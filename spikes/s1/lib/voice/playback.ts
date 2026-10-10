import {
  PLAYBACK_STARTUP_MS,
  TTS_SETTINGS,
  VOICE_VERSION,
} from "../../config/voice";
import {
  type AudioTrace,
  LongTaskCapture,
  resourceTrace,
} from "./client-timing";
import type { TrialResult } from "./report";
import { requestRoute } from "./routing";
import { zeroPrefixFrames } from "./zero-prefix";

export type PreparedClip = {
  id: string;
  text: string;
  fixture: string;
  url: string;
  version: string;
};

// One gesture-unlocked context per session. AudioBufferSource resamples each PCM
// buffer to the device rate; start times share one continuous audio clock.
export class PcmPlayer {
  private sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  private onsetTime: number | null = null;
  private frozenOnset: number | null = null;
  private frames = 0;
  private timingOrigin = 0;
  private timing: AudioTrace = {};
  leadingSilenceMs: number | null = null;
  trimmedZeroPrefixMs = 0;
  onsetEstimator: string | null = null;
  private sealed = false;
  private carry: number | null = null;
  private resolveDone: (() => void) | null = null;
  private rejectDone: ((error: Error) => void) | null = null;
  underruns = 0;
  generation = 0;
  constructor(
    readonly context: AudioContext,
    readonly startupBufferMs = PLAYBACK_STARTUP_MS,
  ) {
    if (![10, 20, 40].includes(startupBufferMs))
      throw new Error("invalid_startup_buffer");
  }
  async unlock() {
    // Call resume synchronously from the user gesture, before network work.
    await this.context.resume();
    if (this.context.state !== "running") throw new Error("audio_blocked");
    const source = this.context.createBufferSource();
    source.buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
    source.connect(this.context.destination);
    source.onended = () => source.disconnect();
    source.start();
  }
  begin(timingOrigin = performance.now()) {
    this.stop();
    if (this.context.state !== "running") throw new Error("audio_blocked");
    this.nextTime = 0;
    this.onsetTime = null;
    this.frozenOnset = null;
    this.frames = 0;
    this.timingOrigin = timingOrigin;
    this.timing = {};
    this.leadingSilenceMs = null;
    this.trimmedZeroPrefixMs = 0;
    this.onsetEstimator = null;
    this.sealed = false;
    this.carry = null;
    this.underruns = 0;
  }
  push(bytes: Uint8Array, rate: number) {
    if (this.context.state !== "running" || this.sealed)
      throw new Error("audio_interrupted");
    let data = bytes;
    if (this.carry !== null) {
      data = new Uint8Array(bytes.length + 1);
      data[0] = this.carry;
      data.set(bytes, 1);
      this.carry = null;
    }
    let length = data.length - (data.length % 2);
    if (data.length % 2) this.carry = data[data.length - 1];
    if (!length) return;
    if (!this.frames) {
      const removed = zeroPrefixFrames(data.subarray(0, length), rate);
      this.trimmedZeroPrefixMs = (removed / rate) * 1000;
      data = data.subarray(removed * 2);
      length -= removed * 2;
    }
    const frames = length / 2,
      buffer = this.context.createBuffer(1, frames, rate);
    const samples = buffer.getChannelData(0),
      view = new DataView(data.buffer, data.byteOffset, length);
    if (this.nextTime && this.nextTime < this.context.currentTime - 0.005)
      this.underruns++;
    const start = Math.max(
      this.nextTime,
      this.context.currentTime +
        (this.nextTime > this.context.currentTime
          ? 0
          : this.startupBufferMs / 1000),
    );
    if (start + frames / rate - this.context.currentTime > 12)
      throw new Error("audio_buffer_limit");
    for (let i = 0; i < frames; i++) {
      const sample = view.getInt16(i * 2, true);
      samples[i] = sample / 32768;
      if (this.onsetTime === null && Math.abs(sample) >= 164) {
        this.onsetTime = start + i / rate;
        this.leadingSilenceMs = ((this.frames + i) / rate) * 1000;
        this.timing.onsetDetection = {
          atMs: performance.now() - this.timingOrigin,
          contextTimeMs: this.context.currentTime * 1000,
          scheduledContextMs: this.onsetTime * 1000,
          sampleOffsetMs: (i / rate) * 1000,
        };
      }
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      if (this.sealed && !this.sources.size) this.resolveDone?.();
    };
    this.nextTime = start + frames / rate;
    this.frames += frames;
    this.timing.firstSchedule ??= {
      atMs: performance.now() - this.timingOrigin,
      contextTimeMs: this.context.currentTime * 1000,
      state: this.context.state,
      sourceStartContextMs: start * 1000,
      frames,
    };
    source.start(start);
  }
  onsetDelayMs() {
    return this.onsetTime === null
      ? null
      : Math.max(0, (this.onsetTime - this.context.currentTime) * 1000);
  }
  onsetPerformanceTime(): number | null {
    if (this.frozenOnset !== null) return this.frozenOnset;
    if (this.onsetTime === null || this.context.currentTime < this.onsetTime)
      return null;
    const stamp = this.context.getOutputTimestamp?.();
    if (
      stamp &&
      typeof stamp.contextTime === "number" &&
      typeof stamp.performanceTime === "number" &&
      stamp.contextTime > 0 &&
      stamp.performanceTime > 0
    ) {
      this.onsetEstimator = "output-timestamp";
      this.frozenOnset =
        stamp.performanceTime + (this.onsetTime - stamp.contextTime) * 1000;
      this.recordOutputMapping(stamp);
      return this.frozenOnset;
    }
    // Preserve the v2 fallback until physical-phone calibration justifies a change.
    this.onsetEstimator = this.context.outputLatency
      ? "output-latency-fallback"
      : this.context.baseLatency
        ? "base-latency-fallback"
        : "clock-only";
    this.frozenOnset =
      performance.now() +
      (this.onsetTime -
        this.context.currentTime +
        (this.context.outputLatency || this.context.baseLatency || 0)) *
        1000;
    this.recordOutputMapping();
    return this.frozenOnset;
  }
  private recordOutputMapping(stamp?: AudioTimestamp) {
    if (this.onsetTime === null || this.frozenOnset === null) return;
    this.timing.outputMapping = {
      capturedAtMs: performance.now() - this.timingOrigin,
      contextTimeMs: this.context.currentTime * 1000,
      state: this.context.state,
      scheduledContextMs: this.onsetTime * 1000,
      timestampContextMs:
        typeof stamp?.contextTime === "number"
          ? stamp.contextTime * 1000
          : null,
      timestampPerformanceMs:
        typeof stamp?.performanceTime === "number"
          ? stamp.performanceTime - this.timingOrigin
          : null,
      mappedOnsetMs: this.frozenOnset - this.timingOrigin,
    };
  }
  audioTrace(): AudioTrace {
    return this.timing;
  }
  finish() {
    this.sealed = true;
    if (this.carry !== null || this.onsetTime === null)
      return Promise.reject(new Error("invalid_or_silent_audio"));
    if (!this.sources.size) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      this.resolveDone = resolve;
      this.rejectDone = reject;
    });
  }
  stop() {
    this.generation++;
    this.sealed = true;
    this.rejectDone?.(new Error("audio_stopped"));
    this.resolveDone = null;
    this.rejectDone = null;
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
      source.disconnect();
    }
    this.sources.clear();
  }
  dispose() {
    this.stop();
    void this.context.close();
  }
}

