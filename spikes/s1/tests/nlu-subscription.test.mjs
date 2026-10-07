import assert from "node:assert/strict";
import { test } from "node:test";
import { transcriptSpans } from "../lib/nlu/prompt.ts";
import {
  codexArguments,
  inspectEvents,
  runBounded,
  selectFixtures,
  subscriptionEnvironment,
  subscriptionSummary,
} from "../scripts/evaluate-subscription-nlu.mjs";

test("evidence hints preserve decoded UTF-16 offsets across Tamil, emoji and clauses", () => {
  const transcript =
    '  I like 🎨; என் மகள் இசை விரும்புவாள் but I dislike rain.\nShe said "yes"';
  const spans = transcriptSpans(transcript);
  assert.equal(spans.length, 4);
  assert.equal(spans[0].text, "I like 🎨");
  assert.equal(spans[0].end - spans[0].start, 9);
  for (const span of spans) {
    assert.equal(transcript.slice(span.start, span.end), span.text);
    assert.ok(span.end <= transcript.length);
  }
  assert.deepEqual(transcriptSpans("  \n; "), []);
});

test("subscription scheduling caps concurrent calls and stops dispatch after failure", async () => {
  let active = 0,
    peak = 0;
  const attempted = [];
  await runBounded([0, 1, 2, 3, 4], 2, async (id) => {
    attempted.push(id);
    peak = Math.max(peak, ++active);
    await new Promise((accept) => setTimeout(accept, id === 0 ? 5 : 15));
    active--;
    return id !== 0;
  });
  assert.equal(peak, 2);
  assert.deepEqual(attempted, [0, 1]);
  await assert.rejects(() => runBounded([1], 3, async () => true));
});

test("subscription evaluation excludes API credentials and inherited orchestration", () => {
  const env = subscriptionEnvironment({
    PATH: "/bin",
    OPENAI_API_KEY: "secret",
    CODEX_API_KEY: "secret",
    AI_GATEWAY_API_KEY: "secret",
    OPENAI_BASE_URL: "https://other.invalid",
    AUTH_SECRET: "secret",
    T3_THREAD_ID: "parent",
    CODEX_HOME: "/other",
  });
  assert.deepEqual(env, { PATH: "/bin" });
  const args = codexArguments({
    model: "gpt-6-luna",
    effort: "low",
    directory: "/empty",
    instructions: "/empty/instructions",
    schema: "/empty/schema",
    output: "/empty/output",
  });
  for (const constraint of [
    'forced_login_method="chatgpt"',
    'model_provider="openai"',
    "features.shell_tool=false",
    "features.plugins=false",
    "features.hooks=false",
    "features.multi_agent=false",
    "features.multi_agent_v2=false",
    "features.goals=false",
    "project_doc_max_bytes=0",
    'web_search="disabled"',
  ])
    assert.ok(args.includes(constraint));
  assert.ok(args.includes("--ignore-user-config"));
  assert.ok(args.includes("--ephemeral"));
  assert.ok(!args.some((x) => /resume|expected|fixtures/.test(x)));
});

test("subscription batches cannot silently include held-out cases during development", () => {
  const fixtures = [
    { id: "a", split: "development" },
    { id: "b", split: "held_out" },
  ];
  assert.deepEqual(selectFixtures(fixtures, "development"), [fixtures[0]]);
  assert.throws(() => selectFixtures(fixtures, "development", ["b"]));
  assert.throws(() => selectFixtures(fixtures, "all", ["a", "a"]));
  assert.throws(() => selectFixtures(fixtures, "other"));
});

test("subscription output requires one completed turn without tool activity or errors", () => {
  const completed = { type: "turn.completed", usage: { input_tokens: 123 } };
  assert.deepEqual(
    inspectEvents([
      { type: "item.completed", item: { type: "agent_message" } },
      completed,
    ]),
    { usage: completed.usage, toolActivity: false },
  );
  for (const type of [
    "command_execution",
    "file_change",
    "mcp_tool_call",
    "collab_tool_call",
    "web_search",
    "unknown_tool",
  ])
    assert.throws(
      () =>
        inspectEvents([{ type: "item.started", item: { type } }, completed]),
      /tool_activity_rejected/,
    );
  assert.throws(() => inspectEvents([]));
  assert.throws(() => inspectEvents([completed, completed]));
  assert.throws(() => inspectEvents([completed, { type: "turn.failed" }]));
  assert.throws(() =>
    inspectEvents([completed, { item: { type: "error", message: "failure" } }]),
  );
});

test("subscription correctness never implies deployment acceptance and counts failures", () => {
  const rows = Array.from({ length: 60 }, (_, i) => ({
    caseId: String(i),
    split: i < 12 ? "held_out" : "development",
    tags: i < 12 ? ["dates", "privacy"] : [],
    correct: true,
    schemaValid: true,
    status: "ok",
  }));
  assert.equal(subscriptionSummary(rows, rows).syntheticCorrectnessPass, true);
  assert.equal(
    subscriptionSummary(rows, rows).deploymentAcceptance,
    "pending_live_gates",
  );
  assert.equal(
    subscriptionSummary(rows.slice(1), rows).syntheticCorrectnessPass,
    false,
  );
  assert.equal(
    subscriptionSummary([...rows.slice(1), rows[1]], rows)
      .syntheticCorrectnessPass,
    false,
  );
  const failed = rows.map((x, i) =>
    i === 0
      ? { ...x, correct: false, schemaValid: false, status: "execution_error" }
      : x,
  );
  const summary = subscriptionSummary(failed, rows);
  assert.equal(summary.attempted, 60);
  assert.equal(summary.correct, 59);
  assert.equal(summary.syntheticCorrectnessPass, false);
});
