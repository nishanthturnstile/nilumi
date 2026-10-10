import { randomUUID } from "node:crypto";
import {
  type FileHandle,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
} from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { z } from "zod";

export const CAPS = {
  s4: 50_000_000,
  vgw: 1_000_000,
  "vgw-followup": 1_050_000,
} as const;
export type Scope = keyof typeof CAPS;
const Amount = z.number().int().nonnegative().safe();
const Entry = z
  .object({
    id: z.string().min(1).max(160),
    allowance: Amount.positive(),
    charged: Amount,
    state: z.enum(["reserved", "settled"]),
    at: z.string().datetime(),
  })
  .strict();
const LedgerSchema = z
  .object({
    version: z.literal(1),
    scope: z.enum(["s4", "vgw", "vgw-followup"]),
    cap: Amount,
    entries: z.array(Entry).max(1000),
  })
  .strict();
export type Ledger = z.infer<typeof LedgerSchema>;

export class VerificationError extends Error {
  constructor(
    public code: string,
    public status = 503,
  ) {
    super(code);
  }
}
export const spent = (ledger: Ledger) =>
  ledger.entries.reduce((sum, entry) => sum + entry.charged, 0);

export type AtomicFileTiming = Partial<
  Record<
    | "serializeMs"
    | "openMs"
    | "writeMs"
    | "syncMs"
    | "closeMs"
    | "renameMs"
    | "directoryOpenMs"
    | "directorySyncMs"
    | "directoryCloseMs",
    number
  >
>;
export type LedgerTiming = {
  lockDurability?: "diagnostic-only" | "flushed";
  stages: Partial<
    Record<
      | "lockAcquireMs"
      | "lockWriteMs"
      | "lockSyncMs"
      | "readMs"
      | "parseValidateMs"
      | "callbackMs"
      | "lockCloseMs"
      | "lockRemoveMs",
      number
    >
  >;
  saveCount: number;
  saves: AtomicFileTiming[];
};
async function measure<T>(
  marks: Partial<Record<string, number>> | undefined,
  key: string,
  run: () => Promise<T>,
): Promise<T> {
  if (!marks) return run();
  const started = performance.now();
  try {
    return await run();
  } finally {
    marks[key] = (marks[key] ?? 0) + performance.now() - started;
  }
}
export async function atomicFile(
  path: string,
  data: string | Uint8Array,
  timing?: AtomicFileTiming,
) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const file = await measure(timing, "openMs", () =>
    open(temporary, "wx", 0o600),
  );
  try {
    await measure(timing, "writeMs", () => file.writeFile(data));
    await measure(timing, "syncMs", () => file.sync());
  } finally {
    await measure(timing, "closeMs", () => file.close());
  }
  await measure(timing, "renameMs", () => rename(temporary, path));
  const parent = await measure(timing, "directoryOpenMs", () =>
    open(join(path, ".."), "r"),
  );
  try {
    await measure(timing, "directorySyncMs", () => parent.sync());
  } finally {
    await measure(timing, "directoryCloseMs", () => parent.close());
  }
}

export function validateLedger(raw: unknown, scope: Scope): Ledger {
  const ledger = LedgerSchema.parse(raw);
  if (
    ledger.scope !== scope ||
    ledger.cap !== CAPS[scope] ||
    new Set(ledger.entries.map((entry) => entry.id)).size !==
      ledger.entries.length ||
    ledger.entries.some(
      (entry) =>
        entry.state === "reserved" && entry.charged !== entry.allowance,
    )
  )
    throw new VerificationError("invalid_ledger");
  return ledger;
}

// Initialization is explicit and exclusive. Paid paths never create a missing ledger.
export async function initializeLedger(directory: string, scope: Scope) {
  if (!isAbsolute(directory))
    throw new VerificationError("absolute_state_directory_required");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = await open(join(directory, `${scope}-budget.json`), "wx", 0o600);
  try {
    await file.writeFile(
      JSON.stringify({ version: 1, scope, cap: CAPS[scope], entries: [] }),
    );
    await file.sync();
  } finally {
    await file.close();
  }
  const parent = await open(directory, "r");
  try {
    await parent.sync();
  } finally {
    await parent.close();
  }
}

