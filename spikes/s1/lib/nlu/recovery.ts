import { NluResult } from "./contracts";
// Offline-only rehearsal. The scored Gateway adapter never invokes this wrapper.
// The future runtime may repair a schema once and then try an approved challenger.
export async function rehearseRecovery(deps: {
  primary: () => Promise<unknown>;
  repair: () => Promise<unknown>;
  challenger: () => Promise<unknown>;
}) {
  const attempts: string[] = [];
  for (const [name, call] of [
    ["primary", deps.primary],
    ["repair", deps.repair],
    ["challenger", deps.challenger],
  ] as const) {
    attempts.push(name);
    try {
      const raw = await call();
      const parsed = NluResult.safeParse(raw);
      if (parsed.success)
        return {
          evidence: "offline_only" as const,
          attempts,
          result: parsed.data,
        };
    } catch {
      /* Error content is intentionally discarded. */
    }
  }
  return { evidence: "offline_only" as const, attempts, result: null };
}
