# S4 Sarvam latency research — October 9, 2026

**Status: research and proposed experiments; no new synthesis, deployment or accepted architecture change.**

The approved streaming experiment is now implemented and reviewed in
[doc 20](../validation/s4/20-s4-streaming-validation.md); this research remains the pre-change record.
The post-retest [low-level analysis and experiment plan](../plans/21-s4-low-level-latency-plan.md)
examines remaining application, connection and playback costs without a region move.

The largest identified opportunity is progressive synthesis **and** progressive phone playback. Singapore adds a network path, but the evidence does not support treating geography as the main explanation or moving hosting first. Keep the wife's selected Ritu voice while testing transport changes. The ≤700 ms p95 target remains unproved.

This review combines current primary documentation, the deployed harness code, the owner's [partial Android evidence](../validation/s4/18-s4-voice-verification.md#owner-provided-android-results--042244-utc), and a non-synthesis probe in the running Singapore container. Provider documentation is dated evidence, not a latency guarantee. Recommendations below are experiments, not completed optimizations.

## 1. What currently takes time

| Stage | Current implementation | Consequence |
| --- | --- | --- |
| Sarvam synthesis | [`sarvam.ts`](../../spikes/s1/lib/voice/sarvam.ts) uses `/text-to-speech`, awaits complete JSON/base64 audio, decodes and inspects the WAV | First playback waits for synthesis of the entire sentence |
| Durable completion | [`service.ts`](../../spikes/s1/lib/voice/service.ts) saves the audio and metadata atomically before returning the response | Two completed-file writes are on the first-audio path |
| Phone download | [`playback.ts`](../../spikes/s1/lib/voice/playback.ts) awaits `response.blob()` before assigning the audio source | Playback also waits for the entire phone download |
| Shared reservation lock | `handleClip` holds the global S4 ledger lock across provider synthesis and completed-file writes | Another phone can receive a busy response while the first is synthesizing |
| Audio lifetime | Playback releases the source and calls `audio.load()` between trials | Investigate startup/unlock continuity on real phones; its latency contribution has not been isolated |

The preparation request completes before the agreed metric starts, when the validated sentence reaches the phone. Removing that request would primarily improve release-to-reply latency, a separate product metric. The speech GET, server authorization/reservation, synthesis, transfer and playback startup are inside S4 timing.

Across completed v1 trials, the provider timer's p50 is 724.23 ms on Wi-Fi and 744.34 ms on mobile. The paired remainder's p50 is 433.17 and 472.16 ms respectively. `providerMs` measures the complete provider round trip, JSON parsing, decoding and inspection; it is **not** provider time to first audio chunk. The remainder is not pure network time. The 4.50 s Wi-Fi sample includes 4.09 s inside the provider timer. These partial samples do not establish either inference-only latency or home-network causality.

## 2. Singapore and storage measurements

The staging service is one replica in `asia-southeast1-eqsg3a`, Node 24.21.0, with `/verification` on its persistent volume. At 04:40:48 UTC, a separate Node subprocess made eight sequential unauthenticated **GET** requests to Sarvam's TTS URL, consuming each small 405 response. It used no API key, no text and no synthesis POST. Undici diagnostics observed one connection across all eight requests.

| Control probe | Observation |
| --- | --- |
| First response headers / complete response | 308.33 / 319.01 ms |
| First connection setup | 145.66 ms |
| Next seven response headers | 62.07–66.98 ms; nearest-rank p50 64.05 ms |
| 1 KiB temporary atomic write, 12 samples | 10.23–22.49 ms; p50 14.48 ms |
| 109,176-byte temporary atomic write, 12 samples | 10.66–27.24 ms; p50 13.07 ms |

Writes included file fsync, rename and parent-directory fsync; unlink happened after timing. Unique temporary files were removed. The S4 budget ledger's hash was identical before and after. The temporary SSH registration was revoked and its local identity deleted. [Raw probe evidence and method](../../spikes/s1/evals/results/s4-singapore-control-probe-2026-10-09.json) retain every sample.

**Interpretation:** a warm connection to the public API can be much quicker than a full synthesis. Connection reuse already works in this probe; adding a keep-alive setting is not automatically a new optimization. Completed-file persistence appears to offer tens of milliseconds in this window, rather than explaining the whole gap. These are small control samples: a 405 can be served by a different edge/backend path, and the probe does not measure authenticated inference, the application process's pool, the home phone path or savings achievable by moving to India.

