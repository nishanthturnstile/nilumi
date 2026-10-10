import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  CANARY_FIXTURES,
  GATEWAY_ROLES,
  NEGATIVE_CANARY_PROFILES,
  NEGATIVE_CANARY_ROUTE,
} from "../config/gateway-roles.ts";
import { createGatewayClient } from "../lib/gateway/client.ts";
import {
  CANARY_VERSION,
  credentialHash,
  fixtureHash,
  requirePreflight,
  requireQuotaReadback,
} from "../lib/gateway/preflight.ts";
import {
  atomicFile,
  CAPS,
  reserve,
  settle,
  spent,
  withLedger,
} from "../lib/verification/ledger.ts";

export { fixtureHash };
const PROBES = ["chat", "embedding", "negative", "quota"];
export function manifest(pricing, negativeProfile = "arcee") {
  const negativeRoute = NEGATIVE_CANARY_PROFILES[negativeProfile];
  if (!negativeRoute) throw new Error("negative_profile_invalid");
  const probes = PROBES.map((probe) => {
    const role = probe === "embedding" ? "embed" : "nlu";
    const input =
      role === "embed" ? CANARY_FIXTURES.embedding : CANARY_FIXTURES.chat;
    const route = probe === "negative" ? negativeRoute : GATEWAY_ROLES[role];
    return {
      probe,
      role,
      model: route.model,
      providers: route.providers,
      maxInputBytes: Buffer.byteLength(input) + 4096,
      maxOutputTokens: role === "embed" ? 0 : 32,
      controls: {
        disallowPromptTraining: true,
        only: route.providers,
        store: route.storeSupported ? false : "unsupported",
      },
      expected:
        probe === "negative"
          ? "no_providers_available"
          : probe === "quota"
            ? "402 quota_for_entity_exceeded"
            : "success",
      reservationUsd: pricing
        ? reservation(
            role,
            input,
            pricing,
            probe === "negative",
            negativeProfile,
          ) / 1e6
        : null,
    };
  });
  const maximumUsd = pricing
    ? probes.reduce((total, probe) => total + probe.reservationUsd, 0)
    : null;
  if (maximumUsd !== null && maximumUsd > CAPS.vgw / 1e6)
    throw new Error("manifest_exceeds_cap");
  return {
    version: CANARY_VERSION,
    fixtureHash: fixtureHash(),
    capUsd: CAPS.vgw / 1e6,
    maxCalls: 4,
    fallback: "disabled",
    maximumUsd,
    probes,
  };
}
async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
async function bindSession(directory, config, key, ledger) {
  const identity = {
    version: CANARY_VERSION,
    teamId: config.teamId,
    keyId: config.canaryBudget.keyId,
    credentialHash: credentialHash(key),
    fixtureHash: fixtureHash(),
    ...(config.negativeProfile
      ? { negativeProfile: config.negativeProfile }
      : {}),
    ...(config.negativeMode ? { negativeMode: config.negativeMode } : {}),
  };
  const file = resolve(directory, "gateway-session.json");
  try {
    const existing = await readJson(file);
    if (
      Object.entries(identity).some(
        ([field, value]) => existing[field] !== value,
      )
    )
      throw new Error("canary_identity_changed");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    if (ledger.entries.length) throw new Error("canary_session_missing");
    await atomicFile(file, JSON.stringify(identity));
  }
  return {
    version: identity.version,
    teamId: identity.teamId,
    keyId: identity.keyId,
    fixtureHash: identity.fixtureHash,
    ...(identity.negativeProfile
      ? { negativeProfile: identity.negativeProfile }
      : {}),
    ...(identity.negativeMode ? { negativeMode: identity.negativeMode } : {}),
  };
}
export function reservation(
  role,
  input,
  pricing,
  negative = false,
  negativeProfile = "arcee",
) {
  const route = pricing.find(
    (item) =>
      item.id ===
      (negative
        ? NEGATIVE_CANARY_PROFILES[negativeProfile]
        : GATEWAY_ROLES[role]
      ).model,
  );
  const inputRate = Math.max(
      Number(route?.pricing?.input),
      Number(route?.pricing?.input_cache_write ?? 0),
    ),
    outputRate = Number(route?.pricing?.output ?? 0);
  if (
    !route ||
    !Number.isFinite(inputRate) ||
    inputRate <= 0 ||
    !Number.isFinite(outputRate) ||
    (role !== "embed" && route?.pricing?.output === undefined) ||
    outputRate < 0
  )
    throw new Error("pricing_unverified");
  // UTF-8 token upper bound + serialization envelope, no cache discount.
  return Math.ceil(
    ((Buffer.byteLength(input) + 4096) * inputRate +
      (role === "embed" ? 0 : 32) * outputRate) *
      1e6,
  );
}
export async function runCanary({
  directory,
  probe,
  key,
  config,
  fetcher = fetch,
  now = Date.now(),
}) {
  if (!key) throw new Error("gateway_key_missing");
  config = requirePreflight(config, now);
  if (!PROBES.includes(probe)) throw new Error("probe_not_ready");
  const role = probe === "embedding" ? "embed" : "nlu";
  const input =
    role === "embed" ? CANARY_FIXTURES.embedding : CANARY_FIXTURES.chat;
  const ratesResponse = await fetcher(
    "https://ai-gateway.vercel.sh/v1/models",
    { signal: AbortSignal.timeout(5000) },
  );
  if (!ratesResponse.ok) throw new Error("pricing_unverified");
  const pricing = (await ratesResponse.json()).data;
  const plan = manifest(pricing, config.negativeProfile);
  if (
    pricing.find(
      (item) =>
        item.id ===
        NEGATIVE_CANARY_PROFILES[config.negativeProfile ?? "arcee"].model,
    )?.no_training !== "none"
  )
    throw new Error("negative_route_policy_changed");
  if (
    [GATEWAY_ROLES.nlu.model, GATEWAY_ROLES.embed.model].some(
      (model) =>
        pricing.find((item) => item.id === model)?.no_training !== "all",
    )
  )
    throw new Error("approved_route_policy_changed");
  return await withLedger(directory, "vgw", async (ledger, save) => {
    if (
      ledger.entries.length >= 4 ||
      ledger.entries.some((entry) => entry.id.startsWith(`${probe}:`))
    )
      throw new Error("probe_attempt_limit_reached");
    const evidence = await bindSession(directory, config, key, ledger);
    // Positive probes must succeed before negative controls; quota is last.
    if (PROBES[ledger.entries.length] !== probe)
      throw new Error("probe_order_invalid");
    let previous;
    for (const entry of ledger.entries) {
      previous = await readJson(resolve(directory, `${entry.id}-report.json`));
      const expected = entry.id.startsWith("negative:")
        ? "degraded_probe_observed"
        : "passed";
      if (
        previous.id !== entry.id ||
        previous.keyId !== evidence.keyId ||
        previous.fixtureHash !== evidence.fixtureHash ||
        previous.status !== expected
      )
        throw new Error("previous_probe_incomplete");
    }
    if (probe === "quota")
      requireQuotaReadback(config, previous.at, spent(ledger) / 1e6, now);
    const faultFile = resolve(directory, "gateway-halt.json");
    let halted = false;
    try {
      await readFile(faultFile);
      halted = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (halted) throw new Error("role_halted");
    const id = `${probe}:${randomUUID()}`;
    const client = createGatewayClient({
      key,
      syntheticCanary: true,
      negativeProfile: config.negativeProfile,
      negativeMode: config.negativeMode,
      acknowledgement: async () => null,
      verificationPassed: async () => false,
      fetch: fetcher,
      reserve: async () => {
        reserve(
          ledger,
          id,
          Math.ceil(
            plan.probes.find((item) => item.probe === probe).reservationUsd *
              1e6,
          ),
        );
        await save();
      },
      state: {
        isTripped: async () => halted,
        trip: async (affectedRole, reason) => {
          if (probe === "negative" && reason === "no_providers_available")
            return;
          halted = true;
          await atomicFile(
            faultFile,
            JSON.stringify({
              role: affectedRole,
              reason,
              at: new Date().toISOString(),
            }),
          );
        },
      },
    });
    let report;
    try {
      const result =
        probe === "negative"
          ? await client.negativeCanary(AbortSignal.timeout(15_000))
          : await client.call(role, input, AbortSignal.timeout(15_000));
      const cost = result.receipt.costUsd;
      if (probe === "embedding" && result.result.embedding?.length !== 768)
        throw new Error("embedding_dimensions_invalid");
      settle(
        ledger,
        id,
        cost === undefined ? undefined : Math.ceil(cost * 1e6),
      );
      await save();
      const entry = ledger.entries.find((item) => item.id === id);
      if (entry.charged > entry.allowance)
        throw new Error("reservation_exceeded");
      if (["negative", "quota"].includes(probe))
        await atomicFile(
          faultFile,
          JSON.stringify({
            reason: "unexpected_probe_success",
            at: new Date().toISOString(),
          }),
        );
      report = {
        id,
        probe,
        fixtureHash: fixtureHash(),
        status: ["quota", "negative"].includes(probe)
          ? "unexpected_success"
          : "passed",
        receipt: result.receipt,
        ...(probe === "embedding" ? { dimensions: 768 } : {}),
        latencyMs: result.latencyMs,
        countedUsd: spent(ledger) / 1e6,
        providerForwardingVerified: false,
      };
    } catch (error) {
      const expected =
        (probe === "quota" &&
          error.failure?.httpStatus === 402 &&
          error.failure?.providerCode === "quota_for_entity_exceeded") ||
        (probe === "negative" && error.code === "no_providers_available");
      if (!expected)
        await atomicFile(
          faultFile,
          JSON.stringify({
            reason: error.code ?? "gateway_request_failed",
            at: new Date().toISOString(),
          }),
        );
      report = {
        id,
        probe,
        fixtureHash: fixtureHash(),
        status: expected ? "degraded_probe_observed" : "failed",
        reason: error.code ?? "gateway_request_failed",
        failure: error.failure,
        countedUsd: spent(ledger) / 1e6,
      };
    }
    report = {
      ...report,
      ...evidence,
      at: new Date(now).toISOString(),
      shutdownRequired: true,
    };
    await atomicFile(
      resolve(directory, `${id}-report.json`),
      JSON.stringify(report, null, 2),
    );
    return report;
  });
}
// This observes revocation; deletion remains an authenticated account action.
// No inference request is needed, and raw HTTP bodies/credentials are discarded.
export async function verifyRevocation({ directory, key, fetcher = fetch }) {
  if (!key) throw new Error("gateway_key_missing");
  return withLedger(directory, "vgw", async (ledger) => {
    const session = await readJson(resolve(directory, "gateway-session.json"));
    if (session.credentialHash !== credentialHash(key))
      throw new Error("canary_identity_changed");
    await atomicFile(
      resolve(directory, "gateway-halt.json"),
      JSON.stringify({
        reason: "shutdown_started",
        at: new Date().toISOString(),
      }),
    );
    // An arbitrary invalid key's 401 is not evidence of revoking the used key.
    let previouslySucceeded = false;
    for (const entry of ledger.entries) {
      try {
        const report = await readJson(
          resolve(directory, `${entry.id}-report.json`),
        );
        if (
          report.id === entry.id &&
          report.keyId === session.keyId &&
          report.status === "passed"
        )
          previouslySucceeded = true;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    const response = await fetcher("https://ai-gateway.vercel.sh/v1/credits", {
      headers: { Authorization: `Bearer ${key}` },
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    await response.body?.cancel();
    const report = {
      version: CANARY_VERSION,
      keyId: session.keyId,
      teamId: session.teamId,
      at: new Date().toISOString(),
      httpStatus: response.status,
      previouslySucceeded,
      status:
        response.status === 401 && previouslySucceeded
          ? "revocation_verified"
          : "revocation_unverified",
      countedUsd: spent(ledger) / 1e6,
      temporaryAccessRemoval: "operator-evidence-required",
    };
    await atomicFile(
      resolve(directory, "gateway-shutdown.json"),
      JSON.stringify(report, null, 2),
    );
    return report;
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const live = process.argv.includes("--live");
  const shutdown = process.argv.includes("--verify-revocation");
  if (!live && !shutdown)
    process.stdout.write(
      `${JSON.stringify(
        {
          ...manifest(),
          mode: "dry",
          fixtures: CANARY_FIXTURES,
          negativeRoute: NEGATIVE_CANARY_ROUTE,
          providerForwarding: "pending",
        },
        null,
        2,
      )}\n`,
    );
  else {
    try {
      const directory = process.env.VGW_STATE_DIR;
      if (!directory) throw new Error("state_directory_required");
      const configPath =
        process.argv.find((arg) => arg.startsWith("--config="))?.slice(9) ??
        new URL("../config/gateway-canary.json", import.meta.url);
      const probe =
        process.argv.find((arg) => arg.startsWith("--probe="))?.split("=")[1] ??
        "chat";
      const report = shutdown
        ? await verifyRevocation({
            directory,
            key: process.env.VGW_CANARY_API_KEY,
          })
        : await runCanary({
            directory,
            probe,
            key: process.env.VGW_CANARY_API_KEY,
            config: await readJson(configPath),
          });
      process.stdout.write(`${JSON.stringify(report)}\n`);
      if (
        !["passed", "degraded_probe_observed", "revocation_verified"].includes(
          report.status,
        )
      )
        process.exitCode = 1;
    } catch {
      process.stderr.write(
        "Canary refused: preflight, credential, probe sequence, pricing, shutdown or durable evidence is incomplete. Revoke the canary key and record shutdown on exit.\n",
      );
      process.exitCode = 1;
    }
  }
}
