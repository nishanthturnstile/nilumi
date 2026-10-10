import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  LEGACY_APPLICATION_VOICE_VERSION,
  LEGACY_POOL_VOICE_VERSION,
  LEGACY_STREAM_VOICE_VERSION,
  LEGACY_VOICE_VERSION,
  PREVIOUS_VOICE_VERSION,
  TTS_SETTINGS,
  VOICE_VERSION,
} from "../config/voice.ts";
import {
  CAPS,
  initializeLedger,
  reserve,
  spent,
  withLedger,
} from "../lib/verification/ledger.ts";
import { AttemptIndex } from "../lib/voice/attempts.ts";
import { PcmPlayer, playClip } from "../lib/voice/playback.ts";
import { summarizeVoice } from "../lib/voice/report.ts";
import { synthesize } from "../lib/voice/sarvam.ts";
import {
  handleClip,
  handleDiagnostic,
  handleVoice,
} from "../lib/voice/service.ts";
import { ReplayAudio } from "../lib/voice/stream-buffer.ts";
import { traceProviderRequest } from "../lib/voice/timing.ts";
import { WavStreamDecoder } from "../lib/voice/wav-stream.ts";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
function pcm(frames = 1000) {
  const bytes = Buffer.alloc(frames * 2);
  for (let i = 50; i < frames; i++) bytes.writeInt16LE(3000, i * 2);
  return bytes;
}
function wave(samples = pcm(), unknown = false) {
  const bytes = Buffer.alloc(samples.length + 44);
  bytes.write("RIFF");
  bytes.writeUInt32LE(unknown ? 0xffffffff : bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(TTS_SETTINGS.speech_sample_rate, 24);
  bytes.writeUInt32LE(TTS_SETTINGS.speech_sample_rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(unknown ? 0xffffffff : samples.length, 40);
  bytes.set(samples, 44);
  return bytes;
}
const timing = (bytes) => ({
  providerMs: 100,
  providerHeadersMs: 30,
  providerFirstAudioMs: 50,
  leadingSilenceMs: (50 / TTS_SETTINGS.speech_sample_rate) * 1000,
  pcmBytes: bytes.length,
});
async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "nilumi-s4-stream-"));
  await initializeLedger(directory, "s4");
  const env = {
    S4_ENABLED: "true",
    S4_STATE_DIR: directory,
    S4_ORIGIN: "https://example.invalid",
    AUTH_SECRET: "test",
    S4_EVALUATOR_EMAILS: "a@example.invalid",
    S4_PRICE_VERIFIED_AT: "2026-10-09",
    S4_BILLING_MAX_MULTIPLIER: "1.2",
    SARVAM_API_KEY: "test",
  };
  const request = (data, method = "POST") =>
    new Request(`${env.S4_ORIGIN}/api/voice`, {
      method,
      headers: { origin: env.S4_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify(data),
    });
  const prepare = async (fixture = "shopping", mode = "listen") => {
    const response = await handleVoice(
      request({ fixture, voice: "ritu", mode }),
      "a@example.invalid",
      env,
    );
    assert.equal(response.status, 200);
    return response.json();
  };
  const get = (item, options = {}) =>
    new Request(`${env.S4_ORIGIN}${item.url}`, options);
  return { directory, env, request, prepare, get };
}
async function consume(reader) {
  const parts = [];
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) return Buffer.concat(parts);
    parts.push(chunk.value);
  }
}
for (const unknown of [false, true])
  test(`incremental WAV accepts split headers/samples and ${unknown ? "unknown" : "known"} lengths`, () => {
    const decoder = new WavStreamDecoder(),
      bytes = wave(pcm(), unknown),
      parts = [];
    for (let i = 0; i < bytes.length; i++)
      parts.push(...decoder.push(bytes.subarray(i, i + 1)));
    assert.deepEqual(Buffer.concat(parts), pcm());
    assert.equal(decoder.finish().pcmBytes, pcm().length);
    assert.equal(
      decoder.finish().leadingSilenceMs,
      (50 / TTS_SETTINGS.speech_sample_rate) * 1000,
    );
  });
for (const [name, mutate] of [
  ["wrong sample rate", (b) => b.writeUInt32LE(16000, 24)],
  ["stereo", (b) => b.writeUInt16LE(2, 22)],
  ["compressed encoding", (b) => b.writeUInt16LE(3, 20)],
  ["RIFF mismatch", (b) => b.writeUInt32LE(b.length, 4)],
  ["truncation", (b) => b.subarray(0, b.length - 2)],
  ["trailing garbage", (b) => Buffer.concat([b, Buffer.from("garbage")])],
  ["silence", (b) => b.fill(0, 44)],
])
  test(`WAV stream rejects ${name}`, () => {
    const bytes = wave(),
      result = mutate(bytes),
      decoder = new WavStreamDecoder();
    assert.throws(() => {
      decoder.push(result instanceof Uint8Array ? result : bytes);
      decoder.finish();
    }, /audio/);
  });
