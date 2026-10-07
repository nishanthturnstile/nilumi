import type { EvaluationMode } from "./nlu-policy";

export const MODEL_CONFIG_VERSION = "s3-openai-challengers-v4";
export const MODELS = {
  "openai/gpt-6-luna": {
    role: "validation",
    provider: "openai",
    reasoningEffort: "low",
    inputPerMillion: 0.1,
    outputPerMillion: 0.5,
    cachedInputPerMillion: 0.01,
    cacheWritePerMillion: 0.125,
  },
  "openai/gpt-5-nano": {
    role: "cost_challenger",
    provider: "openai",
    reasoningEffort: "low",
    inputPerMillion: 0.05,
    outputPerMillion: 0.4,
    cachedInputPerMillion: 0.005,
    cacheWritePerMillion: 0,
  },
  "openai/gpt-4.1-nano": {
    role: "latency_challenger",
    provider: "openai",
    reasoningEffort: null,
    inputPerMillion: 0.1,
    outputPerMillion: 0.4,
    cachedInputPerMillion: 0.025,
    cacheWritePerMillion: 0,
  },
  "openai/gpt-4.1-mini": {
    role: "accuracy_challenger",
    provider: "openai",
    reasoningEffort: null,
    inputPerMillion: 0.4,
    outputPerMillion: 1.6,
    cachedInputPerMillion: 0.1,
    cacheWritePerMillion: 0,
  },
} as const;
export type ModelId = keyof typeof MODELS;
export const DEFAULT_MODEL: ModelId = "openai/gpt-6-luna";
export const MAX_OUTPUT_TOKENS = 4096;
export const TIMEOUT_MS = 5000;
export const TEST_CAP_USD = 0.5;
export const MONTH_CAP_USD = 5;
export const PRICE_VERIFIED_AT = "2026-10-07";
export const PRICE_SOURCE = "https://ai-gateway.vercel.sh/v1/models";
// No tool use, search, images, priority tiers, repair or fallback calls.
export function modelOptions(id: ModelId, mode: EvaluationMode = "zdr") {
  if (mode !== "zdr" && mode !== "synthetic_hobby")
    throw new Error("invalid_evaluation_mode");
  return {
    gateway: {
      only: [MODELS[id].provider],
      ...(mode === "zdr" ? { zeroDataRetention: true } : {}),
      disallowPromptTraining: true,
    },
    openai: {
      ...(MODELS[id].reasoningEffort === null
        ? {}
        : { reasoningEffort: MODELS[id].reasoningEffort }),
      store: false,
    },
  };
}
