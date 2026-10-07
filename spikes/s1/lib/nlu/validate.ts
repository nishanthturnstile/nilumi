import { DateTime } from "luxon";
import { type Context, REGISTRY, visibleContext } from "./context";
import {
  type Command,
  type DateExpr,
  type EntityReference,
  NluResult,
  type ParsedResult,
  Validated,
  type ValidatedCommand,
} from "./contracts";
import { checkDate } from "./dates";
import {
  detectSensitive,
  normalizeNumbers,
  type RefusalCategory,
} from "./sensitive";

export type Outcome = {
  index: number;
  status:
    | "interpreted"
    | "clarification_required"
    | "confirmation_required"
    | "invalid";
  reasons: string[];
  visibilities: string[];
  provisional: string[];
  validated?: ValidatedCommand;
};
export type Validation =
  | { status: "parsed"; parsed: ParsedResult; outcomes: Outcome[] }
  | { status: "refused"; category: RefusalCategory }
  | { status: "schema_error" };
export const normalize = (s: string) =>
  normalizeNumbers(s)
    .replace(/[\p{P}\p{Z}]+/gu, " ")
    .trim();
const contains = (span: string, value: string) =>
  ` ${normalize(span)} `.includes(` ${normalize(value)} `);
const negation =
  /\b(?:not|never|no longer|don't|dont|vendam|illa|illai)\b|இல்லை|வேண்டாம்/i;
const hypothetical = /\b(?:if|maybe|might|should we|perhaps)\b|ஒருவேளை/i;
const shareCue =
  /\b(?:share|tell my (?:wife|husband)|for both of us|let my (?:wife|husband) know|share pannu)\b|பகிர்/i;
export function resolveEntity(ref: EntityReference, ctx: Context) {
  let candidates = ctx.entities.filter((x) =>
    [x.name, ...x.aliases].some((n) => normalize(n) === normalize(ref.mention)),
  );
  if (
    ref.relation === "self" ||
    ref.relation === "spouse" ||
    ref.relation === "child" ||
    ref.relation === "children"
  ) {
    const relation = ref.relation === "children" ? "child" : ref.relation;
    const ids = ctx.members
      .filter((x) => x.relation === relation)
      .map((x) => x.entity_id);
    candidates = candidates.filter((x) => ids.includes(x.id));
  } else if (ref.relation === "household")
    candidates = candidates.filter((x) => x.type === "household");
  if (ref.existing_id) {
    const existing = ctx.entities.find((x) => x.id === ref.existing_id);
    if (!existing || !candidates.some((x) => x.id === existing.id))
      return { reason: "invalid_entity_id" };
    if (candidates.length > 1) return { reason: "ambiguous_entity" };
    candidates = [existing];
  }
  if (candidates.length > 1) return { reason: "ambiguous_entity" };
  if (!candidates.length) return { reason: "unavailable_entity" };
  if (ref.type_hint && ref.type_hint !== candidates[0].type)
    return { reason: "entity_type_mismatch" };
  return { entity: candidates[0] };
}
export function validateResult(
  raw: unknown,
  transcript: string,
  rawContext: Context,
): Validation {
  const secret = detectSensitive(transcript);
  if (secret) return { status: "refused", category: secret };
  const parsed = NluResult.safeParse(raw);
  if (!parsed.success) return { status: "schema_error" };
  const ctx = visibleContext(rawContext);
  return {
    status: "parsed",
    parsed: parsed.data,
    outcomes: parsed.data.commands.map((command, index) =>
      validateCommand(command, index, transcript, ctx),
    ),
  };
}
function validateCommand(
  rawCommand: Command,
  index: number,
  transcript: string,
  ctx: Context,
): Outcome {
  const command = structuredClone(rawCommand);
  const invalid: string[] = [],
    clarify: string[] = [],
    confirm: string[] = [],
    visibilities: string[] = [],
    provisional: string[] = [];
  const entity = (ref: EntityReference) => {
    const r = resolveEntity(ref, ctx);
    if (r.reason)
      (r.reason.startsWith("invalid_") || r.reason === "entity_type_mismatch"
        ? invalid
        : clarify
      ).push(r.reason);
    if (r.entity) ref.existing_id = r.entity.id;
    return r.entity;
  };
  const evidence = (ev: { start: number; end: number }) => {
    // UTF-16 offsets, exclusive end; never accept a split surrogate pair.
    const split = (i: number) =>
      i > 0 &&
      i < transcript.length &&
      /[\uD800-\uDBFF]/.test(transcript[i - 1]) &&
      /[\uDC00-\uDFFF]/.test(transcript[i]);
    if (
      ev.start >= ev.end ||
      ev.end > transcript.length ||
      split(ev.start) ||
      split(ev.end)
    ) {
      invalid.push("invalid_evidence");
      return "";
    }
    return transcript.slice(ev.start, ev.end);
  };
  const date = (value: DateExpr | undefined, reminder = false) => {
    if (!value) {
      if (reminder) clarify.push("missing_time");
      return;
    }
    if (!contains(transcript, value.phrase))
      invalid.push("unsupported_date_phrase");
    const reason = checkDate(value, ctx.occurred_at, reminder);
    if (reason) clarify.push(reason);
  };
  const members = (
    refs: { mention: string; member_id?: string }[],
    required: boolean,
  ) => {
    if (required && !refs.length) clarify.push("missing_target");
    for (const ref of refs) {
      let matches = ctx.members.filter((x) =>
        [x.name, ...x.aliases].some(
          (n) => normalize(n) === normalize(ref.mention),
        ),
      );
      if (ref.member_id) {
        if (!matches.some((x) => x.id === ref.member_id)) {
          invalid.push("invalid_member_id");
          continue;
        }
        matches = matches.filter((x) => x.id === ref.member_id);
      }
      if (matches.length !== 1)
        clarify.push(
          matches.length ? "ambiguous_member" : "unavailable_member",
        );
      else ref.member_id = matches[0].id;
    }
  };
  const target = (ref: Extract<Command, { kind: "correct" }>["target"]) => {
    if (ref.task_id) invalid.push("invalid_target_kind");
    let memories = ctx.memories;
    if (ref.entity) {
      const resolved = entity(ref.entity);
      memories = memories.filter((x) => x.subject_id === resolved?.id);
    }
    if (ref.predicate) {
      if (!REGISTRY[ref.predicate]) invalid.push("unknown_predicate");
      memories = memories.filter((x) => x.predicate === ref.predicate);
    }
    if (ref.refers_to_last) {
      const ids = ctx.previous_turns.at(-1)?.memory_ids ?? [];
      memories = memories.filter((x) => ids.includes(x.id));
    }
    if (ref.memory_id) {
      if (!memories.some((x) => x.id === ref.memory_id))
        invalid.push("invalid_memory_id");
      memories = memories.filter((x) => x.id === ref.memory_id);
    }
    if (!ref.memory_id && !ref.refers_to_last && !ref.entity && !ref.predicate)
      clarify.push("missing_target");
    if (memories.length !== 1)
      clarify.push(memories.length ? "ambiguous_target" : "unavailable_target");
    if (memories.length === 1) ref.memory_id = memories[0].id;
    return memories.length === 1 ? memories[0] : undefined;
  };
  const literal = (
    value: Extract<Command, { kind: "correct" }>["new_value"],
    span: string,
  ) => {
    const support =
      value.type === "date" || value.type === "datetime"
        ? (value.date?.phrase ?? value.value)
        : value.value;
    if (!contains(span, support)) invalid.push("unsupported_value");
    if (value.type === "number" && !Number.isFinite(Number(value.value)))
      invalid.push("invalid_value");
    if (
      value.type === "phone" &&
      !/^[6-9]\d{9}$/.test(value.value.replace(/\s/g, ""))
    )
      invalid.push("invalid_value");
    if (value.type === "boolean" && !["true", "false"].includes(value.value))
      invalid.push("invalid_value");
    if (
      value.type === "duration" &&
      !/^P(?:\d+[YMWD])+(?:T(?:\d+[HMS])+)?$/.test(value.value)
    )
      invalid.push("invalid_value");
    if (value.type === "date" || value.type === "datetime") {
      if (!value.date) clarify.push("unresolved_date");
      else {
        date(value.date);
        if (
          value.date.resolved &&
          DateTime.fromISO(value.value).toMillis() !==
            DateTime.fromISO(value.date.resolved).toMillis()
        )
          invalid.push("invalid_value");
      }
    }
  };
  switch (command.kind) {
    case "remember":
      for (const fact of command.facts) {
        const subject = entity(fact.subject);
        const evidenceSpan = evidence(fact.evidence);
        const support =
          fact.object?.mention ??
          fact.value?.date?.phrase ??
          fact.value?.value ??
          "";
        const clauses = evidenceSpan
          .split(/[.;\n]|\bbut\b/iu)
          .filter(
            (part) =>
              contains(part, fact.subject.mention) && contains(part, support),
          );
        if (!clauses.length && support) invalid.push("unsupported_clause");
        const span = clauses.length === 1 ? clauses[0] : evidenceSpan;
        if (
          clauses.length > 1 &&
          clauses.some((c) => negation.test(c) || hypothetical.test(c))
        )
          clarify.push("ambiguous_evidence");
        if (!contains(span, fact.subject.mention))
          invalid.push("unsupported_subject");
        if ((fact.value === undefined) === (fact.object === undefined))
          invalid.push("value_object_exclusivity");
        if (fact.value) literal(fact.value, span);
        if (fact.object) {
          entity(fact.object);
          if (!contains(span, fact.object.mention))
            invalid.push("unsupported_object");
        }
        const polarity = hypothetical.test(span)
          ? "hypothetical"
          : negation.test(span)
            ? "negated"
            : "affirmed";
        if (polarity !== fact.polarity) invalid.push("polarity_mismatch");
        if (fact.polarity !== "affirmed") clarify.push("non_affirmed_fact");
        const registry = REGISTRY[fact.predicate];
        if (!registry && /^new:[a-z][a-z0-9_]*$/.test(fact.predicate))
          provisional.push(fact.predicate);
        else if (!registry) invalid.push("unknown_predicate");
        if (registry) {
          if (
            subject &&
            !registry.subjects.includes("*") &&
            !registry.subjects.includes(subject.type)
          )
            invalid.push("predicate_subject_mismatch");
          if (
            (registry.value === "entity" && !fact.object) ||
            (registry.value !== "entity" && fact.value?.type !== registry.value)
          )
            invalid.push("predicate_value_mismatch");
          if (registry.health) confirm.push("health_confirmation");
        }
        const defaultPrivate =
          registry?.visibility === "private" ||
          /\b(?:for me|my private|private note)\b|எனக்கு மட்டும்/i.test(span);
        let visibility = defaultPrivate ? "private" : "household";
        if (fact.visibility_hint === "private") visibility = "private";
        const sharing =
          fact.share_intent === true ||
          fact.visibility_hint === "shared" ||
          (defaultPrivate && fact.visibility_hint === "household");
        if (sharing) {
          if (
            !shareCue.test(span) ||
            negation.test(span) ||
            hypothetical.test(span)
          )
            invalid.push("missing_share_cue");
          else if (subject?.owner_id && subject.owner_id !== ctx.speaker_id)
            invalid.push("not_owner");
          else {
            visibility = defaultPrivate ? "shared" : "household";
            if (subject?.visibility === "private")
              confirm.push("private_entity_projection");
          }
        }
        visibilities.push(visibility);
        date(fact.valid_from);
      }
      break;
    case "correct": {
      const memory = target(command.target);
      const span = evidence(command.evidence);
      literal(command.new_value, span);
      const registry = memory && REGISTRY[memory.predicate];
      if (registry && registry.value !== command.new_value.type)
        invalid.push("predicate_value_mismatch");
      if (registry?.health) confirm.push("health_confirmation");
      if (
        memory &&
        memory.visibility !== "household" &&
        memory.owner_id !== ctx.speaker_id
      )
        invalid.push("not_owner");
      if (
        command.reason === "was_wrong" &&
        !/\b(?:wrong|meant|mistake|actually|thappu)\b|தவறு/i.test(span)
      )
        clarify.push("correction_reason_unclear");
      if (
        command.reason === "changed_in_world" &&
        !/\b(?:now|new|changed|from|ippo)\b|இப்போது/i.test(span)
      )
        clarify.push("correction_reason_unclear");
      date(command.effective);
      break;
    }
    case "share":
    case "unshare":
    case "forget": {
      const memory = target(command.target);
      if (
        memory &&
        (command.kind === "share" ||
          command.kind === "unshare" ||
          memory.visibility !== "household") &&
        memory.owner_id !== ctx.speaker_id
      )
        invalid.push("not_owner");
      if (command.kind === "share") {
        const span = evidence(command.evidence);
        if (
          !shareCue.test(span) ||
          negation.test(span) ||
          hypothetical.test(span)
        )
          invalid.push("missing_share_cue");
        if (
          memory &&
          ctx.entities.find((x) => x.id === memory.subject_id)?.visibility ===
            "private"
        )
          confirm.push("private_entity_projection");
      }
      break;
    }
    case "task_complete": {
      const ref = command.target;
      if (ref.memory_id || ref.entity || ref.predicate || ref.refers_to_last)
        invalid.push("invalid_target_kind");
      const task = ctx.tasks.find((x) => x.id === ref.task_id);
      if (!task)
        (ref.task_id ? invalid : clarify).push(
          ref.task_id ? "invalid_task_id" : "missing_target",
        );
      else if (!contains(transcript, task.title))
        invalid.push("unsupported_task_target");
      break;
    }
    case "undo": {
      const op = ctx.operations.at(-1);
      if (
        !op ||
        DateTime.fromISO(ctx.occurred_at).toMillis() -
          DateTime.fromISO(op.occurred_at).toMillis() >
          86400000
      )
        clarify.push("unavailable_undo");
      else if (!op.reversible) invalid.push("irreversible_operation");
      else if (!op.postcondition_holds) clarify.push("undo_conflict");
      break;
    }
    case "ask":
      command.query.entities.forEach(entity);
      for (const predicate of command.query.predicates)
        if (!REGISTRY[predicate]) invalid.push("unknown_predicate");
      date(command.query.time);
      break;
    case "inspect":
      entity(command.entity);
      break;
    case "list_add":
    case "list_complete":
    case "list_remove":
    case "list_read": {
      const matches = ctx.lists.filter((x) =>
        [x.name, ...x.aliases].some(
          (n) => normalize(n) === normalize(command.list.mention),
        ),
      );
      if (
        command.list.list_id &&
        !matches.some((x) => x.id === command.list.list_id)
      )
        invalid.push("invalid_list_id");
      if (matches.length !== 1)
        clarify.push(matches.length ? "ambiguous_list" : "unavailable_list");
      else command.list.list_id = matches[0].id;
      if (command.kind === "list_add") {
        for (const item of command.items) {
          const relevant = transcript
            .split(/[.;\n]|\bbut\b/iu)
            .filter((part) => contains(part, item.name));
          if (
            relevant.some(
              (part) => negation.test(part) || hypothetical.test(part),
            )
          )
            clarify.push("non_affirmed_list");
          if (item.quantity !== undefined) {
            const before = [String(item.quantity), item.unit, item.name]
              .filter(Boolean)
              .join(" ");
            const after = [item.name, String(item.quantity), item.unit]
              .filter(Boolean)
              .join(" ");
            if (!contains(transcript, before) && !contains(transcript, after))
              invalid.push("unsupported_quantity");
          }
          if (!contains(transcript, item.name))
            invalid.push("unsupported_item");
          if (
            item.quantity !== undefined &&
            !contains(transcript, String(item.quantity))
          )
            invalid.push("unsupported_quantity");
          if (item.unit && !contains(transcript, item.unit))
            invalid.push("unsupported_unit");
          if (item.note && !contains(transcript, item.note))
            invalid.push("unsupported_note");
        }
      } else if (command.kind !== "list_read")
        for (const item of command.items)
          if (!contains(transcript, item)) invalid.push("unsupported_item");
      break;
    }
    case "reminder_create":
      members(command.targets, true);
      if (!contains(transcript, command.text))
        invalid.push("unsupported_reminder_text");
      if (
        /\bremind me\b|எனக்கு நினைவூட்டு/i.test(transcript) &&
        (command.targets.length !== 1 ||
          command.targets[0].member_id !== ctx.speaker_id)
      )
        invalid.push("target_mismatch");
      if (/\bremind us\b/i.test(transcript)) {
        const adults = ctx.members
          .filter((x) => x.role === "adult")
          .map((x) => x.id)
          .sort();
        if (
          JSON.stringify(command.targets.map((x) => x.member_id).sort()) !==
          JSON.stringify(adults)
        )
          invalid.push("target_mismatch");
      }
      date(command.at, true);
      visibilities.push(
        command.targets.length === 1 &&
          command.targets[0].member_id === ctx.speaker_id
          ? "private"
          : "household",
      );
      break;
    case "task_create":
      if (!contains(transcript, command.title))
        invalid.push("unsupported_task_title");
      members(command.assignees, false);
      date(command.due);
      if (command.remind_at) date(command.remind_at, true);
      break;
    case "task_list":
      if (command.assignee) members([command.assignee], false);
      date(command.range);
      break;
    case "clarify_answer":
      if (
        !ctx.pending ||
        DateTime.fromISO(ctx.occurred_at).toMillis() -
          DateTime.fromISO(ctx.pending.created_at).toMillis() >=
          300000
      )
        clarify.push("expired_clarification");
      else if (!ctx.pending.choices.includes(command.choice))
        invalid.push("invalid_choice");
      break;
    case "unsupported":
      clarify.push("unsupported_command");
      break;
  }
  if (
    "recurrence" in command &&
    command.recurrence &&
    !/^FREQ=(?:DAILY|WEEKLY|MONTHLY|YEARLY)(?:;(?:INTERVAL=\d+|BYDAY=(?:MO|TU|WE|TH|FR|SA|SU)(?:,(?:MO|TU|WE|TH|FR|SA|SU))*))*$/.test(
      command.recurrence,
    )
  )
    invalid.push("invalid_recurrence");
  const reasons = [
    ...new Set(invalid.length ? invalid : clarify.length ? clarify : confirm),
  ];
  const status = invalid.length
    ? "invalid"
    : clarify.length
      ? "clarification_required"
      : confirm.length
        ? "confirmation_required"
        : "interpreted";
  const checked = Validated.command.safeParse(command);
  return {
    index,
    status,
    reasons,
    visibilities,
    provisional,
    ...((status === "interpreted" || status === "confirmation_required") &&
    checked.success
      ? { validated: checked.data }
      : {}),
  };
}
