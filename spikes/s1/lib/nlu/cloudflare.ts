import { z } from "zod";
import { MAX_OUTPUT_TOKENS, MODELS, TIMEOUT_MS } from "../../config/models";
import {
  NluResult,
  normalizeProviderOutput,
  type ParsedResult,
  PROVIDER_SCHEMA,
} from "./contracts";
import { type Adapter, SchemaGenerationError, type Usage } from "./gateway";

const Configuration = z.object({
  accountId: z.string().regex(/^[a-f0-9]{32}$/),
  gatewayId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  token: z.string().min(1).regex(/^\S+$/),
});
export function cloudflareConfiguration(env: NodeJS.ProcessEnv = process.env) {
  return Configuration.safeParse({
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    gatewayId: env.CLOUDFLARE_AI_GATEWAY_ID,
    token: env.CLOUDFLARE_API_TOKEN,
  });
}
type Configuration = z.infer<typeof Configuration>;
const Counter = z.number().int().nonnegative();
const ProviderUsage = z.object({
  input_tokens: Counter,
  output_tokens: Counter,
  input_tokens_details: z
    .object({
      cached_tokens: Counter.optional(),
      cache_write_tokens: Counter.optional(),
    })
    .optional(),
  output_tokens_details: z
    .object({ reasoning_tokens: Counter.optional() })
    .optional(),
});
function usageFrom(raw: unknown): Usage | undefined {
  const result = ProviderUsage.safeParse(raw);
  if (!result.success) return undefined;
  const u = result.data;
  const cached = u.input_tokens_details?.cached_tokens ?? 0;
  const cacheWrite = u.input_tokens_details?.cache_write_tokens ?? 0;
  const reasoning = u.output_tokens_details?.reasoning_tokens ?? 0;
  if (cached + cacheWrite > u.input_tokens || reasoning > u.output_tokens)
    return undefined;
  return {
    input: u.input_tokens,
    output: u.output_tokens,
    cached,
    cacheWrite,
    reasoning,
  };
}

// Configuration evidence, not a Vercel-style per-generation routing receipt.
// Read immediately before each inference; unknown settings never authorize a call.
export async function verifyCloudflareRoute(
  configuration: Configuration,
  signal: AbortSignal,
  mode: Parameters<Adapter>[0]["evaluationMode"],
  fetcher: typeof fetch = fetch,
) {
  const c = Configuration.parse(configuration);
  const root = `https://api.cloudflare.com/client/v4/accounts/${c.accountId}/ai-gateway/gateways/${c.gatewayId}`;
  const options = {
    headers: { Authorization: `Bearer ${c.token}` },
    signal,
    redirect: "error" as const,
    cache: "no-store" as const,
  };
  const responses = await Promise.all([
    fetcher(root, options),
    fetcher(`${root}/provider_configs?per_page=100`, options),
  ]);
  if (responses.some((r) => !r.ok))
    throw new Error("cloudflare_route_verification_failed");
  const [settings, keys] = await Promise.all(responses.map((r) => r.json()));
  if (
    settings.success !== true ||
    settings.result?.id !== c.gatewayId ||
    settings.result.collect_logs !== false ||
    settings.result.authentication !== true ||
    settings.result.cache_ttl !== 0 ||
    settings.result.byok_only !== false ||
    (mode !== "synthetic_hobby" && settings.result.zdr !== true) ||
    keys.success !== true ||
    !Array.isArray(keys.result) ||
    keys.result.length !== 0 ||
    (keys.result_info?.total_count !== undefined &&
      keys.result_info.total_count !== 0)
  )
    throw new Error("cloudflare_route_privacy_pending");
}

export async function callCloudflare(
  args: Parameters<Adapter>[0],
  configuration: Configuration,
  fetcher: typeof fetch = fetch,
) {
  const c = Configuration.parse(configuration);
  if (
    !Object.hasOwn(MODELS, args.modelId) ||
    ![undefined, "zdr", "synthetic_hobby"].includes(args.evaluationMode)
  )
    throw new Error("invalid_cloudflare_selection");
  const started = performance.now();
  const signal = AbortSignal.any([
    args.signal,
    AbortSignal.timeout(TIMEOUT_MS),
  ]);
  signal.throwIfAborted();
  await verifyCloudflareRoute(c, signal, args.evaluationMode, fetcher);
  signal.throwIfAborted();
  const effort = MODELS[args.modelId].reasoningEffort;
  const response = await fetcher(
    `https://api.cloudflare.com/client/v4/accounts/${c.accountId}/ai/v1/responses`,
    {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal,
      headers: {
        Authorization: `Bearer ${c.token}`,
        "Content-Type": "application/json",
        "cf-aig-gateway-id": c.gatewayId,
        "cf-aig-collect-log": "false",
        "cf-aig-collect-log-payload": "false",
        "cf-aig-skip-cache": "true",
        "cf-aig-max-attempts": "1",
        "cf-aig-request-timeout": String(TIMEOUT_MS),
      },
      body: JSON.stringify({
        model: args.modelId,
        instructions: args.system,
        input: [{ role: "user", content: args.prompt }],
        store: false,
        background: false,
        stream: false,
        tools: [],
        tool_choice: "none",
        max_output_tokens: MAX_OUTPUT_TOKENS,
        ...(effort === null ? {} : { reasoning: { effort } }),
        text: {
          format: {
            type: "json_schema",
            name: "nlu_result",
            strict: true,
            schema: PROVIDER_SCHEMA,
          },
        },
      }),
    },
  );
  // Never include provider bodies or credentials in an exception or report.
  if (!response.ok) throw new Error("cloudflare_inference_failed");
  const data = await response.json();
  signal.throwIfAborted();
  const usage = usageFrom(data.usage);
  const returnedModel =
    data.model === args.modelId ||
    data.model === args.modelId.slice("openai/".length);
  if (!returnedModel) throw new Error("cloudflare_model_mismatch");
  if (data.status !== "completed" || !Array.isArray(data.output))
    throw new SchemaGenerationError(usage);
  const messages = data.output.filter(
    (x: { type?: string }) => x.type === "message",
  );
  if (
    data.output.some(
      (x: { type?: string }) =>
        !["reasoning", "message"].includes(x.type ?? ""),
    ) ||
    messages.length !== 1 ||
    messages[0].role !== "assistant" ||
    messages[0].status !== "completed" ||
    !Array.isArray(messages[0].content) ||
    messages[0].content.length !== 1 ||
    messages[0].content[0].type !== "output_text" ||
    typeof messages[0].content[0].text !== "string"
  )
    throw new SchemaGenerationError(usage);
  let raw: ParsedResult;
  try {
    raw = NluResult.parse(
      normalizeProviderOutput(JSON.parse(messages[0].content[0].text)),
    );
  } catch {
    throw new SchemaGenerationError(usage);
  }
  return {
    raw,
    usage,
    latencyMs: performance.now() - started,
    routedProvider: "openai",
    routedModel: args.modelId,
    isByok: false,
    routingEvidence: "cloudflare_configuration_and_response_model" as const,
    generationId: typeof data.id === "string" ? data.id : undefined,
  };
}
export const cloudflareAdapter: Adapter = (args) => {
  const configuration = cloudflareConfiguration();
  if (!configuration.success)
    throw new Error("missing_cloudflare_configuration");
  return callCloudflare(args, configuration.data);
};
