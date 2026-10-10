import { TTS_SETTINGS, type Voice } from "../../config/voice";
import { VerificationError } from "../verification/ledger";
import { type ProviderTrace, traceProviderRequest } from "./timing";
import { recordProviderPolicy, sarvamPool } from "./transport";
import { WavStreamDecoder } from "./wav-stream";

export type Clip = {
  bytes: Uint8Array;
  providerMs: number;
  leadingSilenceMs: number;
};

// Reject unsupported/corrupt/silent audio before it can count as spoken playback.
export function inspectWav(bytes: Uint8Array): number {
  const buffer = Buffer.from(bytes);
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE" ||
    buffer.readUInt32LE(4) + 8 !== buffer.length
  )
    throw new VerificationError("invalid_provider_audio");
  let format = false,
    rate = 0,
    channels = 0;
  for (let offset = 12; offset + 8 <= buffer.length; ) {
    const kind = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4),
      start = offset + 8;
    if (start + size > buffer.length)
      throw new VerificationError("invalid_provider_audio");
    if (kind === "fmt " && size >= 16) {
      channels = buffer.readUInt16LE(start + 2);
      rate = buffer.readUInt32LE(start + 4);
      format =
        buffer.readUInt16LE(start) === 1 &&
        buffer.readUInt16LE(start + 14) === 16 &&
        channels === 1 &&
        rate === TTS_SETTINGS.speech_sample_rate;
    }
    if (kind === "data" && format && size % 2 === 0) {
      for (let i = 0; i < size; i += 2) {
        if (Math.abs(buffer.readInt16LE(start + i)) >= 164)
          return (i / 2 / rate / channels) * 1000;
      }
      throw new VerificationError("silent_provider_audio");
    }
    offset = start + size + (size % 2);
  }
  throw new VerificationError("invalid_provider_audio");
}

export type StreamTiming = {
  providerMs: number;
  providerHeadersMs: number;
  providerFirstAudioMs: number;
  leadingSilenceMs: number;
  pcmBytes: number;
};

export async function* synthesize(
  text: string,
  voice: Voice,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  key = process.env.SARVAM_API_KEY,
  trace: ProviderTrace = {},
): AsyncGenerator<Uint8Array, StreamTiming> {
  if (!key) throw new VerificationError("sarvam_key_missing");
  const started = performance.now();
  const combined = AbortSignal.any([signal, AbortSignal.timeout(12_000)]);
  const response = await traceProviderRequest(trace, () =>
    fetcher("https://api.sarvam.ai/text-to-speech/stream", {
      method: "POST",
      redirect: "error",
      signal: combined,
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": key,
      },
      body: JSON.stringify({
        ...TTS_SETTINGS,
        text,
        speaker: voice,
        enable_cached_responses: false,
        enable_preprocessing: false,
      }),
      dispatcher: sarvamPool(),
    } as RequestInit),
  );
  recordProviderPolicy(trace, response);
  const providerHeadersMs = performance.now() - started;
  const requestId = response.headers.get("x-request-id");
  if (requestId && /^[a-zA-Z0-9._:-]{1,128}$/.test(requestId))
    trace.requestId = requestId;
  if (!response.ok) {
    await response.body?.cancel();
    throw new VerificationError("synthesis_failed");
  }
  const contentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (
    !response.body ||
    !["audio/wav", "audio/x-wav", "audio/wave"].includes(contentType ?? "") ||
    Number(response.headers.get("content-length")) > 3_000_000
  ) {
    await response.body?.cancel();
    throw new VerificationError("invalid_provider_audio");
  }
  const reader = response.body.getReader(),
    decoder = new WavStreamDecoder();
  let first: number | null = null;
  try {
    while (true) {
      combined.throwIfAborted();
      const chunk = await reader.read();
      if (chunk.done) break;
      if (chunk.value.length && trace.firstBodyMs === undefined) {
        trace.firstBodyMs = performance.now() - started;
        trace.firstRawBytes = chunk.value.length;
      }
      const parsing = performance.now();
      const frames = decoder.push(chunk.value);
      trace.decoderProcessingMs =
        (trace.decoderProcessingMs ?? 0) + performance.now() - parsing;
      if (
        trace.firstRawPcmBytes === undefined &&
        trace.firstRawBytes !== undefined
      )
        trace.firstRawPcmBytes = frames.reduce(
          (sum, frame) => sum + frame.length,
          0,
        );
      for (const pcm of frames) {
        if (first === null) {
          first = performance.now() - started;
          trace.decoderFirstPcmProcessingMs = trace.decoderProcessingMs;
        }
        yield pcm;
      }
    }
    const inspected = decoder.finish();
    return {
      ...inspected,
      providerMs: performance.now() - started,
      providerHeadersMs,
      providerFirstAudioMs: first as number,
    };
  } catch {
    throw new VerificationError(
      signal.aborted ? "synthesis_cancelled" : "invalid_or_interrupted_audio",
    );
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
