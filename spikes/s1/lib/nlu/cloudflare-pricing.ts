import { z } from "zod";
import prices from "../../config/cloudflare-pricing.json";
import { MAX_OUTPUT_TOKENS, type ModelId } from "../../config/models";
import type { Usage } from "./gateway";

const Rate = z.number().finite().nonnegative();
const Pricing = z.object({
  version: z.literal("s3-cloudflare-pricing-v1"),
  purchase_fee_fraction: z.literal(0.05),
  models: z.record(
    z.string(),
    z.object({
      verified_at: z.string().datetime(),
      source: z
        .string()
        .url()
        .startsWith("https://developers.cloudflare.com/ai/models/openai/"),
      inputPerMillion: Rate,
      outputPerMillion: Rate,
      cachedInputPerMillion: Rate,
      cacheWritePerMillion: Rate,
    }),
  ),
});
export function verifyCloudflarePricing(
  ids: readonly string[],
  raw: unknown = prices,
  now = Date.now(),
) {
  const p = Pricing.parse(raw);
  if (
    !ids.length ||
    ids.some((id) => {
      const r = p.models[id];
      const age = r ? now - Date.parse(r.verified_at) : Infinity;
      return !id.startsWith("openai/") || !r || age < 0 || age > 86400000;
    })
  )
    throw new Error("cloudflare_prices_pending_or_stale");
  return p;
}
function rate(id: ModelId) {
  const p = Pricing.parse(prices);
  const r = p.models[id];
  if (!r) throw new Error("cloudflare_prices_pending");
  return { r, fee: 1 + p.purchase_fee_fraction };
}
export function estimateCloudflareReservation(id: ModelId, bytes: number) {
  const { r, fee } = rate(id);
  return (
    (((bytes + 4096) * Math.max(r.inputPerMillion, r.cacheWritePerMillion) +
      MAX_OUTPUT_TOKENS * r.outputPerMillion) /
      1e6) *
    fee
  );
}
export function calculateCloudflareCost(id: ModelId, u: Usage) {
  const { r, fee } = rate(id);
  return (
    ((Math.max(0, u.input - u.cached - u.cacheWrite) * r.inputPerMillion +
      u.cached * r.cachedInputPerMillion +
      u.cacheWrite * r.cacheWritePerMillion +
      u.output * r.outputPerMillion) /
      1e6) *
    fee
  );
}
