import { createHash } from "node:crypto";
import { z } from "zod";
import { CANARY_FIXTURES } from "../../config/gateway-roles";
import { VerificationError } from "../verification/ledger";

export const CANARY_VERSION = "vgw-controls-v3";
export const fixtureHash = () =>
  createHash("sha256").update(JSON.stringify(CANARY_FIXTURES)).digest("hex");
export const credentialHash = (key: string) =>
  createHash("sha256").update(key).digest("hex");
const Id = z.string().min(1).max(160);
const Dollars = z.number().finite().nonnegative();
const Budget = z.object({
  keyId: Id,
  teamId: Id,
  attribution: z.literal("team"),
  limitUsd: Dollars,
  refresh: z.enum(["monthly", "none"]),
  alerts: z.array(z.number()),
});
const Preflight = z.object({
  version: z.literal(3),
  checkedAt: z.string().datetime(),
  teamId: Id,
  purchasedCredits: z.literal(true),
  creditBalanceUsd: Dollars.positive(),
  // Conservative validity of purchased credits, not unknown free-credit expiry.
  paidCreditValidThrough: z.string().datetime(),
  creditExpiryEvidence: Id,
  autoTopUpOff: z.literal(true),
  noTeamByok: z.literal(true),
  fixtureHash: z.literal(fixtureHash()),
  teamBudget: z.object({
    limitUsd: z.literal(10),
    refresh: z.literal("monthly"),
    alerts: z.array(z.number()),
  }),
  runtimeBudget: Budget,
  evaluationBudget: Budget,
  s3CountedUsd: Dollars.max(2),
  s3LedgerEvidence: Id,
  canaryBudget: Budget,
  // Creation/readback gates all probes; lowering/readback gates quota only.
  canaryBudgetVerified: z.literal(true),
  negativeRouteVerified: z.literal(true),
  negativeProfile: z.enum(["arcee", "schematron"]).optional(),
  negativeMode: z.literal("streaming").optional(),
  quotaReadback: z
    .object({
      keyId: Id,
      limitUsd: Dollars,
      spendUsd: Dollars,
      refresh: z.literal("none"),
      editedAt: z.string().datetime(),
      checkedAt: z.string().datetime(),
    })
    .nullable(),
});
export type CanaryPreflight = z.infer<typeof Preflight>;
export function preflightStatus(raw: unknown, now = Date.now()) {
  const parsed = Preflight.safeParse(raw);
  if (!parsed.success)
    return {
      ready: false,
      pending: [
        ...new Set(parsed.error.issues.map((issue) => issue.path.join("."))),
      ],
    };
  try {
    requirePreflight(raw, now);
    return { ready: true, pending: [] };
  } catch {
    return { ready: false, pending: ["budget_identity_expiry_or_readback"] };
  }
}
const alertSet = (alerts: number[]) =>
  alerts.length === 3 && [50, 75, 100].every((n) => alerts.includes(n));
export function requirePreflight(raw: unknown, now = Date.now()) {
  const parsed = Preflight.safeParse(raw);
  if (!parsed.success) throw new VerificationError("account_preflight_pending");
  const config = parsed.data;
  const age = now - Date.parse(config.checkedAt);
  const budgets = [
    config.runtimeBudget,
    config.evaluationBudget,
    config.canaryBudget,
  ];
  if (
    age < 0 ||
    age > 24 * 60 * 60 * 1000 ||
    Date.parse(config.paidCreditValidThrough) <= now ||
    !alertSet(config.teamBudget.alerts) ||
    !alertSet(config.runtimeBudget.alerts) ||
    budgets.some((budget) => budget.teamId !== config.teamId) ||
    new Set(budgets.map((budget) => budget.keyId)).size !== 3 ||
    config.runtimeBudget.limitUsd !== 8 ||
    config.runtimeBudget.refresh !== "monthly" ||
    config.evaluationBudget.refresh !== "none" ||
    Math.abs(config.evaluationBudget.limitUsd - (2 - config.s3CountedUsd)) >
      1e-9 ||
    config.canaryBudget.limitUsd !== 1 ||
    config.canaryBudget.refresh !== "none"
  )
    throw new VerificationError("account_preflight_pending");
  return config;
}
export function requireQuotaReadback(
  config: CanaryPreflight,
  lastProbeAt: string,
  countedUsd: number,
  now = Date.now(),
) {
  const readback = config.quotaReadback;
  if (
    !readback ||
    readback.keyId !== config.canaryBudget.keyId ||
    readback.limitUsd !== readback.spendUsd ||
    readback.spendUsd > countedUsd ||
    Date.parse(readback.editedAt) < Date.parse(lastProbeAt) ||
    // Use the documented worst-case propagation window, without blocking sleep.
    Date.parse(readback.checkedAt) - Date.parse(readback.editedAt) < 300_000 ||
    Date.parse(readback.checkedAt) > now ||
    now - Date.parse(readback.checkedAt) > 24 * 60 * 60 * 1000
  )
    throw new VerificationError("quota_readback_pending");
}
