import {
  MAX_OUTPUT_TOKENS,
  MODELS,
  MONTH_CAP_USD,
  type ModelId,
  TEST_CAP_USD,
} from "../../config/models";
import type { Usage } from "./gateway";
export const BUDGET_VERSION = 1;
export type Reservation = {
  id: string;
  month: string;
  allowance: number;
  charged: number;
  state: "reserved" | "settled";
  basis: "reservation" | "reported" | "estimated";
};
export type Ledger = {
  version: 1;
  monthCap: number;
  testCap: number;
  entries: Reservation[];
};
export function freshLedger(): Ledger {
  return {
    version: 1,
    monthCap: MONTH_CAP_USD,
    testCap: TEST_CAP_USD,
    entries: [],
  };
}
export function estimateReservation(
  modelId: ModelId,
  promptBytes: number,
): number {
  const m = MODELS[modelId];
  // UTF-8 bytes upper-bound text tokens; include a second schema copy + envelope.
  // Cache writes may cost more than uncached input; never budget cache hits.
  return (
    ((promptBytes + 4096) *
      Math.max(m.inputPerMillion, m.cacheWritePerMillion) +
      MAX_OUTPUT_TOKENS * m.outputPerMillion) /
    1e6
  );
}
export function calculateCost(modelId: ModelId, u: Usage): number {
  const m = MODELS[modelId];
  return (
    (Math.max(0, u.input - u.cached - u.cacheWrite) * m.inputPerMillion +
      u.cached * m.cachedInputPerMillion +
      u.cacheWrite * m.cacheWritePerMillion +
      u.output * m.outputPerMillion) /
    1e6
  );
}
export function reserve(
  ledger: Ledger,
  id: string,
  month: string,
  allowance: number,
) {
  if (
    !Number.isFinite(allowance) ||
    allowance <= 0 ||
    ledger.entries.some((x) => x.id === id)
  )
    throw new Error("invalid_reservation");
  const monthSpend = ledger.entries
    .filter((x) => x.month === month)
    .reduce((n, x) => n + x.charged, 0);
  const testSpend = ledger.entries.reduce((n, x) => n + x.charged, 0);
  if (
    monthSpend + allowance > Math.min(ledger.monthCap, MONTH_CAP_USD) ||
    testSpend + allowance > Math.min(ledger.testCap, TEST_CAP_USD)
  )
    return false;
  ledger.entries.push({
    id,
    month,
    allowance,
    charged: allowance,
    state: "reserved",
    basis: "reservation",
  });
  return true;
}
export function settle(
  ledger: Ledger,
  id: string,
  charge: number | undefined,
  basis: "reported" | "estimated",
) {
  const entry = ledger.entries.find((x) => x.id === id);
  if (!entry || entry.state !== "reserved")
    throw new Error("invalid_settlement");
  if (charge === undefined || !Number.isFinite(charge) || charge < 0) return;
  entry.charged = charge;
  entry.state = "settled";
  entry.basis = basis;
}
export function validateLedger(raw: unknown): Ledger {
  if (!raw || typeof raw !== "object") throw new Error("invalid_ledger");
  const l = raw as Ledger;
  if (
    l.version !== 1 ||
    l.monthCap !== MONTH_CAP_USD ||
    l.testCap !== TEST_CAP_USD ||
    !Array.isArray(l.entries)
  )
    throw new Error("invalid_ledger");
  const ids = new Set<string>();
  for (const e of l.entries) {
    if (
      typeof e.id !== "string" ||
      ids.has(e.id) ||
      !/^\d{4}-\d{2}$/.test(e.month) ||
      !Number.isFinite(e.charged) ||
      e.charged < 0 ||
      !Number.isFinite(e.allowance) ||
      e.allowance <= 0 ||
      !["reserved", "settled"].includes(e.state) ||
      !["reservation", "reported", "estimated"].includes(e.basis)
    )
      throw new Error("invalid_ledger");
    ids.add(e.id);
  }
  return l;
}