export async function playClip(
  player: PcmPlayer,
  prepared: PreparedClip,
  signal: AbortSignal,
  combination: TrialResult["combination"],
  voice: string,
  standalone: boolean,
): Promise<TrialResult> {
  const started = performance.now();
  const row: TrialResult = {
    id: prepared.id,
    fixture: prepared.fixture,
    voice,
    version: prepared.version,
    combination,
    standalone,
    status: "failed",
    firstAudioMs: null,
    providerMs: null,
    cached: false,
    sentenceLength: prepared.text.length,
    at: new Date().toISOString(),
    providerFirstAudioMs: null,
    providerHeadersMs: null,
    transferFirstChunkMs: null,
    audioBytes: 0,
    underruns: 0,
    clientTrace: {
      schema: "s4-latency-1",
      processingMs: 0,
      maxProcessingMs: 0,
      maxArrivalGapMs: 0,
      chunks: 0,
      startupBufferMs: player.startupBufferMs,
      contextSampleRate: player.context.sampleRate,
      baseLatencyMs: Number.isFinite(player.context.baseLatency)
        ? player.context.baseLatency * 1000
        : null,
      outputLatencyMs: Number.isFinite(player.context.outputLatency)
        ? player.context.outputLatency * 1000
        : null,
    },
  };
  const client = row.clientTrace as NonNullable<TrialResult["clientTrace"]>;
  client.diagnosticsVersion = "s4-client-timing-1";
  client.requestRoute = requestRoute();
  const longTasks = new LongTaskCapture(started);
  const abort = new AbortController();
  let reason: TrialResult["status"] = "failed",
    reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let playbackGeneration: number | null = null;
  let onsetTimer: ReturnType<typeof setTimeout> | undefined;
  let lastArrival: number | null = null;
  const captureOnset = () => {
    if (playbackGeneration !== player.generation) return;
    const onset = player.onsetPerformanceTime();
    if (onset !== null && Number.isFinite(onset) && onset >= started)
      row.firstAudioMs = onset - started;
    row.underruns = player.underruns;
    if (player.leadingSilenceMs !== null)
      client.leadingSilenceMs = player.leadingSilenceMs;
    if (player.onsetEstimator) client.onsetEstimator = player.onsetEstimator;
  };
  const cancel = (status: TrialResult["status"]) => {
    reason = status;
    abort.abort();
    void reader?.cancel().catch(() => {});
    captureOnset();
    if (playbackGeneration === player.generation) {
      client.audio = player.audioTrace();
      player.stop();
    }
  };
  const aborted = () => cancel("cancelled");
  const hidden = () => {
    if (document.hidden) cancel("interrupted");
  };
  const stateChanged = () => {
    if (player.context.state !== "running") cancel("interrupted");
  };
  const timer = setTimeout(() => cancel("failed"), 20_000);
  signal.addEventListener("abort", aborted, { once: true });
  document.addEventListener("visibilitychange", hidden);
  player.context.addEventListener("statechange", stateChanged);
  try {
    signal.throwIfAborted();
    if (document.hidden) {
      reason = "interrupted";
      throw new Error("audio_interrupted");
    }
    if (prepared.version !== VOICE_VERSION)
      throw new Error("voice_version_mismatch");
    try {
      player.begin(started);
      playbackGeneration = player.generation;
    } catch {
      reason = "blocked";
      throw new Error("audio_blocked");
    }
    client.fetchStartMs = performance.now() - started;
    const response = await fetch(prepared.url, {
      signal: abort.signal,
      cache: "no-store",
    });
    client.responseHeadersMs = performance.now() - started;
    if (
      !response.ok ||
      !response.body ||
      response.headers.get("X-Audio-Format") !== "pcm16le" ||
      response.headers.get("X-Voice-Version") !== VOICE_VERSION ||
      Number(response.headers.get("X-Sample-Rate")) !==
        TTS_SETTINGS.speech_sample_rate
    )
      throw new Error("invalid_audio_response");
    row.cached = response.headers.get("X-Template-Cache") === "true";
    reader = response.body.getReader();
    while (true) {
      abort.signal.throwIfAborted();
      const chunk = await reader.read();
      if (chunk.done) break;
      if (!chunk.value.length) continue;
      const arrival = performance.now();
      row.transferFirstChunkMs ??= arrival - started;
      if (lastArrival !== null)
        client.maxArrivalGapMs = Math.max(
          client.maxArrivalGapMs,
          arrival - lastArrival,
        );
      lastArrival = arrival;
      client.chunks++;
      row.audioBytes = (row.audioBytes ?? 0) + chunk.value.length;
      if (row.audioBytes > 3_000_000) throw new Error("audio_buffer_limit");
      if (player.generation !== playbackGeneration)
        throw new Error("stale_audio_attempt");
      const processing = performance.now();
      player.push(chunk.value, TTS_SETTINGS.speech_sample_rate);
      const elapsed = performance.now() - processing;
      client.processingMs += elapsed;
      client.maxProcessingMs = Math.max(client.maxProcessingMs, elapsed);
      captureOnset();
      const delay = player.onsetDelayMs();
      if (
        onsetTimer === undefined &&
        delay !== null &&
        row.firstAudioMs === null
      )
        onsetTimer = setTimeout(captureOnset, Math.ceil(delay) + 16);
    }
    abort.signal.throwIfAborted();
    // Final provider diagnostics arrive after EOF, outside first-audio timing.
    // Await them alongside completion; never delay playback for metadata.
    const metadata = async () => {
      const response = await fetch(`${prepared.url}?metadata=1`, {
        signal: abort.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("audio_not_complete");
      const info = await response.json();
      if (
        ![
          info.providerMs,
          info.providerFirstAudioMs,
          info.providerHeadersMs,
        ].every(
          (value) =>
            typeof value === "number" && Number.isFinite(value) && value >= 0,
        ) ||
        info.pcmBytes !== row.audioBytes
      )
        throw new Error("invalid_audio_diagnostics");
      row.providerMs = info.providerMs;
      row.providerFirstAudioMs = info.providerFirstAudioMs;
      row.providerHeadersMs = info.providerHeadersMs;
    };
    await Promise.all([player.finish(), metadata()]);
    abort.signal.throwIfAborted();
    if (document.hidden || player.context.state !== "running") {
      reason = "interrupted";
      throw new Error("audio_interrupted");
    }
    row.underruns = player.underruns;
    row.status = player.underruns ? "failed" : "ok";
  } catch {
    row.status = signal.aborted ? "cancelled" : reason;
  } finally {
    captureOnset();
    client.longTasks = longTasks.finish(
      row.transferFirstChunkMs ?? null,
      row.firstAudioMs ?? performance.now() - started,
    );
    if (playbackGeneration === player.generation) {
      client.audio = player.audioTrace();
      client.trimmedZeroPrefixMs = player.trimmedZeroPrefixMs;
      if (player.leadingSilenceMs !== null)
        client.originalLeadingSilenceMs =
          player.leadingSilenceMs + player.trimmedZeroPrefixMs;
    }
    clearTimeout(onsetTimer);
    clearTimeout(timer);
    signal.removeEventListener("abort", aborted);
    document.removeEventListener("visibilitychange", hidden);
    player.context.removeEventListener("statechange", stateChanged);
    abort.abort();
    await reader?.cancel().catch(() => {});
    reader?.releaseLock();
    if (player.generation === playbackGeneration) player.stop();
    if (prepared.id !== "diagnostic" && client.fetchStartMs !== undefined) {
      // A bounded, read-only request preserves partial traces on failures/Stop.
      // Its latency is outside onset and it can never start synthesis.
      try {
        const response = await fetch(`${prepared.url}?trace=1`, {
          cache: "no-store",
          signal: AbortSignal.timeout(1500),
        });
        if (
          response.headers.get("content-type")?.startsWith("application/json")
        ) {
          const trace = await response.json();
          if (response.ok && trace.schema === "s4-latency-1")
            row.serverTrace = trace;
        } else await response.body?.cancel();
      } catch {
        /* Optional diagnostics do not change a playback result. */
      }
    }
    if (typeof window !== "undefined") {
      try {
        const entries = performance.getEntriesByName(
          new URL(prepared.url, window.location.href).href,
          "resource",
        ) as PerformanceResourceTiming[];
        const resource = entries.findLast(
          (entry) => entry.startTime >= started,
        );
        if (resource)
          client.resource = resourceTrace(
            resource,
            started,
            client.fetchStartMs,
            client.responseHeadersMs,
          );
      } catch {
        /* Optional resource diagnostics cannot change the playback result. */
      }
    }
  }
  return row;
}
