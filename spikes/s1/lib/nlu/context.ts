import { z } from "zod";
import { EntityType } from "./contracts";

export const REGISTRY_VERSION = "synthetic-v1";
export const FIXTURE_VERSION = "golden-v1";
export const ContextSchema = z.strictObject({
  occurred_at: z.iso.datetime({ offset: true }),
  speaker_id: z.string(),
  members: z
    .array(
      z.strictObject({
        id: z.string(),
        entity_id: z.string(),
        name: z.string(),
        aliases: z.array(z.string()),
        role: z.enum(["adult", "child"]),
        relation: z.enum(["self", "spouse", "child"]),
      }),
    )
    .max(10),
  entities: z
    .array(
      z.strictObject({
        id: z.string(),
        name: z.string(),
        aliases: z.array(z.string()),
        type: EntityType,
        visibility: z.enum(["household", "shared", "private"]),
        owner_id: z.string().optional(),
      }),
    )
    .max(20),
  lists: z
    .array(
      z.strictObject({
        id: z.string(),
        name: z.string(),
        aliases: z.array(z.string()),
        items: z.array(z.string()),
      }),
    )
    .max(5),
  memories: z
    .array(
      z.strictObject({
        id: z.string(),
        subject_id: z.string(),
        predicate: z.string(),
        value: z.string(),
        visibility: z.enum(["household", "shared", "private"]),
        owner_id: z.string().optional(),
      }),
    )
    .max(20),
  tasks: z
    .array(
      z.strictObject({
        id: z.string(),
        title: z.string(),
        visibility: z.enum(["household", "private"]),
        owner_id: z.string().optional(),
      }),
    )
    .max(20)
    .default([]),
  operations: z
    .array(
      z.strictObject({
        id: z.string(),
        occurred_at: z.iso.datetime({ offset: true }),
        actor_id: z.string(),
        reversible: z.boolean(),
        postcondition_holds: z.boolean(),
        memory_id: z.string().optional(),
      }),
    )
    .max(10),
  previous_turns: z
    .array(
      z.strictObject({ text: z.string(), memory_ids: z.array(z.string()) }),
    )
    .max(3),
  pending: z
    .strictObject({
      created_at: z.iso.datetime({ offset: true }),
      choices: z.array(z.string()),
    })
    .optional(),
});
export type Context = z.infer<typeof ContextSchema>;
export type Predicate = {
  subjects: string[];
  value: string;
  visibility: "household" | "private";
  health?: boolean;
};
export const REGISTRY: Record<string, Predicate> = {
  prefers: { subjects: ["person"], value: "text", visibility: "household" },
  dislikes: { subjects: ["person"], value: "text", visibility: "household" },
  allergic_to: {
    subjects: ["person"],
    value: "text",
    visibility: "household",
    health: true,
  },
  medication: {
    subjects: ["person"],
    value: "text",
    visibility: "private",
    health: true,
  },
  phone_number: {
    subjects: ["person", "organization", "service_provider"],
    value: "phone",
    visibility: "household",
  },
  stored_at: {
    subjects: ["item", "document"],
    value: "text",
    visibility: "household",
  },
  service_provider: {
    subjects: ["household", "appliance"],
    value: "entity",
    visibility: "household",
  },
  note: { subjects: ["*"], value: "text", visibility: "private" },
  warranty_expires_on: {
    subjects: ["appliance", "vehicle", "item"],
    value: "date",
    visibility: "household",
  },
  purchased_on: {
    subjects: ["appliance", "vehicle", "item"],
    value: "date",
    visibility: "household",
  },
  serviced_on: {
    subjects: ["appliance", "vehicle"],
    value: "date",
    visibility: "household",
  },
  service_interval: {
    subjects: ["appliance", "vehicle"],
    value: "duration",
    visibility: "household",
  },
};
export function visibleContext(raw: Context): Context {
  const ctx = ContextSchema.parse(raw);
  const adult =
    ctx.members.find((x) => x.id === ctx.speaker_id)?.role === "adult";
  const visible = (x: { visibility: string; owner_id?: string }) =>
    x.visibility === "private"
      ? x.owner_id === ctx.speaker_id
      : x.visibility === "shared"
        ? adult
        : true;
  const entities = ctx.entities.filter(visible);
  const ids = new Set(entities.map((x) => x.id));
  const memories = ctx.memories.filter(
    (x) => visible(x) && ids.has(x.subject_id),
  );
  const memoryIds = new Set(memories.map((x) => x.id));
  // A prior turn referring to an invisible record is omitted, including its text.
  return {
    ...ctx,
    entities,
    memories,
    tasks: ctx.tasks.filter(visible),
    operations: ctx.operations.filter(
      (x) =>
        x.actor_id === ctx.speaker_id &&
        (!x.memory_id || memoryIds.has(x.memory_id)),
    ),
    previous_turns: ctx.previous_turns.filter((x) =>
      x.memory_ids.every((id) => memoryIds.has(id)),
    ),
  };
}
