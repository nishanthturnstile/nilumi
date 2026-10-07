import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { ContextSchema } from "./context";
import { NluResult } from "./contracts";
export const FixtureSchema = z.strictObject({
  id: z.string().regex(/^[a-z]+-\d{2}$/),
  category: z.enum([
    "shopping",
    "memories",
    "dates",
    "questions",
    "corrections",
    "privacy",
  ]),
  tags: z.array(z.string()),
  split: z.enum(["development", "held_out"]),
  transcript: z.string().min(1),
  context: ContextSchema,
  expected: NluResult.nullable(),
  outcomes: z.array(
    z.strictObject({
      index: z.number().int().nonnegative(),
      status: z.enum([
        "interpreted",
        "clarification_required",
        "confirmation_required",
        "invalid",
      ]),
      reasons: z.array(z.string()),
      visibilities: z.array(z.string()),
      provisional: z.array(z.string()),
    }),
  ),
  refusal: z
    .enum(["payment_card", "aadhaar", "pan", "secret_cue", "password"])
    .optional(),
  understanding: z.string(),
  explanation: z.string(),
});
export type Fixture = z.infer<typeof FixtureSchema>;
export async function loadFixtures() {
  const bytes = await readFile(join(process.cwd(), "evals/nlu.jsonl"));
  const fixtures = bytes
    .toString("utf8")
    .trim()
    .split("\n")
    .map((x) => FixtureSchema.parse(JSON.parse(x)));
  return { fixtures, hash: createHash("sha256").update(bytes).digest("hex") };
}
