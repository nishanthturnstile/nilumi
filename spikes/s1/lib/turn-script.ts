export type ScriptItem =
  | { kind: "sentence"; seq: number; text: string; delayMs: number }
  | { kind: "speech"; seq: number; delayMs: number };

// Canned turn: two sentences, each with speech.ready. No AI calls — spike only.
export const SSE_SCRIPT: ScriptItem[] = [
  { kind: "sentence", seq: 1, text: "Added milk to the shopping list.", delayMs: 400 },
  { kind: "speech", seq: 1, delayMs: 300 },
  { kind: "sentence", seq: 2, text: "Anything else?", delayMs: 1200 },
  { kind: "speech", seq: 2, delayMs: 300 },
];
