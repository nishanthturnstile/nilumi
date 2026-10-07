import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { SYNTHETIC_FIXTURE_SHA256 } from "../config/nlu-policy.ts";
import {
  normalizeProviderOutput,
  PROVIDER_SCHEMA,
} from "../lib/nlu/contracts.ts";
import { loadFixtures } from "../lib/nlu/fixtures.ts";
import {
  INTERPRETATION_VERSION,
  interpretResult,
} from "../lib/nlu/interpret.ts";
import {
  buildPrompt,
  PROMPT_VERSION,
  STATIC_PREFIX,
} from "../lib/nlu/prompt.ts";
import { score } from "../lib/nlu/scoring.ts";
export async function pipelineFingerprint() {
  const files = [
    "scripts/evaluate-subscription-nlu.mjs",
    "evals/few-shot.json",
    "package.json",
    "pnpm-lock.yaml",
  ];
  for (const directory of ["lib/nlu", "config"])
    for (const name of await readdir(
      new URL(`../${directory}/`, import.meta.url),
    ))
      if (/\.(ts|json)$/.test(name)) files.push(`${directory}/${name}`);
  const hash = createHash("sha256");
  for (const file of files.sort()) {
    hash.update(file).update("\0");
    hash
      .update(await readFile(new URL(`../${file}`, import.meta.url)))
      .update("\0");
  }
  return hash.digest("hex");
}

// Local, synthetic correctness evidence only. Never import Gateway or its ledger.
export function subscriptionEnvironment(source) {
  return Object.fromEntries(
    Object.entries(source).filter(
      ([key]) =>
        !/^(.*API_KEY|.*TOKEN|.*SECRET|.*COOKIE|OPENAI_BASE_URL|T3_.*|NLU_.*|CODEX_HOME)$/i.test(
          key,
        ),
    ),
  );
}

export function selectFixtures(fixtures, split, caseIds) {
  if (!["development", "held_out", "all"].includes(split))
    throw new Error("Invalid split");
  const eligible = fixtures.filter((x) => split === "all" || x.split === split);
  if (!caseIds) return eligible;
  if (!caseIds.length || new Set(caseIds).size !== caseIds.length)
    throw new Error("Empty or duplicate case IDs");
  const selected = caseIds.map((id) => eligible.find((x) => x.id === id));
  if (selected.some((x) => !x))
    throw new Error("Unknown case or case outside selected split");
  return selected;
}

export async function runBounded(selected, concurrency, evaluate) {
  if (![1, 2].includes(concurrency))
    throw new Error("Concurrency must be 1 or 2");
  let next = 0;
  let stopped = false;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (!stopped && next < selected.length) {
        const fixture = selected[next++];
        if ((await evaluate(fixture)) === false) stopped = true;
      }
    }),
  );
}

export function subscriptionSummary(rows, selected) {
  const correct = rows.filter((x) => x.correct).length;
  const calls = rows.filter((x) => x.status !== "refused");
  const held = rows.filter((x) => x.split === "held_out");
  const dates = rows.filter((x) => x.tags.includes("dates"));
  const privacy = rows.filter((x) => x.tags.includes("privacy"));
  const complete = rows.length === selected.length;
  return {
    expected: selected.length,
    attempted: rows.length,
    correct,
    accuracy: rows.length ? correct / rows.length : null,
    extraction: {
      attempted: rows.filter((x) => x.extractionScore || x.status === "refused")
        .length,
      correct: rows.filter(
        (x) =>
          x.extractionScore?.correct || (x.status === "refused" && x.correct),
      ).length,
    },
    normalizedCases: rows.filter((x) => x.normalizations?.length).length,
    schemaValidRate: calls.length
      ? calls.filter((x) => x.schemaValid === true).length / calls.length
      : null,
    heldOut: {
      attempted: held.length,
      correct: held.filter((x) => x.correct).length,
    },
    dates: {
      attempted: dates.length,
      correct: dates.filter((x) => x.correct).length,
    },
    privacy: {
      attempted: privacy.length,
      correct: privacy.filter((x) => x.correct).length,
    },
    coverageComplete: complete,
    syntheticCorrectnessPass:
      complete &&
      rows.length === 60 &&
      new Set(rows.map((x) => x.caseId)).size === 60 &&
      correct >= 54 &&
      held.length === 12 &&
      held.filter((x) => x.correct).length >= 11 &&
      dates.length >= 12 &&
      dates.every((x) => x.correct) &&
      privacy.length >= 8 &&
      privacy.every((x) => x.correct),
    deploymentAcceptance: "pending_live_gates",
  };
}

