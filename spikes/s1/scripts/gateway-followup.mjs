import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gatewayFailure } from "../lib/gateway/policy.ts";
import {
  atomicFile,
  initializeLedger,
  reserve,
  settle,
  spent,
  validateLedger,
  withLedger,
} from "../lib/verification/ledger.ts";
import { manifest, runCanary } from "./gateway-canary.mjs";

const scope = "vgw-followup";
const sourceHash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function sourceLedger(source) {
  const bytes = await readFile(source);
  const raw = JSON.parse(bytes);
  if (!["vgw", "vgw-followup"].includes(raw.scope))
    throw new Error("prior_scope_invalid");
  const ledger = validateLedger(raw, raw.scope);
  if (spent(ledger) <= 0) throw new Error("prior_spend_required");
  return {
    source: resolve(source),
    hash: sourceHash(bytes),
    counted: spent(ledger),
  };
}

// Explicit, exclusive initialization; paid paths never create/migrate state.
export async function initializeFollowup(directory, source) {
  const prior = await sourceLedger(source);
  await initializeLedger(directory, scope);
  await withLedger(directory, scope, async (ledger, save) => {
    reserve(ledger, `carry:${prior.hash}`, prior.counted);
    settle(ledger, `carry:${prior.hash}`, prior.counted);
    await save();
    await atomicFile(
      resolve(directory, "prior-run.json"),
      JSON.stringify(prior),
    );
  });
  await initializeLedger(resolve(directory, "round-1"), "vgw");
  return {
    capUsd: 1.05,
    priorCountedUsd: prior.counted / 1e6,
    priorHash: prior.hash,
  };
}

export async function runFollowup({ directory, probe, ...options }) {
  // Quota warm-up needs its separately validated manifest and preflight method.
  if (!["chat", "embedding", "negative"].includes(probe))
    throw new Error("followup_probe_not_enabled");
  return withLedger(directory, scope, async (ledger, save) => {
    const prior = JSON.parse(
      await readFile(resolve(directory, "prior-run.json"), "utf8"),
    );
    const current = await sourceLedger(prior.source);
    const carry = ledger.entries.find((e) => e.id === `carry:${prior.hash}`);
    if (
      current.hash !== prior.hash ||
      !carry ||
      carry.charged !== current.counted ||
      carry.state !== "settled"
    )
      throw new Error("prior_run_changed_or_missing");
    const child = resolve(directory, "round-1");
    const before = validateLedger(
      JSON.parse(await readFile(resolve(child, "vgw-budget.json"), "utf8")),
      "vgw",
    );
    const diagnostics = ledger.entries.filter(
      (e) => !e.id.startsWith("carry:"),
    );
    if (
      diagnostics.length !== before.entries.length ||
      diagnostics.some((e) => e.state === "reserved")
    )
      throw new Error("followup_incomplete_attempt");
    const fetcher = options.fetcher ?? fetch;
    const response = await fetcher("https://ai-gateway.vercel.sh/v1/models", {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("pricing_unverified");
    const catalog = await response.json();
    const plan = manifest(catalog.data, options.config?.negativeProfile);
    const allowance = Math.ceil(
      plan.probes.find((p) => p.probe === probe).reservationUsd * 1e6,
    );
    if (diagnostics.reduce((n, e) => n + e.allowance, 0) + allowance > 5000)
      throw new Error("diagnostic_manifest_exceeded");
    const id = `${probe}:${randomUUID()}`;
    reserve(ledger, id, allowance);
    await save();
    // Reserve the aggregate first, then the child; a crash keeps both conservative.
    let transportFailure;
    const transport = async (url, request) => {
      // The child and aggregate reserve from the same freshly fetched catalog.
      if (String(url).endsWith("/models")) return Response.json(catalog);
      const result = await fetcher(url, request);
      if (result.status >= 400) {
        const body = await result.clone().text();
        transportFailure = gatewayFailure({
          status: result.status,
          responseBody: body.length < 10000 ? body : undefined,
        });
      }
      return result;
    };
    const report = await runCanary({
      ...options,
      fetcher: transport,
      directory: child,
      probe,
    });
    const after = validateLedger(
      JSON.parse(await readFile(resolve(child, "vgw-budget.json"), "utf8")),
      "vgw",
    );
    const charge = spent(after) - spent(before);
    if (charge < 0) throw new Error("child_spend_regressed");
    settle(ledger, id, charge);
    await save();
    if (charge > allowance) {
      await atomicFile(
        resolve(child, "gateway-halt.json"),
        JSON.stringify({ reason: "aggregate_reservation_exceeded" }),
      );
      throw new Error("aggregate_reservation_exceeded");
    }
    const result = {
      ...report,
      aggregateCountedUsd: spent(ledger) / 1e6,
      aggregateCapUsd: 1.05,
      priorHash: prior.hash,
      transportFailure,
    };
    await atomicFile(
      resolve(directory, `${id}-aggregate-report.json`),
      JSON.stringify(result, null, 2),
    );
    return result;
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const directory = process.env.VGW_FOLLOWUP_DIR;
    if (!directory) throw new Error("state_directory_required");
    const argument = (name) =>
      process.argv
        .find((a) => a.startsWith(`--${name}=`))
        ?.slice(name.length + 3);
    const result = process.argv.includes("--init")
      ? await initializeFollowup(directory, argument("source"))
      : process.argv.includes("--live")
        ? await runFollowup({
            directory,
            probe: argument("probe"),
            key: process.env.VGW_CANARY_API_KEY,
            config: JSON.parse(await readFile(argument("config"), "utf8")),
          })
        : {
            mode: "dry",
            capUsd: 1.05,
            diagnosticMaximumUsd: 0.005,
            enabledProbes: ["chat", "embedding", "negative"],
            quota: "separate-gateway-quota-runner-requires-passed-diagnostics",
            modelCalls: 0,
          };
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (
      result.status &&
      !["passed", "degraded_probe_observed"].includes(result.status)
    )
      process.exitCode = 1;
  } catch {
    process.stderr.write(
      "Follow-up refused or failed; preserve state and revoke canary access on exit.\n",
    );
    process.exitCode = 1;
  }
}
