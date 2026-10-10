import { BENCHMARK_IDS, COMBINATIONS, VOICE_VERSION } from "../../config/voice";
import { p50, p95 } from "../scoring";
import type { AudioTrace, LongTaskTrace, resourceTrace } from "./client-timing";
import type { RequestRoute } from "./routing";
import type { ServerTrace } from "./timing";

export type TrialResult = {
  id: string;
  purpose?: "benchmark" | "smoke";
  fixture: string;
  voice: string;
  version: string;
  combination: (typeof COMBINATIONS)[number];
  standalone: boolean;
  status: "ok" | "blocked" | "failed" | "cancelled" | "interrupted";
  firstAudioMs: number | null;
  providerMs: number | null;
  providerFirstAudioMs?: number | null;
  providerHeadersMs?: number | null;
  transferFirstChunkMs?: number | null;
  audioBytes?: number;
  underruns?: number;
  serverTrace?: ServerTrace;
  clientTrace?: {
    schema: "s4-latency-1";
    responseHeadersMs?: number;
    fetchStartMs?: number;
    processingMs: number;
    maxProcessingMs: number;
    maxArrivalGapMs: number;
    chunks: number;
    startupBufferMs: number;
    leadingSilenceMs?: number;
    originalLeadingSilenceMs?: number;
    trimmedZeroPrefixMs?: number;
    onsetEstimator?: string;
    contextSampleRate: number;
    baseLatencyMs: number | null;
    outputLatencyMs: number | null;
    diagnosticsVersion?: "s4-client-timing-1";
    requestRoute?: RequestRoute;
    audio?: AudioTrace;
    longTasks?: LongTaskTrace;
    resource?: ReturnType<typeof resourceTrace>;
  };
  cached: boolean;
  sentenceLength: number;
  at: string;
};

export function summarizeVoice(
  rows: TrialResult[],
  voice: string,
  audibleOnsetVerified = false,
) {
  return COMBINATIONS.map((combination) => {
    const trials = rows.filter(
      (row) =>
        row.combination === combination &&
        row.voice === voice &&
        row.version === VOICE_VERSION &&
        !row.cached &&
        row.purpose !== "smoke",
    );
    const ids = new Set(trials.map((row) => row.id));
    const successes = trials.filter(
      (row) =>
        row.status === "ok" &&
        row.standalone &&
        row.firstAudioMs !== null &&
        Number.isFinite(row.firstAudioMs) &&
        row.firstAudioMs >= 0 &&
        (row.underruns ?? 0) === 0,
    );
    const timings = successes.map((row) => row.firstAudioMs as number);
    return {
      combination,
      attempted: trials.length,
      successful: successes.length,
      failed: trials.length - successes.length,
      p50Ms: timings.length ? p50(timings) : null,
      p95Ms: timings.length ? p95(timings) : null,
      accepted:
        trials.length >= 50 &&
        ids.size === trials.length &&
        BENCHMARK_IDS.every(
          (fixture) =>
            trials.filter((row) => row.fixture === fixture).length >= 5,
        ) &&
        successes.length === trials.length &&
        p95(timings) <= 700 &&
        audibleOnsetVerified,
      audibleOnsetVerified,
    };
  });
}