function nativePath(path, windowsExecutable) {
  return windowsExecutable && process.platform !== "win32"
    ? execFileSync("wslpath", ["-w", path], { encoding: "utf8" }).trim()
    : path;
}

export function codexArguments({
  model,
  effort,
  directory,
  instructions,
  schema,
  output,
}) {
  return [
    "exec",
    "--ignore-user-config",
    "--ignore-rules",
    "--ephemeral",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--json",
    "--color",
    "never",
    "--model",
    model,
    "--cd",
    directory,
    "--output-schema",
    schema,
    "--output-last-message",
    output,
    "-c",
    'model_provider="openai"',
    "-c",
    'forced_login_method="chatgpt"',
    "-c",
    `model_reasoning_effort=${JSON.stringify(effort)}`,
    "-c",
    `model_instructions_file=${JSON.stringify(instructions)}`,
    "-c",
    "project_doc_max_bytes=0",
    "-c",
    'web_search="disabled"',
    "-c",
    "features.shell_tool=false",
    "-c",
    "features.unified_exec=false",
    "-c",
    "features.apps=false",
    "-c",
    "features.plugins=false",
    "-c",
    "features.hooks=false",
    "-c",
    "features.memories=false",
    "-c",
    "features.skill_search=false",
    "-c",
    "features.skip_host_skill_discovery=true",
    "-c",
    "suppress_unstable_features_warning=true",
    "-c",
    "features.browser_use=false",
    "-c",
    "features.computer_use=false",
    "-c",
    "features.image_generation=false",
    "-c",
    "features.view_image=false",
    "-c",
    "features.multi_agent_v2=false",
    "-c",
    "features.multi_agent=false",
    "-c",
    "features.goals=false",
    "-c",
    "features.sleep_tool=false",
    "-c",
    "features.tool_suggest=false",
    "-c",
    "features.unbounded_connection_retries=false",
    "-",
  ];
}

export function inspectEvents(events) {
  const errors = events.filter((x) => x.item?.type === "error");
  if (errors.length)
    throw new Error(
      `codex_item_error:${errors
        .map((x) => x.item.message)
        .join(" ")
        .replace(/Bearer\s+\S+|sk-[\w-]+|[A-Za-z0-9_+/=-]{60,}/g, "[redacted]")
        .slice(0, 600)}`,
    );
  const completed = events.filter((x) => x.type === "turn.completed");
  const toolItems = events.filter(
    (x) => x.item && !["agent_message", "reasoning"].includes(x.item.type),
  );
  if (toolItems.length)
    throw new Error(
      `tool_activity_rejected:${[...new Set(toolItems.map((x) => x.item.type))].join(",")}`,
    );
  if (
    completed.length !== 1 ||
    events.some((x) => x.type === "turn.failed" || x.type === "error")
  )
    throw new Error("incomplete_or_failed_turn");
  return { usage: completed[0].usage, toolActivity: false };
}

