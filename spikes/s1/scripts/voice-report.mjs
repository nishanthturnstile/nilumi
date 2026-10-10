import { readFile } from "node:fs/promises";
import { z } from "zod";
import {
  BENCHMARK_IDS,
  COMBINATIONS,
  ONSET_METHOD,
  VOICE_VERSION,
  VOICES,
} from "../config/voice.ts";
import { summarizeVoice } from "../lib/voice/report.ts";

const Trial = z
  .object({
    id: z.string().uuid(),
    purpose: z.enum(["benchmark", "smoke"]).optional(),
    fixture: z.enum(BENCHMARK_IDS),
    voice: z.enum(VOICES),
    version: z.literal(VOICE_VERSION),
    combination: z.enum(COMBINATIONS),
    standalone: z.boolean(),
    status: z.enum(["ok", "failed", "blocked", "cancelled", "interrupted"]),
    firstAudioMs: z.number().nonnegative().finite().nullable(),
    providerMs: z.number().nonnegative().finite().nullable(),
    providerFirstAudioMs: z
      .number()
      .nonnegative()
      .finite()
      .nullable()
      .optional(),
    providerHeadersMs: z.number().nonnegative().finite().nullable().optional(),
    transferFirstChunkMs: z
      .number()
      .nonnegative()
      .finite()
      .nullable()
      .optional(),
    audioBytes: z.number().int().nonnegative().optional(),
    underruns: z.number().int().nonnegative().optional(),
    // Diagnostics do not participate in acceptance; allow additive trace fields.
    clientTrace: z
      .object({ schema: z.literal("s4-latency-1") })
      .passthrough()
      .optional(),
    serverTrace: z
      .object({ schema: z.literal("s4-latency-1") })
      .passthrough()
      .optional(),
    cached: z.boolean(),
    sentenceLength: z.number().int().nonnegative(),
    at: z.string().datetime(),
  })
  .strict();
const Export = z.object({
  metric: z.literal("sentence-available-to-audible-playback"),
  onsetMethod: z.literal(ONSET_METHOD),
  audibleOnsetVerified: z.boolean(),
  budget: z.object({ selection: z.object({ voice: z.enum(VOICES) }) }),
  trials: z.array(Trial).max(1000),
});

try {
  const paths = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  if (!paths.length) throw new Error("report_files_required");
  const reports = await Promise.all(
    paths.map(async (path) =>
      Export.parse(JSON.parse(await readFile(path, "utf8"))),
    ),
  );
  const voice = reports[0].budget.selection.voice;
  if (reports.some((report) => report.budget.selection.voice !== voice))
    throw new Error("voice_selection_mismatch");
  const rows = reports.flatMap((report) => report.trials);
  if (new Set(rows.map((row) => row.id)).size !== rows.length)
    throw new Error("overlapping_reports");
  const verified = process.argv.includes("--audible-onset-verified");
  const summary = summarizeVoice(rows, voice, verified);
  process.stdout.write(
    `${JSON.stringify({ voice, version: VOICE_VERSION, summary, accepted: summary.every((slice) => slice.accepted) }, null, 2)}\n`,
  );
  if (!summary.every((slice) => slice.accepted)) process.exitCode = 1;
} catch {
  process.stderr.write(
    "Report refused: provide non-overlapping phone exports with the same selected voice and valid trial metadata.\n",
  );
  process.exitCode = 1;
}
