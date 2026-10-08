import assert from "node:assert/strict";
import { test } from "node:test";
import examples from "../evals/few-shot.json" with { type: "json" };
import { visibleContext } from "../lib/nlu/context.ts";
import { normalizeProviderOutput } from "../lib/nlu/contracts.ts";
import { buildPrompt, transcriptSpans } from "../lib/nlu/prompt.ts";
import { validateResult } from "../lib/nlu/validate.ts";
import {
  codexArguments,
  inspectEvents,
  runBounded,
  selectFixtures,
  subscriptionEnvironment,
  subscriptionEventStream,
  subscriptionSummary,
} from "../scripts/evaluate-subscription-nlu.mjs";

test("independent extraction examples preserve negation, note scope and explicit references", () => {
  const revised = examples.filter((example) =>
    [
      "I do not enjoy hiking",
      "For myself, I have a note book a hotel",
      "I enjoy gardening",
      "That was mistaken, I meant sort the receipts",
      "What is Dev's private note?",
    ].includes(example.transcript),
  );
  assert.equal(revised.length, 5);
  for (const example of revised) {
    const context = {
      occurred_at: "2026-10-08T12:00:00+05:30",
      lists: [],
      operations: [],
      tasks: [],
      ...example.context,
    };
    const result = validateResult(
      normalizeProviderOutput(example.result),
      example.transcript,
      context,
    );
    assert.equal(result.status, "parsed");
    assert.equal(result.parsed.commands.length, 1);
    assert.equal(
      result.outcomes[0].status,
      example.transcript.startsWith("I do not")
        ? "clarification_required"
        : "interpreted",
    );
  }
  assert.equal(revised[0].result.commands[0].facts[0].predicate, "prefers");
  assert.equal(revised[0].result.commands[0].facts[0].polarity, "negated");
  assert.equal(revised[1].result.commands[0].kind, "remember");
  assert.equal(revised[1].result.commands[0].facts[0].subject.mention, "I");
  assert.equal(revised[2].result.commands[0].facts[0].subject.type_hint, null);
  assert.equal(revised[2].result.commands[0].facts[0].visibility_hint, null);
  assert.equal(revised[3].result.commands[0].target.memory_id, "example-note");
  assert.equal(revised[4].result.commands[0].query.answer_shape, "value");
});

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
test("literal prefer contrast preserves change cues and repeats fixed rules after data", () => {
  const pair = examples.filter(
    (example) => example.context?.speaker_id === "contrast-member",
  );
  assert.equal(pair.length, 2);
  assert.deepEqual(pair[0].context, pair[1].context);
  const context = {
    ...pair[0].context,
    occurred_at: "2026-10-08T12:00:00+05:30",
    lists: [],
    tasks: [],
    operations: [],
  };
  const inputs = [];
  for (const example of pair) {
    const result = validateResult(example.result, example.transcript, context);
    assert.equal(result.status, "parsed");
    assert.equal(result.outcomes[0].status, "interpreted");
    const prompt = buildPrompt(example.transcript, context);
    assert.equal(prompt.status, "ready");
    const input = JSON.parse(prompt.prompt);
    assert.deepEqual(input.reference_context, visibleContext(context));
    assert.equal(input.current_input.transcript, example.transcript);
    assert.equal(Object.keys(input).at(-1), "final_extraction_rules");
    inputs.push(input);
  }
  assert.equal(pair[0].result.commands[0].kind, "remember");
  assert.equal(pair[1].result.commands[0].kind, "correct");
  assert.equal(
    inputs[0].final_extraction_rules,
    inputs[1].final_extraction_rules,
  );
  const incorrect = structuredClone(pair[1].result);
  incorrect.commands[0].evidence.end = pair[0].transcript.length;
  const rejected = validateResult(incorrect, pair[0].transcript, context);
  assert.ok(rejected.outcomes[0].reasons.includes("correction_reason_unclear"));
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
    "agents.enabled=false",
    'features.code_mode.excluded_tool_namespaces=["collaboration","clock"]',
    "features.goals=false",
    "project_doc_max_bytes=0",
    'web_search="disabled"',
  ])
    assert.ok(args.includes(constraint));
  assert.ok(args.includes("--ignore-user-config"));
  assert.ok(args.includes("--ephemeral"));
  assert.ok(args.includes("--strict-config"));
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

test("stream rejects tool dispatch immediately across split JSONL chunks", () => {
  const stream = subscriptionEventStream();
  stream.push('{"type":"item.started","item":{"type":"collab_');
  assert.throws(
    () => stream.push('tool_call"}}\n'),
    /tool_activity_rejected:collab_tool_call/,
  );
});

test("stream accepts UTF-8 text, CRLF and a final line without newline", () => {
  const stream = subscriptionEventStream();
  stream.push(
    '{"type":"item.completed","item":{"type":"agent_message","text":"தமிழ்"}}\r\n',
  );
  stream.push('{"type":"turn.completed","usage":{"input_tokens":9}}');
  assert.deepEqual(stream.finish(), {
    usage: { input_tokens: 9 },
    toolActivity: false,
  });
});

