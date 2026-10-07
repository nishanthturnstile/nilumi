import assert from "node:assert/strict";
import { test } from "node:test";
import { DateTime } from "luxon";
import { resolveDate } from "../lib/nlu/dates.ts";
import { evaluateCase } from "../lib/nlu/evaluate.ts";
import { loadFixtures } from "../lib/nlu/fixtures.ts";
import { interpretResult } from "../lib/nlu/interpret.ts";
import { score } from "../lib/nlu/scoring.ts";
import { pipelineFingerprint } from "../scripts/evaluate-subscription-nlu.mjs";

const { fixtures } = await loadFixtures();
const development = fixtures.filter(
  (fixture) => fixture.split === "development",
);
const fixture = (id) =>
  structuredClone(development.find((item) => item.id === id));

test("upcoming Saturday uses fixture instant and household zone on every weekday", () => {
  for (let day = 5; day <= 11; day++) {
    const now = DateTime.fromObject(
      { year: 2026, month: 10, day, hour: 15 },
      { zone: "Asia/Kolkata" },
    );
    const delta = (6 - now.weekday + 7) % 7 || 7;
    const expected = now
      .plus({ days: delta })
      .set({ hour: 9 })
      .toISO({ suppressMilliseconds: true });
    assert.equal(
      resolveDate("next Saturday morning", now.toISO()).resolved,
      expected,
    );
    assert.equal(
      resolveDate("next Saturday morning", now.toUTC().toISO()).resolved,
      expected,
    );
  }
  assert.equal(
    resolveDate("naalaikku kaalai", "2026-10-07T15:00:00+05:30").resolved,
    "2026-10-08T09:00:00+05:30",
  );
});

test("date resolver rejects conflicting, partial, ranged and impossible phrases", () => {
  for (const phrase of [
    "tomorrow morning in 2040",
    "next Saturday morning or Friday",
    "today tomorrow",
    "tomorrow at 7",
    "meeting 3/4/2027 please",
    "3/4/2027 to 5/4/2027",
    "31/2/2027",
    "tomorrow at 13pm",
    "tomorrow at 8:99am",
  ])
    assert.ok(resolveDate(phrase, "2026-10-07T15:00:00+05:30").reason, phrase);
});

test("standalone dayparts use the product clock defaults", () => {
  for (const [phrase, clock] of [
    ["morning", "09:00"],
    ["afternoon", "14:00"],
    ["evening", "18:30"],
  ])
    assert.equal(
      resolveDate(phrase, "2026-10-07T15:00:00+05:30").resolved,
      `2026-10-07T${clock}:00+05:30`,
    );
});

test("a unique literal this-weekend modifier is preserved without inventing a phrase", () => {
  const f = fixture("dates-07");
  f.expected.commands[0].at.phrase = "weekend";
  const result = interpretResult(f.expected, f.transcript, f.context);
  assert.equal(
    score(fixture("dates-07"), result.extractionValidation).correct,
    false,
  );
  assert.equal(score(fixture("dates-07"), result.validation).correct, true);
  assert.equal(result.normalizations[0].path, "result.commands.0.at.phrase");
  const repeated = interpretResult(
    f.expected,
    `${f.transcript}; next weekend too`,
    f.context,
  );
  assert.equal(repeated.validation.parsed.commands[0].at.phrase, "weekend");
});

test("omitting an adjacent explicit clock invalidates a date interpretation", () => {
  const f = fixture("dates-06");
  const result = interpretResult(
    f.expected,
    `${f.transcript} at 11am`,
    f.context,
  );
  assert.equal(result.validation.outcomes[0].status, "invalid");
  assert.ok(
    result.validation.outcomes[0].reasons.includes("incomplete_date_phrase"),
  );
  assert.equal(result.validation.outcomes[0].validated, undefined);
});

test("unique note references become stable IDs without relaxing ownership or conflicting selectors", () => {
  const f = fixture("privacy-03");
  f.expected.commands[0].target = {
    entity: { existing_id: "e-nila", mention: "Nila" },
    predicate: "note",
  };
  const result = interpretResult(f.expected, f.transcript, f.context);
  assert.deepEqual(result.validation.parsed.commands[0].target, {
    memory_id: "m-nila-shared",
  });
  assert.deepEqual(result.validation.outcomes[0].reasons, ["not_owner"]);
  assert.equal(result.normalizations[0].kind, "reference");
  f.expected.commands[0].target.memory_id = "m-preference";
  const conflict = interpretResult(f.expected, f.transcript, f.context);
  assert.deepEqual(conflict.normalizations, []);
  assert.ok(
    conflict.validation.outcomes[0].reasons.includes("invalid_memory_id"),
  );
  delete f.expected.commands[0].target.memory_id;
  const note = f.context.memories.find(
    (memory) => memory.id === "m-nila-shared",
  );
  f.context.memories.push({ ...note, id: "another-note" });
  const ambiguous = interpretResult(f.expected, f.transcript, f.context);
  assert.deepEqual(ambiguous.normalizations, []);
  assert.ok(
    ambiguous.validation.outcomes[0].reasons.includes("ambiguous_target"),
  );
  note.visibility = "private";
  f.context.memories.pop();
  assert.deepEqual(
    interpretResult(f.expected, f.transcript, f.context).normalizations,
    [],
  );
});

