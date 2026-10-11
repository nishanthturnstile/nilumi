# S4 Sarvam latency research — October 9, 2026

**Status: research and proposed experiments; no new synthesis, deployment or accepted architecture change.**

The approved streaming experiment is now implemented and reviewed in
[doc 20](../validation/s4/20-s4-streaming-validation.md); this research remains the pre-change record.
The post-retest [Dated experiment evidence](../validation/s4/24-s4-v4-connection-and-ledger-validation.md)
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



 ## Findings and limits

 These October9 measurements concern the existing HTTP/PCM synthetic harness. Later application, WebSocket and both-phone outcomes are recorded in [S4 evidence](../validation/s4/25-s4-v4-both-phone-analysis.md). They do not validate a Pipecat transport or complete recognition-to-action conversation.

 The original tuning proposals (payload, persistent connection, buffering, browser scheduling and caching) are historical hypotheses, not an active experiment sequence. P0 measures the complete new path and chooses tests from observed bottlenecks. The [implementation plan](../plans/implementation-plan.md#p0) owns that work and budget gates.

 Sarvam's [HTTP streaming](https://docs.sarvam.ai/api/text-to-speech/overview) and [Pipecat release](https://github.com/pipecat-ai/pipecat/releases/tag/v1.11.0) are integration references; processor settings and released-version compatibility still require actual tests.
