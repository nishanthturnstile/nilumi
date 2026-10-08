import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { MODELS, modelOptions } from "../config/models.ts";
import {
  evaluationDisclosure,
  evaluationMode,
  SYNTHETIC_FIXTURE_SHA256,
} from "../config/nlu-policy.ts";
import {
  calculateCost,
  estimateReservation,
  freshLedger,
  reserve,
  settle,
  validateLedger,
} from "../lib/nlu/budget.ts";
import { REGISTRY, visibleContext } from "../lib/nlu/context.ts";
import {
  NluResult,
  normalizeProviderOutput,
  Parser,
  PROVIDER_SCHEMA,
  Validated,
} from "../lib/nlu/contracts.ts";
import { checkDate, resolveDate } from "../lib/nlu/dates.ts";
import {
  EvaluationRequest,
  evaluateCase,
  handleEvaluation,
  privacyReady,
  schedule,
} from "../lib/nlu/evaluate.ts";
import { loadFixtures } from "../lib/nlu/fixtures.ts";
import { inlineReceipt } from "../lib/nlu/gateway.ts";
import { buildPrompt, STATIC_PREFIX } from "../lib/nlu/prompt.ts";
import { percentile, score, summarize } from "../lib/nlu/scoring.ts";
import {
  detectSensitive,
  luhn,
  normalizeNumbers,
  verhoeff,
} from "../lib/nlu/sensitive.ts";
import { validateResult } from "../lib/nlu/validate.ts";
import { acquireLedger, runComparison } from "../scripts/evaluate-nlu.mjs";

