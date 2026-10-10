import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  GATEWAY_ROLES,
  NEGATIVE_CANARY_ROUTE,
  QUOTA_CANARY,
} from "../config/gateway-roles.ts";
import { gatewayFailure } from "../lib/gateway/policy.ts";
import { fixtureHash, requirePreflight } from "../lib/gateway/preflight.ts";
import {
  atomicFile,
  initializeLedger,
  reserve,
  withLedger,
} from "../lib/verification/ledger.ts";
import {
  manifest,
  runCanary,
  verifyRevocation,
} from "../scripts/gateway-canary.mjs";
import {
  initializeFollowup,
  runFollowup,
} from "../scripts/gateway-followup.mjs";
import { quotaManifest, runQuota } from "../scripts/gateway-quota.mjs";

const key = "synthetic-canary-credential";
const now = Date.now();
const at = (offset = 0) => new Date(now + offset).toISOString();
function config() {
  const budget = (keyId, limitUsd, refresh) => ({
    keyId,
    teamId: "team-synthetic",
    attribution: "team",
    limitUsd,
    refresh,
    alerts: [50, 75, 100],
  });
  return {
    version: 3,
    checkedAt: at(),
    teamId: "team-synthetic",
    purchasedCredits: true,
    creditBalanceUsd: 20,
    paidCreditValidThrough: at(365 * 86400_000),
    creditExpiryEvidence: "synthetic-purchase-and-validity-evidence",
    autoTopUpOff: true,
    noTeamByok: true,
    fixtureHash: fixtureHash(),
    teamBudget: { limitUsd: 10, refresh: "monthly", alerts: [50, 75, 100] },
    runtimeBudget: budget("runtime", 8, "monthly"),
    evaluationBudget: budget("evaluation", 1.72269354, "none"),
    s3CountedUsd: 0.27730646,
    s3LedgerEvidence: "synthetic-ledger-evidence",
    canaryBudget: budget("canary", 1, "none"),
    canaryBudgetVerified: true,
    negativeRouteVerified: true,
    quotaReadback: null,
  };
}
const pricing = [
  GATEWAY_ROLES.nlu.model,
  GATEWAY_ROLES.embed.model,
  NEGATIVE_CANARY_ROUTE.model,
].map((id) => ({
  id,
  no_training: id === NEGATIVE_CANARY_ROUTE.model ? "none" : "all",
  pricing: { input: "0.000001", output: "0.000002" },
}));
function metadata(model, cost = "0.00001") {
  return {
    gateway: {
      enabledDisallowPromptTraining: true,
      cost,
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
    },
  };
}
function transport({
  quotaCode = "quota_for_entity_exceeded",
  cost = "0.00001",
  positiveFailure = false,
  negativeFailure = false,
} = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    if (String(url).endsWith("/models"))
      return Response.json({ data: pricing });
    if (String(url).endsWith("/credits"))
      return new Response(null, { status: 401 });
    const headers = new Headers(options.headers);
    const model =
      headers.get("ai-model-id") ?? headers.get("ai-language-model-id");
    const body = JSON.parse(options.body);
    calls.push({ model, body });
    if (positiveFailure)
      return Response.json(
        { error: { code: "synthetic_failure" } },
        { status: 503 },
      );
    if (model === NEGATIVE_CANARY_ROUTE.model)
      return Response.json(
        negativeFailure
          ? {
              error: {
                type: "internal_server_error",
                message: "private provider text",
              },
            }
          : { error: { type: "no_providers_available" } },
        { status: negativeFailure ? 500 : 403 },
      );
    if (calls.length === 4)
      return Response.json(
        { error: { code: quotaCode, type: quotaCode } },
        { status: 402 },
      );
    if (String(url).endsWith("/embedding-model"))
      return Response.json({
        embeddings: [Array(768).fill(0.001)],
        usage: { tokens: 10 },
        providerMetadata: metadata(model, cost),
      });
    return Response.json({
      content: [{ type: "text", text: "moon" }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 1, text: 1, reasoning: 0 },
      },
      providerMetadata: metadata(model, cost),
      warnings: [],
    });
  };
  return { calls, fetcher };
}
async function harness(t, options) {
  const directory = await mkdtemp(join(tmpdir(), "nilumi-vgw-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await initializeLedger(directory, "vgw");
  const http = transport(options);
  const preflight = config();
  const run = (probe, overrides = {}) =>
    runCanary({
      directory,
      key,
      config: preflight,
      probe,
      fetcher: http.fetcher,
      now,
      ...overrides,
    });
  return { directory, preflight, run, ...http };
}
async function positives(h) {
  assert.equal((await h.run("chat")).status, "passed");
  assert.equal((await h.run("embedding")).status, "passed");
  const negative = await h.run("negative");
  assert.equal(negative.status, "degraded_probe_observed");
  h.preflight.quotaReadback = {
    keyId: "canary",
    limitUsd: 0.00002,
    spendUsd: 0.00002,
    refresh: "none",
    editedAt: negative.at,
    checkedAt: at(300_000),
  };
}
test("preflight verifies budget readbacks, exact S3 remainder, expiry, fixtures and distinct team keys", () => {
  requirePreflight(config(), now);
  for (const mutate of [
    (c) => {
      c.checkedAt = at(1);
    },
    (c) => {
      c.checkedAt = at(-86400_001);
    },
    (c) => {
      c.fixtureHash = "different";
    },
    (c) => {
      c.paidCreditValidThrough = at(-1);
    },
    (c) => {
      c.runtimeBudget.limitUsd = 10;
    },
    (c) => {
      c.runtimeBudget.alerts = [50, 100];
    },
    (c) => {
      c.canaryBudget.teamId = "other";
    },
    (c) => {
      c.canaryBudget.keyId = c.runtimeBudget.keyId;
    },
    (c) => {
      c.canaryBudget.limitUsd = 0.1;
    },
    (c) => {
      c.evaluationBudget.limitUsd = 2;
    },
    (c) => {
      c.evaluationBudget.attribution = "user";
    },
    (c) => {
      c.evaluationBudget.refresh = "monthly";
    },
    (c) => {
      c.canaryBudgetVerified = false;
    },
    (c) => {
      c.noTeamByok = false;
    },
  ]) {
    const c = config();
    mutate(c);
    assert.throws(() => requirePreflight(c, now), /account_preflight_pending/);
  }
});
test("complete priced manifest includes rejected attempts and stops if rates exceed the cap", () => {
  assert.ok(manifest(pricing).maximumUsd < 0.1);
  assert.equal(manifest().maximumUsd, null);
  assert.equal(manifest(pricing).probes.length, 4);
  const expensive = pricing.map((p) => ({
    ...p,
    pricing: { input: "1", output: "1" },
  }));
  assert.throws(() => manifest(expensive), /manifest_exceeds_cap/);
  const unknown = structuredClone(pricing);
  delete unknown[0].pricing.output;
  assert.throws(() => manifest(unknown), /pricing_unverified/);
});
test("pinned SDK canary verifies chat, embeddings, policy, exact quota and used-key revocation", async (t) => {
  const h = await harness(t);
  await positives(h);
  const quota = await h.run("quota", { now: now + 300_000 });
  assert.equal(quota.status, "degraded_probe_observed");
  assert.equal(quota.failure.httpStatus, 402);
  assert.equal(quota.failure.providerCode, "quota_for_entity_exceeded");
  assert.equal(h.calls.length, 4);
  assert.deepEqual(h.calls[1].body.providerOptions.gateway, {
    only: ["openai"],
    disallowPromptTraining: true,
  });
  assert.deepEqual(h.calls[1].body.providerOptions.openai, { dimensions: 768 });
  const shutdown = await verifyRevocation({
    directory: h.directory,
    key,
    fetcher: h.fetcher,
  });
  assert.equal(shutdown.status, "revocation_verified");
  assert.equal(h.calls.length, 4);
  const ledger = JSON.parse(
    await readFile(join(h.directory, "vgw-budget.json"), "utf8"),
  );
  assert.equal(ledger.entries[2].state, "reserved");
  assert.equal(ledger.entries[3].state, "reserved");
  assert.ok(shutdown.countedUsd <= 0.1);
  for (const name of [
    "gateway-session.json",
    "gateway-shutdown.json",
    `${quota.id}-report.json`,
  ])
    assert.ok(!(await readFile(join(h.directory, name), "utf8")).includes(key));
});
test("an unclassified live-shaped HTTP 500 retains diagnostics and cannot pass policy rejection", async (t) => {
  const h = await harness(t, { negativeFailure: true });
  await h.run("chat");
  await h.run("embedding");
  const report = await h.run("negative");
  assert.equal(report.status, "failed");
  assert.deepEqual(report.failure, {
    reason: "gateway_request_failed",
    httpStatus: 500,
  });
  assert.equal(JSON.stringify(report).includes("private"), false);
  assert.equal(JSON.stringify(report).includes(key), false);
  await assert.rejects(h.run("quota"), /previous_probe_incomplete/);
  assert.equal(h.calls.length, 3);
  const ledger = JSON.parse(
    await readFile(join(h.directory, "vgw-budget.json"), "utf8"),
  );
  assert.equal(ledger.entries[2].state, "reserved");
  assert.equal(ledger.entries[2].charged, ledger.entries[2].allowance);
});
test("credit exhaustion fails closed but cannot pass the key quota proof", async (t) => {
  const h = await harness(t, { quotaCode: "insufficient_credits" });
  await positives(h);
  assert.equal((await h.run("quota", { now: now + 300_000 })).status, "failed");
  assert.equal(h.calls.length, 4);
});
test("out-of-order probes, replay and credential swaps never dispatch", async (t) => {
  const h = await harness(t);
  await assert.rejects(h.run("embedding"), /probe_order_invalid/);
  assert.equal(h.calls.length, 0);
  await h.run("chat");
  await assert.rejects(h.run("chat"), /probe_attempt_limit_reached/);
  await assert.rejects(
    h.run("embedding", { key: "another-credential" }),
    /canary_identity_changed/,
  );
  assert.equal(h.calls.length, 1);
});
test("quota requires the edited canary budget, matching spend, and propagated readback", async (t) => {
  const h = await harness(t);
  await positives(h);
  const valid = structuredClone(h.preflight.quotaReadback);
  for (const invalid of [
    null,
    { ...valid, keyId: "runtime" },
    { ...valid, limitUsd: 1 },
    { ...valid, checkedAt: at(299_999) },
    { ...valid, editedAt: at(-1) },
  ]) {
    h.preflight.quotaReadback = invalid;
    await assert.rejects(
      h.run("quota", { now: now + 300_000 }),
      /quota_readback_pending/,
    );
  }
  assert.equal(h.calls.length, 3);
});
test("missing previous reports, errors and over-reservation charges block further calls", async (t) => {
  const h = await harness(t);
  const chat = await h.run("chat");
  await rm(join(h.directory, `${chat.id}-report.json`));
  await assert.rejects(h.run("embedding"), /ENOENT/);
  assert.equal(h.calls.length, 1);
  for (const options of [{ positiveFailure: true }, { cost: "0.099" }]) {
    const failed = await harness(t, options);
    assert.equal((await failed.run("chat")).status, "failed");
    await assert.rejects(failed.run("embedding"), /previous_probe_incomplete/);
    assert.equal(failed.calls.length, 1);
  }
});
test("shutdown stops dispatch and distinguishes revoked keys from active or unrelated invalid keys", async (t) => {
  const h = await harness(t);
  await h.run("chat");
  await assert.rejects(
    verifyRevocation({
      directory: h.directory,
      key: "wrong-key",
      fetcher: h.fetcher,
    }),
    /canary_identity_changed/,
  );
  for (const status of [200, 402, 403, 500]) {
    const report = await verifyRevocation({
      directory: h.directory,
      key,
      fetcher: async () => new Response(null, { status }),
    });
    assert.equal(report.status, "revocation_unverified");
  }
  await assert.rejects(h.run("embedding"), /role_halted/);
  assert.equal(h.calls.length, 1);
  const unused = await harness(t);
  await assert.rejects(unused.run("embedding"), /probe_order_invalid/);
  assert.equal(
    (
      await verifyRevocation({
        directory: unused.directory,
        key,
        fetcher: unused.fetcher,
      })
    ).status,
    "revocation_unverified",
  );
});
test("SDK error extraction keeps only known codes and status, including nested errors", () => {
  const failure = gatewayFailure({
    statusCode: 500,
    cause: {
      statusCode: 402,
      responseBody: JSON.stringify({
        error: {
          code: "quota_for_entity_exceeded",
          message: "private provider text",
        },
      }),
    },
  });
  assert.deepEqual(failure, {
    reason: "gateway_budget_or_credit_exhausted",
    httpStatus: 402,
    providerCode: "quota_for_entity_exceeded",
  });
  assert.equal(JSON.stringify(failure).includes("private"), false);
  assert.equal(
    gatewayFailure({ statusCode: 401 }).reason,
    "gateway_authentication_failed",
  );
  assert.deepEqual(
    gatewayFailure({
      statusCode: 500,
      cause: { statusCode: 503 },
      response: { error: { code: "no_providers_available" } },
    }),
    {
      reason: "no_providers_available",
      httpStatus: 500,
      providerCode: "no_providers_available",
    },
  );
  assert.deepEqual(
    gatewayFailure({
      statusCode: 500,
      message: "private provider text",
      response: { error: { code: "unreviewed_code" } },
    }),
    { reason: "gateway_request_failed", httpStatus: 500 },
  );
});
test("preflight refusal makes zero network requests", async () => {
  let calls = 0;
  await assert.rejects(
    runCanary({
      directory: "/missing",
      key,
      probe: "chat",
      config: { ...config(), checkedAt: null },
      fetcher: async () => {
        calls++;
      },
    }),
    /account_preflight_pending/,
  );
  assert.equal(calls, 0);
});
test("changed catalog training policy blocks the complete canary before paid dispatch", async (t) => {
  const h = await harness(t);
  for (const id of [
    GATEWAY_ROLES.nlu.model,
    GATEWAY_ROLES.embed.model,
    NEGATIVE_CANARY_ROUTE.model,
  ]) {
    const changed = structuredClone(pricing);
    changed.find((item) => item.id === id).no_training = "some";
    await assert.rejects(
      h.run("chat", { fetcher: async () => Response.json({ data: changed }) }),
      /route_policy_changed/,
    );
  }
  assert.equal(h.calls.length, 0);
});
test("persistent halt prevents a fresh positive probe even with valid account evidence", async (t) => {
  const h = await harness(t);
  await atomicFile(join(h.directory, "gateway-halt.json"), "{}");
  await assert.rejects(h.run("chat"), /role_halted/);
  assert.equal(h.calls.length, 0);
});

test("follow-up carries prior conservative spend once and retains failed policy evidence", async (t) => {
  const h = await harness(t, { negativeFailure: true });
  await withLedger(h.directory, "vgw", async (ledger, save) => {
    reserve(ledger, "previous-uncertain", 1063);
    await save();
  });
  const parent = await mkdtemp(join(tmpdir(), "nilumi-vgw-followup-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const source = join(h.directory, "vgw-budget.json");
  const initialized = await initializeFollowup(parent, source);
  assert.equal(initialized.priorCountedUsd, 0.001063);
  await assert.rejects(initializeFollowup(parent, source));
  const run = (probe) =>
    runFollowup({
      directory: parent,
      probe,
      key,
      config: h.preflight,
      fetcher: (url, options) =>
        String(url).endsWith("/models")
          ? Promise.resolve(
              Response.json({
                data: pricing.map((p) => ({
                  ...p,
                  pricing: { input: "0.0000001", output: "0.0000005" },
                })),
              }),
            )
          : h.fetcher(url, options),
      now,
    });
  const chat = await run("chat");
  assert.equal(chat.aggregateCountedUsd, 0.001073);
  const embed = await run("embedding");
  assert.equal(embed.dimensions, 768);
  const negative = await run("negative");
  assert.equal(negative.status, "failed");
  assert.equal(negative.transportFailure.httpStatus, 500);
  assert.equal(negative.aggregateCapUsd, 1.05);
  assert.ok(!JSON.stringify(negative).includes("private provider text"));
  await assert.rejects(run("quota"), /followup_probe_not_enabled/);
  await assert.rejects(run("chat"));
  assert.equal(h.calls.length, 3);
  const old = JSON.parse(await readFile(source, "utf8"));
  assert.equal(old.entries[0].charged, 1063);
});

test("changed prior ledger blocks follow-up before inference", async (t) => {
  const h = await harness(t);
  await withLedger(h.directory, "vgw", async (ledger, save) => {
    reserve(ledger, "previous-uncertain", 1063);
    await save();
  });
  const parent = await mkdtemp(join(tmpdir(), "nilumi-vgw-followup-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const source = join(h.directory, "vgw-budget.json");
  await initializeFollowup(parent, source);
  await withLedger(h.directory, "vgw", async (ledger, save) => {
    reserve(ledger, "changed", 1);
    await save();
  });
  await assert.rejects(
    runFollowup({
      directory: parent,
      probe: "chat",
      key,
      config: h.preflight,
      fetcher: h.fetcher,
      now,
    }),
    /prior_run_changed_or_missing/,
  );
  assert.equal(h.calls.length, 0);
});

test("alternate policy route stays pinned, synthetic-only and bound to the session", async (t) => {
  const h = await harness(t);
  h.preflight.negativeProfile = "schematron";
  const alternate = {
    id: "inference-net/schematron-v2-small",
    no_training: "none",
    pricing: { input: "0.00000005", output: "0.00000023" },
  };
  const fetcher = (url, options) => {
    if (String(url).endsWith("/models"))
      return Promise.resolve(Response.json({ data: [...pricing, alternate] }));
    const headers = new Headers(options?.headers);
    if (headers.get("ai-language-model-id") === alternate.id) {
      h.calls.push({ model: alternate.id, body: JSON.parse(options.body) });
      return Promise.resolve(
        Response.json(
          { error: { type: "no_providers_available" } },
          { status: 400 },
        ),
      );
    }
    return h.fetcher(url, options);
  };
  await h.run("chat", { fetcher });
  await h.run("embedding", { fetcher });
  const result = await h.run("negative", { fetcher });
  assert.equal(result.status, "degraded_probe_observed");
  assert.deepEqual(h.calls.at(-1).body.providerOptions.gateway.only, [
    "inference-net",
  ]);
  assert.equal(
    h.calls.at(-1).body.providerOptions.gateway.disallowPromptTraining,
    true,
  );
  await assert.rejects(
    h.run("quota", {
      fetcher,
      config: { ...h.preflight, negativeProfile: "arcee" },
    }),
    /canary_identity_changed/,
  );
});

test("a later aggregate ledger carries all earlier rounds without a fresh allowance", async (t) => {
  const h = await harness(t);
  await withLedger(h.directory, "vgw", async (ledger, save) => {
    reserve(ledger, "first-round", 1063);
    await save();
  });
  const first = await mkdtemp(join(tmpdir(), "nilumi-vgw-parent-"));
  const second = await mkdtemp(join(tmpdir(), "nilumi-vgw-parent-"));
  t.after(() => rm(first, { recursive: true, force: true }));
  t.after(() => rm(second, { recursive: true, force: true }));
  await initializeFollowup(first, join(h.directory, "vgw-budget.json"));
  await withLedger(first, "vgw-followup", async (ledger, save) => {
    reserve(ledger, "second-round", 1063);
    await save();
  });
  const imported = await initializeFollowup(
    second,
    join(first, "vgw-followup-budget.json"),
  );
  assert.equal(imported.priorCountedUsd, 0.002126);
  const disk = JSON.parse(
    await readFile(join(second, "vgw-followup-budget.json"), "utf8"),
  );
  assert.equal(disk.entries.length, 1);
  assert.equal(disk.cap, 1050000);
  assert.equal(disk.entries[0].charged, 2126);
});

async function quotaHarness(
  t,
  {
    prior = 1063,
    warmCost = "0.009",
    warmFailure = false,
    quotaCode = "quota_for_entity_exceeded",
    independent = false,
  } = {},
) {
  const h = await harness(t);
  await withLedger(h.directory, "vgw", async (ledger, save) => {
    reserve(ledger, "prior-round", prior);
    await save();
  });
  const directory = await mkdtemp(join(tmpdir(), "nilumi-vgw-quota-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await initializeFollowup(directory, join(h.directory, "vgw-budget.json"));
  const cfg = {
    ...h.preflight,
    negativeProfile: "schematron",
    ...(independent ? { quotaDecision: "adr-052-independent-quota" } : {}),
  };
  const catalog = [
    ...pricing.map((p) => ({
      ...p,
      pricing: { input: "0.0000001", output: "0.0000005" },
    })),
    {
      id: "inference-net/schematron-v2-small",
      no_training: "none",
      pricing: { input: "0.00000005", output: "0.00000023" },
    },
    {
      id: QUOTA_CANARY.model,
      no_training: "all",
      pricing: { input: "0.000005", output: "0.00003" },
    },
  ];
  let quota = false;
  const fetcher = async (url, options) => {
    if (String(url).endsWith("/models"))
      return Response.json({ data: catalog });
    const model = new Headers(options?.headers).get("ai-language-model-id");
    if (model === "inference-net/schematron-v2-small") {
      h.calls.push({ model, body: JSON.parse(options.body) });
      return Response.json(
        { error: { type: "no_providers_available" } },
        { status: 400 },
      );
    }
    if (model === QUOTA_CANARY.model || quota) {
      h.calls.push({
        model,
        body: JSON.parse(options.body),
        bytes: Buffer.byteLength(options.body),
      });
      if (quota)
        return Response.json(
          { error: { code: quotaCode, type: quotaCode } },
          { status: 402 },
        );
      if (warmFailure)
        return Response.json(
          {
            error: {
              type: "internal_server_error",
              message: "private error content",
            },
          },
          { status: 500 },
        );
      return Response.json({
        content: [{ type: "text", text: "1,2,3" }],
        finishReason: { unified: "length", raw: "length" },
        usage: {
          inputTokens: { total: 20, noCache: 20, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 224, text: 224, reasoning: 0 },
        },
        providerMetadata: metadata(model, warmCost),
        warnings: [],
      });
    }
    return h.fetcher(url, options);
  };
  for (const probe of independent
    ? ["chat", "embedding"]
    : ["chat", "embedding", "negative"])
    await runFollowup({ directory, probe, key, config: cfg, fetcher, now });
  return {
    ...h,
    directory,
    cfg,
    catalog,
    fetcher,
    setQuota: () => {
      quota = true;
    },
    run: (probe = "warmup", calls = 1, overrides = {}) =>
      runQuota({
        directory,
        probe,
        calls,
        key,
        config: cfg,
        fetcher,
        ...overrides,
      }),
  };
}

test("quota fixture is priced from the actual bounded SDK payload and cannot become runtime input", async (t) => {
  const h = await quotaHarness(t);
  assert.equal(quotaManifest(h.catalog).reservationMicros, 9280);
  const result = await h.run();
  assert.equal(result.reports[0].status, "passed");
  const call = h.calls.at(-1);
  assert.ok(call.bytes <= 512);
  assert.equal(call.body.maxOutputTokens, 224);
  assert.equal(call.body.providerOptions.openai.store, false);
  assert.equal(call.body.providerOptions.openai.reasoningEffort, "none");
  assert.deepEqual(call.body.providerOptions.gateway, {
    disallowPromptTraining: true,
    only: ["openai"],
  });
  assert.equal(result.aggregateCountedUsd, (1297 + 9000) / 1e6);
  await assert.rejects(h.run("quota"), /quota_exhaustion_readback_pending/);
});

test("ADR-052 independently validates quota after both live positive controls without inventing negative proof", async (t) => {
  const h = await quotaHarness(t, { independent: true });
  const result = await h.run();
  assert.equal(result.reports[0].status, "passed");
  assert.equal(
    h.calls.some((c) => c.model === "inference-net/schematron-v2-small"),
    false,
  );
  delete h.cfg.quotaDecision;
  await assert.rejects(h.run(), /diagnostics_incomplete/);
});

test("quota warm-up stops before crossing the aggregate allowance, including prior rounds", async (t) => {
  const h = await quotaHarness(t, { prior: 997000, warmCost: "0.00672" });
  const result = await h.run("warmup", 25);
  assert.equal(result.reports.at(-1).status, "failed");
  assert.equal(result.reports.at(-1).reason, "hard_cap_reached");
  assert.equal(h.calls.filter((c) => c.model === QUOTA_CANARY.model).length, 7);
  assert.ok(result.aggregateCountedUsd <= 1.05);
  await assert.rejects(h.run(), /canary_halted/);
});

test("unknown warm-up failure retains its full reservation and never retries", async (t) => {
  const h = await quotaHarness(t, { warmFailure: true });
  const result = await h.run("warmup", 25);
  assert.equal(result.reports.length, 1);
  assert.equal(result.reports[0].status, "failed");
  assert.equal(result.aggregateCountedUsd, (1297 + 9280) / 1e6);
  assert.ok(!JSON.stringify(result).includes("private error content"));
  assert.equal(h.calls.filter((c) => c.model === QUOTA_CANARY.model).length, 1);
  await assert.rejects(h.run(), /canary_halted/);
});

test("conservative policy reservation cannot stop warm-up before confirmed costs reach the key budget", async (t) => {
  const h = await quotaHarness(t, { warmCost: "0.009089" });
  for (let i = 0; i < 4; i++) await h.run("warmup", 25);
  await h.run("warmup", 10);
  // 110 receipts plus diagnostics total 0.99981, while retained reservations
  // put the conservative key count above 1. The next bounded crossing is needed.
  const result = await h.run("warmup", 2);
  assert.equal(result.reports.length, 1);
  assert.equal(result.reports[0].status, "passed");
  assert.equal(
    h.calls.filter((c) => c.model === QUOTA_CANARY.model).length,
    111,
  );
  assert.ok(result.aggregateCountedUsd <= 1.05);
});

test("quota requires settled backend exhaustion and exact SDK rejection; credit exhaustion cannot pass", async (t) => {
  for (const quotaCode of [
    "quota_for_entity_exceeded",
    "insufficient_credits",
  ]) {
    const h = await quotaHarness(t, { quotaCode });
    for (let i = 0; i < 4; i++) await h.run("warmup", 25);
    await h.run("warmup", 12);
    const ledger = JSON.parse(
      await readFile(join(h.directory, "vgw-followup-budget.json"), "utf8"),
    );
    const last = ledger.entries.at(-1);
    const report = JSON.parse(
      await readFile(join(h.directory, `${last.id}-quota-report.json`), "utf8"),
    );
    const observedAt = Date.parse(report.at) + 20001;
    h.cfg.quotaExhaustion = {
      keyId: "canary",
      limitUsd: 1,
      spendUsd: 1.00802,
      refresh: "none",
      checkedAt: new Date(observedAt).toISOString(),
    };
    h.setQuota();
    const result = await h.run("quota", 1, { now: observedAt });
    assert.equal(
      result.reports[0].status,
      quotaCode === "quota_for_entity_exceeded"
        ? "degraded_probe_observed"
        : "failed",
    );
    assert.equal(result.reports[0].failure.httpStatus, 402);
    assert.equal(result.reports[0].failure.providerCode, quotaCode);
    assert.ok(result.aggregateCountedUsd <= 1.05);
    await assert.rejects(h.run(), /canary_halted/);
  }
});

test("streaming negative control uses the same pinned SDK policy and never promotes a generic 500", async (t) => {
  for (const status of [400, 500]) {
    const h = await harness(t);
    h.preflight.negativeProfile = "schematron";
    h.preflight.negativeMode = "streaming";
    const alternate = {
      id: "inference-net/schematron-v2-small",
      no_training: "none",
      pricing: { input: "0.00000005", output: "0.00000023" },
    };
    const fetcher = async (url, options) => {
      if (String(url).endsWith("/models"))
        return Response.json({ data: [...pricing, alternate] });
      const headers = new Headers(options?.headers);
      if (headers.get("ai-language-model-id") === alternate.id) {
        h.calls.push({
          model: alternate.id,
          streaming: headers.get("ai-language-model-streaming"),
          body: JSON.parse(options.body),
        });
        return Response.json(
          {
            error: {
              type:
                status === 400
                  ? "no_providers_available"
                  : "internal_server_error",
              message: "private error text",
            },
          },
          { status },
        );
      }
      return h.fetcher(url, options);
    };
    await h.run("chat", { fetcher });
    await h.run("embedding", { fetcher });
    const report = await h.run("negative", { fetcher });
    assert.equal(
      report.status,
      status === 400 ? "degraded_probe_observed" : "failed",
    );
    assert.equal(report.negativeMode, "streaming");
    assert.equal(h.calls.at(-1).streaming, "true");
    assert.deepEqual(h.calls.at(-1).body.providerOptions.gateway, {
      disallowPromptTraining: true,
      only: ["inference-net"],
    });
    assert.equal(h.calls.at(-1).body.maxOutputTokens, 32);
    assert.equal(h.calls.length, 3);
    assert.ok(!JSON.stringify(report).includes("private error text"));
  }
});