async function extract(prompt, options) {
  const windowsExecutable = /\.exe$/i.test(options.binary);
  const directory = await mkdtemp(join(options.workRoot, "nilumi-synthetic-"));
  const within = relative(options.workRoot, resolve(directory));
  if (
    !within.startsWith("nilumi-synthetic-") ||
    within.includes("..") ||
    isAbsolute(within)
  )
    throw new Error("Unsafe temporary cleanup path");
  const schema = join(directory, "schema.json");
  const instructions = join(directory, "instructions.txt");
  const output = join(directory, "output.json");
  try {
    await writeFile(schema, JSON.stringify(PROVIDER_SCHEMA));
    await writeFile(instructions, prompt.system);
    const args = codexArguments({
      ...options,
      directory: nativePath(directory, windowsExecutable),
      schema: nativePath(schema, windowsExecutable),
      instructions: nativePath(instructions, windowsExecutable),
      output: nativePath(output, windowsExecutable),
    });
    const started = performance.now();
    const result = await new Promise((accept, reject) => {
      const child = spawn(options.binary, args, {
        cwd: directory,
        env: subscriptionEnvironment(process.env),
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("subscription_timeout"));
      }, options.timeoutMs);
      child.stdout.on("data", (data) => {
        stdout += data;
      });
      child.stderr.on("data", (data) => {
        stderr += data;
      });
      child.stdin.on("error", () => {});
      child.on("error", () => {
        clearTimeout(timer);
        reject(new Error("codex_launch_failed"));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        try {
          if (code !== 0) {
            const diagnostic = stderr
              .split("\n")
              .filter((x) =>
                /error|invalid|unsupported|failed|requires/i.test(x),
              )
              .join(" ")
              .replace(
                /Bearer\s+\S+|sk-[\w-]+|[A-Za-z0-9_+/=-]{60,}/g,
                "[redacted]",
              )
              .slice(0, 1000);
            throw new Error(`codex_exit_${code}: ${diagnostic}`);
          }
          const events = stdout
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line));
          accept(inspectEvents(events));
        } catch (error) {
          reject(error);
        }
      });
      child.stdin.end(prompt.prompt);
    });
    return {
      ...result,
      raw: JSON.parse(await readFile(output, "utf8")),
      elapsedMs: performance.now() - started,
    };
  } finally {
    // mkdtemp's fixed prefix is outside the repository and contains no credentials.
    await rm(directory, { recursive: true, force: true });
  }
}

