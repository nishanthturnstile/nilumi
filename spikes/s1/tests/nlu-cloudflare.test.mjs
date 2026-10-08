import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import prices from "../config/cloudflare-pricing.json" with { type: "json" };
import {
  callCloudflare,
  cloudflareConfiguration,
} from "../lib/nlu/cloudflare.ts";
import {
  calculateCloudflareCost,
  estimateCloudflareReservation,
  verifyCloudflarePricing,
} from "../lib/nlu/cloudflare-pricing.ts";
import { PROVIDER_SCHEMA } from "../lib/nlu/contracts.ts";
import { evaluateCase, handleEvaluation } from "../lib/nlu/evaluate.ts";
import { loadFixtures } from "../lib/nlu/fixtures.ts";
import { SchemaGenerationError } from "../lib/nlu/gateway.ts";
import { verifyRates } from "../scripts/evaluate-nlu.mjs";

const { fixtures, hash } = await loadFixtures();
const fixture = fixtures.find((f) => f.id === "shopping-01");
const c = {
  accountId: "00000000000000000000000000000000",
  gatewayId: "offline-test",
  token: "mock-private-token",
};
const args = {
  modelId: "openai/gpt-6-luna",
  system: "synthetic system",
  prompt: "synthetic input",
  signal: new AbortController().signal,
  evaluationMode: "synthetic_hobby",
};
const settings = {
  success: true,
  result: {
    id: c.gatewayId,
    collect_logs: false,
    cache_ttl: 0,
    authentication: true,
    byok_only: false,
    zdr: true,
  },
};
const output = () => ({
  id: "resp_offline",
  model: "gpt-6-luna",
  status: "completed",
  usage: {
    input_tokens: 100,
    output_tokens: 20,
    input_tokens_details: { cached_tokens: 10 },
    output_tokens_details: { reasoning_tokens: 2 },
  },
  output: [
    {
      type: "message",
      role: "assistant",
      status: "completed",
      content: [
        { type: "output_text", text: JSON.stringify(fixture.expected) },
      ],
    },
  ],
});
const fake =
  (
    payload = output(),
    configuration = settings,
    keys = { success: true, result: [] },
    seen = [],
  ) =>
  async (url, options) => {
    seen.push({ url, options });
    if (url.includes("provider_configs")) return Response.json(keys);
    if (options.method !== "POST") return Response.json(configuration);
    return Response.json(payload);
  };

