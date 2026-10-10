import { Pool } from "undici";
import { PROVIDER_POOL_POLICY } from "../../config/voice";
import { noteProviderDisconnect, type ProviderTrace } from "./timing";

const ORIGIN = "https://api.sarvam.ai";
// Injectable origin is used by local HTTP controls; production always uses ORIGIN.
export function createProviderPool(origin = ORIGIN) {
  const pool = new Pool(origin, PROVIDER_POOL_POLICY);
  pool.on("disconnect", (url, _targets, error) =>
    noteProviderDisconnect(url.origin, error),
  );
  return pool;
}
const shared = globalThis as typeof globalThis & {
  __nilumiS4SarvamPool?: Pool;
};
export function sarvamPool() {
  // One pool across Next route bundles; creating one does not make a request.
  shared.__nilumiS4SarvamPool ??= createProviderPool();
  return shared.__nilumiS4SarvamPool;
}
export function recordProviderPolicy(trace: ProviderTrace, response: Response) {
  const match = response.headers.get("keep-alive")?.match(/\btimeout=(\d+)\b/i);
  const seconds = match ? Number(match[1]) : null;
  const hint = seconds !== null && seconds <= 86_400 ? seconds * 1000 : null;
  const serverCloses = /\bclose\b/i.test(
    response.headers.get("connection") ?? "",
  );
  trace.poolPolicy = {
    ...PROVIDER_POOL_POLICY,
    serverIdleHintMs: hint,
    serverCloses,
    // This is the H1 policy derived from hints, not a guarantee of socket survival.
    effectiveIdleMs: serverCloses
      ? 0
      : hint === null
        ? PROVIDER_POOL_POLICY.keepAliveTimeout
        : Math.max(
            0,
            Math.min(
              hint - PROVIDER_POOL_POLICY.keepAliveTimeoutThreshold,
              PROVIDER_POOL_POLICY.keepAliveMaxTimeout,
            ),
          ),
  };
}
