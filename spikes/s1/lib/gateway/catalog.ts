import { GATEWAY_ROLES, type GatewayRole } from "../../config/gateway-roles";
import { VerificationError } from "../verification/ledger";

type CatalogModel = {
  id: string;
  no_training: string;
  pricing: { input: string; output?: string; input_cache_write?: string };
};
export function approvedCatalogModel(data: unknown, role: GatewayRole) {
  const route = GATEWAY_ROLES[role];
  if (
    !route ||
    route.providers.length !== 1 ||
    route.providers[0] !== "openai" ||
    !Array.isArray(data)
  )
    throw new VerificationError("route_not_approved", 403);
  const model = data.find((m) => m?.id === route.model) as
    | CatalogModel
    | undefined;
  if (!model || model.no_training !== "all")
    throw new VerificationError("route_policy_unverified", 503);
  const input = Math.max(
    Number(model.pricing?.input),
    Number(model.pricing?.input_cache_write ?? 0),
  );
  const output = Number(model.pricing?.output ?? 0);
  if (
    !Number.isFinite(input) ||
    input <= 0 ||
    !Number.isFinite(output) ||
    output < 0 ||
    (role !== "embed" && model.pricing.output === undefined)
  )
    throw new VerificationError("route_pricing_unverified", 503);
  return { input, output };
}

export function createCatalogGuard(
  load: () => Promise<unknown>,
  now = Date.now,
) {
  let snapshot: { data: unknown; checkedAt: number } | null = null;
  let loading: Promise<void> | null = null;
  return async (role: GatewayRole) => {
    if (
      !snapshot ||
      now() - snapshot.checkedAt >= 300000 ||
      now() < snapshot.checkedAt
    ) {
      loading ??= (async () => {
        snapshot = { data: await load(), checkedAt: now() };
      })().finally(() => {
        loading = null;
      });
      await loading;
    }
    if (!snapshot) throw new VerificationError("route_policy_unverified");
    return approvedCatalogModel(snapshot.data, role);
  };
}