test("Cloudflare request enforces privacy, structured output, one attempt and direct OpenAI route", async () => {
  const seen = [];
  const result = await callCloudflare(
    args,
    c,
    fake(output(), settings, undefined, seen),
  );
  assert.equal(seen.length, 3);
  const call = seen.find((x) => x.options.method === "POST");
  assert.equal(
    call.url,
    `https://api.cloudflare.com/client/v4/accounts/${c.accountId}/ai/v1/responses`,
  );
  assert.equal(call.options.headers["cf-aig-gateway-id"], c.gatewayId);
  for (const name of ["cf-aig-collect-log", "cf-aig-collect-log-payload"])
    assert.equal(call.options.headers[name], "false");
  assert.equal(call.options.headers["cf-aig-skip-cache"], "true");
  assert.equal(call.options.headers["cf-aig-max-attempts"], "1");
  assert.equal(call.options.headers["cf-aig-request-timeout"], "5000");
  assert.equal(call.options.redirect, "error");
  const body = JSON.parse(call.options.body);
  assert.equal(body.model, args.modelId);
  assert.equal(body.store, false);
  assert.equal(body.background, false);
  assert.equal(body.stream, false);
  assert.equal(body.max_output_tokens, 4096);
  assert.deepEqual(body.tools, []);
  assert.equal(body.tool_choice, "none");
  assert.deepEqual(body.reasoning, { effort: "low" });
  assert.deepEqual(body.text.format.schema, PROVIDER_SCHEMA);
  assert.equal(body.text.format.strict, true);
  assert.deepEqual(result.raw, fixture.expected);
  assert.equal(result.routedProvider, "openai");
  assert.equal(result.isByok, false);
  assert.equal(
    result.routingEvidence,
    "cloudflare_configuration_and_response_model",
  );
});
test("unsupported reasoning setting is omitted for GPT-4.1 challengers", async () => {
  const seen = [],
    payload = output();
  payload.model = "gpt-4.1-mini";
  await callCloudflare(
    { ...args, modelId: "openai/gpt-4.1-mini" },
    c,
    fake(payload, settings, undefined, seen),
  );
  assert.equal(
    JSON.parse(seen.find((x) => x.options.method === "POST").options.body)
      .reasoning,
    undefined,
  );
});
test("unknown or unsafe gateway configuration and any stored provider key block inference", async () => {
  for (const patch of [
    { collect_logs: true },
    { authentication: false },
    { cache_ttl: 60 },
    { byok_only: true },
    { byok_only: undefined },
    { id: "other" },
  ]) {
    const seen = [];
    await assert.rejects(
      callCloudflare(
        args,
        c,
        fake(
          output(),
          { ...settings, result: { ...settings.result, ...patch } },
          undefined,
          seen,
        ),
      ),
      /cloudflare_route_privacy_pending/,
    );
    assert.equal(seen.filter((x) => x.options.method === "POST").length, 0);
  }
  for (const keys of [
    { success: true, result: [{ provider_slug: "openai" }] },
    { success: true, result: [], result_info: { total_count: 1 } },
    { success: false, result: [] },
  ]) {
    await assert.rejects(
      callCloudflare(args, c, fake(output(), settings, keys)),
      /cloudflare_route_privacy_pending/,
    );
  }
  await assert.rejects(
    callCloudflare(
      { ...args, evaluationMode: "zdr" },
      c,
      fake(output(), {
        ...settings,
        result: { ...settings.result, zdr: false },
      }),
    ),
    /cloudflare_route_privacy_pending/,
  );
});
test("provider failure sends one inference attempt and does not reveal provider content", async () => {
  let attempts = 0;
  await assert.rejects(
    callCloudflare(args, c, async (url, opts) => {
      if (opts.method !== "POST") return fake()(url, opts);
      attempts++;
      return new Response("private provider error", { status: 403 });
    }),
    (e) => e.message === "cloudflare_inference_failed",
  );
  assert.equal(attempts, 1);
});
test("model substitution, tool output, truncation and invalid JSON cannot pass Cloudflare validation", async () => {
  const altered = output();
  altered.model = "different-model";
  await assert.rejects(
    callCloudflare(args, c, fake(altered)),
    /cloudflare_model_mismatch/,
  );
  for (const mutate of [
    (p) => {
      p.status = "incomplete";
    },
    (p) => {
      p.output.push({ type: "function_call" });
    },
    (p) => {
      p.output[0].content[0].text = "{}";
    },
    (p) => {
      p.output[0].content[0].text = "invalid JSON";
    },
    (p) => {
      p.output[0].content.push({ type: "refusal" });
    },
  ]) {
    const p = output();
    mutate(p);
    await assert.rejects(
      callCloudflare(args, c, fake(p)),
      SchemaGenerationError,
    );
  }
});
test("invalid usage retains unknown cost and an already aborted request sends nothing", async () => {
  const p = output();
  p.usage.input_tokens_details.cached_tokens = 101;
  assert.equal((await callCloudflare(args, c, fake(p))).usage, undefined);
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(
    callCloudflare({ ...args, signal: controller.signal }, c, async () => {
      calls++;
      throw new Error("should not call");
    }),
  );
  assert.equal(calls, 0);
});
test("Cloudflare pricing expires, omits unverified models and reserves long-context rates plus purchase fee", () => {
  const now = Date.parse("2026-10-08T01:00:00Z");
  verifyCloudflarePricing([args.modelId], prices, now);
  for (const time of [now - 2 * 86400000, now + 2 * 86400000])
    assert.throws(
      () => verifyCloudflarePricing([args.modelId], prices, time),
      /pending_or_stale/,
    );
  assert.throws(
    () => verifyCloudflarePricing(["openai/gpt-4.1-mini"], prices, now),
    /pending_or_stale/,
  );
  const reserve = estimateCloudflareReservation(args.modelId, 100);
  assert.equal(reserve, ((4196 * 0.25 + 4096 * 0.75) / 1e6) * 1.05);
  assert.equal(
    calculateCloudflareCost(args.modelId, {
      input: 100,
      output: 20,
      cached: 10,
      cacheWrite: 0,
      reasoning: 2,
    }),
    ((90 * 0.2 + 10 * 0.02 + 20 * 0.75) / 1e6) * 1.05,
  );
});
test("Cloudflare cost remains estimated and reports configuration evidence", async () => {
  const row = await evaluateCase(
    fixture,
    args.modelId,
    1,
    (a) => callCloudflare(a, c, fake()),
    args.signal,
    "synthetic_hobby",
  );
  assert.equal(row.status, "ok");
  assert.equal(row.costBasis, "estimated");
  assert.equal(
    row.routingEvidence,
    "cloudflare_configuration_and_response_model",
  );
  assert.ok(row.costUsd > 0);
});
test("Vercel credentials alone cannot enable the migrated endpoint, and Cloudflare profile stays pending", async () => {
  assert.equal(
    cloudflareConfiguration({ AI_GATEWAY_API_KEY: "mock-vercel" }).success,
    false,
  );
  const env = {
    NLU_EVALUATION_ENABLED: "true",
    RAILWAY_ENVIRONMENT_NAME: "staging",
    NLU_EVALUATOR_EMAILS: "owner@example.invalid",
    NLU_EVALUATION_ORIGIN: "https://example.invalid",
    NLU_GATEWAY: "cloudflare",
    CLOUDFLARE_ACCOUNT_ID: c.accountId,
    CLOUDFLARE_AI_GATEWAY_ID: c.gatewayId,
    CLOUDFLARE_API_TOKEN: c.token,
  };
  const request = new Request("https://example.invalid/api/nlu/evaluate", {
    method: "POST",
    headers: {
      Origin: env.NLU_EVALUATION_ORIGIN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      caseIds: [fixture.id],
      modelIds: [args.modelId],
      passes: 1,
    }),
  });
  const response = await handleEvaluation(request, {
    email: env.NLU_EVALUATOR_EMAILS,
    env,
    fixtures: { fixtures, hash },
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "cloudflare_privacy_pending");
  const policy = JSON.parse(
    await readFile(
      new URL("../config/cloudflare-privacy.json", import.meta.url),
    ),
  );
  assert.equal(policy.team_zero_data_retention, false);
  assert.equal(policy.verified_at, null);
});