async function main() {
  const args = new Map();
  const allowed = new Set([
    "split",
    "cases",
    "model",
    "codex-bin",
    "work-root",
    "concurrency",
    "frozen-prompt-sha256",
    "frozen-pipeline-sha256",
  ]);
  for (let i = 2; i < process.argv.length; i += 2) {
    if (
      !process.argv[i].startsWith("--") ||
      !process.argv[i + 1] ||
      !allowed.has(process.argv[i].slice(2)) ||
      args.has(process.argv[i].slice(2))
    )
      throw new Error("Use --option value pairs");
    args.set(process.argv[i].slice(2), process.argv[i + 1]);
  }
  const split = args.get("split") ?? "development";
  const model = args.get("model") ?? "gpt-6-luna";
  if (model !== "gpt-6-luna")
    throw new Error("Only the approved subscription Luna is enabled");
  const options = {
    model,
    effort: "low",
    binary: args.get("codex-bin") ?? "codex",
    workRoot: resolve(args.get("work-root") ?? tmpdir()),
    timeoutMs: 120_000,
  };
  const concurrency = Number(args.get("concurrency") ?? "1");
  if (![1, 2].includes(concurrency))
    throw new Error("Concurrency must be 1 or 2");
  await mkdir(options.workRoot, { recursive: true });
  const env = subscriptionEnvironment(process.env);
  const auth = spawnSync(options.binary, ["login", "status"], {
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (
    auth.status !== 0 ||
    !`${auth.stdout}${auth.stderr}`.includes("Logged in using ChatGPT")
  )
    throw new Error("ChatGPT subscription login required");
  const { fixtures, hash } = await loadFixtures();
  if (hash !== SYNTHETIC_FIXTURE_SHA256)
    throw new Error("Frozen synthetic corpus hash mismatch");
  const selected = selectFixtures(
    fixtures,
    split,
    args.get("cases")?.split(","),
  );
  const pipelineSha256 = await pipelineFingerprint();
  if (
    split !== "development" &&
    args.get("frozen-prompt-sha256") !==
      createHash("sha256").update(STATIC_PREFIX).digest("hex")
  )
    throw new Error("Held-out evaluation requires the frozen prompt hash");
  if (
    split !== "development" &&
    args.get("frozen-pipeline-sha256") !== pipelineSha256
  )
    throw new Error("Held-out evaluation requires the frozen pipeline hash");
  const directory = resolve("validation-results/subscription");
  await mkdir(directory, { recursive: true });
  const reportPath = join(directory, `${randomUUID()}.json`);
  const report = {
    mode: "subscription_synthetic_correctness",
    syntheticOnly: true,
    authentication: "chatgpt",
    model,
    modelVerification:
      "Explicit Codex CLI model pin; no Gateway routing receipt",
    codexVersion: execFileSync(options.binary, ["--version"], {
      env,
      encoding: "utf8",
    }).trim(),
    reasoningEffort: "low",
    promptVersion: PROMPT_VERSION,
    promptSha256: createHash("sha256").update(STATIC_PREFIX).digest("hex"),
    fixtureSha256: hash,
    interpretationVersion: INTERPRETATION_VERSION,
    pipelineSha256,
    split,
    createdAt: new Date().toISOString(),
    timeoutMs: options.timeoutMs,
    concurrency,
    retries: "Runner does not retry; built-in Codex transport behavior applies",
    timingScope: "Codex process wall time; not Gateway NLU latency",
    gatewaySpendUsd: 0,
    subscriptionCostUsd: null,
    privacy: "Subscription policy applies; no ZDR or Gateway no-training claim",
    rows: [],
  };
  let saving = Promise.resolve();
  const save = () => {
    saving = saving.then(async () => {
      report.rows.sort(
        (a, b) =>
          selected.findIndex((x) => x.id === a.caseId) -
          selected.findIndex((x) => x.id === b.caseId),
      );
      report.summary = subscriptionSummary(report.rows, selected);
      if (report.abortReason) report.summary.syntheticCorrectnessPass = false;
      const temporary = `${reportPath}.tmp`;
      await writeFile(temporary, JSON.stringify(report, null, 2), {
        mode: 0o600,
      });
      await rename(temporary, reportPath);
    });
    return saving;
  };
  await save();
  console.log(
    JSON.stringify({
      reportPath,
      selected: selected.length,
      promptSha256: report.promptSha256,
      pipelineSha256,
    }),
  );
  await runBounded(selected, concurrency, async (fixture) => {
    if (report.abortReason) return false;
    const base = {
      caseId: fixture.id,
      category: fixture.category,
      split: fixture.split,
      tags: fixture.tags,
    };
    const prompt = buildPrompt(fixture.transcript, fixture.context);
    if (prompt.status === "refused") {
      const validation = { status: "refused", category: prompt.category };
      report.rows.push({
        ...base,
        status: "refused",
        validation,
        ...score(fixture, validation),
        elapsedMs: 0,
      });
    } else {
      try {
        const response = await extract(prompt, options);
        const { validation, extractionValidation, normalizations } =
          interpretResult(
            normalizeProviderOutput(response.raw),
            fixture.transcript,
            fixture.context,
          );
        report.rows.push({
          ...base,
          status: validation.status === "parsed" ? "ok" : validation.status,
          ...response,
          validation,
          extractionScore: score(fixture, extractionValidation),
          normalizations,
          ...score(fixture, validation),
        });
      } catch (error) {
        report.abortReason = error.message;
        report.rows.push({
          ...base,
          status: "execution_error",
          error: error.message,
          correct: false,
          schemaValid: false,
        });
        await save();
        console.log(
          JSON.stringify({
            caseId: fixture.id,
            status: "execution_error",
            error: error.message,
          }),
        );
        // Access, tool, transport or limit failures stop the batch without retries.
        process.exitCode = 1;
        return false;
      }
    }
    await save();
    const row = report.rows.find((x) => x.caseId === fixture.id);
    console.log(
      JSON.stringify({
        caseId: row.caseId,
        correct: row.correct,
        schemaValid: row.schemaValid,
        elapsedMs: row.elapsedMs,
      }),
    );
    return true;
  });
  if ((await pipelineFingerprint()) !== pipelineSha256) {
    report.abortReason = "Pipeline changed during evaluation";
    process.exitCode = 1;
  }
  await save();
  console.log(JSON.stringify(report.summary));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await main();
