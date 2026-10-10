import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { CANARY_FIXTURES, GATEWAY_ROLES } from "../config/gateway-roles.ts";
import {
  BENCHMARK_IDS,
  COMBINATIONS,
  reserveTtsMicros,
  VOICE_VERSION,
} from "../config/voice.ts";
import { createGatewayClient } from "../lib/gateway/client.ts";
import {
  requireAcknowledgement,
  routingReceipt,
  terminalGatewayError,
} from "../lib/gateway/policy.ts";
import {
  CAPS,
  initializeLedger,
  reserve,
  settle,
  spent,
  withLedger,
} from "../lib/verification/ledger.ts";
import { summarizeVoice } from "../lib/voice/report.ts";
import { inspectWav, synthesize } from "../lib/voice/sarvam.ts";
import { handleClip, handleVoice } from "../lib/voice/service.ts";
import { inspectSource } from "../scripts/gateway-guard.mjs";

const ack = {
  currentNoticeVersion: "v1",
  noticeVersion: "v1",
  currentAdults: ["a", "b"],
  coveredAdults: ["a", "b"],
  currentProcessors: ["vercel", "openai"],
  processors: ["openai", "vercel"],
  withdrawn: false,
  recordedAt: "2026-10-09T00:00:00Z",
};
function receipt(model = GATEWAY_ROLES.nlu.model) {
  return {
    enabledDisallowPromptTraining: true,
    cost: "0.00001",
    routing: {
      originalModelId: model,
      canonicalSlug: model,
      finalProvider: "openai",
      modelAttemptCount: 1,
      totalProviderAttemptCount: 1,
      modelAttempts: [
        {
          canonicalSlug: model,
          success: true,
          providerAttemptCount: 1,
          providerAttempts: [
            { provider: "openai", credentialType: "system", success: true },
          ],
        },
      ],
    },
  };
}
function deps(overrides = {}) {
  const calls = [],
    halted = new Set();
  const gateway = () => "model";
  gateway.embeddingModel = () => "embedding";
  return {
    calls,
    halted,
    key: "test-only",
    syntheticCanary: true,
    acknowledgement: async () => ack,
    verificationPassed: async () => true,
    routeAllowed: async () => true,
    reserve: async () => {},
    create: () => gateway,
    state: {
      isTripped: async (role) => halted.has(role),
      trip: async (role) => {
        halted.add(role);
      },
    },
    generate: async (options) => {
      calls.push(options);
      return { providerMetadata: { gateway: receipt() } };
    },
    embed: async (options) => {
      calls.push(options);
      return {
        providerMetadata: { gateway: receipt(GATEWAY_ROLES.embed.model) },
      };
    },
    ...overrides,
  };
}
test("gateway chat/answer/embedding enforce controls and zero retries at SDK boundary", async () => {
  const d = deps(),
    client = createGatewayClient(d);
  for (const role of ["nlu", "answer", "embed"])
    await client.call(
      role,
      role === "embed" ? CANARY_FIXTURES.embedding : CANARY_FIXTURES.chat,
      AbortSignal.timeout(1000),
    );
  for (const call of d.calls) {
    assert.deepEqual(call.providerOptions.gateway, {
      only: ["openai"],
      disallowPromptTraining: true,
    });
    assert.equal(call.maxRetries, 0);
    assert.equal(call.tools, undefined);
  }
  assert.equal(d.calls[0].providerOptions.openai.store, false);
  assert.deepEqual(d.calls[2].providerOptions.openai, { dimensions: 768 });
});
test("synthetic gateway refuses arbitrary text, missing keys and sensitive input", async () => {
  const d = deps();
  await assert.rejects(
    createGatewayClient(d).call(
      "nlu",
      "real family text",
      AbortSignal.timeout(1000),
    ),
    /canary_fixture_required/,
  );
  await assert.rejects(
    createGatewayClient(deps({ key: "" })).call(
      "nlu",
      CANARY_FIXTURES.chat,
      AbortSignal.timeout(1000),
    ),
    /gateway_key_missing/,
  );
  await assert.rejects(
    createGatewayClient(deps({ syntheticCanary: false })).call(
      "nlu",
      "My OTP is 123456",
      AbortSignal.timeout(1000),
    ),
    /sensitive_input_refused/,
  );
  assert.equal(d.calls.length, 0);
});
test("missing, stale, changed adults/processors and withdrawn acknowledgement block dispatch", async () => {
  for (const invalid of [
    null,
    { ...ack, withdrawn: true },
    { ...ack, noticeVersion: "old" },
    { ...ack, coveredAdults: ["a"] },
    { ...ack, coveredAdults: ["a", "a"] },
    { ...ack, processors: ["openai"] },
    { ...ack, recordedAt: null },
  ]) {
    assert.throws(() => requireAcknowledgement(invalid), /acknowledgement/);
    const d = deps({
      syntheticCanary: false,
      acknowledgement: async () => invalid,
    });
    await assert.rejects(
      createGatewayClient(d).call(
        "nlu",
        "A normal sentence",
        AbortSignal.timeout(1000),
      ),
      /acknowledgement/,
    );
    assert.equal(d.calls.length, 0);
  }
});
test("withdrawal during reservation is rechecked before queued dispatch", async () => {
  let current = ack;
  const d = deps({
    syntheticCanary: false,
    acknowledgement: async () => current,
    reserve: async () => {
      current = { ...ack, withdrawn: true };
    },
  });
  await assert.rejects(
    createGatewayClient(d).call(
      "nlu",
      "A normal sentence",
      AbortSignal.timeout(1000),
    ),
    /acknowledgement/,
  );
  assert.equal(d.calls.length, 0);
});
test("BYOK, unknown provider, missing no-training and inconsistent receipts halt role", async () => {
  const malformed = [
    undefined,
    {},
    { ...receipt(), enabledDisallowPromptTraining: false },
  ];
  const byok = receipt();
  byok.routing.modelAttempts[0].providerAttempts[0].credentialType = "byok";
  malformed.push(byok);
  const wrong = receipt();
  wrong.routing.finalProvider = "unknown";
  malformed.push(wrong);
  for (const value of malformed) {
    assert.throws(
      () => routingReceipt(value, GATEWAY_ROLES.nlu.model, ["openai"]),
      /routing_receipt_invalid/,
    );
    const d = deps({
        generate: async () => ({ providerMetadata: { gateway: value } }),
      }),
      client = createGatewayClient(d);
    await assert.rejects(
      client.call("nlu", CANARY_FIXTURES.chat, AbortSignal.timeout(1000)),
      /routing_receipt_invalid/,
    );
    await assert.rejects(
      client.call("nlu", CANARY_FIXTURES.chat, AbortSignal.timeout(1000)),
      /role_halted/,
    );
  }
});
test("SDK wrapped quota/credit and no-provider errors stop without retry/fallback", async () => {
  for (const error of [
    { statusCode: 402 },
    {
      name: "GatewayInternalServerError",
      cause: { error: { code: "quota_for_entity_exceeded" } },
    },
    {
      responseBody: JSON.stringify({
        error: { type: "no_providers_available" },
      }),
    },
  ]) {
    let calls = 0;
    const d = deps({
      generate: async () => {
        calls++;
        throw error;
      },
    });
    await assert.rejects(
      createGatewayClient(d).call(
        "nlu",
        CANARY_FIXTURES.chat,
        AbortSignal.timeout(1000),
      ),
    );
    assert.equal(calls, 1);
    assert.equal(d.halted.size, 1);
  }
  assert.equal(
    terminalGatewayError({
      name: "GatewayInternalServerError",
      statusCode: 500,
    }),
    null,
  );
});
test("guard detects aliases, reexports, dynamic imports and direct inference URLs", () => {
  for (const source of [
    'import { createGatewayProvider as build } from "@ai-sdk/gateway";',
    'export { gateway } from "@ai-sdk/gateway";',
    'const sdk = import("openai");',
    'fetch("https://api.openai.com/v1/responses");',
  ])
    assert.ok(inspectSource("app/api/bypass.ts", source).length);
  assert.equal(
    inspectSource(
      "lib/gateway/client.ts",
      'import { createGatewayProvider } from "@ai-sdk/gateway";',
    ).length,
    0,
  );
});
test("durable ledger retains crash reservations and blocks reset, replay and overspend", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nilumi-budget-"));
  try {
    await assert.rejects(
      withLedger(directory, "vgw", async () => {}),
      /ledger_missing/,
    );
    await initializeLedger(directory, "vgw");
    await withLedger(directory, "vgw", async (ledger, save) => {
      reserve(ledger, "attempt", CAPS.vgw);
      await save();
    });
    await assert.rejects(initializeLedger(directory, "vgw"));
    await withLedger(directory, "vgw", async (ledger) => {
      assert.equal(spent(ledger), CAPS.vgw);
      assert.throws(() => reserve(ledger, "attempt", 1), /replayed/);
      assert.throws(() => reserve(ledger, "next", 1), /hard_cap/);
      settle(ledger, "attempt", undefined);
      assert.equal(spent(ledger), CAPS.vgw);
      await assert.rejects(
        withLedger(directory, "vgw", async () => {}),
        /busy/,
      );
    });
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
function wav() {
  const bytes = Buffer.alloc(444);
  bytes.write("RIFF");
  bytes.writeUInt32LE(436, 4);
  bytes.write("WAVE", 8);
  bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(22050, 24);
  bytes.writeUInt32LE(44100, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(400, 40);
  bytes.writeInt16LE(4000, 144);
  return bytes;
}
test("Sarvam pins settings, detects silence and masks raw provider errors", async () => {
  let calls = 0;
  const stream = synthesize(
    "A synthetic sentence.",
    "ritu",
    AbortSignal.timeout(1000),
    async (_url, init) => {
      calls++;
      const request = JSON.parse(init.body);
      assert.equal(request.model, "bulbul:v3");
      assert.equal(request.speaker, "ritu");
      assert.equal(request.output_audio_codec, "wav");
      assert.equal(request.pitch, undefined);
      assert.equal(request.loudness, undefined);
      return new Response(wav(), { headers: { "Content-Type": "audio/wav" } });
    },
    "test-key",
  );
  const parts = [];
  let result;
  while (true) {
    const chunk = await stream.next();
    if (chunk.done) {
      result = chunk.value;
      break;
    }
    parts.push(chunk.value);
  }
  assert.equal(calls, 1);
  assert.equal(Buffer.concat(parts).length, 400);
  assert.ok(result.leadingSilenceMs > 0);
  const silent = wav();
  silent.fill(0, 44);
  assert.throws(() => inspectWav(silent), /silent/);
  await assert.rejects(
    synthesize(
      "Example",
      "ritu",
      AbortSignal.timeout(1000),
      async () => new Response("secret-provider-error", { status: 500 }),
      "test-key",
    ).next(),
    /synthesis_failed/,
  );
});
async function voiceSetup() {
  const directory = await mkdtemp(join(tmpdir(), "nilumi-s4-"));
  await initializeLedger(directory, "s4");
  const env = {
    S4_ENABLED: "true",
    S4_STATE_DIR: directory,
    S4_ORIGIN: "https://example.invalid",
    AUTH_SECRET: "test-secret",
    S4_EVALUATOR_EMAILS: "a@example.invalid,b@example.invalid",
    S4_PRICE_VERIFIED_AT: "2026-10-09",
    S4_BILLING_MAX_MULTIPLIER: "1.2",
    SARVAM_API_KEY: "test-key",
  };
  const request = (payload, method = "POST") =>
    new Request("https://example.invalid/api/voice", {
      method,
      headers: { origin: env.S4_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  return { directory, env, request };
}
test("S4 disabled/auth/origin/arbitrary-text gates prevent dispatch", async () => {
  const { directory, env, request } = await voiceSetup();
  try {
    const payload = { fixture: "shopping", voice: "ritu", mode: "listen" };
    assert.equal((await handleVoice(request(payload), null, env)).status, 401);
    assert.equal(
      (
        await handleVoice(request(payload), "a@example.invalid", {
          ...env,
          S4_ENABLED: "false",
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await handleVoice(
          request({ ...payload, text: "real data" }),
          "a@example.invalid",
          env,
        )
      ).status,
      400,
    );
    assert.equal(
      (await handleVoice(request(payload), "outsider@example.invalid", env))
        .status,
      403,
    );
    const wrong = request(payload);
    wrong.headers.set("origin", "https://attacker.invalid");
    assert.equal(
      (await handleVoice(wrong, "a@example.invalid", env)).status,
      403,
    );
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
test("member-bound clips and Safari range/replays share one synthesis", async () => {
  const { directory, env, request } = await voiceSetup();
  let calls = 0;
  try {
    const item = await (
      await handleVoice(
        request({ fixture: "shopping", voice: "ritu", mode: "listen" }),
        "a@example.invalid",
        env,
      )
    ).json();
    const req = (range) =>
      new Request(`https://example.invalid/api/voice/${item.id}`, {
        headers: range ? { range } : {},
      });
    const synth = async function* () {
      calls++;
      yield wav().subarray(44);
      return {
        providerMs: 100,
        providerHeadersMs: 50,
        providerFirstAudioMs: 70,
        leadingSilenceMs: 2,
        pcmBytes: 400,
      };
    };
    assert.equal(
      (await handleClip(req(), item.id, "b@example.invalid", env, synth))
        .status,
      404,
    );
    const range = await handleClip(
      req("bytes=0-1"),
      item.id,
      "a@example.invalid",
      env,
      synth,
    );
    assert.equal(range.status, 206);
    assert.deepEqual(
      new Uint8Array(await range.arrayBuffer()),
      new Uint8Array([0, 0]),
    );
    const full = await handleClip(
      req(),
      item.id,
      "a@example.invalid",
      env,
      synth,
    );
    assert.equal(full.status, 200);
    assert.equal(full.headers.get("X-Template-Cache"), "true");
    await full.arrayBuffer();
    assert.equal(calls, 1);
    await withLedger(directory, "s4", async (ledger) =>
      assert.equal(ledger.entries.length, 1),
    );
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
test("benchmark requires wife selection and new trials always synthesize", async () => {
  const { directory, env, request } = await voiceSetup();
  let calls = 0;
  try {
    const payload = { fixture: "shopping", voice: "ritu", mode: "benchmark" };
    assert.equal(
      (await handleVoice(request(payload), "a@example.invalid", env)).status,
      409,
    );
    assert.equal(
      (
        await handleVoice(
          request({ voice: "ritu", selectedBy: "wife" }, "PATCH"),
          "a@example.invalid",
          env,
        )
      ).status,
      200,
    );
    for (let i = 0; i < 2; i++) {
      const item = await (
        await handleVoice(request(payload), "a@example.invalid", env)
      ).json();
      const response = await handleClip(
        new Request(`https://example.invalid/api/voice/${item.id}`),
        item.id,
        "a@example.invalid",
        env,
        async function* () {
          calls++;
          yield wav().subarray(44);
          return {
            providerMs: 100,
            providerHeadersMs: 50,
            providerFirstAudioMs: 70,
            leadingSilenceMs: 2,
            pcmBytes: 400,
          };
        },
      );
      assert.equal(response.headers.get("X-Template-Cache"), "false");
      await response.arrayBuffer();
    }
    assert.equal(calls, 2);
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
test("failed synthesis retains allowance and never retries the same clip", async () => {
  const { directory, env, request } = await voiceSetup();
  let calls = 0;
  try {
    const item = await (
      await handleVoice(
        request({ fixture: "shopping", voice: "ritu", mode: "listen" }),
        "a@example.invalid",
        env,
      )
    ).json();
    const req = () =>
      new Request(`https://example.invalid/api/voice/${item.id}`);
    const fail = () => ({
      async next() {
        calls++;
        throw new Error("provider secret");
      },
      async return() {
        return { done: true };
      },
    });
    assert.equal(
      (await handleClip(req(), item.id, "a@example.invalid", env, fail)).status,
      503,
    );
    assert.equal(
      (await handleClip(req(), item.id, "a@example.invalid", env, fail)).status,
      503,
    );
    assert.equal(calls, 1);
    await withLedger(directory, "s4", async (ledger) =>
      assert.ok(spent(ledger) > 0),
    );
    // Stream failure precedes the optional atomic trace write. Wait for its
    // rename before removing the temporary directory used by the producer.
    let persisted;
    for (let i = 0; i < 100; i++) {
      try {
        persisted = JSON.parse(
          await readFile(
            join(directory, "trials", `${item.id}.trace.json`),
            "utf8",
          ),
        );
        break;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await sleep(5);
      }
    }
    assert.equal(persisted?.outcome, "failed");
    assert.doesNotMatch(JSON.stringify(persisted), /provider secret/);
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
test("cancelled and cross-site clips cannot dispatch", async () => {
  const { directory, env, request } = await voiceSetup();
  try {
    const item = await (
      await handleVoice(
        request({ fixture: "shopping", voice: "ritu", mode: "listen" }),
        "a@example.invalid",
        env,
      )
    ).json();
    const url = `https://example.invalid/api/voice/${item.id}`,
      synth = async () => assert.fail("dispatch");
    assert.equal(
      (
        await handleClip(
          new Request(url, { headers: { "sec-fetch-site": "cross-site" } }),
          item.id,
          "a@example.invalid",
          env,
          synth,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await handleClip(
          new Request(url, {
            method: "DELETE",
            headers: { origin: env.S4_ORIGIN },
          }),
          item.id,
          "a@example.invalid",
          env,
          synth,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await handleClip(
          new Request(url),
          item.id,
          "a@example.invalid",
          env,
          synth,
        )
      ).status,
      404,
    );
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
test("four slices need full uncached coverage, zero failures and audible verification", () => {
  const rows = COMBINATIONS.flatMap((combination) =>
    Array.from({ length: 50 }, (_, index) => ({
      id: `${combination}-${index}`,
      fixture: BENCHMARK_IDS[index % BENCHMARK_IDS.length],
      voice: "ritu",
      version: VOICE_VERSION,
      combination,
      standalone: true,
      status: "ok",
      firstAudioMs: index < 47 ? 600 : 700,
      providerMs: 100,
      cached: false,
      sentenceLength: 40,
      at: new Date().toISOString(),
    })),
  );
  assert.ok(summarizeVoice(rows, "ritu", true).every((item) => item.accepted));
  assert.ok(
    summarizeVoice(rows, "ritu", false).every((item) => !item.accepted),
  );
  const failed = structuredClone(rows);
  const uncovered = rows.map((row) => ({ ...row, fixture: "shopping" }));
  assert.ok(
    summarizeVoice(uncovered, "ritu", true).every((item) => !item.accepted),
  );
  failed[0].status = "blocked";
  assert.equal(summarizeVoice(failed, "ritu", true)[0].accepted, false);
  const cached = structuredClone(rows);
  cached[0].cached = true;
  assert.equal(summarizeVoice(cached, "ritu", true)[0].attempted, 49);
  assert.equal(
    summarizeVoice([...rows, rows[0]], "ritu", true)[0].accepted,
    false,
  );
  assert.ok(reserveTtsMicros("தமிழ்") > reserveTtsMicros("Tamil"));
});

test("pinned SDK serializes storage and controls, maps terminal errors and never retries", async () => {
  for (const [status, code, expected] of [
    [402, "quota_for_entity_exceeded", "gateway_budget_or_credit_exhausted"],
    [403, "no_providers_available", "no_providers_available"],
  ]) {
    const requests = [];
    const halted = new Set();
    const client = createGatewayClient({
      key: "synthetic-test-credential",
      syntheticCanary: true,
      acknowledgement: async () => null,
      verificationPassed: async () => false,
      reserve: async () => {},
      state: {
        isTripped: async (role) => halted.has(role),
        trip: async (role) => {
          halted.add(role);
        },
      },
      fetch: async (url, options) => {
        requests.push({ url: String(url), body: JSON.parse(options.body) });
        return Response.json(
          { error: { type: code, code, message: "synthetic refusal" } },
          { status },
        );
      },
    });
    await assert.rejects(
      client.call("nlu", CANARY_FIXTURES.chat, AbortSignal.timeout(1000)),
      new RegExp(expected),
    );
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.providerOptions.gateway, {
      only: ["openai"],
      disallowPromptTraining: true,
    });
    assert.equal(requests[0].body.providerOptions.openai.store, false);
    assert.equal(requests[0].body.maxOutputTokens, 32);
    await assert.rejects(
      client.call("nlu", CANARY_FIXTURES.chat, AbortSignal.timeout(1000)),
      /role_halted/,
    );
    assert.equal(requests.length, 1);
  }
});
test("negative route stays synthetic-only and preserves no-training on the documented model/provider pair", async () => {
  const requests = [];
  const client = createGatewayClient({
    key: "synthetic-test-credential",
    syntheticCanary: true,
    acknowledgement: async () => null,
    verificationPassed: async () => false,
    reserve: async () => {},
    state: { isTripped: async () => false, trip: async () => {} },
    fetch: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return Response.json(
        {
          error: {
            type: "no_providers_available",
            message: "synthetic policy refusal",
          },
        },
        { status: 403 },
      );
    },
  });
  await assert.rejects(
    client.negativeCanary(AbortSignal.timeout(1000)),
    /no_providers_available/,
  );
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].providerOptions.gateway, {
    only: ["arcee-ai"],
    disallowPromptTraining: true,
  });
  await assert.rejects(
    createGatewayClient(deps({ syntheticCanary: false })).negativeCanary(
      AbortSignal.timeout(1000),
    ),
    /canary_fixture_required/,
  );
});

test("first family call requires accepted S-VGW even with current household acknowledgement", async () => {
  let reservations = 0;
  const d = deps({
    syntheticCanary: false,
    verificationPassed: async () => false,
    reserve: async () => {
      reservations++;
    },
  });
  for (const role of ["nlu", "answer", "embed"]) {
    await assert.rejects(
      createGatewayClient(d).call(
        role,
        "A household request.",
        AbortSignal.timeout(1000),
      ),
      /gateway_verification_required/,
    );
  }
  assert.equal(reservations, 0);
  assert.equal(d.calls.length, 0);
});
