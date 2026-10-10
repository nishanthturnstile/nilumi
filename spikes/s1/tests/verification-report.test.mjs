import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  BENCHMARK_IDS,
  COMBINATIONS,
  ONSET_METHOD,
  VOICE_VERSION,
} from "../config/voice.ts";

test("offline voice report accepts additive traces without bypassing acceptance gates", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nilumi-s4-report-"));
  const path = join(directory, "report.json");
  const report = {
    metric: "sentence-available-to-audible-playback",
    onsetMethod: ONSET_METHOD,
    audibleOnsetVerified: true,
    budget: { selection: { voice: "ritu" } },
    trials: COMBINATIONS.flatMap((combination) =>
      Array.from({ length: 50 }, (_, index) => ({
        id: randomUUID(),
        fixture: BENCHMARK_IDS[index % BENCHMARK_IDS.length],
        voice: "ritu",
        version: VOICE_VERSION,
        combination,
        standalone: true,
        status: "ok",
        firstAudioMs: 600,
        providerMs: 500,
        cached: false,
        sentenceLength: 40,
        at: "2026-10-09T08:00:00.000Z",
        clientTrace: { schema: "s4-latency-1", futureDiagnostic: 12 },
        serverTrace: { schema: "s4-latency-1", futureDiagnostic: 34 },
      })),
    ),
  };
  const run = async (value, verified = true) => {
    await writeFile(path, JSON.stringify(value));
    try {
      return {
        code: 0,
        ...(await promisify(execFile)(process.execPath, [
          "--import",
          "tsx",
          "scripts/voice-report.mjs",
          path,
          ...(verified ? ["--audible-onset-verified"] : []),
        ])),
      };
    } catch (error) {
      return error;
    }
  };
  try {
    const accepted = await run(report);
    assert.equal(accepted.code, 0);
    assert.equal(JSON.parse(accepted.stdout).accepted, true);
    const unverified = await run(report, false);
    assert.equal(unverified.code, 1);
    assert.equal(JSON.parse(unverified.stdout).accepted, false);
    const cancelled = structuredClone(report);
    cancelled.trials[0].status = "cancelled";
    const stopped = await run(cancelled);
    assert.equal(stopped.code, 1);
    assert.equal(JSON.parse(stopped.stdout).summary[0].failed, 1);
    const unknown = structuredClone(report);
    unknown.trials[0].undeclaredAcceptanceField = true;
    const refused = await run(unknown);
    assert.equal(refused.code, 1);
    assert.equal(refused.stdout, "");
    assert.match(refused.stderr, /Report refused/);
    const freeOnly = await run({
      ...report,
      trials: [],
      diagnostics: report.trials,
    });
    assert.equal(freeOnly.code, 1);
    assert.equal(JSON.parse(freeOnly.stdout).accepted, false);
    assert.ok(
      JSON.parse(freeOnly.stdout).summary.every(
        (slice) => slice.attempted === 0,
      ),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
