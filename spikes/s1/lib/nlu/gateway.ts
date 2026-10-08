import { createGatewayProvider } from "@ai-sdk/gateway";
import {
  generateText,
  type JSONSchema7,
  jsonSchema,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
} from "ai";
import { z } from "zod";
import {
  MAX_OUTPUT_TOKENS,
  type ModelId,
  modelOptions,
} from "../../config/models";
import type { EvaluationMode } from "../../config/nlu-policy";
import {
  NluResult,
  normalizeProviderOutput,
  type ParsedResult,
  PROVIDER_SCHEMA,
} from "./contracts";

export type Usage = {
  input: number;
  output: number;
  cached: number;
  cacheWrite: number;
  reasoning: number;
};
export type ModelResponse = {
  raw: unknown;
  latencyMs?: number;
  metadata?: () => Promise<Partial<ModelResponse>>;
  usage?: Usage;
  cost?: number;
  routedProvider?: string;
  routedModel?: string;
  isByok?: boolean;
  generationId?: string;
  routingEvidence?: "cloudflare_configuration_and_response_model";
};
export type Adapter = (args: {
  modelId: ModelId;
  system: string;
  prompt: string;
  signal: AbortSignal;
  evaluationMode?: EvaluationMode;
}) => Promise<ModelResponse>;
export class SchemaGenerationError extends Error {
  constructor(public usage?: Usage) {
    super("schema_generation_failed");
  }
}
const RoutingReceipt = z.object({
  originalModelId: z.string(),
  canonicalSlug: z.string(),
  finalProvider: z.string(),
  modelAttemptCount: z.literal(1),
  totalProviderAttemptCount: z.literal(1),
  modelAttempts: z.tuple([
    z.object({
      canonicalSlug: z.string(),
      success: z.literal(true),
      providerAttemptCount: z.literal(1),
      providerAttempts: z.tuple([
        z.object({
          provider: z.string(),
          credentialType: z.enum(["system", "byok"]),
          success: z.literal(true),
        }),
      ]),
    }),
  ]),
});
export function inlineReceipt(metadata: unknown): Partial<ModelResponse> {
  if (!metadata || typeof metadata !== "object") return {};
  const m = metadata as Record<string, unknown>;
  const parsed = RoutingReceipt.safeParse(m.routing);
  if (!parsed.success || m.enabledDisallowPromptTraining !== true) return {};
  const route = parsed.data;
  const model = route.modelAttempts[0];
  const attempt = model.providerAttempts[0];
  if (
    route.originalModelId !== route.canonicalSlug ||
    model.canonicalSlug !== route.canonicalSlug ||
    attempt.provider !== route.finalProvider
  )
    return {};
  const cost =
    typeof m.cost === "number" ||
    (typeof m.cost === "string" && m.cost.trim() !== "")
      ? Number(m.cost)
      : NaN;
  return {
    routedProvider: route.finalProvider,
    routedModel: route.canonicalSlug,
    isByok: attempt.credentialType === "byok",
    ...(Number.isFinite(cost) && cost >= 0 ? { cost } : {}),
  };
}
export async function callGateway(
  args: Parameters<Adapter>[0],
  generate: typeof generateText = generateText,
  create: typeof createGatewayProvider = createGatewayProvider,
) {
  const { modelId, system, prompt, signal } = args;
  const gateway = create({
    apiKey: process.env.AI_GATEWAY_API_KEY,
  });
  const started = performance.now();
  let result: Awaited<ReturnType<typeof generateText>>;
  try {
    result = await generate({
      model: gateway(modelId),
      system,
      prompt,
      output: Output.object({
        // Zod emits draft-7 here; its broader declared type also permits older drafts.
        schema: jsonSchema<ParsedResult>(PROVIDER_SCHEMA as JSONSchema7, {
          validate: async (value) => {
            const parsed = NluResult.safeParse(normalizeProviderOutput(value));
            return parsed.success
              ? { success: true, value: parsed.data }
              : { success: false, error: parsed.error };
          },
        }),
      }),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      maxRetries: 0,
      abortSignal: signal,
      providerOptions: modelOptions(modelId, args.evaluationMode),
    });
  } catch (error) {
    if (
      NoObjectGeneratedError.isInstance(error) ||
      NoOutputGeneratedError.isInstance(error)
    )
      throw new SchemaGenerationError();
    throw error;
  }
  const latencyMs = performance.now() - started;
  const u = result.usage;
  const usage =
    u.inputTokens !== undefined && u.outputTokens !== undefined
      ? {
          input: u.inputTokens,
          output: u.outputTokens,
          cached: u.inputTokenDetails?.cacheReadTokens ?? 0,
          cacheWrite: u.inputTokenDetails?.cacheWriteTokens ?? 0,
          reasoning: u.outputTokenDetails?.reasoningTokens ?? 0,
        }
      : undefined;
  const gatewayMetadata = result.providerMetadata?.gateway;
  const receipt = inlineReceipt(gatewayMetadata);
  const generationId = gatewayMetadata?.generationId;
  const metadata =
    typeof generationId === "string" && gatewayMetadata?.routing === undefined
      ? async () => {
          const g = await gateway.getGenerationInfo({ id: generationId });
          return {
            cost: g.totalCost,
            routedProvider: g.providerName,
            routedModel: g.model,
            isByok: g.isByok,
            generationId,
          };
        }
      : undefined;
  return {
    ...receipt,
    raw: result.output,
    usage,
    latencyMs,
    generationId: typeof generationId === "string" ? generationId : undefined,
    metadata,
  };
}
// Historical Vercel implementation retained for receipt regression tests.
// Runtime selects a gateway explicitly; there is no cross-gateway fallback.
