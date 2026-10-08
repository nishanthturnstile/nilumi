import { randomUUID } from "node:crypto";
import { z } from "zod";
import cloudflarePrivacy from "../../config/cloudflare-privacy.json";
import {
  MODEL_CONFIG_VERSION,
  MODELS,
  type ModelId,
  TIMEOUT_MS,
} from "../../config/models";
import { gatewayTransport } from "../../config/nlu-gateway";
import {
  type EvaluationMode,
  evaluationDisclosure,
  evaluationMode,
  SYNTHETIC_FIXTURE_SHA256,
} from "../../config/nlu-policy";
import vercelPrivacy from "../../config/nlu-privacy.json";
import { calculateCost } from "./budget";
import { callCloudflare, cloudflareConfiguration } from "./cloudflare";
import {
  calculateCloudflareCost,
  verifyCloudflarePricing,
} from "./cloudflare-pricing";
import { FIXTURE_VERSION, REGISTRY_VERSION } from "./context";
import { CONTRACT_VERSION, PROVIDER_SCHEMA_VERSION } from "./contracts";
import { type Fixture, loadFixtures } from "./fixtures";
import {
  type Adapter,
  callGateway,
  SchemaGenerationError,
  type TransportTimings,
} from "./gateway";
import { INTERPRETATION_VERSION, interpretResult } from "./interpret";
import { buildPrompt, PROMPT_VERSION } from "./prompt";
import { score } from "./scoring";

export const EvaluationRequest = z
  .strictObject({
    caseIds: z.array(z.string()).min(1).max(60),
    modelIds: z
      .array(
        z.enum([
          "openai/gpt-6-luna",
          "openai/gpt-5-nano",
          "openai/gpt-4.1-nano",
          "openai/gpt-4.1-mini",
        ]),
      )
      .min(1)
      .max(2),
    passes: z.number().int().min(1).max(3),
  })
  .refine(
    (x) =>
      new Set(x.caseIds).size === x.caseIds.length &&
      new Set(x.modelIds).size === x.modelIds.length,
    "Duplicate IDs",
  );