test("stream rejects errors, oversized output and incomplete turns", () => {
  for (const event of [
    { type: "error" },
    { type: "turn.failed" },
    { item: { type: "error", message: "failure" } },
    { item: { type: "unknown_tool" } },
  ])
    assert.throws(() =>
      subscriptionEventStream().push(`${JSON.stringify(event)}\n`),
    );
  assert.throws(() => subscriptionEventStream().push("x".repeat(2_000_001)));
  assert.throws(() => subscriptionEventStream().push("invalid JSON\n"));
  assert.throws(() => subscriptionEventStream().finish());
});

test("preference contrast examples validate with the same prior preference", () => {
  const pair = examples.filter(
    (example) =>
      example.context?.speaker_id === "example-member" &&
      example.context?.memories?.some(
        (memory) => memory.predicate === "prefers",
      ),
  );
  assert.equal(pair.length, 2);
  assert.deepEqual(pair[0].context, pair[1].context);
  const context = {
    ...pair[0].context,
    occurred_at: "2026-10-07T12:00:00+05:30",
    members: [
      {
        id: "example-member",
        entity_id: "example-person",
        name: "Dev",
        aliases: ["I"],
        role: "adult",
        relation: "self",
      },
    ],
    entities: pair[0].context.entities.map((entity) => ({
      ...entity,
      visibility: "household",
    })),
    memories: pair[0].context.memories.map((memory) => ({
      ...memory,
      visibility: "household",
    })),
    lists: [],
    operations: [],
    tasks: [],
  };
  for (const example of pair) {
    const result = validateResult(example.result, example.transcript, context);
    assert.equal(result.status, "parsed");
    assert.equal(result.outcomes[0].status, "interpreted");
    const prompt = buildPrompt(example.transcript, context);
    assert.equal(prompt.status, "ready");
    const input = JSON.parse(prompt.prompt);
    assert.deepEqual(input.reference_context, visibleContext(context));
    assert.equal(input.current_input.transcript, example.transcript);
    for (const span of input.current_input.transcript_spans)
      assert.equal(example.transcript.slice(span.start, span.end), span.text);
  }
  assert.equal(pair[0].result.commands[0].kind, "remember");
  assert.equal(pair[1].result.commands[0].kind, "correct");
  const ordinary = pair[0];
  const forbiddenCorrection = {
    ...pair[1].result,
    commands: [
      {
        ...pair[1].result.commands[0],
        evidence: { start: 0, end: ordinary.transcript.length },
      },
    ],
  };
  const invalid = validateResult(
    forbiddenCorrection,
    ordinary.transcript,
    context,
  );
  assert.notEqual(invalid.outcomes[0].status, "interpreted");
  assert.equal(
    buildPrompt("my password is secret123", context).status,
    "refused",
  );
});

test("ambiguity examples preserve the distinction between missing and ambiguous slots", () => {
  const context = {
    occurred_at: "2026-10-07T12:00:00+05:30",
    speaker_id: "example-member",
    members: [
      {
        id: "example-member",
        entity_id: "example-person",
        name: "Dev",
        aliases: ["me"],
        role: "adult",
        relation: "self",
      },
    ],
    entities: [],
    memories: [],
    lists: [],
    operations: [],
    previous_turns: [],
  };
  const clock = examples.find(
    (example) => example.result.commands[0]?.at?.phrase === "at 6",
  );
  const ambiguousClock = validateResult(
    normalizeProviderOutput(clock.result),
    clock.transcript,
    context,
  );
  assert.equal(ambiguousClock.status, "parsed");
  assert.deepEqual(ambiguousClock.outcomes[0].reasons, ["ambiguous_time"]);
  assert.equal(ambiguousClock.parsed.commands[0].at.phrase, "at 6");
  const missingClock = structuredClone(clock.result);
  delete missingClock.commands[0].at;
  assert.deepEqual(
    validateResult(missingClock, "Remind me to stretch", context).outcomes[0]
      .reasons,
    ["missing_time"],
  );
  const name = examples.find((example) =>
    example.context?.entities?.some((entity) => entity.name === "Kiran"),
  );
  const ambiguousName = validateResult(
    normalizeProviderOutput(name.result),
    name.transcript,
    {
      ...context,
      entities: name.context.entities.map((entity) => ({
        ...entity,
        visibility: "household",
      })),
    },
  );
  assert.equal(ambiguousName.status, "parsed");
  assert.deepEqual(ambiguousName.outcomes[0].reasons, ["ambiguous_entity"]);
  assert.deepEqual(ambiguousName.parsed.commands[0].query.entities, [
    { mention: "Kiran" },
  ]);
});

test("shopping completion and possessive unshare examples remain supported actions", () => {
  const base = {
    occurred_at: "2026-10-07T12:00:00+05:30",
    speaker_id: "example-member",
    members: [],
    entities: [],
    memories: [],
    lists: [],
    operations: [],
    previous_turns: [],
  };
  for (const kind of ["list_complete", "unshare"]) {
    const example = examples.find(
      (item) => item.result.commands[0]?.kind === kind,
    );
    const result = validateResult(
      normalizeProviderOutput(example.result),
      example.transcript,
      { ...base, ...example.context },
    );
    assert.equal(result.status, "parsed");
    assert.equal(result.outcomes[0].status, "interpreted");
    assert.deepEqual(result.outcomes[0].reasons, []);
    if (kind === "unshare")
      assert.deepEqual(result.parsed.commands[0].target, {
        memory_id: "example-note",
      });
  }
});
