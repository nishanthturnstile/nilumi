import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { preflightStatus } from "../lib/gateway/preflight.ts";
import { atomicFile } from "../lib/verification/ledger.ts";
import { manifest } from "./gateway-canary.mjs";

try {
  const configPath =
    process.argv.find((arg) => arg.startsWith("--config="))?.slice(9) ??
    new URL("../config/gateway-canary.json", import.meta.url);
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const catalog = process.argv.includes("--catalog");
  let pricing;
  if (catalog) {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("pricing_unverified");
    pricing = (await response.json()).data;
  }
  const plan = manifest(pricing);
  const report = {
    checkedAt: new Date().toISOString(),
    mode: catalog ? "public-catalog-read-only" : "offline",
    sdk: { ai: "7.0.130", gateway: "4.0.106" },
    accountPreflight: preflightStatus(config),
    manifest: plan,
    catalogSource: catalog ? "https://ai-gateway.vercel.sh/v1/models" : null,
    routes: pricing
      ? [...new Set(plan.probes.map((probe) => probe.model))].map((id) => {
          const model = pricing.find((item) => item.id === id);
          return {
            id,
            noTraining: model?.no_training ?? "unknown",
            inputUsdPerToken: model?.pricing?.input,
            cacheWriteUsdPerToken: model?.pricing?.input_cache_write,
            outputUsdPerToken: model?.pricing?.output,
          };
        })
      : [],
    modelCalls: 0,
    canarySpendUsd: 0,
    acceptance: "pending-live-proofs-storage-forwarding-and-shutdown",
  };
  const output = process.argv
    .find((arg) => arg.startsWith("--output="))
    ?.slice(9);
  if (output)
    await atomicFile(resolve(output), JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch {
  process.stderr.write(
    "Preflight report refused: configuration, pricing or output is unavailable. No model call was made.\n",
  );
  process.exitCode = 1;
}