export type Privacy = {
  team: string;
  verified_at: string | null;
  verified_by: string | null;
  team_zero_data_retention: boolean;
  team_no_prompt_training: boolean;
  gateway_managed_credentials_only: boolean;
  approved_models: string[];
  approved_providers: string[];
  fixture_review_sha256: string | null;
  fixture_reviewed_by: string | null;
  synthetic_hobby?: {
    approved_at: string | null;
    approved_by: string | null;
    fixture_sha256: string | null;
  };
};
export function privacyReady(
  p: Privacy,
  hash: string,
  ids: ModelId[],
  mode: EvaluationMode = "zdr",
): boolean {
  const policyReady =
    mode === "zdr"
      ? p.team_zero_data_retention && p.team_no_prompt_training
      : mode === "synthetic_hobby" &&
        !!p.synthetic_hobby?.approved_by &&
        !!p.synthetic_hobby.approved_at &&
        Number.isFinite(Date.parse(p.synthetic_hobby.approved_at)) &&
        p.synthetic_hobby.fixture_sha256 === SYNTHETIC_FIXTURE_SHA256 &&
        hash === SYNTHETIC_FIXTURE_SHA256;
  return (
    !!p.team &&
    !!p.verified_by &&
    !!p.verified_at &&
    Number.isFinite(Date.parse(p.verified_at)) &&
    policyReady &&
    p.gateway_managed_credentials_only &&
    p.fixture_review_sha256 === hash &&
    !!p.fixture_reviewed_by &&
    ids.every(
      (id) =>
        p.approved_models.includes(id) &&
        p.approved_providers.includes(MODELS[id].provider),
    )
  );
}
export async function evaluateCase(
  fixture: Fixture,
  modelId: ModelId,
  pass: number,
  adapter: Adapter,
  signal: AbortSignal,
  mode: EvaluationMode = "zdr",
) {
  const base = {
    ...evaluationDisclosure(mode),
    caseId: fixture.id,
    modelId,
    pass,
    category: fixture.category,
    split: fixture.split,
    tags: fixture.tags,
    language: fixture.expected?.language ?? "boundary",
  };
  const prompt = buildPrompt(fixture.transcript, fixture.context);
  if (prompt.status === "refused") {
    const validation = {
      status: "refused" as const,
      category: prompt.category,
    };
    return {
      ...base,
      status: "refused",
      validation,
      ...score(fixture, validation),
      schemaValid: null,
      latencyMs: 0,
      validationMs: 0,
      costUsd: 0,
      costBasis: "local",
      billable: false,
    };
  }
  const started = performance.now();
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), TIMEOUT_MS);
  timer.unref();
  const timed = AbortSignal.any([signal, deadline.signal]);
  let transportTimings: TransportTimings | undefined;
  let stopWaiting: (() => void) | undefined;
  try {
    if (signal.aborted) throw new Error("cancelled");
    // Register before calling the adapter, including synchronous cancellation.
    const aborted = new Promise<never>((_, reject) => {
      const onAbort = () => reject(new Error("aborted"));
      timed.addEventListener("abort", onAbort, { once: true });
      stopWaiting = () => timed.removeEventListener("abort", onAbort);
    });
    const generated = await Promise.race([
      adapter({
        modelId,
        system: prompt.system,
        prompt: prompt.prompt,
        signal: timed,
        evaluationMode: mode,
        onTransportTiming: (timings) => {
          transportTimings = { ...timings };
        },
      }),
      aborted,
    ]);
    // A blocked event loop can postpone timer delivery. Never accept a late
    // completion or trust an adapter's narrower latency measurement.
    const latencyMs = performance.now() - started;
    if (latencyMs >= TIMEOUT_MS) deadline.abort();
    if (timed.aborted) throw new Error("aborted");
    clearTimeout(timer);
    stopWaiting?.();
    // Charge/routing lookup is non-generative and outside the five-second NLU deadline.
    // It may take at most one extra second, without changing model latency samples.
    let metadata: Partial<Awaited<ReturnType<Adapter>>> = {};
    if (generated.metadata && !signal.aborted) {
      const metadataDeadline = new AbortController();
      const metadataSignal = AbortSignal.any([signal, metadataDeadline.signal]);
      const metadataTimer = setTimeout(() => metadataDeadline.abort(), 1000);
      metadataTimer.unref();
      let stopMetadataWaiting: (() => void) | undefined;
      try {
        const metadataAborted = new Promise<never>((_, reject) => {
          const onAbort = () => reject(new Error("metadata_timeout"));
          metadataSignal.addEventListener("abort", onAbort, { once: true });
          stopMetadataWaiting = () =>
            metadataSignal.removeEventListener("abort", onAbort);
        });
        metadata = await Promise.race([
          generated.metadata(metadataSignal),
          metadataAborted,
        ]);
      } catch {
        /* Unknown metadata keeps routing verification pending. */
      } finally {
        clearTimeout(metadataTimer);
        stopMetadataWaiting?.();
      }
    }
    if (signal.aborted) throw new Error("cancelled");
    const response = { ...generated, ...metadata };
    const validationStart = performance.now();
    const interpretation = interpretResult(
      response.raw,
      fixture.transcript,
      fixture.context,
    );
    const { validation, extractionValidation, normalizations } = interpretation;
    const routedMismatch =
      response.isByok === true ||
      (response.routedProvider !== undefined &&
        response.routedProvider !== MODELS[modelId].provider) ||
      (response.routedModel !== undefined &&
        response.routedModel !== modelId) ||
      (mode === "synthetic_hobby" &&
        (response.isByok !== false ||
          response.routedProvider !== MODELS[modelId].provider ||
          response.routedModel !== modelId));
    const reportedCost =
      response.cost !== undefined &&
      Number.isFinite(response.cost) &&
      response.cost >= 0;
    const cost = reportedCost
      ? response.cost
      : response.usage
        ? response.routingEvidence ===
          "cloudflare_configuration_and_response_model"
          ? calculateCloudflareCost(modelId, response.usage)
          : calculateCost(modelId, response.usage)
        : null;
    return {
      ...base,
      status: routedMismatch
        ? "routing_error"
        : validation.status === "schema_error"
          ? "schema_error"
          : "ok",
      validation,
      extractionScore: score(fixture, extractionValidation),
      normalizations,
      ...score(fixture, validation),
      ...(routedMismatch ? { correct: false, mismatches: ["routing"] } : {}),
      latencyMs,
      transportTimings,
      validationMs: performance.now() - validationStart,
      promptBytes: prompt.bytes,
      usage: response.usage,
      costUsd: cost,
      costBasis: reportedCost
        ? "reported"
        : cost === null
          ? "reservation"
          : "estimated",
      routedProvider: response.routedProvider ?? null,
      routedModel: response.routedModel ?? null,
      isByok: response.isByok ?? null,
      routingEvidence: response.routingEvidence ?? null,
      generationId: response.generationId,
      options: MODELS[modelId].reasoningEffort,
      billable: true,
    };
  } catch (error) {
    // Never serialize provider errors, raw output or transcripts (could echo secrets).
    return {
      ...base,
      status: signal.aborted
        ? "cancelled"
        : timed.aborted
          ? "timeout"
          : error instanceof SchemaGenerationError
            ? "schema_error"
            : "model_error",
      correct: false,
      schemaValid: false,
      mismatches: ["request_failed"],
      latencyMs: performance.now() - started,
      transportTimings,
      validationMs: 0,
      promptBytes: prompt.bytes,
      costUsd: null,
      costBasis: "reservation",
      billable: true,
    };
  } finally {
    clearTimeout(timer);
    stopWaiting?.();
  }
}
export function schedule(
  caseIds: string[],
  modelIds: ModelId[],
  passes: number,
) {
  const jobs: { caseId: string; modelId: ModelId; pass: number }[] = [];
  for (let pass = 1; pass <= passes; pass++)
    for (const [index, caseId] of caseIds.entries())
      for (const modelId of (index + pass) % 2
        ? modelIds
        : [...modelIds].reverse())
        jobs.push({ caseId, modelId, pass });
  return jobs;
}
let active = false;
function hasEvaluationOrigin(req: Request, env: NodeJS.ProcessEnv) {
  const origin = env.NLU_EVALUATION_ORIGIN;
  if (!origin || req.headers.get("origin") !== origin) return false;
  try {
    const configured = new URL(origin);
    if (new URL(req.url).origin === configured.origin) return true;
    // Railway terminates TLS and sets these headers; Next may expose its internal URL.
    // Accept only the configured public host and a single HTTPS value in staging.
    return (
      env.RAILWAY_ENVIRONMENT_NAME === "staging" &&
      configured.protocol === "https:" &&
      req.headers.get("x-forwarded-proto") === "https" &&
      req.headers.get("x-forwarded-host") === configured.host
    );
  } catch {
    return false;
  }
}

