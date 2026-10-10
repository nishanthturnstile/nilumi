export const GATEWAY_ROLES = {
  nlu: {
    model: "openai/gpt-6-luna",
    providers: ["openai"],
    storeSupported: true,
  },
  answer: {
    model: "openai/gpt-6-luna",
    providers: ["openai"],
    storeSupported: true,
  },
  embed: {
    model: "openai/text-embedding-3-small",
    providers: ["openai"],
    storeSupported: false,
  },
} as const;
export type GatewayRole = keyof typeof GATEWAY_ROLES;
// A policy-ineligible route used only by the synthetic negative canary.
// Its model/provider pairing is documented by Vercel; never a runtime fallback.
export const NEGATIVE_CANARY_ROUTE = {
  model: "arcee-ai/trinity-large-thinking",
  providers: ["arcee-ai"],
  storeSupported: false,
} as const;
export const NEGATIVE_CANARY_PROFILES = {
  arcee: NEGATIVE_CANARY_ROUTE,
  schematron: {
    model: "inference-net/schematron-v2-small",
    providers: ["inference-net"],
    storeSupported: false,
  },
} as const;
export const CANARY_FIXTURES = {
  chat: "Reply with the single word moon.",
  embedding: "A synthetic shopping list contains rice and milk.",
} as const;
// Synthetic quota workload only; never a runtime role or fallback.
export const QUOTA_CANARY = {
  model: "openai/gpt-5.5",
  providers: ["openai"],
  storeSupported: true,
  fixture:
    "Output integers 1 through 20000, comma-separated, with no other text.",
  maxOutputTokens: 224,
  maxWireBytes: 512,
} as const;