Railway currently lists Singapore, California, Virginia and Amsterdam, with no Indian deployment region. An India migration would require a different hosting arrangement, rather than a Railway region toggle. No reviewed hosted TTS source establishes the exact inference city or a selectable India endpoint. Measure both phone→app and app→authenticated first-audio paths before reconsidering topology. An extra India relay could add a hop and operational cost. [Railway region options](https://docs.railway.com/deployments/regions).

## 3. Recommended experiments, in order

### A. Stream a validated sentence all the way to playback

Sarvam explicitly recommends HTTP streaming or WebSocket for conversational Bulbul v3 output. Its single-response REST interface waits for a complete file. Our pace 1 and temperature 0.6 already match conversational defaults, so retain them and Ritu during the first experiment. [Bulbul v3 best practices](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/bulbul-v3-best-practices).

Start with `POST /text-to-speech/stream`: it accepts a complete text payload and returns binary audio progressively. This fits Nilumi's existing validated-sentence boundary with less lifecycle work than a persistent socket. Forward chunks as they arrive; keeping `.text()`, `.arrayBuffer()` or `.blob()` over the whole response would retain the principal wait. Keep subscription credentials on the server. [HTTP streaming guide](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/streaming-api/http-stream).

Compare these phone playback approaches before choosing:

| Approach | Benefit | Proof needed |
| --- | --- | --- |
| MP3 stream through the same-origin member-bound audio URL, using the media element directly | Smaller payload and existing browser decoder; simplest first candidate | Both installed phones start before provider completion; Safari range requests cannot trigger duplicate synthesis; measure actual buffer/startup delay and the last word |
| `linear16` stream to a persistent AudioWorklet/player | Direct control over a small startup buffer and non-silent sample scheduling | Verify hosted v3 format, sample alignment, resampling to the actual context rate, bounded queues, underruns, interruptions and cancellation |

Do not treat arbitrary compressed transport chunks as independently decodable files. Web Audio's `decodeAudioData` is a file-decoding interface, rather than a general incremental decoder. A PCM path should consume PCM directly; a compressed path needs a browser-supported streaming decoder. [Web Audio specification](https://webaudio.github.io/web-audio-api/#dom-baseaudiocontext-decodeaudiodata).

The existing complete-WAV inspection and onset headers need redesign: they depend on seeing the finished file. Measure silence incrementally, retain completion/integrity checks, and deliver final diagnostics separately. Waiting for final statistics before releasing response headers would defeat streaming. Retain no-store/no-transform and verify that the deployed path delivers the first audio chunk before upstream completion.

### B. Reduce payload after establishing streaming

Test 16 kHz against 22.05 kHz while preserving voice and naturalness. At mono PCM16, 16 kHz is 32,000 bytes/second versus 44,100: a calculated **27.4% payload reduction**. Both are documented streaming sample rates. This calculation does not predict inference speed or first-audio savings. [Sample-rate guide](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/how-to/set-the-sample-rate).

MP3 at 64 kbit/s is nominally 8,000 bytes/second, approximately **5.5 times smaller** than our current PCM payload, before headers and encoder effects. Compare 64k and 128k for consonants, names, Tamil and tail truncation; smaller output can introduce encoding or browser buffering delay. The stream reference supports these bitrates and `linear16`/MP3/WAV formats. Pin `enable_cached_responses=false` for benchmark requests. [Stream API reference](https://docs.sarvam.ai/api-reference/text-to-speech/convert-stream), [codec guide](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/how-to/set-audio-format-for-output).

### C. Use a persistent WebSocket if HTTP streaming leaves a measured bottleneck

Configure once per active speaking session, send one complete validated sentence, and flush immediately. The documented `min_buffer_size` default is 50 characters, with range 30–200; a flush forces shorter text to start processing. Our 24–53-character English fixtures should never wait for text from the next sentence. These controls are WebSocket-specific. [Buffer-size guide](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/how-to/set-buffer-size-to-start-processing).

`max_chunk_length` is documented as 50–500, default 150. Existing fixtures are already below 150, so reducing this parameter is not an obvious main fix. Preserve complete sentence boundaries. [Sentence-splitting guide](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/how-to/set-maximum-length-for-sentence-splitting).

Use completion events to distinguish sentence completion from an idle gap; do not copy tutorial examples that wait three seconds of silence before deciding a turn ended. Ping active connections and reconnect with bounded backoff. A reconnect must not silently resend an uncertain billable utterance. Keep sockets isolated by member/session, stop them appropriately on cancellation, and prevent late chunks from an earlier sentence playing. [WebSocket guide](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/streaming-api/web-socket). Sarvam documents repeated convert/flush operations on one configured connection in its [migration guide](https://docs.sarvam.ai/api/migrations/from-gemini/text-to-speech).

### D. Remove avoidable application waits without weakening controls

Keep the durable budget reservation **before** dispatch. Move completed audio/metadata persistence behind first-chunk delivery only with an explicit attempt state and per-clip single-flight operation. Repeated GETs/ranges must join the same attempt or replay its spool, including during synthesis. A crash after reservation must remain uncertain and charged conservatively, rather than dispatching again automatically.

Restrict the shared ledger lock to checking/reserving state; use per-clip coordination for synthesis and a small provider concurrency limit. This would improve two-phone reliability, but the sequential Android export does not establish lock contention as its cause. Account-wide rate limiting must still include listening and other TTS callers. Sarvam documents a v3 Starter limit of 30 REST requests/minute and 30 concurrent WebSocket connections; our actual account tier and HTTP-stream limit need verification before concurrency tuning. Do not hide 429s or reconnects with selective reruns. [Rate-limit documentation](https://docs.sarvam.ai/api/getting-started/ratelimits).

Reuse one unlocked playback element/context during the session and measure source-reset overhead on the installed phones. Separate genuine user-gesture unlock from benchmark timing; include the first real speech request and label cold/warm sessions. Stop and app-switch handling must invalidate old chunks. Native pooling exists: Node's fetch uses Undici and supports a custom dispatcher if measurements justify one; do not create a new client/agent per utterance or add an SDK merely to claim keep-alive. [Node 24 fetch documentation](https://nodejs.org/download/release/v24.21.0/docs/api/globals.html#fetch).

### E. Quality and production caching

The English benchmark correctly pins `en-IN`. The separate Tamil listening fixture currently inherits that same setting. Evaluate `ta-IN` for Tamil and appropriate language/script handling for Tanglish in a separately versioned quality set; do not mix it into the English latency corpus. Sarvam requires an explicit language code and documents its role in language-specific normalization. [Language guide](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/how-to/set-the-language).

Production can reuse fixed, non-personal confirmation clips keyed by text, voice, language, model and settings. The listening cache already does this. Benchmark attempts must remain fresh and cache status explicit. Avoid a shared cache for private household text; caching common phrases cannot establish uncached S4 acceptance. Number/name preprocessing or pronunciation dictionaries should address demonstrated quality errors in separate comparisons, rather than changing the frozen benchmark to produce a faster result.

### F. Evaluate v4 Flash only if needed

Sarvam now documents `bulbul:v4-flash` as an interactive low-latency tier. Its speakers are persona IDs; the selected v3 short name `ritu` is not a drop-in setting for that model. A new model requires a valid language-specific persona and the wife's fresh listening comparison. [v4 Flash guide](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/best-practice-guide-for-bulbul-v-4-flash).

The reviewed public price table lists v3 at ₹30/10,000 characters and does not list a v4 Flash price. Verify v4 price/account access before reserving a paid comparison; do not reuse the v3 reservation bound without evidence. [Sarvam pricing](https://docs.sarvam.ai/api/getting-started/pricing).

The docs also disagree on some defaults and bitrate options: the stream reference says default model v2; the HTTP tutorial says v3, and their bitrate lists differ. The HTTP tutorial's “new connection per request” wording does not describe the keep-alive reuse observed in our Node probe. Pin every relevant parameter and use the endpoint reference plus a bounded capability check; avoid copying v4 persona examples into a v3 request.

## 4. Measurement and acceptance plan

First add synthetic, zero-billing fixtures that emit valid audio in delayed chunks. Prove browser/player first sound precedes final response completion, Stop discards late chunks, repeated/range requests synthesize once, and a failed stream remains a failed attempt. Amend the proposed adapter contract alongside implementation: [Architecture §14.4](../core/02-architecture.md#144-tts-and-speech-lifecycle) currently returns a complete `Uint8Array` clip. Progressive delivery must preserve validated sentences, ordering, replay and member boundaries.

Then run a small, separately versioned Ritu transport smoke with short, typical and longer sentences on both phones. Label all exploratory attempts; they are diagnostics, not acceptance. Freeze the promising candidate before a fresh complete acceptance run. Do not pool v1, experimental codecs or different models.

Capture these durations on each host's own monotonic clock:

| Phone | Server/provider |
| --- | --- |
| Validated sentence arrival, speech request start, first response/audio bytes, first decoded non-silent sample or media-playing event, estimated output onset, completion/interruption | Request arrival, authorization/ledger duration, provider dispatch, response headers, first audio chunk, final audio byte, persistence duration and completion/error |

Use first **audio** chunk rather than response headers as the provider onset measure. Correlate durations by attempt ID; do not subtract unsynchronized phone/server timestamps or add stage p95 values as if they guaranteed an end-to-end p95. Export chunk and final-file bytes, format/rate, cold/warm connection status, cache status, device/OS and actual network label. Physically verify audible onset again for the new playback method; v1's checkbox is not transferable proof.

The owner's snapshot leaves ₹43.592 under the original ₹50 cap. A fresh 200-trial run of the unchanged ten-sentence v3 corpus reserves ₹32.832 using the existing conservative rate, leaving **₹10.760** for tuning and any necessary listening at that snapshot. Read the current durable ledger before further spending and retain the same cumulative cap. Stage a few smoke calls instead of spending on another complete run before confirming progressive onset.

Acceptance remains at least 50 uncached trials in each installed iPhone/Android × home Wi-Fi/mobile slice, required fixture coverage, no failed attempts, actual audible-onset verification and p95 ≤700 ms. Measure both the first/cold reply and sustained use. Streaming is the strongest code-supported opportunity; its actual first-audio p95 still requires phone evidence. S-VGW remains a separate Phase 2 gate.

Research artifacts were checked against raw probe values and existing reservation
helpers; local documentation file links resolve. The S1 harness passes lint/guard,
type checking, all 245 offline tests and the production build. These checks validate
the current harness and evidence files, not any proposed streaming candidate.