test("WAV parser skips padded ancillary chunks without playing header bytes", () => {
  const bytes = wave(),
    junk = Buffer.from([74, 85, 78, 75, 3, 0, 0, 0, 1, 2, 3, 0]);
  const joined = Buffer.concat([
    bytes.subarray(0, 36),
    junk,
    bytes.subarray(36),
  ]);
  joined.writeUInt32LE(joined.length - 8, 4);
  const decoder = new WavStreamDecoder();
  assert.deepEqual(Buffer.concat(decoder.push(joined)), pcm());
  assert.equal(decoder.finish().pcmBytes, pcm().length);
});
test("Sarvam forwards first PCM before upstream completes and disables provider caching", async () => {
  const tail = deferred(),
    bytes = wave();
  let completed = false,
    requests = 0;
  const trace = {};
  const iterator = synthesize(
    "Your list is up to date.",
    "ritu",
    new AbortController().signal,
    async (url, options) => {
      requests++;
      assert.equal(url, "https://api.sarvam.ai/text-to-speech/stream");
      const body = JSON.parse(options.body);
      assert.equal(body.enable_cached_responses, false);
      assert.equal(body.model, "bulbul:v3");
      assert.equal(body.speaker, "ritu");
      assert.equal(body.speech_sample_rate, 22050);
      return new Response(
        new ReadableStream({
          async start(c) {
            c.enqueue(bytes.subarray(0, 444));
            await tail.promise;
            completed = true;
            c.enqueue(bytes.subarray(444));
            c.close();
          },
        }),
        {
          headers: {
            "content-type": "audio/wav",
            "x-request-id": "provider-request-123",
          },
        },
      );
    },
    "test",
    trace,
  );
  const first = await iterator.next();
  assert.equal(first.done, false);
  assert.equal(first.value.length, 400);
  assert.equal(completed, false);
  tail.resolve();
  let result;
  while (true) {
    const chunk = await iterator.next();
    if (chunk.done) {
      result = chunk.value;
      break;
    }
  }
  assert.equal(requests, 1);
  assert.equal(result.pcmBytes, pcm().length);
  assert.ok(result.providerFirstAudioMs <= result.providerMs);
  assert.equal(trace.requestId, "provider-request-123");
  assert.ok(trace.firstBodyMs <= result.providerFirstAudioMs);
  assert.equal(trace.firstRawBytes, 444);
  assert.equal(trace.firstRawPcmBytes, 400);
  assert.ok(trace.decoderFirstPcmProcessingMs >= 0);
  assert.ok(trace.decoderProcessingMs >= trace.decoderFirstPcmProcessingMs);
  assert.equal(trace.poolPolicy.keepAliveTimeout, 15_000);
});
test("successful HTTP JSON/error responses never get played as PCM", async () => {
  const iterator = synthesize(
    "Example",
    "ritu",
    new AbortController().signal,
    async () => Response.json({ error: "private" }),
    "test",
  );
  await assert.rejects(iterator.next(), /invalid_provider_audio/);
});
test("replay spool propagates a late error and enforces its memory bound", async () => {
  const spool = new ReplayAudio(),
    reader = spool.open(new AbortController().signal, () => {}).getReader();
  spool.append(pcm());
  assert.equal((await reader.read()).done, false);
  spool.fail(new Error("interrupted"));
  await assert.rejects(reader.read(), /interrupted/);
  assert.throws(
    () => new ReplayAudio().append(new Uint8Array(3_000_001)),
    /invalid_audio/,
  );
});
test("streaming GETs join one reservation; ledger reads and metadata do not wait for synthesis", async () => {
  const { directory, env, prepare, get } = await setup();
  const tail = deferred();
  let calls = 0;
  try {
    const item = await prepare(),
      bytes = pcm();
    const synth = async function* () {
      calls++;
      yield bytes.subarray(0, 400);
      await tail.promise;
      yield bytes.subarray(400);
      return timing(bytes);
    };
    const first = await handleClip(
        get(item),
        item.id,
        "a@example.invalid",
        env,
        synth,
      ),
      one = first.body.getReader();
    assert.equal((await one.read()).value.length, 400);
    const second = await handleClip(
        get(item),
        item.id,
        "a@example.invalid",
        env,
        synth,
      ),
      two = second.body.getReader();
    assert.equal((await two.read()).value.length, 400);
    assert.equal(calls, 1);
    await withLedger(directory, "s4", async (ledger) =>
      assert.equal(ledger.entries.length, 1),
    );
    assert.equal(
      (
        await handleClip(
          new Request(`${env.S4_ORIGIN}${item.url}?metadata=1`),
          item.id,
          "a@example.invalid",
          env,
          synth,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await handleVoice(
          new Request(`${env.S4_ORIGIN}/api/voice`),
          "a@example.invalid",
          env,
        )
      ).status,
      200,
    );
    tail.resolve();
    assert.equal((await consume(one)).length, 1600);
    assert.equal((await consume(two)).length, 1600);
    const originalTrace = await (
      await handleClip(
        new Request(`${env.S4_ORIGIN}${item.url}?trace=1`),
        item.id,
        "a@example.invalid",
        env,
        synth,
      )
    ).json();
    const replay = await handleClip(
      get(item, { headers: { range: "bytes=0-1" } }),
      item.id,
      "a@example.invalid",
      env,
      synth,
    );
    assert.equal(replay.status, 206);
    assert.equal((await replay.arrayBuffer()).byteLength, 2);
    assert.equal(calls, 1);
    const replayTrace = await (
      await handleClip(
        new Request(`${env.S4_ORIGIN}${item.url}?trace=1`),
        item.id,
        "a@example.invalid",
        env,
        synth,
      )
    ).json();
    assert.deepEqual(replayTrace, originalTrace);
    const info = await (
      await handleClip(
        new Request(`${env.S4_ORIGIN}${item.url}?metadata=1`),
        item.id,
        "a@example.invalid",
        env,
        synth,
      )
    ).json();
    assert.equal(info.pcmBytes, bytes.length);
    assert.equal(info.version, VOICE_VERSION);
    // Audio EOF deliberately precedes optional trace persistence. Verify the
    // durable original before removing the fixture directory underneath it.
    let persistedTrace;
    for (let i = 0; i < 100; i++) {
      try {
        persistedTrace = JSON.parse(
          await readFile(
            join(directory, "trials", `${item.id}.trace.json`),
            "utf8",
          ),
        );
        break;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await sleep(5);
      }
    }
    const synthesisTrace = { ...originalTrace };
    delete synthesisTrace.descriptorCancelled;
    delete synthesisTrace.sharedProducer;
    assert.deepEqual(persistedTrace, synthesisTrace);
  } finally {
    tail.resolve();
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
test("two distinct clips can synthesize concurrently with a shared durable cap", async () => {
  const { directory, env, prepare, get } = await setup();
  const tail = deferred();
  let calls = 0;
  try {
    const a = await prepare("shopping"),
      b = await prepare("reminder"),
      bytes = pcm();
    const synth = async function* () {
      calls++;
      yield bytes;
      await tail.promise;
      return timing(bytes);
    };
    const responses = await Promise.all(
      [a, b].map((item) =>
        handleClip(get(item), item.id, "a@example.invalid", env, synth),
      ),
    );
    assert.deepEqual(
      responses.map((r) => r.status),
      [200, 200],
    );
    assert.equal(calls, 2);
    await withLedger(directory, "s4", async (ledger) =>
      assert.equal(ledger.entries.length, 2),
    );
    const c = await prepare("date");
    assert.equal(
      (await handleClip(get(c), c.id, "a@example.invalid", env, synth)).status,
      429,
    );
    tail.resolve();
    await Promise.all(responses.map((r) => r.arrayBuffer()));
    await withLedger(directory, "s4", async (ledger) =>
      assert.equal(ledger.entries.length, 2),
    );
  } finally {
    tail.resolve();
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
test("a disconnected reader does not cancel its surviving replay reader", async () => {
  const { directory, env, prepare, get } = await setup();
  const tail = deferred();
  try {
    const item = await prepare(),
      bytes = pcm();
    let calls = 0;
    const synth = async function* () {
      calls++;
      yield bytes.subarray(0, 400);
      await tail.promise;
      yield bytes.subarray(400);
      return timing(bytes);
    };
    const first = await handleClip(
        get(item),
        item.id,
        "a@example.invalid",
        env,
        synth,
      ),
      second = await handleClip(
        get(item),
        item.id,
        "a@example.invalid",
        env,
        synth,
      );
    await first.body.cancel();
    tail.resolve();
    assert.equal((await second.arrayBuffer()).byteLength, bytes.length);
    assert.equal(calls, 1);
  } finally {
    tail.resolve();
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
test("late provider failure retains reservation and cannot replay a failed ID", async () => {
  const { directory, env, prepare, get } = await setup();
  let calls = 0;
  try {
    const item = await prepare();
    const synth = async function* () {
      calls++;
      yield pcm();
      await sleep(10);
      throw new Error("private provider content");
    };
    const response = await handleClip(
        get(item),
        item.id,
        "a@example.invalid",
        env,
        synth,
      ),
      reader = response.body.getReader();
    assert.equal((await reader.read()).done, false);
    await assert.rejects(reader.read(), /audio_stream_failed/);
    assert.equal(
      (await handleClip(get(item), item.id, "a@example.invalid", env, synth))
        .status,
      503,
    );
    assert.equal(calls, 1);
    await withLedger(directory, "s4", async (ledger) => {
      assert.ok(spent(ledger) > 0);
      assert.equal(ledger.entries[0].state, "reserved");
    });
    // The optional trace write follows stream failure. Wait for its rename
    // before deleting the fixture; otherwise cleanup races background IO.
    let persisted;
    for (let i = 0; i < 100; i++) {
      try {
        persisted = JSON.parse(
          await readFile(
            join(directory, "trials", `${item.id}.trace.json`),
            "utf8",
          ),
        );
        break;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await sleep(5);
      }
    }
    assert.equal(persisted?.outcome, "failed");
    assert.doesNotMatch(JSON.stringify(persisted), /private provider content/);
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
test("v1 wife choice/budget survive v2; fresh choice has a separate file", async () => {
  const { directory, env, request } = await setup();
  try {
    const selection = {
      voice: "ritu",
      selectedBy: "wife",
      version: LEGACY_VOICE_VERSION,
      at: "2026-10-09T04:19:53.061Z",
    };
    await writeFile(
      join(directory, "selection.json"),
      JSON.stringify(selection),
    );
    const data = await (
      await handleVoice(
        new Request(`${env.S4_ORIGIN}/api/voice`),
        "a@example.invalid",
        env,
      )
    ).json();
    assert.deepEqual(data.selection, selection);
    assert.equal(data.version, VOICE_VERSION);
    assert.equal(
      (
        await handleVoice(
          request({ fixture: "short", voice: "ritu", mode: "benchmark" }),
          "a@example.invalid",
          env,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await handleVoice(
          request({ voice: "ritu", selectedBy: "wife" }, "PATCH"),
          "a@example.invalid",
          env,
        )
      ).status,
      200,
    );
    assert.deepEqual(
      JSON.parse(await readFile(join(directory, "selection.json"))),
      selection,
    );
    assert.equal(
      JSON.parse(
        await readFile(join(directory, `selection-${VOICE_VERSION}.json`)),
      ).version,
      VOICE_VERSION,
    );
    await withLedger(directory, "s4", async (ledger) =>
      assert.equal(spent(ledger), 0),
    );
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
test("free diagnostic streams before delayed EOF and never reserves credits", async () => {
  const { directory, env } = await setup();
  try {
    const req = new Request(`${env.S4_ORIGIN}/api/voice/diagnostic`);
    assert.equal((await handleDiagnostic(req, null, env)).status, 401);
    const reader = (
      await handleDiagnostic(req, "a@example.invalid", env)
    ).body.getReader();
    assert.ok((await reader.read()).value.length > 0);
    let ended = false;
    const second = reader.read().then((value) => {
      ended = true;
      return value;
    });
    await sleep(20);
    assert.equal(ended, false);
    await second;
    assert.equal((await reader.read()).done, true);
    await withLedger(directory, "s4", async (ledger) =>
      assert.equal(spent(ledger), 0),
    );
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
class FakeContext extends EventTarget {
  state = "running";
  sampleRate = 48000;
  baseLatency = 0.01;
  outputLatency = 0.01;
  origin = performance.now();
  starts = [];
  onStart = () => {};
  destination = {};
  get currentTime() {
    return (performance.now() - this.origin) / 1000;
  }
  getOutputTimestamp() {
    return {
      contextTime: this.currentTime - 0.01,
      performanceTime: performance.now(),
    };
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
  createBuffer(_channels, length, rate) {
    const samples = new Float32Array(length);
    return { length, duration: length / rate, getChannelData: () => samples };
  }
  createBufferSource() {
    const source = {
      buffer: null,
      onended: null,
      connect() {},
      disconnect() {},
      timer: null,
      start: (when = this.currentTime) => {
        this.starts.push(when);
        this.onStart();
        source.timer = setTimeout(
          () => source.onended?.(),
          Math.max(0, when - this.currentTime + source.buffer.duration) * 1000,
        );
      },
      stop: () => clearTimeout(source.timer),
    };
    return source;
  }
}
const headers = {
  "X-Audio-Format": "pcm16le",
  "X-Sample-Rate": String(TTS_SETTINGS.speech_sample_rate),
  "X-Voice-Version": VOICE_VERSION,
  "X-Template-Cache": "false",
};
const prepared = {
  id: "trial",
  fixture: "short",
  text: "Your list is up to date.",
  url: "/api/voice/trial",
  version: VOICE_VERSION,
};
async function browser(run) {
  const saved = { document: globalThis.document, fetch: globalThis.fetch };
  const document = new EventTarget();
  document.hidden = false;
  globalThis.document = document;
  try {
    await run(document);
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.document === undefined) delete globalThis.document;
    else globalThis.document = saved.document;
  }
}
test("phone PCM starts before final transfer and includes scheduled non-silent output", () =>
  browser(async () => {
    const tail = deferred(),
      scheduled = deferred(),
      context = new FakeContext(),
      player = new PcmPlayer(context),
      bytes = pcm(6615);
    let completed = false;
    context.onStart = scheduled.resolve;
    globalThis.fetch = async (url) => {
      if (url.includes("metadata")) return Response.json(timing(bytes));
      await sleep(15);
      return new Response(
        new ReadableStream({
          async start(c) {
            c.enqueue(bytes.subarray(0, 8820));
            await tail.promise;
            completed = true;
            c.enqueue(bytes.subarray(8820));
            c.close();
          },
        }),
        { headers },
      );
    };
    const playback = playClip(
      player,
      prepared,
      new AbortController().signal,
      "iphone/wifi",
      "ritu",
      true,
    );
    await scheduled.promise;
    assert.equal(completed, false);
    await sleep(60);
    tail.resolve();
    const result = await playback;
    assert.equal(result.status, "ok");
    assert.equal(result.audioBytes, bytes.length);
    assert.equal(result.underruns, 0);
    assert.ok(result.firstAudioMs >= 35 && result.firstAudioMs < 150);
    assert.equal(result.clientTrace.startupBufferMs, 20);
    assert.equal(result.clientTrace.onsetEstimator, "output-timestamp");
    const audio = result.clientTrace.audio;
    assert.equal(result.clientTrace.diagnosticsVersion, "s4-client-timing-1");
    assert.equal(audio.firstSchedule.state, "running");
    assert.equal(audio.firstSchedule.frames, 4410);
    assert.ok(audio.firstSchedule.atMs >= result.transferFirstChunkMs);
    assert.equal(audio.outputMapping.mappedOnsetMs, result.firstAudioMs);
    assert.ok(
      Math.abs(
        audio.outputMapping.timestampPerformanceMs +
          audio.outputMapping.scheduledContextMs -
          audio.outputMapping.timestampContextMs -
          result.firstAudioMs,
      ) < 1e-6,
    );
    assert.equal(result.clientTrace.longTasks.status, "unsupported");
    assert.ok(result.transferFirstChunkMs >= 10);
    assert.equal(result.providerFirstAudioMs, 50);
  }));
for (const status of ["blocked", "interrupted", "cancelled"])
  test(`phone ${status} cannot qualify or dispatch audio`, () =>
    browser(async (document) => {
      const context = new FakeContext(),
        player = new PcmPlayer(context),
        abort = new AbortController();
      if (status === "blocked") context.state = "suspended";
      if (status === "interrupted") document.hidden = true;
      if (status === "cancelled") abort.abort();
      globalThis.fetch = async () => assert.fail("speech dispatch");
      const result = await playClip(
        player,
        prepared,
        abort.signal,
        "iphone/wifi",
        "ritu",
        true,
      );
      assert.equal(result.status, status);
      assert.equal(result.firstAudioMs, null);
    }));
test("app switching cancels buffered sources and rejects late chunks", () =>
  browser(async (document) => {
    const scheduled = deferred(),
      context = new FakeContext(),
      player = new PcmPlayer(context);
    context.onStart = scheduled.resolve;
    let closed = false;
    globalThis.fetch = async () =>
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(pcm(6615));
          },
          cancel() {
            closed = true;
          },
        }),
        { headers },
      );
    const playback = playClip(
      player,
      prepared,
      new AbortController().signal,
      "iphone/wifi",
      "ritu",
      true,
    );
    await scheduled.promise;
    document.hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    const result = await playback;
    assert.equal(result.status, "interrupted");
    assert.equal(closed, true);
    assert.equal(result.clientTrace.audio.firstSchedule.state, "running");
  }));
test("PCM split samples stay aligned and schedule continuously", () => {
  const context = new FakeContext(),
    player = new PcmPlayer(context);
  player.begin();
  const bytes = pcm(1000);
  player.push(bytes.subarray(0, 201), 22050);
  player.push(bytes.subarray(201), 22050);
  assert.equal(player.underruns, 0);
  assert.equal(context.starts.length, 2);
  assert.ok(
    Math.abs(context.starts[1] - context.starts[0] - 100 / 22050) < 0.000001,
  );
  player.stop();
});

test("Stop invalidates late PCM without stopping a new player generation", () => {
  const context = new FakeContext(),
    player = new PcmPlayer(context);
  player.begin();
  const old = player.generation;
  player.push(pcm(), 22050);
  player.stop();
  assert.throws(() => player.push(pcm(), 22050), /interrupted/);
  player.begin();
  player.push(pcm(), 22050);
  assert.notEqual(player.generation, old);
  assert.equal(player.underruns, 0);
  player.stop();
});
test("a playback underrun stays a failed attempt", () =>
  browser(async () => {
    const context = new FakeContext(),
      player = new PcmPlayer(context),
      bytes = pcm(4410);
    globalThis.fetch = async (url) => {
      if (url.includes("metadata"))
        return Response.json(timing(Buffer.concat([bytes, bytes])));
      return new Response(
        new ReadableStream({
          async start(c) {
            c.enqueue(bytes);
            await sleep(400);
            c.enqueue(bytes);
            c.close();
          },
        }),
        { headers },
      );
    };
    const result = await playClip(
      player,
      prepared,
      new AbortController().signal,
      "iphone/wifi",
      "ritu",
      true,
    );
    assert.equal(result.status, "failed");
    assert.equal(result.underruns, 1);
  }));
test("smoke results cannot count toward acceptance", () => {
  const rows = Array.from({ length: 50 }, (_, i) => ({
    id: String(i),
    purpose: "smoke",
    fixture: "short",
    voice: "ritu",
    version: VOICE_VERSION,
    combination: "iphone/wifi",
    standalone: true,
    status: "ok",
    firstAudioMs: 100,
    providerMs: 50,
    cached: false,
    sentenceLength: 24,
    at: new Date().toISOString(),
  }));
  assert.equal(summarizeVoice(rows, "ritu", true)[0].attempted, 0);
});
test("cap reached after preparation prevents dispatch and preserves the ledger", async () => {
  const { directory, env, prepare, get } = await setup();
  let calls = 0;
  try {
    const item = await prepare();
    await withLedger(directory, "s4", async (ledger, save) => {
      reserve(ledger, "existing-spend", CAPS.s4);
      await save();
    });
    const synth = async function* () {
      calls++;
      yield pcm();
      return timing(pcm());
    };
    assert.equal(
      (await handleClip(get(item), item.id, "a@example.invalid", env, synth))
        .status,
      402,
    );
    assert.equal(calls, 0);
    await withLedger(directory, "s4", async (ledger) =>
      assert.equal(spent(ledger), CAPS.s4),
    );
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
test("DELETE during synthesis revokes readers and cannot redispatch the ID", async () => {
  const { directory, env, prepare, get } = await setup();
  let calls = 0;
  try {
    const item = await prepare();
    const synth = async function* (_text, _voice, signal) {
      calls++;
      yield pcm();
      await new Promise((_, reject) =>
        signal.addEventListener("abort", () => reject(new Error("cancelled")), {
          once: true,
        }),
      );
      return timing(pcm());
    };
    const reader = (
      await handleClip(get(item), item.id, "a@example.invalid", env, synth)
    ).body.getReader();
    await reader.read();
    assert.equal(
      (
        await handleClip(
          get(item, { method: "DELETE", headers: { origin: env.S4_ORIGIN } }),
          item.id,
          "a@example.invalid",
          env,
          synth,
        )
      ).status,
      200,
    );
    await assert.rejects(reader.read(), /cancelled/);
    assert.equal(
      (await handleClip(get(item), item.id, "a@example.invalid", env, synth))
        .status,
      404,
    );
    assert.equal(calls, 1);
    await withLedger(directory, "s4", async (ledger) =>
      assert.ok(spent(ledger) > 0),
    );
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});

test("attempt index coalesces loads, pins active state and evicts only idle entries", async () => {
  const index = new AttemptIndex(1),
    loaded = deferred();
  let reads = 0;
  const descriptor = {
    id: "a",
    owner: "owner",
    expires: Date.now() + 10000,
    cancelled: false,
  };
  const load = async () => {
    reads++;
    await loaded.promise;
    return descriptor;
  };
  const a = index.acquire("a", load),
    b = index.acquire("a", load);
  assert.throws(() => index.remember("b", { ...descriptor, id: "b" }), /busy/);
  loaded.resolve();
  const [one, two] = await Promise.all([a, b]);
  assert.equal(reads, 1);
  assert.equal(one.state, two.state);
  one.state.item.cancelled = true;
  assert.equal(two.state.item.cancelled, true);
  const releaseReader = one.retain();
  one.release();
  one.release();
  two.release();
  assert.throws(() => index.remember("b", { ...descriptor, id: "b" }), /busy/);
  releaseReader();
  index.remember("b", { ...descriptor, id: "b" });
  const lease = await index.acquire("b", async () =>
    assert.fail("disk lookup"),
  );
  assert.equal(lease.source, "prepared");
  lease.release();
});

test("fresh benchmark forwards early PCM with a durable reservation and content-free trace", async () => {
  const { directory, env, request, prepare, get } = await setup();
  const tail = deferred();
  try {
    await handleVoice(
      request({ voice: "ritu", selectedBy: "wife" }, "PATCH"),
      "a@example.invalid",
      env,
    );
    const item = await prepare("shopping", "benchmark"),
      bytes = pcm();
    let reserved = false;
    const synth = async function* () {
      await withLedger(directory, "s4", async (ledger) => {
        reserved = ledger.entries.some((e) => e.id === item.id);
      });
      assert.equal(reserved, true);
      yield bytes.subarray(0, 400);
      await tail.promise;
      yield bytes.subarray(400);
      return timing(bytes);
    };
    const response = await handleClip(
      get(item),
      item.id,
      "a@example.invalid",
      env,
      synth,
    );
    assert.equal(response.status, 200);
    assert.ok(response.headers.has("server-timing"));
    const reader = response.body.getReader();
    assert.equal((await reader.read()).value.length, 400);
    const traceResponse = () =>
      handleClip(
        new Request(`${env.S4_ORIGIN}${item.url}?trace=1`),
        item.id,
        "a@example.invalid",
        env,
        synth,
      );
    const partial = await (await traceResponse()).json();
    assert.equal(partial.descriptorSource, "prepared");
    assert.equal(partial.outcome, "pending");
    assert.ok(partial.providerDispatchMs <= partial.firstPcmMs);
    assert.ok(partial.firstPcmMs <= partial.responseReadyMs);
    assert.equal(partial.providerEofMs, undefined);
    tail.resolve();
    await consume(reader);
    const complete = await (await traceResponse()).json();
    assert.equal(complete.outcome, "complete");
    assert.ok(complete.providerEofMs >= complete.firstPcmMs);
    assert.ok(complete.reservationMs >= 0);
    assert.ok(!JSON.stringify(complete).includes("a@example.invalid"));
    assert.ok(!JSON.stringify(complete).includes("Added milk"));
    const denied = await handleClip(
      new Request(`${env.S4_ORIGIN}${item.url}?trace=1`),
      item.id,
      "b@example.invalid",
      { ...env, S4_EVALUATOR_EMAILS: "a@example.invalid,b@example.invalid" },
      synth,
    );
    assert.equal(denied.status, 404);
  } finally {
    tail.resolve();
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});

test("Stop before first PCM rejects late provider bytes and retains readable cancellation trace", async () => {
  const { directory, env, prepare, get } = await setup(),
    entered = deferred(),
    tail = deferred();
  try {
    const item = await prepare();
    let calls = 0;
    const synth = async function* () {
      calls++;
      entered.resolve();
      await tail.promise;
      yield pcm();
      return timing(pcm());
    };
    const pending = handleClip(
      get(item),
      item.id,
      "a@example.invalid",
      env,
      synth,
    );
    await entered.promise;
    const stopped = await handleClip(
      get(item, { method: "DELETE", headers: { origin: env.S4_ORIGIN } }),
      item.id,
      "a@example.invalid",
      env,
      synth,
    );
    assert.equal(stopped.status, 200);
    tail.resolve();
    assert.equal((await pending).status, 503);
    const trace = await (
      await handleClip(
        new Request(`${env.S4_ORIGIN}${item.url}?trace=1`),
        item.id,
        "a@example.invalid",
        env,
        synth,
      )
    ).json();
    assert.equal(trace.outcome, "cancelled");
    assert.equal(trace.firstPcmMs, undefined);
    assert.equal(
      (await handleClip(get(item), item.id, "a@example.invalid", env, synth))
        .status,
      404,
    );
    assert.equal(calls, 1);
    await withLedger(directory, "s4", async (ledger) => {
      assert.equal(ledger.entries.length, 1);
      assert.ok(spent(ledger) > 0);
    });
  } finally {
    tail.resolve();
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});

test("a restarted process reads durable uncertainty and never redispatches", async () => {
  const { directory, env, prepare } = await setup();
  try {
    const item = await prepare();
    await withLedger(directory, "s4", async (ledger, save) => {
      reserve(ledger, item.id, 100000);
      await save();
    });
    const code = `
      import { handleClip } from './lib/voice/service.ts';
      const env = JSON.parse(process.argv[1]), id = process.argv[2];
      let calls = 0;
      const synth = async function* () { calls++; yield new Uint8Array([0, 1]); };
      const r = await handleClip(new Request(env.S4_ORIGIN + '/api/voice/' + id), id, 'a@example.invalid', env, synth);
      process.stdout.write(JSON.stringify({status:r.status, body:await r.json(), calls}));
    `;
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        code,
        JSON.stringify(env),
        item.id,
      ],
      { cwd: process.cwd(), timeout: 10000 },
    );
    const result = JSON.parse(stdout);
    assert.equal(result.status, 503);
    assert.equal(result.body.error, "prior_synthesis_uncertain");
    assert.equal(result.calls, 0);
    await withLedger(directory, "s4", async (ledger) =>
      assert.equal(spent(ledger), 100000),
    );
    await handleClip(
      new Request(`${env.S4_ORIGIN}${item.url}`, {
        method: "DELETE",
        headers: { origin: env.S4_ORIGIN },
      }),
      item.id,
      "a@example.invalid",
      env,
    );
    const cancelled = await promisify(execFile)(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        code,
        JSON.stringify(env),
        item.id,
      ],
      { cwd: process.cwd(), timeout: 10000 },
    );
    const afterRestart = JSON.parse(cancelled.stdout);
    assert.equal(afterRestart.status, 404);
    assert.equal(afterRestart.calls, 0);
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});

test("Stop revokes a pending range while another descriptor keeps shared listening audio alive", async () => {
  const { directory, env, prepare, get } = await setup(),
    tail = deferred();
  try {
    const a = await prepare(),
      b = await prepare(),
      bytes = pcm();
    let calls = 0;
    const synth = async function* () {
      calls++;
      yield bytes.subarray(0, 400);
      await tail.promise;
      yield bytes.subarray(400);
      return timing(bytes);
    };
    const range = handleClip(
      get(a, { headers: { range: "bytes=0-1" } }),
      a.id,
      "a@example.invalid",
      env,
      synth,
    );
    const survivor = await handleClip(
      get(b),
      b.id,
      "a@example.invalid",
      env,
      synth,
    );
    assert.equal(survivor.status, 200);
    await handleClip(
      get(a, { method: "DELETE", headers: { origin: env.S4_ORIGIN } }),
      a.id,
      "a@example.invalid",
      env,
      synth,
    );
    tail.resolve();
    assert.equal((await range).status, 404);
    assert.equal((await survivor.arrayBuffer()).byteLength, bytes.length);
    assert.equal(calls, 1);
    const sharedTrace = await (
      await handleClip(
        new Request(`${env.S4_ORIGIN}${b.url}?trace=1`),
        b.id,
        "a@example.invalid",
        env,
        synth,
      )
    ).json();
    assert.equal(sharedTrace.sharedProducer, true);
    assert.equal(sharedTrace.descriptorCancelled, false);
    assert.equal(sharedTrace.outcome, "complete");
  } finally {
    tail.resolve();
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});

for (const previousVersion of [
  LEGACY_STREAM_VOICE_VERSION,
  LEGACY_APPLICATION_VOICE_VERSION,
  LEGACY_POOL_VOICE_VERSION,
  PREVIOUS_VOICE_VERSION,
])
  test(`previous preferred voice survives the current version without resetting reservations: ${previousVersion}`, async () => {
    const { directory, env } = await setup();
    try {
      const selection = {
        voice: "priya",
        selectedBy: "wife",
        version: previousVersion,
        at: "2026-10-09T04:19:53.061Z",
      };
      await writeFile(
        join(directory, `selection-${previousVersion}.json`),
        JSON.stringify(selection),
      );
      await withLedger(directory, "s4", async (ledger, save) => {
        reserve(ledger, "old-attempt", 123456);
        await save();
      });
      const state = await (
        await handleVoice(
          new Request(`${env.S4_ORIGIN}/api/voice`),
          "a@example.invalid",
          env,
        )
      ).json();
      assert.deepEqual(state.selection, selection);
      assert.equal(state.reservedInr, 0.123456);
      assert.equal(state.version, VOICE_VERSION);
      assert.equal(state.startupBufferMs, 20);
    } finally {
      await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
    }
  });

test("provider diagnostics identify reused sockets without capturing content or credentials", async () => {
  const server = createServer((_req, response) => {
    response.end("private response content");
  });
  server.keepAliveTimeout = 30000;
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const one = {},
      two = {};
    await traceProviderRequest(
      one,
      async () => {
        const r = await fetch(origin, {
          headers: { "x-test-secret": "private credential" },
        });
        await r.text();
      },
      origin,
    );
    await sleep(50);
    await traceProviderRequest(
      two,
      async () => {
        const r = await fetch(origin);
        await r.text();
      },
      origin,
    );
    assert.equal(one.connection.reused, false);
    assert.equal(two.connection.reused, true);
    assert.equal(one.connection.socketId, two.connection.socketId);
    assert.ok(two.connection.idleBeforeMs >= 30);
    assert.ok(one.connection.socketToHeadersMs >= 0);
    assert.ok(!JSON.stringify([one, two]).includes("private"));
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("onset estimate is frozen near first sound instead of remapped at completion", () => {
  const context = new FakeContext();
  Object.defineProperty(context, "currentTime", { value: 0, writable: true });
  const player = new PcmPlayer(context);
  const origin = performance.now();
  player.begin(origin);
  player.push(pcm(), 22050);
  assert.equal(player.onsetPerformanceTime(), null);
  context.currentTime = 0.03;
  context.getOutputTimestamp = () => ({
    contextTime: 0.03,
    performanceTime: 1000,
  });
  const onset = player.onsetPerformanceTime();
  assert.ok(onset > 990 && onset < 1000);
  assert.ok(Math.abs(onset - (1000 + 20 + 50 / 22.05 - 30)) < 1e-6);
  const mapping = structuredClone(player.audioTrace().outputMapping);
  assert.equal(mapping.mappedOnsetMs, onset - origin);
  context.currentTime = 1;
  context.getOutputTimestamp = () => ({
    contextTime: 1,
    performanceTime: 9000,
  });
  assert.equal(player.onsetPerformanceTime(), onset);
  assert.deepEqual(player.audioTrace().outputMapping, mapping);
  player.stop();
});

test("failed optional browser diagnostics do not change playback, onset or bytes", () =>
  browser(async () => {
    const previousWindow = globalThis.window;
    const previousObserver = globalThis.PerformanceObserver;
    const context = new FakeContext();
    const player = new PcmPlayer(context);
    const bytes = pcm(4410);
    globalThis.window = {
      location: {
        get href() {
          throw new Error("resource diagnostics unavailable");
        },
      },
    };
    globalThis.PerformanceObserver = class {
      static supportedEntryTypes = ["longtask"];
      constructor() {
        throw new Error("observer unavailable");
      }
    };
    globalThis.fetch = async (url) =>
      url.includes("metadata")
        ? Response.json(timing(bytes))
        : new Response(bytes, { headers });
    try {
      const result = await playClip(
        player,
        prepared,
        new AbortController().signal,
        "iphone/wifi",
        "ritu",
        true,
      );
      assert.equal(result.status, "ok");
      assert.equal(result.audioBytes, bytes.length);
      assert.equal(result.underruns, 0);
      assert.equal(result.clientTrace.longTasks.status, "unavailable");
      assert.equal(result.clientTrace.resource, undefined);
      assert.equal(
        result.clientTrace.audio.outputMapping.mappedOnsetMs,
        result.firstAudioMs,
      );
      assert.ok(result.firstAudioMs >= 20 && result.firstAudioMs < 100);
    } finally {
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
      if (previousObserver === undefined) delete globalThis.PerformanceObserver;
      else globalThis.PerformanceObserver = previousObserver;
      player.stop();
    }
  }));

test("separately loaded route modules share prepared descriptors and attempt ownership", async () => {
  const { directory, env, prepare, get } = await setup();
  try {
    const separate = await import(
      "../lib/voice/service.ts?separate-route-bundle"
    );
    const item = await prepare();
    const synth = async function* () {
      yield pcm();
      return timing(pcm());
    };
    const response = await separate.handleClip(
      get(item),
      item.id,
      "a@example.invalid",
      env,
      synth,
    );
    assert.equal(response.status, 200);
    await response.arrayBuffer();
    const trace = await (
      await handleClip(
        new Request(`${env.S4_ORIGIN}${item.url}?trace=1`),
        item.id,
        "a@example.invalid",
        env,
        synth,
      )
    ).json();
    assert.equal(trace.descriptorSource, "prepared");
    assert.equal(trace.outcome, "complete");
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});

test("completed replay after process restart preserves the original synthesis trace and charge", async () => {
  const { directory, env, prepare, get } = await setup();
  try {
    const item = await prepare(),
      bytes = pcm();
    const synth = async function* () {
      yield bytes;
      return timing(bytes);
    };
    const response = await handleClip(
      get(item),
      item.id,
      "a@example.invalid",
      env,
      synth,
    );
    await response.arrayBuffer();
    let original;
    for (let i = 0; i < 100; i++) {
      try {
        original = JSON.parse(
          await readFile(
            join(directory, "trials", `${item.id}.trace.json`),
            "utf8",
          ),
        );
        break;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await sleep(5);
      }
    }
    assert.ok(original?.providerDispatchMs >= 0);
    const code = `
      import { handleClip } from './lib/voice/service.ts';
      const env = JSON.parse(process.argv[1]), id = process.argv[2], url = env.S4_ORIGIN + '/api/voice/' + id;
      let calls = 0;
      const synth = async function* () { calls++; yield new Uint8Array([0,1]); };
      const response = await handleClip(new Request(url), id, 'a@example.invalid', env, synth);
      const bytes = await response.arrayBuffer();
      const trace = await (await handleClip(new Request(url+'?trace=1'), id, 'a@example.invalid', env, synth)).json();
      process.stdout.write(JSON.stringify({status:response.status, bytes:bytes.byteLength, calls, trace}));
    `;
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        code,
        JSON.stringify(env),
        item.id,
      ],
      { cwd: process.cwd(), timeout: 10000 },
    );
    const replay = JSON.parse(stdout);
    assert.equal(replay.status, 200);
    assert.equal(replay.bytes, bytes.length);
    assert.equal(replay.calls, 0);
    assert.equal(replay.trace.providerDispatchMs, original.providerDispatchMs);
    assert.equal(replay.trace.firstPcmMs, original.firstPcmMs);
    assert.deepEqual(
      JSON.parse(
        await readFile(
          join(directory, "trials", `${item.id}.trace.json`),
          "utf8",
        ),
      ),
      original,
    );
    await withLedger(directory, "s4", async (ledger) =>
      assert.equal(ledger.entries.length, 1),
    );
  } finally {
    await rm(directory, { recursive: true, maxRetries: 10, retryDelay: 20 });
  }
});
