import { z } from "zod";

export const CONTRACT_VERSION = "s3-v1";
export const PROVIDER_SCHEMA_VERSION = "s3-wire-v2";
export const EntityType = z.enum([
  "person",
  "household",
  "appliance",
  "vehicle",
  "place",
  "organization",
  "service_provider",
  "document",
  "item",
  "food",
  "activity",
]);
const text = z.string().min(1).max(1000);
export const Evidence = z.strictObject({
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
});
export const EntityRef = z.strictObject({
  existing_id: text.optional(),
  mention: text,
  type_hint: EntityType.optional(),
  relation: z
    .enum(["self", "spouse", "child", "children", "household"])
    .optional(),
});
export const MemberRef = z.strictObject({
  mention: text,
  member_id: text.optional(),
});
export const ListRef = z.strictObject({
  mention: text,
  list_id: text.optional(),
});
export const TargetRef = z.strictObject({
  memory_id: text.optional(),
  task_id: text.optional(),
  refers_to_last: z.boolean().optional(),
  entity: EntityRef.optional(),
  predicate: text.optional(),
});
function contract(complete: boolean) {
  const resolved = z.iso.datetime({ offset: true });
  const date = z.strictObject({
    phrase: text,
    resolved: complete ? resolved : resolved.optional(),
    precision: z.enum(["minute", "day", "month", "year", "approx"]),
  });
  const value = z.strictObject({
    type: z.enum([
      "text",
      "date",
      "datetime",
      "number",
      "money",
      "phone",
      "duration",
      "boolean",
    ]),
    value: text,
    unit: text.optional(),
    date: date.optional(),
  });
  const fact = z.strictObject({
    subject: EntityRef,
    predicate: text,
    qualifier: text.optional(),
    object: EntityRef.optional(),
    value: value.optional(),
    valid_from: date.optional(),
    visibility_hint: z.enum(["household", "shared", "private"]).optional(),
    share_intent: z.boolean().optional(),
    evidence: Evidence,
    polarity: z.enum(["affirmed", "negated", "hypothetical"]),
  });
  const query = z.strictObject({
    entities: z.array(EntityRef).max(20),
    predicates: z.array(text).max(20),
    time: date.optional(),
    answer_shape: z.enum(["value", "list", "when", "who", "yes_no", "summary"]),
    include_history: z.boolean(),
  });
  // Literal kinds keep branches exclusive; a regular union emits OpenAI-supported anyOf.
  const command = z.union([
    z.strictObject({
      kind: z.literal("remember"),
      facts: z.array(fact).min(1).max(20),
    }),
    z.strictObject({
      kind: z.literal("correct"),
      target: TargetRef,
      new_value: value,
      reason: z.enum(["was_wrong", "changed_in_world"]),
      effective: date.optional(),
      evidence: Evidence,
    }),
    z.strictObject({ kind: z.literal("forget"), target: TargetRef }),
    z.strictObject({
      kind: z.literal("share"),
      target: TargetRef,
      evidence: Evidence,
    }),
    z.strictObject({ kind: z.literal("unshare"), target: TargetRef }),
    z.strictObject({ kind: z.literal("undo") }),
    z.strictObject({ kind: z.literal("ask"), query }),
    z.strictObject({ kind: z.literal("inspect"), entity: EntityRef }),
    z.strictObject({
      kind: z.literal("list_add"),
      list: ListRef,
      items: z
        .array(
          z.strictObject({
            name: text,
            quantity: z.number().positive().optional(),
            unit: text.optional(),
            note: text.optional(),
          }),
        )
        .min(1)
        .max(40),
    }),
    z.strictObject({
      kind: z.literal("list_complete"),
      list: ListRef,
      items: z.array(text).min(1).max(40),
    }),
    z.strictObject({
      kind: z.literal("list_remove"),
      list: ListRef,
      items: z.array(text).min(1).max(40),
    }),
    z.strictObject({ kind: z.literal("list_read"), list: ListRef }),
    z.strictObject({
      kind: z.literal("task_create"),
      title: text,
      due: date.optional(),
      assignees: z.array(MemberRef).max(10),
      remind_at: date.optional(),
      recurrence: text.optional(),
    }),
    z.strictObject({
      kind: z.literal("reminder_create"),
      text,
      at: complete ? date : date.optional(),
      targets: z.array(MemberRef).max(10),
      recurrence: text.optional(),
    }),
    z.strictObject({ kind: z.literal("task_complete"), target: TargetRef }),
    z.strictObject({
      kind: z.literal("task_list"),
      range: date.optional(),
      assignee: MemberRef.optional(),
    }),
    z.strictObject({ kind: z.literal("clarify_answer"), choice: text }),
    z.strictObject({ kind: z.literal("unsupported"), reason: text }),
  ]);
  return {
    command,
    date,
    value,
    fact,
    result: z
      .strictObject({
        language: z.enum(["en", "ta", "mixed"]),
        commands: z.array(command).max(5),
        smalltalk_reply: text.optional(),
      })
      .refine(
        (x) => !x.commands.length || x.smalltalk_reply === undefined,
        "Smalltalk requires zero commands",
      ),
  };
}
export const Parser = contract(false);
export const Validated = contract(true);
export const NluResult = Parser.result;
function providerSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(providerSchema);
  if (!value || typeof value !== "object") return value;
  const node = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, providerSchema(child)]),
  );
  // Zod wraps optional draft-7 references in a one-branch allOf. OpenAI's
  // supported subset accepts the reference directly; this wrapper adds no rule.
  if (
    Array.isArray(node.allOf) &&
    node.allOf.length === 1 &&
    Object.keys(node).length === 1
  )
    return node.allOf[0];
  if (node.type === "object" && node.properties) {
    const properties = node.properties as Record<string, unknown>;
    const required = new Set((node.required as string[] | undefined) ?? []);
    node.properties = Object.fromEntries(
      Object.entries(properties).map(([key, child]) => [
        key,
        required.has(key) ? child : { anyOf: [child, { type: "null" }] },
      ]),
    );
    node.required = Object.keys(properties);
    node.additionalProperties = false;
  }
  return node;
}
// References remove repeated wire definitions without changing parsed contracts.
const parserJsonSchema = z.toJSONSchema(NluResult, {
  target: "draft-7",
  reused: "ref",
});
export const PROVIDER_SCHEMA = providerSchema(
  parserJsonSchema,
) as typeof parserJsonSchema;

// Provider-only nulls represent absent optional slots; required omissions still fail Zod.
export function normalizeProviderOutput(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeProviderOutput);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== null)
      .map(([key, child]) => [key, normalizeProviderOutput(child)]),
  );
}
export type ParsedResult = z.infer<typeof NluResult>;
export type Command = z.infer<typeof Parser.command>;
export type ValidatedCommand = z.infer<typeof Validated.command>;
export type Fact = z.infer<typeof Parser.fact>;
export type DateExpr = z.infer<typeof Parser.date>;
export type EntityReference = z.infer<typeof EntityRef>;
