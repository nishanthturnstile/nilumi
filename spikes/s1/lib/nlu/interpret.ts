import { type Context, REGISTRY, visibleContext } from "./context";
import { NluResult } from "./contracts";
import { resolveDate } from "./dates";
import { normalize, resolveEntity, validateResult } from "./validate";

export const INTERPRETATION_VERSION = "s3-interpret-v4";

// Deterministic interpretation is part of the application, not an LLM repair call.
// Keep the original extraction validation so benchmark reports expose both stages.
export function interpretResult(
  raw: unknown,
  transcript: string,
  context: Context,
) {
  const extractionValidation = validateResult(raw, transcript, context);
  const parsed = NluResult.safeParse(raw);
  const normalizations: { path: string; kind: "date" | "reference" }[] = [];
  if (!parsed.success || extractionValidation.status === "refused")
    return {
      extractionValidation,
      validation: extractionValidation,
      normalizations,
    };
  const input = structuredClone(parsed.data);
  const incompleteDates = new Set<number>();
  const visible = visibleContext(context);
  function bindMembers(
    refs: { mention: string; member_id?: string }[],
    path: string,
  ) {
    for (const [index, ref] of refs.entries()) {
      const matches = visible.members.filter(
        (member) =>
          [member.name, ...member.aliases].some(
            (alias) => normalize(alias) === normalize(ref.mention),
          ) &&
          (!ref.member_id || member.id === ref.member_id),
      );
      if (matches.length === 1 && !ref.member_id) {
        ref.member_id = matches[0].id;
        normalizations.push({ path: `${path}.${index}`, kind: "reference" });
      }
    }
  }
  for (const [index, command] of input.commands.entries()) {
    if (command.kind === "reminder_create")
      bindMembers(command.targets, `result.commands.${index}.targets`);
    if (command.kind === "task_create")
      bindMembers(command.assignees, `result.commands.${index}.assignees`);
    if (command.kind === "task_list" && command.assignee)
      bindMembers([command.assignee], `result.commands.${index}.assignee`);
    if (command.kind !== "share" && command.kind !== "unshare") continue;
    const target = command.target;
    if (
      target.task_id ||
      (!target.entity &&
        !target.predicate &&
        !target.memory_id &&
        !target.refers_to_last)
    )
      continue;
    const entity = target.entity
      ? resolveEntity(target.entity, visible).entity
      : undefined;
    if (
      (target.entity && !entity) ||
      (target.predicate && !Object.hasOwn(REGISTRY, target.predicate))
    )
      continue;
    const matches = visible.memories.filter(
      (memory) =>
        (!entity || memory.subject_id === entity.id) &&
        (!target.predicate || memory.predicate === target.predicate) &&
        (!target.memory_id || memory.id === target.memory_id) &&
        (!target.refers_to_last ||
          visible.previous_turns.at(-1)?.memory_ids.includes(memory.id)),
    );
    if (matches.length !== 1) continue;
    const minimal = { memory_id: matches[0].id };
    if (JSON.stringify(target) !== JSON.stringify(minimal)) {
      command.target = minimal;
      normalizations.push({
        path: `result.commands.${index}.target`,
        kind: "reference",
      });
    }
  }
  function visit(value: unknown, path: string) {
    if (!value || typeof value !== "object") return;
    const object = value as Record<string, unknown>;
    if (typeof object.phrase === "string" && "precision" in object) {
      const literal = normalize(object.phrase);
      if (!literal || !` ${normalize(transcript)} `.includes(` ${literal} `))
        return;
      const source = transcript.normalize("NFC").toLowerCase();
      const phrase = object.phrase.normalize("NFC").toLowerCase();
      // Preserve the complete literal weekend phrase without changing its instant.
      // Only one occurrence is eligible, so another clause cannot supply the modifier.
      const occurrence = source.indexOf(phrase);
      if (
        phrase === "weekend" &&
        occurrence >= 0 &&
        source.indexOf(phrase, occurrence + phrase.length) < 0 &&
        /\bthis\s+$/.test(source.slice(0, occurrence))
      ) {
        const prefix = /\bthis\s+$/.exec(source.slice(0, occurrence));
        if (prefix) {
          object.phrase = transcript
            .normalize("NFC")
            .slice(prefix.index, occurrence + phrase.length);
          normalizations.push({ path: `${path}.phrase`, kind: "date" });
        }
      }
      for (
        let start = source.indexOf(phrase);
        start >= 0;
        start = source.indexOf(phrase, start + phrase.length)
      ) {
        const tail = source.slice(start + phrase.length);
        if (
          /^\s+(?:(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|at\s+\d|in\s+\d{4}\b)/i.test(
            tail,
          )
        ) {
          const index = /^result\.commands\.(\d+)/.exec(path)?.[1];
          if (index !== undefined) incompleteDates.add(Number(index));
          return;
        }
      }
      const date = resolveDate(object.phrase as string, context.occurred_at);
      if (!date.reason && date.resolved && date.precision) {
        if (
          object.resolved !== date.resolved ||
          object.precision !== date.precision
        )
          normalizations.push({ path, kind: "date" });
        object.resolved = date.resolved;
        object.precision = date.precision;
      }
      return;
    }
    for (const [key, child] of Object.entries(object))
      visit(child, `${path}.${key}`);
    // A typed date value duplicates its ISO in value; derive both from the phrase.
    if ((object.type === "date" || object.type === "datetime") && object.date) {
      const date = object.date as Record<string, unknown>;
      if (
        typeof date.phrase === "string" &&
        typeof date.resolved === "string" &&
        !resolveDate(date.phrase, context.occurred_at).reason &&
        ` ${normalize(transcript)} `.includes(` ${normalize(date.phrase)} `)
      ) {
        if (object.value !== date.resolved)
          normalizations.push({ path: `${path}.value`, kind: "date" });
        object.value = date.resolved;
      }
    }
  }
  visit(input, "result");
  const validation = validateResult(input, transcript, context);
  if (validation.status === "parsed") {
    for (const outcome of validation.outcomes)
      if (incompleteDates.has(outcome.index)) {
        outcome.status = "invalid";
        outcome.reasons = [
          ...new Set([...outcome.reasons, "incomplete_date_phrase"]),
        ];
        delete outcome.validated;
      }
  }
  return {
    extractionValidation,
    validation,
    normalizations,
  };
}
