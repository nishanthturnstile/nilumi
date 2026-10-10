import { createHash, createHmac, randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { z } from "zod";
import {
  PLAYBACK_STARTUP_MS,
  reserveTtsMicros,
  SENTENCES,
  TTS_SETTINGS,
  VOICE_PROFILE,
  VOICE_SELECTION_VERSIONS,
  VOICE_VERSION,
  VOICES,
} from "../../config/voice";
import {
  atomicFile,
  CAPS,
  reserve,
  spent,
  VerificationError,
  withLedger,
} from "../verification/ledger";
import { AttemptIndex } from "./attempts";
import { type StreamTiming, synthesize } from "./sarvam";
import { ReplayAudio } from "./stream-buffer";
import type { ServerTrace } from "./timing";

const Prepare = z
  .object({
    fixture: z.enum(SENTENCES.map((item) => item.id) as [string, ...string[]]),
    voice: z.enum(VOICES),
    mode: z.enum(["listen", "benchmark", "smoke"]),
  })
  .strict();
const Descriptor = Prepare.extend({
  id: z.string().uuid(),
  owner: z.string(),
  expires: z.number(),
  cancelled: z.boolean(),
  version: z.literal(VOICE_VERSION),
}).strict();
const Selection = z
  .object({
    voice: z.enum(VOICES),
    selectedBy: z.literal("wife"),
    version: z.enum(VOICE_SELECTION_VERSIONS),
    at: z.string().datetime(),
  })
  .strict();
type Environment = Record<string, string | undefined>;
type VoiceRuntime = {
  version: string;
  active: Map<string, Set<AbortController>>;
  attempts: Map<
    string,
    { spool: ReplayAudio; controller: AbortController; trace: ServerTrace }
  >;
  ledgerQueues: Map<string, Promise<void>>;
  descriptors: AttemptIndex<z.infer<typeof Descriptor>>;
  storageReady: Map<string, Promise<void>>;
};
// Prepare/clip routes can have separate Next bundles. Share process ownership,
// not just module-local state. A real process restart still reloads durable files.
const shared = globalThis as typeof globalThis & {
  __nilumiS4VoiceRuntime?: VoiceRuntime;
};
if (
  !shared.__nilumiS4VoiceRuntime ||
  shared.__nilumiS4VoiceRuntime.version !== VOICE_VERSION
)
  shared.__nilumiS4VoiceRuntime = {
    version: VOICE_VERSION,
    active: new Map(),
    attempts: new Map(),
    ledgerQueues: new Map(),
    descriptors: new AttemptIndex(),
    storageReady: new Map(),
  };
const { active, attempts, ledgerQueues, descriptors, storageReady } =
  shared.__nilumiS4VoiceRuntime;
function ensureStorage(directory: string) {
  let ready = storageReady.get(directory);
  if (!ready) {
    ready = (async () => {
      await mkdir(join(directory, "trials"), { recursive: true, mode: 0o700 });
      await mkdir(join(directory, "audio"), { recursive: true, mode: 0o700 });
    })();
    storageReady.set(directory, ready);
    void ready.catch(() => storageReady.delete(directory));
    if (storageReady.size > 32)
      storageReady.delete(storageReady.keys().next().value as string);
  }
  return ready;
}
async function voiceLedger<T>(
  directory: string,
  run: Parameters<typeof withLedger<T>>[2],
  trace?: ServerTrace,
) {
  const queued = performance.now();
  const previous = ledgerQueues.get(directory) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  ledgerQueues.set(directory, next);
  await previous;
  if (trace) trace.queueWaitMs = performance.now() - queued;
  const started = performance.now();
  try {
    if (trace) trace.ledgerStages = { stages: {}, saveCount: 0, saves: [] };
    return await withLedger(directory, "s4", run, trace?.ledgerStages);
  } finally {
    if (trace) trace.ledgerMs = performance.now() - started;
    release();
    if (ledgerQueues.get(directory) === next) ledgerQueues.delete(directory);
  }
}

function configuration(env: Environment) {
  if (env.S4_ENABLED !== "true")
    throw new VerificationError("voice_verification_disabled", 404);
  if (
    !env.S4_STATE_DIR ||
    !isAbsolute(env.S4_STATE_DIR) ||
    !env.S4_ORIGIN ||
    !env.AUTH_SECRET ||
    env.S4_PRICE_VERIFIED_AT !== "2026-10-09" ||
    env.S4_BILLING_MAX_MULTIPLIER !== "1.2"
  )
    throw new VerificationError("voice_configuration_incomplete");
  return {
    directory: env.S4_STATE_DIR,
    origin: env.S4_ORIGIN,
    secret: env.AUTH_SECRET,
  };
}
function authorize(email: string | null, env: Environment) {
  const config = configuration(env);
  if (!email) throw new VerificationError("sign_in_required", 401);
  if (
    !env.S4_EVALUATOR_EMAILS?.split(",")
      .map((value) => value.trim())
      .includes(email)
  )
    throw new VerificationError("voice_access_denied", 403);
  return {
    ...config,
    owner: createHmac("sha256", config.secret).update(email).digest("hex"),
  };
}
function checkOrigin(req: Request, origin: string) {
  if (req.headers.get("origin") !== origin)
    throw new VerificationError("origin_required", 403);
}
async function body(req: Request): Promise<unknown> {
  if (Number(req.headers.get("content-length")) > 1024)
    throw new VerificationError("invalid_request", 400);
  const text = await req.text();
  if (text.length > 1024) throw new VerificationError("invalid_request", 400);
  try {
    return JSON.parse(text);
  } catch {
    throw new VerificationError("invalid_request", 400);
  }
}
function failure(error: unknown) {
  const known = error instanceof VerificationError;
  return Response.json(
    { error: known ? error.code : "voice_request_failed" },
    {
      status: known ? error.status : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
const json = (data: unknown) =>
  Response.json(data, { headers: { "Cache-Control": "no-store" } });
async function readSelection(directory: string) {
  for (const name of [
    ...VOICE_SELECTION_VERSIONS.map((version) => `selection-${version}.json`),
    "selection.json",
  ]) {
    try {
      return Selection.parse(
        JSON.parse(
          await readFile(
            /* turbopackIgnore: true */ join(
              /* turbopackIgnore: true */ directory,
              name,
            ),
            "utf8",
          ),
        ),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return null;
}

export async function handleVoice(
  req: Request,
  email: string | null,
  env: Environment = process.env,
) {
  try {
    const { directory, origin, owner } = authorize(email, env);
    if (req.method === "GET") {
      return await voiceLedger(directory, async (ledger) =>
        json({
          version: VOICE_VERSION,
          profile: VOICE_PROFILE,
          startupBufferMs: PLAYBACK_STARTUP_MS,
          settings: TTS_SETTINGS,
          voices: VOICES,
          sentences: SENTENCES,
          selection: await readSelection(directory),
          capInr: CAPS.s4 / 1e6,
          reservedInr: spent(ledger) / 1e6,
        }),
      );
    }
    checkOrigin(req, origin);
    if (req.method === "PATCH") {
      const parsed = z
        .object({ voice: z.enum(VOICES), selectedBy: z.literal("wife") })
        .strict()
        .safeParse(await body(req));
      if (!parsed.success) throw new VerificationError("invalid_request", 400);
      const selection = {
        ...parsed.data,
        version: VOICE_VERSION,
        at: new Date().toISOString(),
      };
      await voiceLedger(directory, async () =>
        atomicFile(
          join(directory, `selection-${VOICE_VERSION}.json`),
          JSON.stringify(selection),
        ),
      );
      return json(selection);
    }
    const parsed = Prepare.safeParse(await body(req));
    if (!parsed.success) throw new VerificationError("invalid_request", 400);
    if (!env.SARVAM_API_KEY) throw new VerificationError("sarvam_key_missing");
    const descriptor = await voiceLedger(directory, async (ledger) => {
      if (
        parsed.data.mode !== "listen" &&
        (await readSelection(directory))?.voice !== parsed.data.voice
      )
        throw new VerificationError("wife_voice_selection_required", 409);
      const fixture = SENTENCES.find(
        (sentence) => sentence.id === parsed.data.fixture,
      );
      if (!fixture) throw new VerificationError("invalid_fixture", 400);
      if (spent(ledger) + reserveTtsMicros(fixture.text) > CAPS.s4)
        throw new VerificationError("hard_cap_reached", 402);
      await ensureStorage(directory);
      const item: z.infer<typeof Descriptor> = {
        ...parsed.data,
        id: randomUUID(),
        owner,
        expires: Date.now() + 2 * 60 * 60 * 1000,
        cancelled: false,
        version: VOICE_VERSION,
      };
      await atomicFile(
        join(directory, "trials", `${item.id}.json`),
        JSON.stringify(item),
      );
      descriptors.remember(`${directory}/${item.id}`, item);
      return item;
    });
    const fixture = SENTENCES.find(
      (sentence) => sentence.id === descriptor.fixture,
    );
    return json({
      id: descriptor.id,
      text: fixture?.text,
      fixture: descriptor.fixture,
      url: `/api/voice/${descriptor.id}`,
      expires: descriptor.expires,
      version: VOICE_VERSION,
    });
  } catch (error) {
    return failure(error);
  }
}

async function loadDescriptor(directory: string, id: string) {
  if (!z.string().uuid().safeParse(id).success)
    throw new VerificationError("clip_not_found", 404);
  let item: z.infer<typeof Descriptor>;
  try {
    item = Descriptor.parse(
      JSON.parse(
        await readFile(join(directory, "trials", `${id}.json`), "utf8"),
      ),
    );
  } catch {
    throw new VerificationError("clip_not_found", 404);
  }
  return item;
}
function validateDescriptor(
  item: z.infer<typeof Descriptor>,
  id: string,
  owner: string,
  allowCancelled = false,
) {
  if (
    item.id !== id ||
    item.owner !== owner ||
    item.expires <= Date.now() ||
    (item.cancelled && !allowCancelled)
  )
    throw new VerificationError("clip_not_found", 404);
}

export function audioResponse(
  bytes: Uint8Array,
  req: Request,
  metadata: { providerMs: number; leadingSilenceMs: number; cached: boolean },
) {
  const headers = new Headers({
    "Content-Type": "audio/x-pcm",
    "X-Audio-Format": "pcm16le",
    "X-Sample-Rate": String(TTS_SETTINGS.speech_sample_rate),
    "Cache-Control": "no-store, no-transform",
    "Accept-Ranges": "bytes",
    "Content-Length": String(bytes.length),
    "X-Synthesis-Ms": String(metadata.providerMs),
    "X-Leading-Silence-Ms": String(metadata.leadingSilenceMs),
    "X-Template-Cache": String(metadata.cached),
    "X-Voice-Version": VOICE_VERSION,
  });
  const match = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return new Response(new Uint8Array(bytes), { headers });
  const suffix = match[1] === "";
  const first = Number(suffix ? match[2] : match[1]);
  const last = match[2] === "" ? bytes.length - 1 : Number(match[2]);
  const start = suffix ? Math.max(0, bytes.length - first) : first;
  const end = suffix ? bytes.length - 1 : Math.min(last, bytes.length - 1);
  if (
    (!match[1] && !match[2]) ||
    !Number.isSafeInteger(first) ||
    !Number.isSafeInteger(last) ||
    start >= bytes.length ||
    start > end ||
    (suffix && first === 0)
  ) {
    headers.set("Content-Range", `bytes */${bytes.length}`);
    headers.set("Content-Length", "0");
    return new Response(null, { status: 416, headers });
  }
  headers.set("Content-Range", `bytes ${start}-${end}/${bytes.length}`);
  headers.set("Content-Length", String(end - start + 1));
  return new Response(new Uint8Array(bytes.slice(start, end + 1)), {
    status: 206,
    headers,
  });
}

const Metadata = z
  .object({
    providerMs: z.number().nonnegative().finite(),
    providerHeadersMs: z.number().nonnegative().finite(),
    providerFirstAudioMs: z.number().nonnegative().finite(),
    leadingSilenceMs: z.number().nonnegative().finite(),
    pcmBytes: z.number().int().positive().max(3_000_000),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    version: z.literal(VOICE_VERSION),
  })
  .strict();
function clipPaths(directory: string, item: z.infer<typeof Descriptor>) {
  const fixture = SENTENCES.find((sentence) => sentence.id === item.fixture);
  if (!fixture) throw new VerificationError("invalid_fixture", 400);
  const cacheId =
    item.mode !== "listen"
      ? item.id
      : createHash("sha256")
          .update(
            JSON.stringify({
              voice: item.voice,
              text: fixture.text,
              version: VOICE_VERSION,
              settings: TTS_SETTINGS,
            }),
          )
          .digest("hex");
  return {
    fixture,
    cacheId,
    audioPath: join(directory, "audio", `${cacheId}.pcm`),
    infoPath: join(directory, "audio", `${cacheId}.json`),
  };
}
async function readMetadata(path: string) {
  return Metadata.parse(JSON.parse(await readFile(path, "utf8")));
}

export async function handleClip(
  req: Request,
  id: string,
  email: string | null,
  env: Environment = process.env,
  synth: typeof synthesize = synthesize,
  requestStarted = performance.now(),
) {
  let stream: ReadableStream<Uint8Array> | undefined;
  let lease: Awaited<ReturnType<typeof descriptors.acquire>> | undefined;
  const trace: ServerTrace = {
    schema: "s4-latency-1",
    authMs: 0,
    outcome: "pending",
    provider: {},
  };
  try {
    const { directory, owner, origin } = authorize(email, env);
    trace.authMs = performance.now() - requestStarted;
    if (!z.string().uuid().safeParse(id).success)
      throw new VerificationError("clip_not_found", 404);
    const descriptorKey = `${directory}/${id}`;
    const lookupStarted = performance.now();
    lease = await descriptors.acquire(descriptorKey, () =>
      loadDescriptor(directory, id),
    );
    const { item } = lease.state;
    trace.descriptorMs = performance.now() - lookupStarted;
    trace.descriptorSource = lease.source;
    const traceRead = new URL(req.url).searchParams.get("trace") === "1";
    validateDescriptor(item, id, owner, req.method === "DELETE" || traceRead);
    if (req.method === "DELETE") {
      checkOrigin(req, origin);
      // Revoke immediately through shared state; acknowledge only after durable write.
      item.cancelled = true;
      for (const controller of active.get(descriptorKey) ?? [])
        controller.abort();
      await atomicFile(
        join(directory, "trials", `${id}.json`),
        JSON.stringify({ ...item, cancelled: true }),
      );
      return json({ cancelled: true });
    }
    const site = req.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none")
      throw new VerificationError("origin_required", 403);
    if (traceRead) {
      if (lease.state.trace)
        return json({
          ...lease.state.trace,
          descriptorCancelled: item.cancelled,
          sharedProducer: lease.state.sharedProducer ?? false,
        });
      try {
        return json({
          ...JSON.parse(
            await readFile(
              join(directory, "trials", `${id}.trace.json`),
              "utf8",
            ),
          ),
          descriptorCancelled: item.cancelled,
        });
      } catch {
        return Response.json(
          { error: "trace_not_available" },
          { status: 409, headers: { "Cache-Control": "no-store" } },
        );
      }
    }
    const { fixture, cacheId, audioPath, infoPath } = clipPaths(
      directory,
      item,
    );
    if (new URL(req.url).searchParams.get("metadata") === "1") {
      // Diagnostic reads can never dispatch synthesis, even for a fresh descriptor.
      try {
        return json({
          ...(await readMetadata(infoPath)),
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT")
          return Response.json(
            { error: "audio_not_complete" },
            { status: 409, headers: { "Cache-Control": "no-store" } },
          );
        throw error;
      }
    }
    req.signal.throwIfAborted();
    const attemptKey = `${directory}/${cacheId}`;
    let attempt = attempts.get(attemptKey);
    let start = false;
    if (!attempt) {
      // Two active paid operations suffice for the two-phone spike. Fail before reserving.
      if (attempts.size >= 2)
        throw new VerificationError("voice_concurrency_limit", 429);
      attempt = {
        spool: new ReplayAudio(),
        controller: new AbortController(),
        trace,
      };
      attempts.set(attemptKey, attempt);
      start = true;
    }
    const { spool, controller } = attempt;
    if (!start && !lease.state.trace) {
      lease.state.trace = attempt.trace;
      lease.state.sharedProducer = true;
    }
    const releaseReader = lease.retain();
    const readerAbort = new AbortController();
    const readers = active.get(descriptorKey) ?? new Set<AbortController>();
    readers.add(readerAbort);
    active.set(descriptorKey, readers);
    stream = spool.open(
      AbortSignal.any([req.signal, readerAbort.signal]),
      () => {
        releaseReader();
        readers.delete(readerAbort);
        if (!readers.size) active.delete(descriptorKey);
        if (!spool.readers && !spool.settled) controller.abort();
      },
    );
    if (start) {
      const state = lease.state;
      const fresh = state.fresh;
      state.fresh = false;
      // Preserve the original billable operation's evidence across completed replays.
      state.trace ??= trace;
      const releaseProducer = lease.retain();
      const produce = async () => {
        try {
          await ensureStorage(directory);
          let cached:
            | { metadata: z.infer<typeof Metadata>; bytes: Uint8Array }
            | undefined;
          if (!fresh || item.mode === "listen")
            try {
              const metadata = await readMetadata(infoPath),
                bytes = await readFile(/* turbopackIgnore: true */ audioPath);
              if (
                bytes.length !== metadata.pcmBytes ||
                bytes.length % 2 ||
                createHash("sha256").update(bytes).digest("hex") !==
                  metadata.sha256
              )
                throw new VerificationError("clip_storage_invalid");
              cached = { metadata, bytes };
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== "ENOENT")
                throw error;
            }
          if (cached) {
            validateDescriptor(item, id, owner);
            controller.signal.throwIfAborted();
            spool.cached = item.mode === "listen";
            spool.append(cached.bytes);
            spool.finish();
            trace.outcome = "complete";
            // Recovery may have no in-memory original: trace reads then use disk.
            if (state.trace === trace) state.trace = undefined;
            return;
          }
          await voiceLedger(
            directory,
            async (ledger, save) => {
              controller.signal.throwIfAborted();
              validateDescriptor(item, id, owner);
              if (ledger.entries.some((entry) => entry.id === item.id))
                throw new VerificationError("prior_synthesis_uncertain");
              reserve(ledger, item.id, reserveTtsMicros(fixture.text));
              const reserved = performance.now();
              await save();
              trace.reservationMs = performance.now() - reserved;
            },
            trace,
          );
          // No ledger lock spans a network call. A cancelled reservation is retained.
          controller.signal.throwIfAborted();
          validateDescriptor(item, id, owner);
          trace.providerDispatchMs = performance.now() - requestStarted;
          const generator = synth(
            fixture.text,
            item.voice,
            controller.signal,
            undefined,
            env.SARVAM_API_KEY,
            trace.provider,
          );
          let timing: StreamTiming;
          try {
            while (true) {
              controller.signal.throwIfAborted();
              const chunk = await generator.next();
              controller.signal.throwIfAborted();
              if (chunk.done) {
                timing = chunk.value;
                trace.providerEofMs = performance.now() - requestStarted;
                break;
              }
              trace.firstPcmMs ??= performance.now() - requestStarted;
              spool.append(chunk.value);
            }
          } finally {
            await generator.return(undefined as never);
          }
          controller.signal.throwIfAborted();
          const bytes = spool.bytes();
          const metadata = Metadata.parse({
            ...timing,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            version: VOICE_VERSION,
          });
          if (metadata.pcmBytes !== bytes.length || bytes.length % 2)
            throw new VerificationError("invalid_provider_audio");
          // These durable writes happen after first-chunk delivery. EOF means both
          // the provider completed cleanly and the replay is durably available.
          const persisting = performance.now();
          await atomicFile(audioPath, bytes);
          await atomicFile(infoPath, JSON.stringify(metadata));
          trace.persistenceMs = performance.now() - persisting;
          trace.outcome = "complete";
          spool.finish();
        } catch (error) {
          trace.outcome =
            controller.signal.aborted ||
            (item.cancelled && trace.providerDispatchMs === undefined)
              ? "cancelled"
              : "failed";
          spool.fail(
            error instanceof VerificationError
              ? error
              : new Error("audio_stream_failed"),
          );
        } finally {
          releaseProducer();
          if (attempts.get(attemptKey)?.spool === spool)
            attempts.delete(attemptKey);
          // Content-free trace persistence cannot delay first audio or replay EOF.
          if (trace.providerDispatchMs !== undefined && state.trace === trace)
            await atomicFile(
              join(directory, "trials", `${id}.trace.json`),
              JSON.stringify(trace),
            ).catch(() => {});
        }
      };
      void produce();
    }
    await spool.ready;
    if (req.headers.has("range")) {
      // Range clients join the same operation and use its completed representation.
      await spool.done;
      validateDescriptor(item, id, owner);
      await stream.cancel();
      return audioResponse(spool.bytes(), req, {
        ...(await readMetadata(infoPath)),
        cached: spool.cached,
      });
    }
    validateDescriptor(item, id, owner);
    trace.responseReadyMs = performance.now() - requestStarted;
    return new Response(stream, {
      headers: {
        "Content-Type": "audio/x-pcm",
        "X-Audio-Format": "pcm16le",
        "X-Sample-Rate": String(TTS_SETTINGS.speech_sample_rate),
        "X-Voice-Version": VOICE_VERSION,
        "X-Template-Cache": String(spool.cached),
        "Cache-Control": "no-store, no-transform",
        "Accept-Ranges": "bytes",
        "Server-Timing": `auth;dur=${trace.authMs.toFixed(2)}, descriptor;dur=${(trace.descriptorMs ?? 0).toFixed(2)}, ready;dur=${trace.responseReadyMs.toFixed(2)}`,
      },
    });
  } catch (error) {
    await stream?.cancel().catch(() => {});
    return failure(error);
  } finally {
    lease?.release();
  }
}

// Fixed local tone only: no provider request, no reservation, no caller text.
export async function handleDiagnostic(
  req: Request,
  email: string | null,
  env: Environment = process.env,
) {
  try {
    authorize(email, env);
    const rate = TTS_SETTINGS.speech_sample_rate;
    const make = (frames: number) => {
      const bytes = new Uint8Array(frames * 2),
        view = new DataView(bytes.buffer);
      for (let i = 0; i < frames; i++)
        view.setInt16(
          i * 2,
          Math.round(Math.sin((i / rate) * 2 * Math.PI * 440) * 3000),
          true,
        );
      return bytes;
    };
    const first = make(Math.round(rate * 1.2)),
      last = make(Math.round(rate * 0.2));
    if (new URL(req.url).searchParams.get("metadata") === "1")
      return json({
        providerMs: 0,
        providerHeadersMs: 0,
        providerFirstAudioMs: 0,
        pcmBytes: first.length + last.length,
      });
    let timer: ReturnType<typeof setTimeout>;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(first);
        timer = setTimeout(() => {
          controller.enqueue(last);
          controller.close();
        }, 500);
      },
      cancel() {
        clearTimeout(timer);
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "audio/x-pcm",
        "X-Audio-Format": "pcm16le",
        "X-Sample-Rate": String(rate),
        "X-Voice-Version": VOICE_VERSION,
        "X-Template-Cache": "false",
        "Cache-Control": "no-store, no-transform",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