export async function handleEvaluation(
  req: Request,
  deps: {
    email: string | null;
    env?: NodeJS.ProcessEnv;
    privacy?: Privacy;
    fixtures?: { fixtures: Fixture[]; hash: string };
    adapter?: Adapter;
  },
) {
  const env = deps.env ?? process.env;
  if (
    env.NLU_EVALUATION_ENABLED !== "true" ||
    env.RAILWAY_ENVIRONMENT_NAME !== "staging"
  )
    return Response.json({ error: "evaluation_disabled" }, { status: 404 });
  if (!deps.email)
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  if (
    !(env.NLU_EVALUATOR_EMAILS ?? "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .includes(deps.email.toLowerCase())
  )
    return Response.json({ error: "forbidden" }, { status: 403 });
  if (!hasEvaluationOrigin(req, env))
    return Response.json({ error: "origin_required" }, { status: 403 });
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "json_required" }, { status: 415 });
  if (Number(req.headers.get("content-length")) > 8192)
    return Response.json({ error: "request_too_large" }, { status: 413 });
  let input: z.infer<typeof EvaluationRequest>;
  try {
    const body = await req.text();
    if (body.length > 8192)
      return Response.json({ error: "request_too_large" }, { status: 413 });
    input = EvaluationRequest.parse(JSON.parse(body));
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const loaded = deps.fixtures ?? (await loadFixtures());
  const mode = evaluationMode(env.NLU_EVALUATION_MODE);
  if (!mode)
    return Response.json({ error: "invalid_evaluation_mode" }, { status: 503 });
  if (input.caseIds.some((id) => !loaded.fixtures.some((x) => x.id === id)))
    return Response.json({ error: "unknown_case" }, { status: 400 });
  const gateway = gatewayTransport(env.NLU_GATEWAY);
  if (!gateway)
    return Response.json({ error: "invalid_gateway" }, { status: 503 });
  const privacy = gateway === "cloudflare" ? cloudflarePrivacy : vercelPrivacy;
  let adapter: Adapter;
  if (gateway === "cloudflare") {
    const configuration = cloudflareConfiguration(env);
    if (!configuration.success)
      return Response.json(
        { error: "missing_cloudflare_configuration" },
        { status: 503 },
      );
    if (!deps.adapter && privacy.team !== configuration.data.accountId)
      return Response.json(
        { error: "cloudflare_privacy_pending" },
        { status: 503 },
      );
    adapter = (args) => callCloudflare(args, configuration.data);
  } else {
    if (!env.AI_GATEWAY_API_KEY)
      return Response.json({ error: "missing_gateway_key" }, { status: 503 });
    adapter = (args) => callGateway(args);
  }
  // Injected adapters are offline test doubles. Runtime requires provider-specific
  // no-training verification even under the synthetic retention exception.
  if (!deps.adapter && gateway === "cloudflare") {
    if (!privacy.team_no_prompt_training)
      return Response.json(
        { error: "cloudflare_privacy_pending" },
        { status: 503 },
      );
    try {
      verifyCloudflarePricing(input.modelIds);
    } catch {
      return Response.json(
        { error: "cloudflare_prices_pending" },
        { status: 503 },
      );
    }
  }
  if (!privacyReady(deps.privacy ?? privacy, loaded.hash, input.modelIds, mode))
    return Response.json(
      { error: "privacy_or_review_pending" },
      { status: 503 },
    );
  if (active)
    return Response.json({ error: "run_in_progress" }, { status: 409 });
  active = true;
  const controller = new AbortController();
  req.signal.addEventListener("abort", () => controller.abort(), {
    once: true,
  });
  if (req.signal.aborted) controller.abort();
  const runId = randomUUID();
  const stream = new ReadableStream({
    async start(out) {
      const emit = (value: unknown) => {
        if (!controller.signal.aborted)
          out.enqueue(new TextEncoder().encode(`${JSON.stringify(value)}\n`));
      };
      try {
        emit({
          type: "start",
          runId,
          gateway,
          ...evaluationDisclosure(mode),
          versions: {
            prompt: PROMPT_VERSION,
            registry: REGISTRY_VERSION,
            fixture: FIXTURE_VERSION,
            fixtureHash: loaded.hash,
            models: MODEL_CONFIG_VERSION,
            contract: CONTRACT_VERSION,
            wireSchema: PROVIDER_SCHEMA_VERSION,
            interpretation: INTERPRETATION_VERSION,
          },
        });
        for (const job of schedule(
          input.caseIds,
          input.modelIds,
          input.passes,
        )) {
          if (controller.signal.aborted) break;
          const fixture = loaded.fixtures.find((x) => x.id === job.caseId);
          if (!fixture) throw new Error("missing_fixture");
          const row = await evaluateCase(
            fixture,
            job.modelId,
            job.pass,
            deps.adapter ?? adapter,
            controller.signal,
            mode,
          );
          emit({ type: "result", runId, ...row });
          if (row.status === "routing_error") break;
        }
        emit({ type: "done", runId });
      } catch {
        emit({ type: "error", runId, error: "evaluation_failed" });
      } finally {
        active = false;
        if (!controller.signal.aborted) out.close();
      }
    },
    cancel() {
      controller.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
