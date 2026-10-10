import { createGatewayProvider } from "@ai-sdk/gateway";
import { embed, generateText, streamText } from "ai";
import {
  CANARY_FIXTURES,
  GATEWAY_ROLES,
  type GatewayRole,
  NEGATIVE_CANARY_PROFILES,
  QUOTA_CANARY,
} from "../../config/gateway-roles";
import { detectSensitive } from "../nlu/sensitive";
import { VerificationError } from "../verification/ledger";
import {
  type Acknowledgement,
  GatewayRequestError,
  type GatewayState,
  gatewayFailure,
  requireAcknowledgement,
  routingReceipt,
} from "./policy";

type Dependencies = {
  key: string;
  state: GatewayState;
  reserve(role: GatewayRole, input: string): Promise<void>;
  acknowledgement(): Promise<Acknowledgement | null>;
  verificationPassed(): Promise<boolean>;
  routeAllowed?(role: GatewayRole): Promise<boolean>;
  dispatchTransport?(send: () => Promise<Response>): Promise<Response>;
  maxWireBytes?: number;
  // A server-selected, fixture-only capability. Never exposed as a request flag.
  syntheticCanary: boolean;
  negativeProfile?: keyof typeof NEGATIVE_CANARY_PROFILES;
  negativeMode?: "streaming";
  generate?: typeof generateText;
  embed?: typeof embed;
  create?: typeof createGatewayProvider;
  fetch?: typeof fetch;
};

export function createGatewayClient(deps: Dependencies) {
  const create = deps.create ?? createGatewayProvider;
  const transport = deps.fetch ?? fetch;
  async function authorize(role: GatewayRole, input: string, warmup = false) {
    if (detectSensitive(input))
      throw new VerificationError("sensitive_input_refused", 403);
    if (!deps.key) throw new VerificationError("gateway_key_missing");
    if (await deps.state.isTripped(role))
      throw new VerificationError("role_halted");
    if (deps.syntheticCanary) {
      const expected = warmup
        ? QUOTA_CANARY.fixture
        : role === "embed"
          ? CANARY_FIXTURES.embedding
          : CANARY_FIXTURES.chat;
      if (input !== expected)
        throw new VerificationError("canary_fixture_required", 403);
    } else {
      if ((await deps.verificationPassed()) !== true)
        throw new VerificationError("gateway_verification_required", 403);
      requireAcknowledgement(await deps.acknowledgement());
      if (!deps.routeAllowed || !(await deps.routeAllowed(role)))
        throw new VerificationError("route_policy_unverified", 503);
    }
  }
  async function dispatch(
    role: GatewayRole,
    input: string,
    signal: AbortSignal,
    negative = false,
    warmup = false,
  ) {
    if ((negative || warmup) && !deps.syntheticCanary)
      throw new VerificationError("canary_fixture_required", 403);
    await authorize(role, input, warmup);
    signal.throwIfAborted();
    try {
      await deps.reserve(role, input);
    } catch (error) {
      if (
        error instanceof VerificationError &&
        error.code === "hard_cap_reached"
      )
        await deps.state.trip(role, error.code);
      throw error;
    }
    // Re-check queued work immediately before dispatch, including withdrawal.
    await authorize(role, input, warmup);
    signal.throwIfAborted();
    const route = negative
      ? NEGATIVE_CANARY_PROFILES[deps.negativeProfile ?? "arcee"]
      : warmup
        ? QUOTA_CANARY
        : GATEWAY_ROLES[role];
    const providerOptions = {
      gateway: { disallowPromptTraining: true, only: [...route.providers] },
      ...(!negative
        ? {
            openai:
              role === "embed"
                ? { dimensions: 768 }
                : { store: false, reasoningEffort: warmup ? "none" : "low" },
          }
        : {}),
    };
    let localFailure: VerificationError | null = null;
    const guardedTransport: typeof fetch = async (url, request) => {
      try {
        if (
          !deps.syntheticCanary &&
          deps.maxWireBytes !== undefined &&
          (typeof request?.body !== "string" ||
            new TextEncoder().encode(request.body).length > deps.maxWireBytes)
        )
          throw new VerificationError("gateway_payload_exceeds_reservation");
        if (
          warmup &&
          (typeof request?.body !== "string" ||
            new TextEncoder().encode(request.body).length >
              QUOTA_CANARY.maxWireBytes)
        )
          throw new VerificationError("quota_payload_exceeds_manifest");
        if (!deps.syntheticCanary) {
          await authorize(role, input);
          signal.throwIfAborted();
        }
        const send = () => transport(url, request);
        return await (!deps.syntheticCanary && deps.dispatchTransport
          ? deps.dispatchTransport(send)
          : send());
      } catch (error) {
        if (error instanceof VerificationError) localFailure = error;
        throw error;
      }
    };
    const gateway = create({
      apiKey: deps.key,
      fetch: warmup || !deps.syntheticCanary ? guardedTransport : transport,
    });
    const started = performance.now();
    try {
      async function streamingNegative() {
        const stream = streamText({
          model: gateway(route.model),
          prompt: input,
          providerOptions,
          maxOutputTokens: 32,
          maxRetries: 0,
          abortSignal: signal,
          onError: () => {},
        });
        for await (const part of stream.fullStream) {
          if (part.type === "error") throw part.error;
        }
        return { providerMetadata: await stream.providerMetadata };
      }
      const result =
        role === "embed"
          ? await (deps.embed ?? embed)({
              model: gateway.embeddingModel(route.model),
              value: input,
              providerOptions,
              maxRetries: 0,
              abortSignal: signal,
            })
          : negative && deps.negativeMode === "streaming"
            ? await streamingNegative()
            : await (deps.generate ?? generateText)({
                model: gateway(route.model),
                prompt: input,
                providerOptions,
                maxOutputTokens: warmup ? QUOTA_CANARY.maxOutputTokens : 32,
                maxRetries: 0,
                abortSignal: signal,
              });
      const receipt = routingReceipt(
        result.providerMetadata?.gateway,
        route.model,
        route.providers,
      );
      if (receipt.costUsd === undefined)
        throw new VerificationError("routing_cost_missing");
      return { result, receipt, latencyMs: performance.now() - started };
    } catch (caught) {
      const error = localFailure ?? caught;
      const failure =
        error instanceof VerificationError ? null : gatewayFailure(error);
      const reason =
        error instanceof VerificationError ? error.code : failure?.reason;
      if (reason) {
        await deps.state.trip(role, reason);
        if (failure) throw new GatewayRequestError(failure);
        throw new VerificationError(
          reason,
          error instanceof VerificationError ? error.status : 503,
        );
      }
      throw new VerificationError("gateway_request_failed");
    }
  }
  return {
    call: (role: GatewayRole, input: string, signal: AbortSignal) =>
      dispatch(role, input, signal),
    negativeCanary: (signal: AbortSignal) =>
      dispatch("nlu", CANARY_FIXTURES.chat, signal, true),
    quotaWarmup: (signal: AbortSignal) =>
      dispatch("nlu", QUOTA_CANARY.fixture, signal, false, true),
  };
}

// Public metadata only; inference stays inside the wrapper above.
export async function loadGatewayCatalog(fetcher: typeof fetch = fetch) {
  const response = await fetcher("https://ai-gateway.vercel.sh/v1/models", {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new VerificationError("route_catalog_unavailable");
  return (await response.json()).data as unknown;
}
