import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DateTime } from "luxon";
import { DEFAULT_MODEL, MODELS, PRICE_SOURCE } from "../config/models.ts";
import {
  evaluationDisclosure,
  evaluationMode,
  SYNTHETIC_FIXTURE_SHA256,
} from "../config/nlu-policy.ts";
import {
  estimateReservation,
  freshLedger,
  reserve,
  settle,
  validateLedger,
} from "../lib/nlu/budget.ts";
import { schedule } from "../lib/nlu/evaluate.ts";
import { loadFixtures } from "../lib/nlu/fixtures.ts";
import { buildPrompt } from "../lib/nlu/prompt.ts";
import { summarize } from "../lib/nlu/scoring.ts";

export async function atomicWrite(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const fd = await open(temporary, "wx", 0o600);
  try {
    await fd.writeFile(JSON.stringify(value, null, 2));
    await fd.sync();
  } finally {
    await fd.close();
  }
  await rename(temporary, path);
  const directory = await open(resolve(path, ".."), "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}
export async function acquireLedger(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = resolve(directory, "nlu-budget.lock");
  const lock = await open(lockPath, "wx", 0o600);
  await lock.writeFile(
    JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() }),
  );
  const path = resolve(directory, "nlu-budget.json");
  try {
    let ledger;
    try {
      ledger = validateLedger(JSON.parse(await readFile(path, "utf8")));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      ledger = freshLedger();
    }
    return {
      ledger,
      save: () => atomicWrite(path, ledger),
      release: async () => {
        await lock.close();
        await unlink(lockPath);
      },
    };
  } catch (error) {
    await lock.close();
    await unlink(lockPath);
    throw error;
  }
}
export async function verifyRates(fetcher) {
  const matches = (rate, expected) =>
    Number.isFinite(Number(rate)) &&
    Math.abs(Number(rate) * 1e6 - expected) < 1e-9;
  const response = await fetcher(PRICE_SOURCE, {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("rate_verification_failed");
  const { data } = await response.json();
  for (const [id, m] of Object.entries(MODELS)) {
    const route = data.find((x) => x.id === id);
    if (
      !route ||
      !matches(route.pricing?.input, m.inputPerMillion) ||
      !matches(route.pricing?.output, m.outputPerMillion) ||
      !matches(route.pricing?.input_cache_write ?? 0, m.cacheWritePerMillion) ||
      !matches(route.pricing?.input_cache_read, m.cachedInputPerMillion)
    )
      throw new Error("rates_changed_update_config_before_live_calls");
  }
}
export async function runComparison({
  fixtures,
  fixtureHash,
  caseIds,
  modelIds,
  passes,
  origin,
  cookie,
  directory,
  fetcher = fetch,
  verifyPricing = true,
  mode = "zdr",
}) {
  if (
    evaluationMode(mode) !== mode ||
    (mode === "synthetic_hobby" && fixtureHash !== SYNTHETIC_FIXTURE_SHA256)
  )
    throw new Error("invalid_evaluation_policy");
  if (verifyPricing) await verifyRates(fetcher);
  const url = new URL(origin);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("https_required");
  const store = await acquireLedger(directory);
  const runId = randomUUID();
  const rows = [],
    jobs = schedule(caseIds, modelIds, passes);
  const reportPath = resolve(directory, `nlu-${runId}.json`);
  const report = () => ({
    runId,
    fixtureHash,
    ...evaluationDisclosure(mode),
    rows,
    summary: summarize(rows, jobs.length),
    budget: {
      testCapUsd: store.ledger.testCap,
      monthCapUsd: store.ledger.monthCap,
      chargedUsd: store.ledger.entries.reduce((s, e) => s + e.charged, 0),
    },
  });
  try {
    for (const [index, job] of jobs.entries()) {
      const fixture = fixtures.find((x) => x.id === job.caseId);
      if (!fixture) throw new Error("unknown_case");
      const prompt = buildPrompt(fixture.transcript, fixture.context);
      const id = `${runId}/${index}`;
      const month = DateTime.now().setZone("Asia/Kolkata").toFormat("yyyy-MM");
      if (prompt.status === "ready") {
        if (
          !reserve(
            store.ledger,
            id,
            month,
            estimateReservation(job.modelId, prompt.bytes),
          )
        ) {
          rows.push({
            ...job,
            status: "not_evaluated",
            correct: false,
            schemaValid: null,
            latencyMs: 0,
            costUsd: 0,
            category: fixture.category,
            split: fixture.split,
            tags: fixture.tags,
            language: fixture.expected?.language ?? "boundary",
          });
          continue;
        }
        // Crash/disconnect leaves this durable charge in place, including after server restart.
        await store.save();
      }
      try {
        const response = await fetcher(new URL("/api/nlu/evaluate", url), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: url.origin,
            ...(cookie ? { Cookie: cookie } : {}),
          },
          body: JSON.stringify({
            caseIds: [job.caseId],
            modelIds: [job.modelId],
            passes: 1,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("endpoint_rejected");
        let result,
          versions,
          serverMode,
          done = false;
        for (const line of (await response.text()).trim().split("\n")) {
          const event = JSON.parse(line);
          if (event.type === "start") {
            versions = event.versions;
            serverMode = event.evaluationMode;
          }
          if (event.type === "result") {
            if (result) throw new Error("multiple_results");
            result = event;
          }
          if (event.type === "done") done = true;
        }
        if (
          !done ||
          !result ||
          versions?.fixtureHash !== fixtureHash ||
          serverMode !== mode ||
          result.caseId !== job.caseId ||
          result.modelId !== job.modelId
        )
          throw new Error("incomplete_or_mismatched_report");
        result.pass = job.pass;
        result.versions = versions;
        if (prompt.status === "ready") {
          // A failed billable call keeps its maximum reservation unless reliable cost exists.
          if (
            result.costUsd !== null &&
            result.costUsd !== undefined &&
            (result.costBasis === "reported" ||
              (result.costBasis === "estimated" && result.usage))
          )
            settle(store.ledger, id, result.costUsd, result.costBasis);
          await store.save();
          const e = store.ledger.entries.find((x) => x.id === id);
          result.accountedCostUsd = e.charged;
        }
        rows.push(result);
        if (result.status === "routing_error") {
          await atomicWrite(reportPath, report());
          break;
        }
      } catch {
        rows.push({
          ...job,
          status: "request_failed",
          correct: false,
          schemaValid: false,
          latencyMs: 0,
          costUsd: null,
          costBasis: "reservation",
          accountedCostUsd:
            store.ledger.entries.find((x) => x.id === id)?.charged ?? 0,
          category: fixture.category,
          split: fixture.split,
          tags: fixture.tags,
          language: fixture.expected?.language ?? "boundary",
        });
        await atomicWrite(reportPath, report());
        break;
      }
      await atomicWrite(reportPath, report());
    }
    const final = report();
    await atomicWrite(reportPath, final);
    return { reportPath, report: final };
  } finally {
    await store.release();
  }
}
async function main() {
  const args = process.argv.slice(2);
  const option = (name) =>
    args.find((x) => x.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (
    args.some(
      (x) =>
        x !== "--live" &&
        x !== "--" &&
        !/^--(?:cases|models|passes|origin|mode)=/.test(x),
    )
  )
    throw new Error("unknown_argument");
  const loaded = await loadFixtures();
  const mode = evaluationMode(option("mode"));
  if (!mode) throw new Error("invalid_evaluation_mode");
  const caseIds =
    option("cases") === "all"
      ? loaded.fixtures.map((x) => x.id)
      : (option("cases") ?? "shopping-01,memories-01,dates-01").split(",");
  const modelIds = (option("models") ?? DEFAULT_MODEL).split(",");
  const passes = Number(option("passes") ?? 1);
  if (
    !caseIds.length ||
    caseIds.length > 60 ||
    new Set(caseIds).size !== caseIds.length ||
    caseIds.some((id) => !loaded.fixtures.some((f) => f.id === id)) ||
    !modelIds.length ||
    modelIds.length > 2 ||
    new Set(modelIds).size !== modelIds.length ||
    modelIds.some((id) => !MODELS[id]) ||
    !Number.isInteger(passes) ||
    passes < 1 ||
    passes > 3
  )
    throw new Error("invalid_selection");
  if (!args.includes("--live")) {
    const estimate = schedule(caseIds, modelIds, passes).reduce((sum, j) => {
      const f = loaded.fixtures.find((x) => x.id === j.caseId);
      const p = buildPrompt(f.transcript, f.context);
      return (
        sum +
        (p.status === "ready" ? estimateReservation(j.modelId, p.bytes) : 0)
      );
    }, 0);
    console.log(
      JSON.stringify({
        mode: "dry_run",
        ...evaluationDisclosure(mode),
        calls: caseIds.length * modelIds.length * passes,
        maximumReservationUsd: estimate,
        testCapUsd: 0.5,
        monthCapUsd: 5,
        fixtureHash: loaded.hash,
      }),
    );
    return;
  }
  const cookie = process.env.NLU_SESSION_COOKIE;
  if (!cookie)
    throw new Error("evaluator_credential_required_keep_it_in_ignored_env");
  const result = await runComparison({
    fixtures: loaded.fixtures,
    fixtureHash: loaded.hash,
    caseIds,
    modelIds,
    passes,
    origin: option("origin") ?? "https://staging.nilumi.in",
    cookie,
    directory: resolve("validation-results"),
    mode,
  });
  console.log(`Synthetic report saved: ${result.reportPath}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => {
    console.error(
      "NLU evaluation stopped. Check access/privacy/review gates, current prices and the retained budget ledger. No credentials or provider errors are printed.",
    );
    process.exitCode = 1;
  });
