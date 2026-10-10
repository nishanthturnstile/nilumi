import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CANARY_FIXTURES, QUOTA_CANARY } from "../config/gateway-roles.ts";
import { createGatewayClient } from "../lib/gateway/client.ts";
import {
  credentialHash,
  fixtureHash,
  requirePreflight,
} from "../lib/gateway/preflight.ts";
import {
  atomicFile,
  reserve,
  settle,
  spent,
  validateLedger,
  withLedger,
} from "../lib/verification/ledger.ts";

const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const hash = (value) => createHash("sha256").update(value).digest("hex");
export const quotaFixtureHash = () => hash(JSON.stringify(QUOTA_CANARY));
export function quotaManifest(pricing) {
  const model = pricing.find((m) => m.id === QUOTA_CANARY.model);
  if (!model || model.no_training !== "all")
    throw new Error("quota_route_policy_unverified");
  const inputRate = Math.max(
    Number(model.pricing.input),
    Number(model.pricing.input_cache_write ?? 0),
  );
  const outputRate = Number(model.pricing.output);
  if (
    !Number.isFinite(inputRate) ||
    inputRate <= 0 ||
    !Number.isFinite(outputRate) ||
    outputRate <= 0
  )
    throw new Error("quota_prices_unverified");
  // The complete serialized SDK request is checked before transport; no cache discount.
  const allowance = Math.ceil(
    (QUOTA_CANARY.maxWireBytes * inputRate +
      QUOTA_CANARY.maxOutputTokens * outputRate) *
      1e6,
  );
  if (allowance > 10000) throw new Error("quota_request_exceeds_manifest");
  return {
    version: "vgw-quota-v4",
    fixtureHash: quotaFixtureHash(),
    aggregateCapUsd: 1.05,
    maximumCalls: 400,
    maximumDurationMs: 2700000,
    reservationMicros: allowance,
    ...QUOTA_CANARY,
  };
}
async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
async function requireControls(directory, config, key, ledger, independent) {
  const prior = await json(resolve(directory, "prior-run.json"));
  const source = await readFile(prior.source);
  const carry = ledger.entries.find((e) => e.id === `carry:${prior.hash}`);
  if (hash(source) !== prior.hash || !carry || carry.charged !== prior.counted)
    throw new Error("prior_run_changed_or_missing");
  const child = resolve(directory, "round-1");
  const session = await json(resolve(child, "gateway-session.json"));
  if (
    session.credentialHash !== credentialHash(key) ||
    session.keyId !== config.canaryBudget.keyId ||
    session.teamId !== config.teamId ||
    session.fixtureHash !== fixtureHash() ||
    session.negativeProfile !== config.negativeProfile ||
    session.negativeMode !== config.negativeMode
  )
    throw new Error("canary_identity_changed");
  if (
    (await exists(resolve(child, "gateway-halt.json"))) ||
    (await exists(resolve(directory, "quota-halt.json")))
  )
    throw new Error("canary_halted");
  const childLedger = validateLedger(
    await json(resolve(child, "vgw-budget.json")),
    "vgw",
  );
  const expectedCount = independent ? 2 : 3;
  if (childLedger.entries.length !== expectedCount)
    throw new Error("diagnostics_incomplete");
  let meteredUsd = 0;
  for (let i = 0; i < expectedCount; i++) {
    const entry = childLedger.entries[i];
    const report = await json(resolve(child, `${entry.id}-report.json`));
    if (
      report.id !== entry.id ||
      report.keyId !== session.keyId ||
      report.fixtureHash !== session.fixtureHash ||
      report.probe !== ["chat", "embedding", "negative"][i] ||
      report.status !== (i === 2 ? "degraded_probe_observed" : "passed") ||
      (i === 2 && report.reason !== "no_providers_available")
    )
      throw new Error("diagnostics_incomplete");
    if (i < 2) meteredUsd += report.receipt.costUsd;
  }
  return { session, childLedger, meteredUsd };
}
export async function runQuota({
  directory,
  key,
  config: raw,
  probe = "warmup",
  calls = 1,
  fetcher = fetch,
  now = Date.now(),
}) {
  if (
    !key ||
    !["warmup", "quota"].includes(probe) ||
    !Number.isInteger(calls) ||
    calls < 1 ||
    calls > 25 ||
    (probe === "quota" && calls !== 1)
  )
    throw new Error("quota_arguments_invalid");
  const config = requirePreflight(raw, now);
  return withLedger(directory, "vgw-followup", async (ledger, save) => {
    const { session, childLedger, meteredUsd } = await requireControls(
      directory,
      config,
      key,
      ledger,
      raw.quotaDecision === "adr-052-independent-quota",
    );
    if (ledger.entries.some((e) => e.state === "reserved"))
      throw new Error("aggregate_attempt_incomplete");
    const warmups = ledger.entries.filter((e) => e.id.startsWith("warmup:"));
    const reports = [];
    for (const entry of warmups) {
      const report = await json(
        resolve(directory, `${entry.id}-quota-report.json`),
      );
      if (
        report.id !== entry.id ||
        report.keyId !== session.keyId ||
        report.fixtureHash !== quotaFixtureHash() ||
        report.status !== "passed"
      )
        throw new Error("warmup_attempt_incomplete");
      reports.push(report);
    }
    const rates = await fetcher("https://ai-gateway.vercel.sh/v1/models", {
      signal: AbortSignal.timeout(5000),
    });
    if (!rates.ok) throw new Error("pricing_unverified");
    const pricing = (await rates.json()).data;
    const plan = quotaManifest(pricing);
    const started = warmups[0] ? Date.parse(warmups[0].at) : now;
    if (
      warmups.length + calls > plan.maximumCalls ||
      now - started > plan.maximumDurationMs
    )
      throw new Error("quota_manifest_expired");
    let keyCounted =
      spent(childLedger) + warmups.reduce((n, e) => n + e.charged, 0);
    // Conservative reservations and rounding still constrain the aggregate cap.
    // Only confirmed receipt costs determine when to pause for backend exhaustion.
    let keyMeteredUsd =
      meteredUsd + reports.reduce((n, r) => n + r.receipt.costUsd, 0);
    if (probe === "quota") {
      const b = raw.quotaExhaustion;
      const last = reports.at(-1);
      if (
        !b ||
        !last ||
        b.keyId !== session.keyId ||
        b.limitUsd !== 1 ||
        b.refresh !== "none" ||
        !Number.isFinite(b.spendUsd) ||
        b.spendUsd < 1 ||
        b.spendUsd > keyCounted / 1e6 + 1e-9 ||
        !Number.isFinite(Date.parse(b.checkedAt)) ||
        Date.parse(b.checkedAt) > now ||
        now - Date.parse(b.checkedAt) > 300000 ||
        Date.parse(b.checkedAt) - Date.parse(last.at) < 20000
      )
        throw new Error("quota_exhaustion_readback_pending");
    }
    const results = [];
    for (let i = 0; i < calls; i++) {
      if (probe === "warmup" && keyMeteredUsd >= 1) break;
      if (Date.now() - started > plan.maximumDurationMs)
        throw new Error("quota_manifest_expired");
      const id = `${probe}:${randomUUID()}`;
      const allowance = probe === "warmup" ? plan.reservationMicros : 1000;
      let halted = false;
      const client = createGatewayClient({
        key,
        syntheticCanary: true,
        negativeProfile: config.negativeProfile,
        acknowledgement: async () => null,
        verificationPassed: async () => false,
        fetch: fetcher,
        reserve: async () => {
          reserve(ledger, id, allowance);
          await save();
        },
        state: {
          isTripped: async () => halted,
          trip: async (role, reason) => {
            halted = true;
            await atomicFile(
              resolve(directory, "quota-halt.json"),
              JSON.stringify({ role, reason, at: new Date().toISOString() }),
            );
          },
        },
      });
      let report;
      try {
        const result =
          probe === "warmup"
            ? await client.quotaWarmup(AbortSignal.timeout(30000))
            : await client.call(
                "nlu",
                CANARY_FIXTURES.chat,
                AbortSignal.timeout(15000),
              );
        const charge = Math.ceil(result.receipt.costUsd * 1e6);
        settle(ledger, id, charge);
        await save();
        keyCounted += charge;
        keyMeteredUsd += result.receipt.costUsd;
        if (charge > allowance || probe === "quota") {
          halted = true;
          await atomicFile(
            resolve(directory, "quota-halt.json"),
            JSON.stringify({
              reason:
                charge > allowance
                  ? "reservation_exceeded"
                  : "unexpected_quota_success",
            }),
          );
        }
        report = {
          status: halted ? "failed" : "passed",
          receipt: result.receipt,
          latencyMs: result.latencyMs,
        };
      } catch (error) {
        const expected =
          error.failure?.httpStatus === 402 &&
          error.failure?.providerCode === "quota_for_entity_exceeded";
        report = {
          status: expected ? "degraded_probe_observed" : "failed",
          failure: error.failure,
          reason: error.code ?? "gateway_request_failed",
        };
        halted = true;
        await atomicFile(
          resolve(directory, "quota-halt.json"),
          JSON.stringify({
            reason: report.reason,
            at: new Date().toISOString(),
          }),
        );
      }
      report = {
        ...report,
        id,
        probe,
        version: plan.version,
        keyId: session.keyId,
        teamId: session.teamId,
        fixtureHash: probe === "warmup" ? plan.fixtureHash : fixtureHash(),
        at: new Date().toISOString(),
        aggregateCountedUsd: spent(ledger) / 1e6,
        keyCountedUsd: keyCounted / 1e6,
        shutdownRequired: true,
      };
      await atomicFile(
        resolve(directory, `${id}-quota-report.json`),
        JSON.stringify(report, null, 2),
      );
      results.push(report);
      if (halted) break;
    }
    await atomicFile(
      resolve(directory, "quota-manifest.json"),
      JSON.stringify(plan, null, 2),
    );
    return {
      probe,
      reports: results,
      aggregateCountedUsd: spent(ledger) / 1e6,
      keyCountedUsd: keyCounted / 1e6,
      readyForReadback: keyMeteredUsd >= 1,
    };
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const argument = (name) =>
      process.argv
        .find((a) => a.startsWith(`--${name}=`))
        ?.slice(name.length + 3);
    const result = process.argv.includes("--live")
      ? await runQuota({
          directory: process.env.VGW_FOLLOWUP_DIR,
          key: process.env.VGW_CANARY_API_KEY,
          config: await json(argument("config")),
          probe: argument("probe") ?? "warmup",
          calls: Number(argument("calls") ?? 1),
        })
      : {
          mode: "dry",
          modelCalls: 0,
          profile: QUOTA_CANARY,
          aggregateCapUsd: 1.05,
          maximumCalls: 400,
        };
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.reports?.some((r) => r.status === "failed"))
      process.exitCode = 1;
  } catch {
    process.stderr.write(
      "Quota run refused; preserve reservations, revoke the canary and verify shutdown.\n",
    );
    process.exitCode = 1;
  }
}