test("explicit Vercel selection uses its own credential gate and rejects unknown gateways before inference", async () => {
  const env = {
    NLU_GATEWAY: "vercel",
    AI_GATEWAY_API_KEY: "mock-vercel-only",
    NLU_EVALUATION_ENABLED: "true",
    RAILWAY_ENVIRONMENT_NAME: "staging",
    NLU_EVALUATION_MODE: "synthetic_hobby",
    NLU_EVALUATOR_EMAILS: "owner@example.invalid",
    NLU_EVALUATION_ORIGIN: "https://example.invalid",
  };
  const policy = JSON.parse(
    await readFile(new URL("../config/nlu-privacy.json", import.meta.url)),
  );
  let calls = 0;
  const request = () =>
    new Request("https://example.invalid/api/nlu/evaluate", {
      method: "POST",
      headers: {
        Origin: env.NLU_EVALUATION_ORIGIN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        caseIds: [fixture.id],
        modelIds: [args.modelId],
        passes: 1,
      }),
    });
  const deps = {
    email: env.NLU_EVALUATOR_EMAILS,
    env,
    privacy: policy,
    fixtures: { fixtures, hash },
    adapter: async () => {
      calls++;
      return {
        raw: fixture.expected,
        routedModel: args.modelId,
        routedProvider: "openai",
        isByok: false,
      };
    },
  };
  const response = await handleEvaluation(request(), deps);
  assert.equal(response.status, 200);
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert.equal(events[0].gateway, "vercel");
  assert.equal(calls, 1);
  for (const gateway of ["unknown", "cloudflare"]) {
    const blocked = await handleEvaluation(request(), {
      ...deps,
      env: { ...env, NLU_GATEWAY: gateway },
    });
    assert.equal(blocked.status, 503);
  }
  assert.equal(calls, 1);
});

test("Vercel rate verification is used only when explicitly selected and still rejects changed prices", async () => {
  const data = [
    {
      id: "openai/gpt-6-luna",
      pricing: {
        input: "0.0000001",
        output: "0.0000005",
        input_cache_write: "0.000000125",
        input_cache_read: "0.00000001",
      },
    },
  ];
  let calls = 0;
  const fetcher = async (url) => {
    calls++;
    assert.equal(url, "https://ai-gateway.vercel.sh/v1/models");
    return Response.json({ data });
  };
  await verifyRates([args.modelId], "vercel", fetcher);
  assert.equal(calls, 1);
  data[0].pricing.input = "0.000001";
  await assert.rejects(
    verifyRates([args.modelId], "vercel", fetcher),
    /rates_changed/,
  );
  await assert.rejects(
    verifyRates(["openai/gpt-4.1-mini"], "cloudflare", fetcher),
    /cloudflare_prices_pending/,
  );
  assert.equal(calls, 2);
});