test("unique member aliases receive existing IDs while missing time and invalid IDs remain blocked", () => {
  const f = fixture("dates-04");
  delete f.expected.commands[0].targets[0].member_id;
  const result = interpretResult(f.expected, f.transcript, f.context);
  const original = fixture("dates-04");
  assert.equal(score(original, result.extractionValidation).correct, false);
  assert.equal(score(original, result.validation).correct, true);
  assert.deepEqual(result.validation.outcomes[0].reasons, ["missing_time"]);
  f.expected.commands[0].targets[0].member_id = "invented";
  assert.deepEqual(
    interpretResult(f.expected, f.transcript, f.context).normalizations,
    [],
  );
  delete f.expected.commands[0].targets[0].member_id;
  const self = f.context.members.find((member) => member.id === "member-arjun");
  f.context.members.push({ ...self, id: "ambiguous-member" });
  const ambiguous = interpretResult(f.expected, f.transcript, f.context);
  assert.deepEqual(ambiguous.normalizations, []);
  assert.ok(
    ambiguous.validation.outcomes[0].reasons.includes("target_mismatch"),
  );
});

test("interpretation fixes supported dates while preserving raw extraction score and input", () => {
  const f = fixture("dates-06");
  const raw = structuredClone(f.expected);
  raw.commands[0].at.resolved = "2026-10-17T09:00:00+05:30";
  const original = structuredClone(raw);
  const result = interpretResult(raw, f.transcript, f.context);
  assert.equal(score(f, result.extractionValidation).correct, false);
  assert.equal(score(f, result.validation).correct, true);
  assert.deepEqual(result.normalizations, [
    { path: "result.commands.0.at", kind: "date" },
  ]);
  assert.deepEqual(raw, original);
});

test("interpretation cannot fix unsupported phrases, ambiguous clocks or invented IDs", () => {
  const f = fixture("dates-06");
  f.expected.commands[0].at.phrase = "tomorrow evening";
  const unsupported = interpretResult(f.expected, f.transcript, f.context);
  assert.deepEqual(unsupported.normalizations, []);
  assert.ok(
    unsupported.validation.outcomes[0].reasons.includes(
      "unsupported_date_phrase",
    ),
  );
  f.expected.commands[0].at.phrase = "at 7";
  const ambiguous = interpretResult(
    f.expected,
    "Remind me to shop at 7",
    f.context,
  );
  assert.deepEqual(ambiguous.normalizations, []);
  assert.ok(
    ambiguous.validation.outcomes[0].reasons.includes("ambiguous_time"),
  );
  const memory = fixture("corrections-02");
  memory.expected.commands[0].target.memory_id = "invented";
  const invalid = interpretResult(
    memory.expected,
    memory.transcript,
    memory.context,
  );
  assert.deepEqual(invalid.normalizations, []);
  assert.equal(score(memory, invalid.validation).correct, false);
});

test("interpretation preserves all approved development actions, privacy and ambiguity outcomes", () => {
  for (const f of development) {
    const result = interpretResult(f.expected, f.transcript, f.context);
    assert.equal(score(f, result.validation).correct, true, f.id);
  }
  const f = fixture("dates-06");
  assert.equal(
    interpretResult({}, f.transcript, f.context).validation.status,
    "schema_error",
  );
  assert.equal(
    interpretResult(f.expected, "my password is secret123", f.context)
      .validation.status,
    "refused",
  );
});

test("pipeline freeze fingerprints interpreter, prompt, contracts and runner deterministically", async () => {
  const hash = await pipelineFingerprint();
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(await pipelineFingerprint(), hash);
});

test("Gateway evaluation and subscription interpretation use the same deterministic stage", async () => {
  const f = fixture("dates-06");
  const raw = structuredClone(f.expected);
  raw.commands[0].at.resolved = "2026-10-17T09:00:00+05:30";
  const row = await evaluateCase(
    f,
    "openai/gpt-4.1-mini",
    1,
    async () => ({ raw, latencyMs: 10, cost: 0 }),
    new AbortController().signal,
  );
  assert.equal(row.correct, true);
  assert.equal(row.extractionScore.correct, false);
  assert.equal(row.normalizations.length, 1);
});