const { fixtures, hash } = await loadFixtures();
test("inline receipt verifies managed routing without an eventually consistent lookup", () => {
  const receipt = {
    enabledDisallowPromptTraining: true,
    cost: "0.0011866",
    routing: {
      originalModelId: "openai/gpt-4.1-nano",
      canonicalSlug: "openai/gpt-4.1-nano",
      finalProvider: "openai",
      modelAttemptCount: 1,
      totalProviderAttemptCount: 1,
      modelAttempts: [
        {
          canonicalSlug: "openai/gpt-4.1-nano",
          success: true,
          providerAttemptCount: 1,
          providerAttempts: [
            { provider: "openai", credentialType: "system", success: true },
          ],
        },
      ],
    },
  };
  assert.deepEqual(inlineReceipt(receipt), {
    routedProvider: "openai",
    routedModel: "openai/gpt-4.1-nano",
    isByok: false,
    cost: 0.0011866,
  });
  for (const mutate of [
    (x) => {
      delete x.routing;
    },
    (x) => {
      x.enabledDisallowPromptTraining = false;
    },
    (x) => {
      x.routing.finalProvider = "azure";
    },
    (x) => {
      x.routing.canonicalSlug = "openai/gpt-5-nano";
    },
    (x) => {
      x.routing.modelAttempts[0].canonicalSlug = "other";
    },
    (x) => {
      x.routing.totalProviderAttemptCount = 2;
    },
    (x) => {
      x.routing.modelAttempts[0].providerAttempts[0].credentialType = "unknown";
    },
    (x) => {
      x.routing.modelAttempts[0].providerAttempts[0].success = false;
    },
  ]) {
    const changed = structuredClone(receipt);
    mutate(changed);
    assert.deepEqual(inlineReceipt(changed), {});
  }
  const byok = structuredClone(receipt);
  byok.routing.modelAttempts[0].providerAttempts[0].credentialType = "byok";
  assert.equal(inlineReceipt(byok).isByok, true);
  for (const cost of [null, "", "NaN", -1])
    assert.equal(inlineReceipt({ ...receipt, cost }).cost, undefined);
});
const byId = (id) => structuredClone(fixtures.find((f) => f.id === id));
const fixture = () => byId("memories-01");
const now = "2026-10-07T15:00:00+05:30";
const ctx = fixture().context;
const run = (f) => validateResult(f.expected, f.transcript, f.context);
const outcome = (f) => run(f).outcomes[0];
const controller = () => new AbortController();
const privacy = {
  team: "synthetic-test-team",
  verified_at: "2026-10-07",
  verified_by: "offline-verifier",
  team_zero_data_retention: true,
  team_no_prompt_training: true,
  gateway_managed_credentials_only: true,
  approved_providers: ["openai"],
  approved_models: Object.keys(MODELS),
  fixture_review_sha256: hash,
  fixture_reviewed_by: "offline-reviewer",
};
const env = {
  AI_GATEWAY_API_KEY: "mock-only",
  RAILWAY_ENVIRONMENT_NAME: "staging",
  NLU_EVALUATION_ENABLED: "true",
  NLU_EVALUATOR_EMAILS: "owner@example.invalid",
  NLU_EVALUATION_ORIGIN: "https://example.invalid",
  CLOUDFLARE_API_TOKEN: "mock-only",
  CLOUDFLARE_ACCOUNT_ID: "00000000000000000000000000000000",
  CLOUDFLARE_AI_GATEWAY_ID: "offline-test",
};
const hobbyPrivacy = {
  ...privacy,
  team_zero_data_retention: false,
  team_no_prompt_training: false,
  synthetic_hobby: {
    approved_at: "2026-10-07T19:57:50+05:30",
    approved_by: "offline-owner",
    fixture_sha256: SYNTHETIC_FIXTURE_SHA256,
  },
};
const req = (
  body = {
    caseIds: ["shopping-01"],
    modelIds: ["openai/gpt-6-luna"],
    passes: 1,
  },
  headers = {},
) =>
  new Request("https://example.invalid/api/nlu/evaluate", {
    method: "POST",
    headers: {
      origin: "https://example.invalid",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
const mockResponse = (f) => ({
  raw: f.expected,
  usage: { input: 100, output: 20, cached: 0, cacheWrite: 0, reasoning: 0 },
  routedModel: "openai/gpt-6-luna",
  routedProvider: "openai",
  isByok: false,
});
const deps = (extra) => ({
  email: "owner@example.invalid",
  env,
  privacy,
  fixtures: { fixtures, hash },
  adapter: async () => mockResponse(byId("shopping-01")),
  ...extra,
});

test("golden set has exact stratification, language, multi-command and holdout coverage", () => {
  assert.equal(fixtures.length, 60);
  assert.equal(new Set(fixtures.map((f) => f.id)).size, 60);
  for (const [cat, total] of Object.entries({
    shopping: 12,
    memories: 12,
    dates: 12,
    questions: 8,
    corrections: 8,
    privacy: 8,
  })) {
    assert.equal(fixtures.filter((f) => f.category === cat).length, total);
    assert.equal(
      fixtures.filter((f) => f.category === cat && f.split === "held_out")
        .length,
      2,
    );
  }
  assert.equal(fixtures.filter((f) => f.split === "development").length, 48);
  assert.ok(fixtures.filter((f) => f.tags.includes("tamil")).length >= 20);
  assert.ok(
    fixtures.filter((f) => f.tags.includes("multi_command")).length >= 10,
  );
  assert.ok(
    fixtures.some((f) => f.split === "held_out" && f.tags.includes("tamil")),
  );
  assert.ok(
    fixtures.some(
      (f) => f.split === "held_out" && f.tags.includes("multi_command"),
    ),
  );
  for (const f of fixtures)
    assert.ok(!STATIC_PREFIX.includes(f.transcript), `golden leak ${f.id}`);
});
for (const f of fixtures)
  test(`authored expected interpretation and deterministic outcome: ${f.id}`, () => {
    const result = run(f);
    assert.deepEqual(score(f, result).mismatches, []);
    assert.equal(score(f, result).correct, true);
    if (result.status === "parsed")
      for (const o of result.outcomes)
        if (o.status === "interpreted" || o.status === "confirmation_required")
          assert.ok(o.validated);
  });

test("OpenAI wire schema requires every object field, uses nullable optional slots and supports every command branch", () => {
  function inspect(node) {
    if (!node || typeof node !== "object") return;
    assert.equal(node.oneOf, undefined);
    if (node.type === "object" && node.properties) {
      assert.deepEqual(
        new Set(node.required),
        new Set(Object.keys(node.properties)),
      );
      assert.equal(node.additionalProperties, false);
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(inspect);
      else inspect(child);
    }
  }
  inspect(PROVIDER_SCHEMA);
  assert.equal(
    PROVIDER_SCHEMA.properties.smalltalk_reply.anyOf[1].type,
    "null",
  );
  const original = byId("shopping-01").expected;
  const wire = { ...original, smalltalk_reply: null };
  wire.commands[0].items[0].unit = null;
  wire.commands[0].items[0].quantity = null;
  assert.deepEqual(
    NluResult.parse(normalizeProviderOutput(wire)),
    byId("shopping-01").expected,
  );
  assert.equal(
    NluResult.safeParse(normalizeProviderOutput({ ...wire, language: null }))
      .success,
    false,
  );
  assert.equal(
    NluResult.safeParse(
      normalizeProviderOutput({ language: "en", commands: [null] }),
    ).success,
    false,
  );
});
test("provider schema is generated from contract; >5 commands and command+smalltalk fail", () => {
  assert.equal(PROVIDER_SCHEMA.properties.commands.maxItems, 5);
  assert.equal(PROVIDER_SCHEMA.properties.commands.items.oneOf, undefined);
  assert.equal(PROVIDER_SCHEMA.properties.commands.items.anyOf.length, 18);
  const commands = Array(6).fill({ kind: "undo" });
  assert.equal(
    NluResult.safeParse({ language: "en", commands }).success,
    false,
  );
  assert.equal(
    NluResult.safeParse({
      language: "en",
      commands: [{ kind: "undo" }],
      smalltalk_reply: "Hi",
    }).success,
    false,
  );
  assert.equal(
    NluResult.safeParse({ language: "en", commands: [], smalltalk_reply: "Hi" })
      .success,
    true,
  );
  assert.equal(
    NluResult.safeParse({ language: "en", commands: [], confidence: 1 })
      .success,
    false,
  );
});
test("parser-only absent date slots cannot pass the validated contract", () => {
  const f = byId("dates-04");
  assert.ok(Parser.command.safeParse(f.expected.commands[0]).success);
  assert.equal(
    Validated.command.safeParse(f.expected.commands[0]).success,
    false,
  );
  assert.equal(outcome(f).validated, undefined);
  const date = { phrase: "at 7", precision: "minute" };
  assert.ok(Parser.date.safeParse(date).success);
  assert.equal(Validated.date.safeParse(date).success, false);
});
test("all additional documented command variants have focused coverage", () => {
  const additional = [
    { kind: "inspect", entity: { mention: "filter", existing_id: "e-filter" } },
    {
      kind: "task_create",
      title: "clean filter",
      assignees: [{ mention: "me", member_id: "member-arjun" }],
    },
    {
      kind: "task_list",
      assignee: { mention: "me", member_id: "member-arjun" },
    },
    { kind: "task_complete", target: { task_id: "task-clean" } },
    { kind: "unsupported", reason: "not supported" },
    { kind: "clarify_answer", choice: "Ravi one" },
  ];
  const context = structuredClone(ctx);
  context.tasks = [
    { id: "task-clean", title: "clean filter", visibility: "household" },
  ];
  context.pending = {
    created_at: "2026-10-07T14:58:00+05:30",
    choices: ["Ravi one"],
  };
  for (const command of additional) {
    assert.ok(Parser.command.safeParse(command).success);
    const r = validateResult(
      { language: "en", commands: [command] },
      "clean filter Ravi one",
      context,
    );
    assert.equal(r.status, "parsed");
    assert.notEqual(r.outcomes[0].status, "invalid");
  }
});
test("shopping score preserves distinct items, order, quantities and repetitions", () => {
  const f = byId("shopping-01");
  f.expected.commands[0].items = [{ name: "milk and sugar" }];
  assert.equal(score(byId("shopping-01"), run(f)).correct, false);
  const multi = byId("shopping-10");
  multi.expected.commands.reverse();
  assert.equal(score(byId("shopping-10"), run(multi)).correct, false);
  const qty = byId("shopping-02");
  qty.expected.commands[0].items[0].quantity = 3;
  assert.equal(outcome(qty).status, "invalid");
  assert.equal(score(byId("shopping-02"), run(qty)).correct, false);
  const repeated = byId("shopping-09");
  repeated.expected.commands[0].items.shift();
  assert.equal(score(byId("shopping-09"), run(repeated)).correct, false);
});
test("invented entity/memory/member/list IDs and private IDs fail", () => {
  const f = fixture();
  f.expected.commands[0].facts[0].subject.existing_id = "invented";
  assert.ok(outcome(f).reasons.includes("invalid_entity_id"));
  const hidden = byId("privacy-01");
  hidden.expected.commands[0].target.memory_id = "m-nila-hidden";
  assert.ok(outcome(hidden).reasons.includes("invalid_memory_id"));
  const list = byId("shopping-01");
  list.expected.commands[0].list.list_id = "invented";
  assert.ok(outcome(list).reasons.includes("invalid_list_id"));
  const member = byId("dates-01");
  member.expected.commands[0].targets[0].member_id = "invented";
  assert.ok(outcome(member).reasons.includes("invalid_member_id"));
});
test("evidence bounds, Tamil UTF-16, surrogate boundaries and fabricated support", () => {
  const f = fixture();
  f.expected.commands[0].facts[0].evidence.end = 999;
  assert.ok(outcome(f).reasons.includes("invalid_evidence"));
  const t = byId("memories-02");
  assert.equal(outcome(t).status, "interpreted");
  f.transcript = "😀 I prefer coffee";
  f.expected.commands[0].facts[0].evidence = {
    start: 1,
    end: f.transcript.length,
  };
  assert.ok(outcome(f).reasons.includes("invalid_evidence"));
  f.expected.commands[0].facts[0].evidence = {
    start: 3,
    end: f.transcript.length,
  };
  assert.equal(outcome(f).status, "interpreted");
  f.expected.commands[0].facts[0].value.value = "bikes";
  assert.ok(outcome(f).reasons.includes("unsupported_value"));
});
test("alternate valid evidence spans and NFC values can pass scoring", () => {
  const expected = fixture();
  expected.transcript = "I prefer coffee. I prefer coffee";
  expected.expected.commands[0].facts[0].evidence = { start: 0, end: 15 };
  const actual = structuredClone(expected);
  actual.expected.commands[0].facts[0].evidence = { start: 17, end: 32 };
  assert.equal(score(expected, run(actual)).correct, true);
});
test("affirmed writes cannot be produced from negation or hypothetical evidence", () => {
  for (const id of ["memories-06", "memories-07"]) {
    const f = byId(id);
    f.expected.commands[0].facts[0].polarity = "affirmed";
    assert.ok(outcome(f).reasons.includes("polarity_mismatch"));
    assert.equal(outcome(f).validated, undefined);
  }
  const f = byId("shopping-01");
  f.transcript = "Don't add milk and sugar";
  assert.ok(outcome(f).reasons.includes("non_affirmed_list"));
});
test("predicate subject/value compatibility, exclusivity and provisional fields", () => {
  const f = fixture();
  const fact = f.expected.commands[0].facts[0];
  fact.predicate = "new:favorite_season";
  assert.deepEqual(outcome(f).provisional, ["new:favorite_season"]);
  fact.predicate = "invented";
  assert.ok(outcome(f).reasons.includes("unknown_predicate"));
  fact.predicate = "warranty_expires_on";
  assert.ok(outcome(f).reasons.includes("predicate_subject_mismatch"));
  assert.ok(outcome(f).reasons.includes("predicate_value_mismatch"));
  fact.object = { mention: "Vikram", existing_id: "e-vikram" };
  assert.ok(outcome(f).reasons.includes("value_object_exclusivity"));
});
test("private defaults cannot be relaxed by hints without a verified share cue", () => {
  const f = byId("memories-08");
  f.expected.commands[0].facts[0].visibility_hint = "household";
  assert.ok(outcome(f).reasons.includes("missing_share_cue"));
  assert.deepEqual(outcome(f).visibilities, ["private"]);
  f.expected.commands[0].facts[0].visibility_hint = "private";
  assert.equal(outcome(f).status, "interpreted");
  const share = byId("privacy-01");
  share.transcript = "Read my note with my wife";
  share.expected.commands[0].evidence.end = share.transcript.length;
  assert.ok(outcome(share).reasons.includes("missing_share_cue"));
});
test("health corrections require confirmation and ownership survives visibility", () => {
  const f = byId("corrections-01");
  f.context.memories[0].predicate = "allergic_to";
  f.expected.commands[0].new_value.value = "coffee";
  assert.equal(outcome(f).status, "confirmation_required");
  f.context.memories[0].visibility = "shared";
  f.context.memories[0].owner_id = "member-nila";
  assert.ok(outcome(f).reasons.includes("not_owner"));
});
test("wrong vs changed-in-world correction reasons are validated", () => {
  const f = byId("corrections-01");
  f.expected.commands[0].reason = "changed_in_world";
  assert.ok(outcome(f).reasons.includes("correction_reason_unclear"));
  const changed = byId("corrections-05");
  assert.equal(outcome(changed).status, "interpreted");
  assert.equal(outcome(changed).validated.effective.precision, "month");
});
test("private entity sharing needs a safe projection confirmation", () => {
  const f = byId("privacy-01");
  f.expected.commands[0].target.memory_id = "m-projection";
  assert.deepEqual(outcome(f).reasons, ["private_entity_projection"]);
  assert.equal(outcome(f).status, "confirmation_required");
});
test("invisible records and their previous-turn text are excluded before prompt construction", () => {
  const context = structuredClone(ctx);
  context.previous_turns.push({
    text: "hidden synthetic note",
    memory_ids: ["m-nila-hidden"],
  });
  const visible = visibleContext(context);
  assert.ok(!visible.memories.some((x) => x.id === "m-nila-hidden"));
  assert.ok(
    !buildPrompt("Where is passport?", context).prompt.includes(
      "hidden synthetic note",
    ),
  );
  context.entities.push({
    id: "secret-entity",
    name: "private spouse asset",
    aliases: ["hidden alias"],
    type: "item",
    visibility: "private",
    owner_id: "member-nila",
  });
  const prompt = buildPrompt("Where is passport?", context);
  assert.ok(!prompt.prompt.includes("hidden alias"));
});
test("undo checks 24h expiry, irreversible forget and conflicting postconditions", () => {
  const f = byId("corrections-03");
  f.context.operations[0].postcondition_holds = false;
  assert.ok(outcome(f).reasons.includes("undo_conflict"));
  f.context.operations[0].postcondition_holds = true;
  f.context.operations[0].reversible = false;
  assert.ok(outcome(f).reasons.includes("irreversible_operation"));
  assert.ok(
    outcome(byId("corrections-07")).reasons.includes("unavailable_undo"),
  );
});
test("pending clarification expires at five minutes and validates choices", () => {
  const f = byId("corrections-08");
  f.context.pending.created_at = "2026-10-07T14:55:00+05:30";
  assert.ok(outcome(f).reasons.includes("expired_clarification"));
  f.context.pending.created_at = "2026-10-07T14:55:01+05:30";
  assert.equal(outcome(f).status, "interpreted");
  f.expected.commands[0].choice = "invented";
  assert.ok(outcome(f).reasons.includes("invalid_choice"));
});

for (const [phrase, expected, precision] of [
  ["tomorrow morning", "2026-10-08T09:00:00+05:30", "minute"],
  ["tomorrow afternoon", "2026-10-08T14:00:00+05:30", "minute"],
  ["tomorrow evening", "2026-10-08T18:30:00+05:30", "minute"],
  ["tonight", "2026-10-07T20:30:00+05:30", "minute"],
  ["weekend", "2026-10-10T10:00:00+05:30", "minute"],
  ["நாளை காலை", "2026-10-08T09:00:00+05:30", "minute"],
  ["naalai madhiyam", "2026-10-08T14:00:00+05:30", "minute"],
  ["3/4/2027", "2027-04-03T00:00:00+05:30", "day"],
  ["2020", "2020-01-01T00:00:00+05:30", "year"],
  ["March 2026", "2026-03-01T00:00:00+05:30", "month"],
  ["next month", "2026-11-01T00:00:00+05:30", "month"],
])
  test(`fixed household date rule: ${phrase}`, () =>
    assert.deepEqual(resolveDate(phrase, now), {
      resolved: expected,
      precision,
    }));
test("dates use fixture occurrence, equivalent ISO offsets and mismatch clarification", () => {
  assert.equal(
    resolveDate("tomorrow morning", "2026-10-07T23:59:00+05:30").resolved,
    "2026-10-08T09:00:00+05:30",
  );
  assert.equal(
    resolveDate("tomorrow morning", "2026-12-31T23:59:00+05:30").resolved,
    "2027-01-01T09:00:00+05:30",
  );
  assert.equal(
    checkDate(
      {
        phrase: "tomorrow morning",
        resolved: "2026-10-08T03:30:00Z",
        precision: "minute",
      },
      now,
      true,
    ),
    null,
  );
  const f = byId("dates-01");
  f.expected.commands[0].at.resolved = "2026-10-09T09:00:00+05:30";
  assert.ok(outcome(f).reasons.includes("date_disagreement"));
  f.expected.commands[0].at.phrase = "imaginary day";
  assert.ok(outcome(f).reasons.includes("unsupported_date_phrase"));
});
test("recurrence is retained and malformed syntax is rejected", () => {
  const f = byId("dates-08");
  assert.equal(outcome(f).validated.recurrence, "FREQ=DAILY");
  f.expected.commands[0].recurrence = "run arbitrary text";
  assert.ok(outcome(f).reasons.includes("invalid_recurrence"));
});
for (const [transcript, category] of [
  ["4111 1111 1111 1111", "payment_card"],
  ["Remember 234567890124", "aadhaar"],
  ["ABCDE1234F", "pan"],
  ["OTP four three two one", "secret_cue"],
  ["UPI PIN double nine one two", "secret_cue"],
  ["my password roseGarden42", "password"],
  ["password short", "password"],
  ["OTP ௪௩௨௧", "secret_cue"],
])
  test(`sensitive boundary refuses category ${category} before adapter`, async () => {
    let calls = 0;
    const f = fixture();
    f.transcript = transcript;
    const row = await evaluateCase(
      f,
      "openai/gpt-6-luna",
      1,
      async () => {
        calls++;
        throw new Error("must not call");
      },
      controller().signal,
    );
    assert.equal(calls, 0);
    assert.equal(row.status, "refused");
    assert.equal(row.validation.category, category);
    assert.equal(row.costUsd, 0);
    assert.equal(row.schemaValid, null);
    assert.ok(!JSON.stringify(row).includes(transcript));
    assert.equal(row.validation.parsed, undefined);
  });
test("checksums, spoken digits and STT o/l folding", () => {
  assert.equal(luhn("4111111111111111"), true);
  assert.equal(luhn("4111111111111112"), false);
  assert.equal(verhoeff("234567890124"), true);
  assert.equal(normalizeNumbers("four three two one"), "4321");
  assert.equal(normalizeNumbers("double nine triple one"), "99111");
  assert.equal(normalizeNumbers("4 o 2 l"), "4021");
});
test("phone, dates, amounts and benign code words pass controls", () => {
  for (const input of [
    "Vikram phone 9876543210",
    "renew on 3/4/2027",
    "cost is 1234 rupees",
    "source code review",
    "password needs changing",
    "4111111111111112",
  ])
    assert.equal(detectSensitive(input), null, input);
  assert.equal(detectSensitive("OTP 9876543210"), "secret_cue");
});
test("a secret in prior context stops the entire call before prompt construction", async () => {
  const f = fixture();
  f.context.previous_turns[0].text = "my password verySecretValue";
  let calls = 0;
  const row = await evaluateCase(
    f,
    "openai/gpt-6-luna",
    1,
    async () => {
      calls++;
    },
    controller().signal,
  );
  assert.equal(calls, 0);
  assert.equal(row.status, "refused");
  assert.ok(!JSON.stringify(row).includes("verySecretValue"));
});
test("adapter failure and malformed output preserve failure attribution without error text", async () => {
  const f = fixture();
  const error = await evaluateCase(
    f,
    "openai/gpt-6-luna",
    1,
    async () => {
      throw new Error("provider echoed secret");
    },
    controller().signal,
  );
  assert.equal(error.status, "model_error");
  assert.equal(error.correct, false);
  assert.equal(error.costUsd, null);
  assert.ok(!JSON.stringify(error).includes("provider echoed"));
  const bad = await evaluateCase(
    f,
    "openai/gpt-6-luna",
    1,
    async () => ({ raw: { commands: [], oops: "bad" } }),
    controller().signal,
  );
  assert.equal(bad.status, "schema_error");
  assert.equal(bad.schemaValid, false);
});
test("model route mismatch and BYOK disqualify output even with correct commands", async () => {
  for (const extra of [
    { isByok: true },
    { routedProvider: "unapproved" },
    { routedModel: "another/model" },
  ]) {
    const f = fixture();
    const row = await evaluateCase(
      f,
      "openai/gpt-6-luna",
      1,
      async () => ({ ...mockResponse(f), ...extra }),
      controller().signal,
    );
    assert.equal(row.status, "routing_error");
    assert.equal(row.correct, false);
  }
});
test("abort cancels active adapter and prevents interpreting its eventual response", async () => {
  const c = controller();
  let called = false;
  const pending = evaluateCase(
    fixture(),
    "openai/gpt-6-luna",
    1,
    async ({ signal }) => {
      called = true;
      await new Promise((resolve) =>
        signal.addEventListener("abort", resolve, { once: true }),
      );
      return mockResponse(fixture());
    },
    c.signal,
  );
  c.abort();
  const row = await pending;
  assert.equal(called, true);
  assert.equal(row.status, "cancelled");
  assert.equal(row.correct, false);
});
test("five second timeout is bounded with no repair or fallback request", async () => {
  let calls = 0;
  const keepAlive = setTimeout(() => {}, 6000);
  try {
    const row = await evaluateCase(
      fixture(),
      "openai/gpt-6-luna",
      1,
      async () => {
        calls++;
        return new Promise(() => {});
      },
      controller().signal,
    );
    assert.equal(row.status, "timeout");
    assert.equal(calls, 1);
    assert.ok(row.latencyMs >= 4500 && row.latencyMs < 6000);
  } finally {
    clearTimeout(keepAlive);
  }
});
test("effective model options enforce OpenAI only, ZDR, no training and supported reasoning", () => {
  for (const id of Object.keys(MODELS))
    assert.deepEqual(modelOptions(id), {
      gateway: {
        only: ["openai"],
        zeroDataRetention: true,
        disallowPromptTraining: true,
      },
      openai:
        MODELS[id].reasoningEffort === null
          ? { store: false }
          : { reasoningEffort: "low", store: false },
    });
});
test("Hobby exception omits unavailable ZDR and keeps no-training, OpenAI-only and supported reasoning", () => {
  assert.equal(evaluationMode(undefined), "zdr");
  for (const bad of ["", "hobby", "production", "typo"])
    assert.equal(evaluationMode(bad), null);
  for (const id of Object.keys(MODELS))
    assert.deepEqual(modelOptions(id, "synthetic_hobby"), {
      gateway: { only: ["openai"], disallowPromptTraining: true },
      openai:
        MODELS[id].reasoningEffort === null
          ? { store: false }
          : { reasoningEffort: "low", store: false },
    });
  assert.throws(() => modelOptions("openai/gpt-6-luna", "typo"));
});
test("Hobby gate requires an explicit exception, fixed synthetic corpus, owner review and managed credentials", () => {
  const ids = ["openai/gpt-6-luna"];
  assert.equal(privacyReady(hobbyPrivacy, hash, ids, "synthetic_hobby"), true);
  assert.equal(privacyReady(hobbyPrivacy, hash, ids), false);
  for (const candidate of [
    { ...hobbyPrivacy, synthetic_hobby: undefined },
    { ...hobbyPrivacy, gateway_managed_credentials_only: false },
    { ...hobbyPrivacy, fixture_reviewed_by: null },
    { ...hobbyPrivacy, fixture_review_sha256: null },
    { ...hobbyPrivacy, approved_providers: [] },
    { ...hobbyPrivacy, approved_models: [] },
    {
      ...hobbyPrivacy,
      synthetic_hobby: {
        ...hobbyPrivacy.synthetic_hobby,
        approved_at: "invalid",
      },
    },
    {
      ...hobbyPrivacy,
      synthetic_hobby: { ...hobbyPrivacy.synthetic_hobby, approved_by: null },
    },
    {
      ...hobbyPrivacy,
      synthetic_hobby: {
        ...hobbyPrivacy.synthetic_hobby,
        fixture_sha256: "different",
      },
    },
  ])
    assert.equal(privacyReady(candidate, hash, ids, "synthetic_hobby"), false);
  const changed = {
    ...hobbyPrivacy,
    fixture_review_sha256: "real-data-substitution",
    synthetic_hobby: {
      ...hobbyPrivacy.synthetic_hobby,
      fixture_sha256: "real-data-substitution",
    },
  };
  assert.equal(
    privacyReady(changed, "real-data-substitution", ids, "synthetic_hobby"),
    false,
  );
});
test("Hobby endpoint permits only fixture IDs and discloses its mode on every result", async () => {
  let mode;
  const hobbyDeps = deps({
    privacy: hobbyPrivacy,
    env: { ...env, NLU_EVALUATION_MODE: "synthetic_hobby" },
    adapter: async (args) => {
      mode = args.evaluationMode;
      return mockResponse(byId("shopping-01"));
    },
  });
  const response = await handleEvaluation(req(), hobbyDeps);
  assert.equal(response.status, 200);
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert.equal(mode, "synthetic_hobby");
  for (const event of events.filter((x) =>
    ["start", "result"].includes(x.type),
  )) {
    assert.equal(event.evaluationMode, "synthetic_hobby");
    assert.equal(event.zeroDataRetentionRequired, false);
    assert.equal(event.noPromptTrainingRequired, true);
    assert.equal(event.productionAccepted, false);
  }
  for (const body of [
    {
      caseIds: ["shopping-01"],
      modelIds: ["openai/gpt-6-luna"],
      passes: 1,
      transcript: "real family text",
    },
    {
      caseIds: ["shopping-01"],
      modelIds: ["openai/gpt-6-luna"],
      passes: 1,
      evaluationMode: "synthetic_hobby",
    },
  ])
    assert.equal((await handleEvaluation(req(body), hobbyDeps)).status, 400);
});
test("Hobby endpoint blocks changed corpus, unknown mode, production and unreviewed data before any adapter call", async () => {
  let calls = 0;
  for (const extra of [
    { env: { ...env, NLU_EVALUATION_MODE: "unknown" } },
    {
      env: {
        ...env,
        NLU_EVALUATION_MODE: "synthetic_hobby",
        RAILWAY_ENVIRONMENT_NAME: "production",
      },
    },
    { fixtures: { fixtures, hash: "changed" } },
    { privacy: { ...hobbyPrivacy, fixture_review_sha256: null } },
    { privacy: { ...hobbyPrivacy, gateway_managed_credentials_only: false } },
  ]) {
    const response = await handleEvaluation(
      req(),
      deps({
        privacy: hobbyPrivacy,
        env: { ...env, NLU_EVALUATION_MODE: "synthetic_hobby" },
        ...extra,
        adapter: async () => {
          calls++;
          return mockResponse(byId("shopping-01"));
        },
      }),
    );
    assert.ok([404, 503].includes(response.status));
  }
  assert.equal(calls, 0);
});
test("Hobby results fail routing verification for BYOK, wrong or unknown providers/models", async () => {
  for (const changed of [
    { isByok: true },
    { isByok: undefined },
    { routedProvider: "azure" },
    { routedProvider: undefined },
    { routedModel: undefined },
    { routedModel: "openai/gpt-5-nano" },
  ]) {
    const row = await evaluateCase(
      byId("shopping-01"),
      "openai/gpt-6-luna",
      1,
      async () => ({ ...mockResponse(byId("shopping-01")), ...changed }),
      controller().signal,
      "synthetic_hobby",
    );
    assert.equal(row.status, "routing_error");
    assert.equal(row.correct, false);
  }
});
test("request rejects arbitrary text, overrides, URLs, duplicate/unknown models and invalid passes", () => {
  for (const body of [
    {
      caseIds: ["shopping-01"],
      modelIds: ["openai/gpt-6-luna"],
      passes: 1,
      transcript: "custom",
    },
    {
      caseIds: ["shopping-01"],
      modelIds: ["openai/gpt-6-luna"],
      passes: 1,
      budget: 5,
    },
    {
      caseIds: ["shopping-01", "shopping-01"],
      modelIds: ["openai/gpt-6-luna"],
      passes: 1,
    },
    { caseIds: ["shopping-01"], modelIds: ["other/model"], passes: 1 },
    { caseIds: ["shopping-01"], modelIds: ["openai/gpt-6-luna"], passes: 4 },
  ])
    assert.equal(EvaluationRequest.safeParse(body).success, false);
});
test("server privacy gate checks all policies, approved routes and exact reviewed fixture hash", () => {
  assert.equal(privacyReady(privacy, hash, ["openai/gpt-6-luna"]), true);
  for (const key of [
    "team_zero_data_retention",
    "team_no_prompt_training",
    "gateway_managed_credentials_only",
  ])
    assert.equal(
      privacyReady({ ...privacy, [key]: false }, hash, ["openai/gpt-6-luna"]),
      false,
    );
  assert.equal(
    privacyReady(privacy, "changed-fixtures", ["openai/gpt-6-luna"]),
    false,
  );
  assert.equal(
    privacyReady({ ...privacy, approved_providers: [] }, hash, [
      "openai/gpt-6-luna",
    ]),
    false,
  );
  assert.equal(
    privacyReady({ ...privacy, approved_models: [] }, hash, [
      "openai/gpt-6-luna",
    ]),
    false,
  );
});
test("authenticated staging evaluation accepts Railway's exact public HTTPS origin behind its internal URL", async () => {
  let calls = 0;
  const request = new Request("http://0.0.0.0:8080/api/nlu/evaluate", {
    method: "POST",
    headers: {
      origin: "https://example.invalid",
      "x-forwarded-proto": "https",
      "x-forwarded-host": "example.invalid",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      caseIds: ["shopping-01"],
      modelIds: ["openai/gpt-6-luna"],
      passes: 1,
    }),
  });
  const response = await handleEvaluation(
    request,
    deps({
      env: { ...env, NLU_EVALUATION_MODE: "synthetic_hobby" },
      privacy: hobbyPrivacy,
      adapter: async () => {
        calls++;
        return mockResponse(byId("shopping-01"));
      },
    }),
  );
  assert.equal(response.status, 200);
  await response.text();
  assert.equal(calls, 1);
});
test("Railway proxy handling rejects missing, ambiguous and mismatched origins before model access", async () => {
  let calls = 0;
  for (const overrides of [
    { origin: "https://attacker.invalid" },
    { origin: "" },
    { "x-forwarded-host": "attacker.invalid" },
    { "x-forwarded-host": "example.invalid.attacker.invalid" },
    { "x-forwarded-host": "example.invalid:444" },
    { "x-forwarded-host": "example.invalid, attacker.invalid" },
    { "x-forwarded-host": "" },
    { "x-forwarded-proto": "http" },
    { "x-forwarded-proto": "https,http" },
    { "x-forwarded-proto": "" },
  ]) {
    const request = new Request("http://0.0.0.0:8080/api/nlu/evaluate", {
      method: "POST",
      headers: {
        origin: "https://example.invalid",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "example.invalid",
        "content-type": "application/json",
        ...overrides,
      },
      body: "{}",
    });
    assert.equal(
      (
        await handleEvaluation(
          request,
          deps({
            adapter: async () => {
              calls++;
              return mockResponse(fixture());
            },
          }),
        )
      ).status,
      403,
    );
  }
  assert.equal(calls, 0);
});
test("endpoint blocks disabled/non-staging evaluation, auth, allowlist, origin, credentials, review", async () => {
  for (const [extra, status] of [
    [{ env: { ...env, NLU_EVALUATION_ENABLED: "false" } }, 404],
    [{ env: { ...env, RAILWAY_ENVIRONMENT_NAME: "production" } }, 404],
    [{ email: null }, 401],
    [{ email: "other@example.invalid" }, 403],
    [{ env: { ...env, AI_GATEWAY_API_KEY: "" } }, 503],
    [{ privacy: { ...privacy, team_zero_data_retention: false } }, 503],
  ]) {
    let calls = 0;
    const response = await handleEvaluation(
      req(),
      deps({
        ...extra,
        adapter: async () => {
          calls++;
        },
      }),
    );
    assert.equal(response.status, status);
    assert.equal(calls, 0);
  }
  assert.equal(
    (
      await handleEvaluation(
        req(undefined, { origin: "https://attacker.invalid" }),
        deps(),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handleEvaluation(
        req(undefined, { "content-type": "text/plain" }),
        deps(),
      )
    ).status,
    415,
  );
  assert.equal(
    (
      await handleEvaluation(
        req({
          caseIds: ["unknown"],
          modelIds: ["openai/gpt-6-luna"],
          passes: 1,
        }),
        deps(),
      )
    ).status,
    400,
  );
});
test("endpoint streams versions, result and done with one active service run", async () => {
  let unblock;
  const wait = new Promise((resolve) => {
    unblock = resolve;
  });
  let calls = 0;
  const response = await handleEvaluation(
    req(),
    deps({
      adapter: async () => {
        calls++;
        await wait;
        return mockResponse(byId("shopping-01"));
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal((await handleEvaluation(req(), deps())).status, 409);
  unblock();
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert.deepEqual(
    events.map((x) => x.type),
    ["start", "result", "done"],
  );
  assert.equal(events[0].versions.fixtureHash, hash);
  assert.equal(calls, 1);
  assert.equal(events[1].correct, true);
});
test("disconnect aborts dispatched work and prevents later cases", async () => {
  let calls = 0;
  const response = await handleEvaluation(
    req({
      caseIds: ["shopping-01", "shopping-02"],
      modelIds: ["openai/gpt-6-luna"],
      passes: 1,
    }),
    deps({
      adapter: async ({ signal }) => {
        calls++;
        await new Promise((resolve) =>
          signal.addEventListener("abort", resolve, { once: true }),
        );
        throw new Error("aborted");
      },
    }),
  );
  const reader = response.body.getReader();
  await reader.read();
  await reader.cancel();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(calls, 1);
  const next = await handleEvaluation(req(), deps());
  assert.equal(next.status, 200);
  await next.text();
});
test("loop alternates models and completes a full pass before repeats", () => {
  const jobs = schedule(
    ["a", "b"],
    ["openai/gpt-6-luna", "openai/gpt-5-nano"],
    3,
  );
  assert.deepEqual(
    jobs.map((x) => x.pass),
    [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
  );
  assert.notEqual(jobs[0].modelId, jobs[2].modelId);
  assert.notEqual(jobs[0].modelId, jobs[4].modelId);
});
test("cost reserves uncached bytes, cache-write premium and all maximum output tokens", () => {
  const amount = estimateReservation("openai/gpt-6-luna", 10000);
  assert.equal(amount, ((10000 + 4096) * 0.125 + 4096 * 0.5) / 1e6);
  const u = {
    input: 1000,
    output: 200,
    cached: 300,
    cacheWrite: 100,
    reasoning: 50,
  };
  assert.equal(
    calculateCost("openai/gpt-6-luna", u),
    (600 * 0.1 + 300 * 0.01 + 100 * 0.125 + 200 * 0.5) / 1e6,
  );
});
test("budget is cumulative across HTTP requests/models and missing usage retains reservation", () => {
  const ledger = freshLedger();
  assert.ok(reserve(ledger, "one", "2026-10", 0.25));
  settle(ledger, "one", undefined, "estimated");
  assert.equal(ledger.entries[0].charged, 0.25);
  assert.ok(reserve(ledger, "two", "2026-10", 0.25));
  assert.equal(reserve(ledger, "three", "2026-10", 0.001), false);
  settle(ledger, "one", 0.01, "reported");
  assert.ok(reserve(ledger, "three", "2026-10", 0.01));
  assert.throws(
    () => validateLedger({ ...ledger, testCap: 5 }),
    /invalid_ledger/,
  );
});
test("ledger file replacement, exclusive locking and interruptions survive a fresh process", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nilumi-ledger-"));
  try {
    const first = await acquireLedger(dir);
    reserve(first.ledger, "interrupted", "2026-10", 0.2);
    await first.save();
    await assert.rejects(acquireLedger(dir), { code: "EEXIST" });
    await first.release();
    const second = await acquireLedger(dir);
    assert.equal(second.ledger.entries[0].state, "reserved");
    assert.equal(second.ledger.entries[0].charged, 0.2);
    settle(second.ledger, "interrupted", 0.001, "reported");
    await second.save();
    await second.release();
    const bytes = await readFile(join(dir, "nlu-budget.json"), "utf8");
    assert.ok(!bytes.includes("transcript"));
    assert.ok(!bytes.includes("password"));
    assert.equal(JSON.parse(bytes).entries[0].charged, 0.001);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("authoritative runner reserves before each request, settles, and reloads cumulative charges", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nilumi-runner-"));
  const f = byId("shopping-01");
  let seenReservation = false;
  const fetcher = async () => {
    const ledger = JSON.parse(
      await readFile(join(dir, "nlu-budget.json"), "utf8"),
    );
    seenReservation = ledger.entries.at(-1).state === "reserved";
    return new Response(
      [
        {
          type: "start",
          evaluationMode: "zdr",
          gateway: "vercel",
          versions: { fixtureHash: hash },
        },
        {
          type: "result",
          caseId: f.id,
          modelId: "openai/gpt-6-luna",
          pass: 1,
          status: "ok",
          correct: true,
          schemaValid: true,
          latencyMs: 10,
          costUsd: 0.001,
          costBasis: "reported",
          category: f.category,
          split: f.split,
          tags: f.tags,
          language: "en",
        },
        { type: "done" },
      ]
        .map(JSON.stringify)
        .join("\n"),
    );
  };
  const opts = {
    fixtures,
    fixtureHash: hash,
    caseIds: [f.id],
    modelIds: ["openai/gpt-6-luna"],
    passes: 1,
    origin: "https://example.invalid",
    cookie: "nilumi_session=mock",
    directory: dir,
    verifyPricing: false,
    fetcher,
  };
  try {
    await runComparison(opts);
    assert.equal(seenReservation, true);
    await runComparison(opts);
    const ledger = JSON.parse(
      await readFile(join(dir, "nlu-budget.json"), "utf8"),
    );
    assert.equal(ledger.entries.length, 2);
    assert.equal(
      ledger.entries.reduce((n, e) => n + e.charged, 0),
      0.002,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("network loss keeps a reservation and stops further calls without hidden retries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nilumi-disconnect-"));
  let calls = 0;
  try {
    const result = await runComparison({
      fixtures,
      fixtureHash: hash,
      caseIds: ["shopping-01", "shopping-02"],
      modelIds: ["openai/gpt-6-luna"],
      passes: 1,
      origin: "https://example.invalid",
      cookie: "mock",
      directory: dir,
      verifyPricing: false,
      fetcher: async () => {
        calls++;
        throw new Error("lost");
      },
    });
    assert.equal(calls, 1);
    assert.equal(result.report.summary.coverageComplete, false);
    const ledger = JSON.parse(
      await readFile(join(dir, "nlu-budget.json"), "utf8"),
    );
    assert.equal(ledger.entries[0].state, "reserved");
    assert.ok(ledger.entries[0].charged > 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("Hobby runner labels reports and stops after the first unverified route", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nilumi-hobby-"));
  let calls = 0;
  try {
    const result = await runComparison({
      fixtures,
      fixtureHash: hash,
      caseIds: ["shopping-01", "shopping-02"],
      modelIds: ["openai/gpt-6-luna"],
      passes: 1,
      mode: "synthetic_hobby",
      origin: "https://example.invalid",
      cookie: "mock",
      directory: dir,
      verifyPricing: false,
      fetcher: async () => {
        calls++;
        return handleEvaluation(
          req(),
          deps({
            privacy: hobbyPrivacy,
            env: { ...env, NLU_EVALUATION_MODE: "synthetic_hobby" },
            adapter: async () => ({
              ...mockResponse(byId("shopping-01")),
              isByok: undefined,
            }),
          }),
        );
      },
    });
    assert.equal(calls, 1);
    assert.equal(result.report.evaluationMode, "synthetic_hobby");
    assert.equal(result.report.zeroDataRetentionRequired, false);
    assert.equal(result.report.productionAccepted, false);
    assert.equal(result.report.rows[0].status, "routing_error");
    assert.equal(result.report.summary.coverageComplete, false);
    assert.equal(result.report.summary.selection, "pending_live_gates");
    assert.ok(result.report.budget.chargedUsd > 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("runner rejects a substituted Hobby corpus before network access and rejects mode mismatches", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nilumi-mode-"));
  let calls = 0;
  const options = {
    fixtures,
    fixtureHash: hash,
    caseIds: ["shopping-01"],
    modelIds: ["openai/gpt-6-luna"],
    passes: 1,
    mode: "synthetic_hobby",
    origin: "https://example.invalid",
    cookie: "mock",
    directory: dir,
    verifyPricing: false,
    fetcher: async () => {
      calls++;
      return new Response(
        [
          {
            type: "start",
            ...evaluationDisclosure("zdr"),
            versions: { fixtureHash: hash },
          },
          {
            type: "result",
            caseId: "shopping-01",
            modelId: "openai/gpt-6-luna",
            correct: true,
            costUsd: 0,
          },
          { type: "done" },
        ]
          .map(JSON.stringify)
          .join("\n"),
      );
    },
  };
  try {
    await assert.rejects(
      runComparison({ ...options, fixtureHash: "changed" }),
      /invalid_evaluation_policy/,
    );
    assert.equal(calls, 0);
    const result = await runComparison(options);
    assert.equal(calls, 1);
    assert.equal(result.report.rows[0].status, "request_failed");
    assert.ok(result.report.rows[0].accountedCostUsd > 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("reported failures stay in accuracy/schema denominators; local refusals excluded from model latency", () => {
  const base = {
    caseId: "a",
    modelId: "openai/gpt-6-luna",
    pass: 1,
    category: "privacy",
    split: "held_out",
    tags: ["privacy"],
    language: "en",
    costUsd: 0,
  };
  const rows = [
    { ...base, status: "ok", correct: true, schemaValid: true, latencyMs: 100 },
    {
      ...base,
      status: "timeout",
      correct: false,
      schemaValid: false,
      latencyMs: 5000,
    },
    {
      ...base,
      status: "refused",
      correct: true,
      schemaValid: null,
      latencyMs: 0,
    },
  ];
  const summary = summarize(rows, 4);
  assert.equal(summary.accuracy, 2 / 3);
  assert.equal(summary.schemaValidRate, 0.5);
  assert.equal(summary.failures, 1);
  assert.equal(summary.latency.samples, 1);
  assert.equal(summary.latency.p95Ms, 100);
  assert.equal(summary.notEvaluated, 1);
  assert.equal(summary.coverageComplete, false);
  assert.equal(summary.slices["split:held_out"].accuracy, 2 / 3);
});
test("nearest-rank percentiles do not hide failed or missing samples", () => {
  assert.equal(percentile([], 0.95), null);
  assert.equal(percentile([10, 30, 20], 0.5), 20);
  assert.equal(percentile([1, 2, 3, 4, 100], 0.95), 100);
});
test("registry entries are synthetic and versioned, not a production persistence layer", () => {
  assert.equal(REGISTRY.allergic_to.health, true);
  assert.equal(REGISTRY.note.visibility, "private");
});

test("negated and hypothetical sharing cannot relax visibility", () => {
  for (const transcript of ["Don't share my note", "Maybe share my note"]) {
    const f = byId("privacy-01");
    f.transcript = transcript;
    f.expected.commands[0].evidence.end = transcript.length;
    assert.ok(outcome(f).reasons.includes("missing_share_cue"));
  }
});
test("subject and value need same-clause support; entity IDs cannot resolve a genuinely ambiguous name", () => {
  const f = fixture();
  f.transcript = "I prefer tea; Nila prefers coffee";
  f.expected.commands[0].facts[0].evidence.end = f.transcript.length;
  assert.ok(outcome(f).reasons.includes("unsupported_clause"));
  const ambiguous = byId("questions-06");
  ambiguous.expected.commands[0].query.entities[0].existing_id = "e-ravi1";
  assert.ok(outcome(ambiguous).reasons.includes("ambiguous_entity"));
  const relation = fixture();
  relation.expected.commands[0].facts[0].subject.relation = "spouse";
  assert.notEqual(outcome(relation).status, "interpreted");
});
test("quantity association and unrelated negation do not corrupt independent commands", () => {
  const f = byId("shopping-02");
  f.expected.commands[0].items[0].quantity = 1;
  assert.ok(outcome(f).reasons.includes("unsupported_quantity"));
  const add = byId("shopping-01");
  add.transcript = "I do not prefer coffee; Add milk and sugar";
  assert.equal(outcome(add).status, "interpreted");
});
test("resolved member IDs determine reminder visibility and target policy", () => {
  const f = byId("dates-01");
  delete f.expected.commands[0].targets[0].member_id;
  assert.equal(outcome(f).status, "interpreted");
  assert.deepEqual(outcome(f).visibilities, ["private"]);
  f.expected.commands[0].targets = [
    { mention: "my wife", member_id: "member-nila" },
  ];
  assert.ok(outcome(f).reasons.includes("target_mismatch"));
  const us = byId("dates-07");
  us.expected.commands[0].targets.pop();
  assert.ok(outcome(us).reasons.includes("target_mismatch"));
});
test("task completion validates task IDs rather than accepting memory targets", () => {
  const context = structuredClone(ctx);
  context.tasks = [
    { id: "clean-filter", title: "clean filter", visibility: "household" },
  ];
  const command = {
    kind: "task_complete",
    target: { task_id: "clean-filter" },
  };
  const run = () =>
    validateResult(
      { language: "en", commands: [command] },
      "Complete clean filter",
      context,
    ).outcomes[0];
  assert.equal(run().status, "interpreted");
  command.target = { memory_id: "m-preference" };
  assert.equal(run().status, "invalid");
});
test("alphabetic secret values near OTP are refused while coding prose is allowed", () => {
  assert.equal(detectSensitive("OTP abcd"), "secret_cue");
  assert.equal(detectSensitive("source code review"), null);
});
test("recorded schema failures and mock recovery are explicitly offline-only", async () => {
  const { rehearseRecovery } = await import("../lib/nlu/recovery.ts");
  const recordings = JSON.parse(
    await readFile(
      new URL("../evals/recorded-responses.json", import.meta.url),
      "utf8",
    ),
  );
  const result = await rehearseRecovery({
    primary: async () => recordings.schema_failure,
    repair: async () => recordings.schema_failure,
    challenger: async () => recordings.success,
  });
  assert.equal(result.evidence, "offline_only");
  assert.deepEqual(result.attempts, ["primary", "repair", "challenger"]);
  assert.equal(result.result.commands[0].items.length, 2);
  const row = await evaluateCase(
    byId("shopping-01"),
    "openai/gpt-6-luna",
    1,
    async () => ({ raw: recordings.wrong_item_count }),
    controller().signal,
  );
  assert.equal(row.correct, false);
});
test("Gateway adapter sends one pinned structured call without tools, retry, fallback or repair", async () => {
  const { callGateway } = await import("../lib/nlu/gateway.ts");
  let args;
  let calls = 0;
  const client = () => ({});
  client.getGenerationInfo = async () => ({
    totalCost: 0.00001,
    providerName: "openai",
    model: "openai/gpt-6-luna",
    isByok: false,
  });
  const response = await callGateway(
    {
      modelId: "openai/gpt-6-luna",
      system: "rules",
      prompt: "synthetic",
      signal: controller().signal,
    },
    async (options) => {
      args = options;
      calls++;
      return {
        output: byId("shopping-01").expected,
        usage: {
          inputTokens: 200,
          outputTokens: 100,
          inputTokenDetails: { cacheReadTokens: 50, cacheWriteTokens: 20 },
          outputTokenDetails: { reasoningTokens: 10 },
        },
        providerMetadata: { gateway: { generationId: "gen-mock" } },
      };
    },
    () => client,
  );
  assert.equal(calls, 1);
  assert.equal(args.maxRetries, 0);
  assert.equal(args.maxOutputTokens, 4096);
  assert.equal(args.tools, undefined);
  assert.equal(args.providerOptions.gateway.models, undefined);
  assert.equal(args.providerOptions.gateway.byok, undefined);
  const metadata = await response.metadata();
  assert.equal(metadata.cost, 0.00001);
  assert.equal(metadata.isByok, false);
  assert.equal(response.usage.cached, 50);
});
test("Gateway adapter uses the approved Hobby options at the actual SDK call boundary", async () => {
  const { callGateway } = await import("../lib/nlu/gateway.ts");
  let options;
  await callGateway(
    {
      modelId: "openai/gpt-6-luna",
      system: "rules",
      prompt: "synthetic",
      signal: controller().signal,
      evaluationMode: "synthetic_hobby",
    },
    async (args) => {
      options = args;
      return { output: byId("shopping-01").expected, usage: {} };
    },
    () => () => ({}),
  );
  assert.deepEqual(
    options.providerOptions,
    modelOptions("openai/gpt-6-luna", "synthetic_hobby"),
  );
  assert.equal(options.maxRetries, 0);
  assert.equal(options.tools, undefined);
  const format = await options.output.responseFormat;
  assert.deepEqual(format.schema, PROVIDER_SCHEMA);
  const wire = structuredClone(byId("shopping-01").expected);
  wire.smalltalk_reply = null;
  wire.commands[0].items[0].unit = null;
  wire.commands[0].items[0].quantity = null;
  const parsed = await options.output.parseCompleteOutput(
    { text: JSON.stringify(wire) },
    { response: {}, usage: {}, finishReason: "stop" },
  );
  assert.deepEqual(parsed, byId("shopping-01").expected);
  wire.language = null;
  await assert.rejects(() =>
    options.output.parseCompleteOutput(
      { text: JSON.stringify(wire) },
      { response: {}, usage: {}, finishReason: "stop" },
    ),
  );
});
test("SDK schema generation failures are tracked as first-attempt schema failures", async () => {
  const { SchemaGenerationError } = await import("../lib/nlu/gateway.ts");
  const row = await evaluateCase(
    fixture(),
    "openai/gpt-6-luna",
    1,
    async () => {
      throw new SchemaGenerationError();
    },
    controller().signal,
  );
  assert.equal(row.status, "schema_error");
  assert.equal(row.schemaValid, false);
  assert.equal(row.costUsd, null);
});
test("complete accuracy gates include every held-out/date/privacy pass and verify actual routing", () => {
  const rows = fixtures.map((f) => ({
    caseId: f.id,
    modelId: "openai/gpt-6-luna",
    pass: 1,
    category: f.category,
    split: f.split,
    tags: f.tags,
    language: f.expected?.language ?? "boundary",
    status: f.refusal ? "refused" : "ok",
    correct: true,
    schemaValid: f.refusal ? null : true,
    latencyMs: 100,
    costUsd: 0,
    routedProvider: "openai",
    routedModel: "openai/gpt-6-luna",
    isByok: false,
  }));
  assert.equal(summarize(rows, 60).selection, "openai/gpt-6-luna");
  rows.find((x) => x.category === "privacy").correct = false;
  assert.equal(summarize(rows, 60).selection, "pending_live_gates");
  rows.find((x) => x.category === "privacy").correct = true;
  assert.equal(summarize(rows.slice(1), 60).selection, "pending_live_gates");
  rows.find((x) => x.status === "ok").isByok = null;
  assert.equal(summarize(rows, 60).selection, "pending_live_gates");
});

test("live rate verification uses Cloudflare prices and blocks unverified challengers", async () => {
  const { verifyRates } = await import("../scripts/evaluate-nlu.mjs");
  await assert.rejects(
    verifyRates(["openai/gpt-4.1-nano"], "cloudflare"),
    /cloudflare_prices_pending/,
  );
});