export async function withLedger<T>(
  directory: string,
  scope: Scope,
  run: (ledger: Ledger, save: () => Promise<void>) => Promise<T>,
  timing?: LedgerTiming,
): Promise<T> {
  if (!isAbsolute(directory))
    throw new VerificationError("absolute_state_directory_required");
  const lockPath = join(directory, `${scope}-budget.lock`);
  let lock: FileHandle;
  try {
    lock = await measure(timing?.stages, "lockAcquireMs", () =>
      open(lockPath, "wx", 0o600),
    );
  } catch {
    throw new VerificationError("ledger_unavailable_or_busy", 409);
  }
  try {
    // The lock's existence grants exclusivity; PID/time are diagnostic only.
    // S4 never reclaims a lock from its contents. Spending still becomes durable
    // via the reservation file AND parent-directory sync before any dispatch.
    // Keep the canary's original lock-content flushing policy unchanged.
    if (timing)
      timing.lockDurability = scope === "s4" ? "diagnostic-only" : "flushed";
    await measure(timing?.stages, "lockWriteMs", () =>
      lock.writeFile(
        JSON.stringify({ pid: process.pid, at: new Date().toISOString() }),
      ),
    );
    if (scope !== "s4")
      await measure(timing?.stages, "lockSyncMs", () => lock.sync());
    let ledger: Ledger;
    try {
      const raw = await measure(timing?.stages, "readMs", () =>
        readFile(join(directory, `${scope}-budget.json`), "utf8"),
      );
      const parsing = performance.now();
      try {
        ledger = validateLedger(JSON.parse(raw), scope);
      } finally {
        if (timing) timing.stages.parseValidateMs = performance.now() - parsing;
      }
    } catch {
      throw new VerificationError("ledger_missing_or_invalid");
    }
    return await measure(timing?.stages, "callbackMs", () =>
      run(ledger, async () => {
        let saveTiming: AtomicFileTiming | undefined;
        if (timing) {
          timing.saveCount++;
          // The voice reservation saves once; diagnostics stay bounded for other callers.
          if (timing.saves.length < 4) {
            saveTiming = {};
            timing.saves.push(saveTiming);
          }
        }
        const serializing = performance.now();
        const serialized = JSON.stringify(ledger);
        if (saveTiming)
          saveTiming.serializeMs = performance.now() - serializing;
        await atomicFile(
          join(directory, `${scope}-budget.json`),
          serialized,
          saveTiming,
        );
      }),
    );
  } finally {
    await measure(timing?.stages, "lockCloseMs", () => lock.close());
    await measure(timing?.stages, "lockRemoveMs", () => unlink(lockPath));
  }
}

export function reserve(ledger: Ledger, id: string, allowance: number) {
  if (
    !Number.isSafeInteger(allowance) ||
    allowance <= 0 ||
    ledger.entries.some((entry) => entry.id === id)
  )
    throw new VerificationError("invalid_or_replayed_reservation");
  if (spent(ledger) + allowance > CAPS[ledger.scope])
    throw new VerificationError("hard_cap_reached", 402);
  ledger.entries.push({
    id,
    allowance,
    charged: allowance,
    state: "reserved",
    at: new Date().toISOString(),
  });
}

export function settle(ledger: Ledger, id: string, charge: number | undefined) {
  const entry = ledger.entries.find((entry) => entry.id === id);
  if (!entry || entry.state !== "reserved")
    throw new VerificationError("invalid_settlement");
  // Unknown charges retain the complete reservation, including after a crash.
  if (charge === undefined) return;
  if (!Number.isSafeInteger(charge) || charge < 0)
    throw new VerificationError("invalid_charge");
  entry.charged = charge;
  entry.state = "settled";
}
