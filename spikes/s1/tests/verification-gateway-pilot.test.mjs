import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { GATEWAY_ROLES } from "../config/gateway-roles.ts";
import {
  PILOT_NOTICE_VERSION,
  PILOT_PROCESSORS,
} from "../config/privacy-notice.ts";
import { createCatalogGuard } from "../lib/gateway/catalog.ts";
import { privacyResponse, requirePilotOrigin } from "../lib/gateway/http.ts";
import {
  PILOT_EVIDENCE_VERSION,
  PilotStore,
} from "../lib/gateway/pilot-store.ts";
import { createPilotRuntime } from "../lib/gateway/runtime.ts";

const owner = "owner@example.test";
const other = "adult@example.test";
const schema = await readFile(
  new URL("../sql/gateway-pilot.sql", import.meta.url),
  "utf8",
);
const models = Object.values(GATEWAY_ROLES).map((r) => ({
  id: r.model,
  no_training: "all",
  pricing: { input: "0.0000001", output: "0.0000005" },
}));
test("production origin validation uses configured HTTPS origin behind a proxy and rejects spoofed headers", () => {
  const previousMode = process.env.NODE_ENV;
  const previousOrigin = process.env.GATEWAY_PILOT_ORIGIN;
  try {
    process.env.NODE_ENV = "production";
    process.env.GATEWAY_PILOT_ORIGIN = "https://staging.nilumi.in";
    const request = new Request("http://internal:3000/api/privacy", {
      headers: { origin: "https://staging.nilumi.in" },
    });
    assert.doesNotThrow(() => requirePilotOrigin(request));
    assert.throws(
      () =>
        requirePilotOrigin(
          new Request(request.url, {
            headers: {
              origin: "https://other.test",
              "x-forwarded-host": "other.test",
              "x-forwarded-proto": "https",
            },
          }),
        ),
      /origin_refused/,
    );
    delete process.env.GATEWAY_PILOT_ORIGIN;
    assert.throws(
      () => requirePilotOrigin(request),
      /gateway_origin_not_configured/,
    );
    for (const invalid of [
      "http://staging.nilumi.in",
      "https://staging.nilumi.in/path",
      "invalid",
    ]) {
      process.env.GATEWAY_PILOT_ORIGIN = invalid;
      assert.throws(
        () => requirePilotOrigin(request),
        /gateway_origin_not_configured/,
      );
    }
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    if (previousOrigin === undefined) delete process.env.GATEWAY_PILOT_ORIGIN;
    else process.env.GATEWAY_PILOT_ORIGIN = previousOrigin;
  }
});
async function setup(
  t,
  { persistent = false, cap = 8000000, evidence = true } = {},
) {
  const directory = persistent
    ? await mkdtemp(join(tmpdir(), "nilumi-pilot-pg-"))
    : undefined;
  let pg = await PGlite.create(directory);
  await pg.exec(schema);
  await pg.query(
    "INSERT INTO gateway_pilot.household(id,owner_email,adults,notice_version,processors,monthly_cap_micros,evidence_version) VALUES('founding',$1,$2::jsonb,$3,$4::jsonb,$5,$6)",
    [
      owner,
      JSON.stringify([owner, other]),
      PILOT_NOTICE_VERSION,
      JSON.stringify(PILOT_PROCESSORS),
      cap,
      evidence ? PILOT_EVIDENCE_VERSION : null,
    ],
  );
  const db = { transaction: (work) => pg.transaction((tx) => work(tx)) };
  const store = new PilotStore(db);
  t.after(async () => {
    await pg.close();
    if (directory) await rm(directory, { recursive: true, force: true });
  });
  return {
    store,
    query: (...args) => pg.query(...args),
    ack: () => store.privacy(owner, "acknowledge", PILOT_NOTICE_VERSION, true),
    restart: async () => {
      await pg.close();
      pg = await PGlite.create(directory);
      return new PilotStore(db);
    },
  };
}
function receipt(model, cost = "0.000004") {
  return {
    gateway: {
      cost,
      enabledDisallowPromptTraining: true,
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
function textResponse(model) {
  return Response.json({
    content: [{ type: "text", text: "moon" }],
    finishReason: { unified: "stop", raw: "stop" },
    usage: {
      inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
    },
    providerMetadata: receipt(model),
    warnings: [],
  });
}

test("durable acknowledgement requires owner attestation, current evidence and current household", async (t) => {
  const h = await setup(t, { evidence: false });
  await assert.rejects(
    h.store.reserve(owner, "nlu", 50),
    /gateway_verification_required/,
  );
  await assert.rejects(
    h.store.status("outsider@example.test"),
    /household_member_required/,
  );
  await assert.rejects(
    h.store.privacy(other, "acknowledge", PILOT_NOTICE_VERSION, true),
    /privacy_acknowledgement_refused/,
  );
  await assert.rejects(
    h.store.privacy(owner, "acknowledge", PILOT_NOTICE_VERSION, false),
    /privacy_acknowledgement_refused/,
  );
  await h.ack();
  await h.query("UPDATE gateway_pilot.household SET evidence_version=$1", [
    PILOT_EVIDENCE_VERSION,
  ]);
  assert.ok(await h.store.reserve(owner, "nlu", 50));
  await h.query("UPDATE gateway_pilot.household SET adults=$1::jsonb", [
    JSON.stringify([owner, "new-adult@example.test"]),
  ]);
  await assert.rejects(
    h.store.reserve(owner, "nlu", 50),
    /household_acknowledgement_required/,
  );
});
test("withdrawal fences queued work; only the withdrawing adult can release their veto", async (t) => {
  const h = await setup(t);
  await h.ack();
  const id = await h.store.reserve(owner, "nlu", 50);
  await h.store.privacy(other, "withdraw", PILOT_NOTICE_VERSION, false);
  let calls = 0;
  await assert.rejects(
    h.store.dispatch(id, owner, async () => {
      calls++;
      return new Response();
    }),
    /household_acknowledgement_required/,
  );
  assert.equal(calls, 0);
  assert.equal(
    (
      await h.query(
        "SELECT charged,state FROM gateway_pilot.reservation WHERE id=$1",
        [id],
      )
    ).rows[0].state,
    "blocked",
  );
  await h.store.privacy(owner, "release-veto", PILOT_NOTICE_VERSION, false);
  await assert.rejects(h.ack(), /privacy_acknowledgement_refused/);
  await h.store.privacy(other, "release-veto", PILOT_NOTICE_VERSION, false);
  await assert.rejects(
    h.store.reserve(owner, "nlu", 50),
    /household_acknowledgement_required/,
  );
  await h.ack();
  assert.ok(await h.store.reserve(owner, "nlu", 50));
});
test("renewed acknowledgement cannot authorize a job queued under an earlier revision", async (t) => {
  const h = await setup(t);
  await h.ack();
  const id = await h.store.reserve(owner, "nlu", 50);
  await h.ack();
  await assert.rejects(
    h.store.dispatch(id, owner, async () => new Response()),
    /queued_privacy_state_changed/,
  );
});
test("PostgreSQL transactions serialize concurrent reservations at the durable hard cap", async (t) => {
  const h = await setup(t, { cap: 100 });
  await h.ack();
  const results = await Promise.allSettled([
    h.store.reserve(owner, "nlu", 60),
    h.store.reserve(other, "answer", 60),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.match(
    results.find((r) => r.status === "rejected").reason.message,
    /hard_cap_reached/,
  );
  assert.equal(
    Number(
      (
        await h.query(
          "SELECT sum(charged) AS total FROM gateway_pilot.reservation",
        )
      ).rows[0].total,
    ),
    60,
  );
});
test("acknowledgement, unknown charges and role halts survive a real PostgreSQL filesystem restart", async (t) => {
  const h = await setup(t, { persistent: true });
  await h.ack();
  const id = await h.store.reserve(owner, "nlu", 50);
  await h.store.dispatch(id, owner, async () => new Response());
  await h.store.fail(id, owner, "nlu", "gateway_request_failed");
  const restarted = await h.restart();
  assert.ok((await restarted.status(other)).acknowledgement.recordedAt);
  await assert.rejects(restarted.reserve(owner, "nlu", 50), /role_halted/);
  const r = (
    await h.query(
      "SELECT charged,state FROM gateway_pilot.reservation WHERE id=$1",
      [id],
    )
  ).rows[0];
  assert.equal(r.state, "unknown");
  assert.equal(Number(r.charged), 50);
});
test("unfinished dispatch after restart blocks subsequent sends and cannot be replayed", async (t) => {
  const h = await setup(t, { persistent: true });
  await h.ack();
  const id = await h.store.reserve(owner, "nlu", 50);
  await h.store.dispatch(id, owner, async () => new Response());
  const restarted = await h.restart();
  const next = await restarted.reserve(owner, "nlu", 50);
  await assert.rejects(
    restarted.dispatch(next, owner, async () => new Response()),
    /prior_dispatch_unresolved/,
  );
  await assert.rejects(
    restarted.dispatch(id, owner, async () => new Response()),
    /reservation_not_dispatchable/,
  );
});
test("catalog guard blocks ineligible, unknown and stale unavailable routes before transport", async () => {
  let now = 0;
  let available = true;
  let loads = 0;
  const guard = createCatalogGuard(
    async () => {
      loads++;
      if (!available) throw Error("offline");
      return models;
    },
    () => now,
  );
  await guard("nlu");
  await guard("embed");
  assert.equal(loads, 1);
  await assert.rejects(guard("unknown"), /route_not_approved/);
  available = false;
  now = 300001;
  await assert.rejects(guard("nlu"), /offline/);
  const ineligible = createCatalogGuard(async () =>
    models.map((m) => ({ ...m, no_training: "none" })),
  );
  await assert.rejects(ineligible("nlu"), /route_policy_unverified/);
});
test("runtime adapter checks controls, settles receipt cost and shares the sensitive boundary across ingress", async (t) => {
  const h = await setup(t);
  await h.ack();
  let calls = 0;
  const run = createPilotRuntime(h.store, "synthetic-test-key", {
    catalog: createCatalogGuard(async () => models),
    fetcher: async (_url, options) => {
      calls++;
      const body = JSON.parse(options.body);
      assert.deepEqual(body.providerOptions.gateway, {
        disallowPromptTraining: true,
        only: ["openai"],
      });
      assert.equal(body.providerOptions.openai.store, false);
      return textResponse(
        new Headers(options.headers).get("ai-language-model-id"),
      );
    },
  });
  const result = await run(
    owner,
    "nlu",
    "Buy rice",
    "text",
    AbortSignal.timeout(5000),
  );
  assert.equal(result.result.text, "moon");
  assert.equal(calls, 1);
  assert.equal(
    Number(
      (await h.query("SELECT charged FROM gateway_pilot.reservation")).rows[0]
        .charged,
    ),
    4,
  );
  for (const ingress of ["text", "voice", "import", "background"])
    await assert.rejects(
      run(owner, "nlu", "My OTP is 482913", ingress, AbortSignal.timeout(5000)),
      /sensitive_input_refused/,
    );
  assert.equal(calls, 1);
});
test("withdrawal at the transport boundary prevents provider dispatch and releases only an unsent reservation", async (t) => {
  const h = await setup(t);
  await h.ack();
  let calls = 0;
  let checks = 0;
  const guard = createCatalogGuard(async () => models);
  const run = createPilotRuntime(h.store, "synthetic-test-key", {
    catalog: async (role) => {
      checks++;
      if (checks === 3)
        await h.store.privacy(other, "withdraw", PILOT_NOTICE_VERSION, false);
      return guard(role);
    },
    fetcher: async () => {
      calls++;
      return new Response();
    },
  });
  await assert.rejects(
    run(owner, "nlu", "Buy rice", "background", AbortSignal.timeout(5000)),
    /household_acknowledgement_required/,
  );
  assert.equal(calls, 0);
  assert.equal(
    Number(
      (await h.query("SELECT charged FROM gateway_pilot.reservation")).rows[0]
        .charged,
    ),
    0,
  );
});
test("settled reservation overruns retain actual cost and persist a role halt", async (t) => {
  const h = await setup(t);
  await h.ack();
  const id = await h.store.reserve(owner, "nlu", 50);
  await h.store.dispatch(id, owner, async () => new Response());
  await assert.rejects(
    h.store.settle(id, owner, 0.00006),
    /reservation_exceeded/,
  );
  assert.equal(
    Number(
      (
        await h.query(
          "SELECT charged FROM gateway_pilot.reservation WHERE id=$1",
          [id],
        )
      ).rows[0].charged,
    ),
    60,
  );
  await assert.rejects(h.store.reserve(owner, "nlu", 50), /role_halted/);
});
test("queued reservations cannot be reused for another role or an insufficient allowance", async (t) => {
  const h = await setup(t);
  await h.ack();
  const id = await h.store.reserve(owner, "embed", 50);
  let calls = 0;
  const send = async () => {
    calls++;
    return new Response();
  };
  await assert.rejects(
    h.store.dispatch(id, owner, send, { role: "nlu", minimumAllowance: 40 }),
    /reservation_not_dispatchable/,
  );
  await assert.rejects(
    h.store.dispatch(id, owner, send, { role: "embed", minimumAllowance: 51 }),
    /reservation_not_dispatchable/,
  );
  assert.equal(calls, 0);
});
test("restricted PostgreSQL runtime role can withdraw but cannot change evidence, membership or caps", async (t) => {
  const h = await setup(t);
  await h.ack();
  for (const statement of [
    "CREATE ROLE gateway_pilot_test",
    "GRANT USAGE ON SCHEMA gateway_pilot TO gateway_pilot_test",
    "GRANT SELECT ON ALL TABLES IN SCHEMA gateway_pilot TO gateway_pilot_test",
    "GRANT INSERT ON gateway_pilot.reservation,gateway_pilot.halt,gateway_pilot.privacy_event TO gateway_pilot_test",
    "GRANT UPDATE ON gateway_pilot.reservation TO gateway_pilot_test",
    "GRANT UPDATE(acknowledgement,vetoes,notice_version,processors,revision,updated_at) ON gateway_pilot.household TO gateway_pilot_test",
    "SET ROLE gateway_pilot_test",
  ])
    await h.query(statement);
  await h.store.privacy(other, "withdraw", PILOT_NOTICE_VERSION, false);
  for (const statement of [
    "UPDATE gateway_pilot.household SET evidence_version='forged'",
    "UPDATE gateway_pilot.household SET monthly_cap_micros=8000000",
    "UPDATE gateway_pilot.household SET owner_email='outsider@example.test'",
  ])
    await assert.rejects(h.query(statement), /permission denied/);
  assert.deepEqual((await h.store.status(owner)).vetoes, [other]);
});
test("privacy HTTP mutations require signed-in membership, same origin and explicit attestation", async (t) => {
  const h = await setup(t);
  const request = (body, origin = "https://nilumi.test") =>
    new Request("https://nilumi.test/api/privacy", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  const body = {
    action: "acknowledge",
    noticeVersion: PILOT_NOTICE_VERSION,
    explained: true,
  };
  assert.equal(
    (await privacyResponse(request(body), null, h.store)).status,
    401,
  );
  assert.equal(
    (await privacyResponse(request(body, "https://other.test"), owner, h.store))
      .status,
    403,
  );
  assert.equal(
    (
      await privacyResponse(
        request({ ...body, explained: false }),
        owner,
        h.store,
      )
    ).status,
    403,
  );
  assert.equal(
    (await privacyResponse(request(body), owner, h.store)).status,
    200,
  );
  assert.equal(
    (
      await privacyResponse(
        new Request("https://nilumi.test/api/privacy"),
        other,
        h.store,
      )
    ).status,
    200,
  );
});
