# S4 low-level latency analysis and experiment plan — October 9, 2026

**Status: research and implementation-ready plan. No runtime change, deployment,
provider call or live-ledger mutation was made for this analysis.**

The first application optimization batch is now implemented and deployed as
`s4-bulbul-v3-stream-3`. See [implementation validation and retest instructions](../validation/s4/22-s4-application-optimization-validation.md).
The analysis below preserves the preimplementation evidence and conditional experiments.

The first implementation experiment should shorten the existing HTTP/PCM path:
instrument it, remove repeated filesystem work, verify persistent provider
connections, then tune startup buffering. Keep Ritu and the frozen English
sentences. Persistent provider WebSocket, different encodings and production
pipeline changes are conditional follow-ups, rather than one large rewrite.

Hosting geography is deferred at the owner's request. An Indian deployment can
be evaluated later against the same traces; this plan does not rely on that move
or assume where Sarvam's authenticated inference runs. The agreed S4 metric stays
**validated sentence available on the phone → audible playback**. Release-to-reply
remains a separate metric.

## 1. What the current evidence can establish

The [v2 Android retest](../validation/s4/20-s4-streaming-validation.md#owner-provided-android-retest--053055-utc)
contains ten completed benchmark trials per network and one manual Stop per
slice, plus six separate exploratory rows. All completed rows report zero
underruns. iPhone evidence is still absent. These small samples do not establish
the eventual p95; their nearest-rank p95 is their maximum.

| Observed component, completed benchmarks | Wi-Fi p50 | Mobile p50 | Interpretation |
| --- | ---: | ---: | --- |
| Server/provider request to response headers | 90.03 ms | 97.82 ms | Includes request setup, connection/network and provider response wait |
| Provider headers to first validated PCM, paired durations | 181.38 ms | 179.05 ms | A distinct generation/delivery interval after headers; not a frontend wait |
| Provider request to first PCM | 277.89 ms | 269.97 ms | Includes the preceding two stages; not inference-only time |
| Phone first PCM minus provider-first-PCM duration | 283.70 ms | 229.76 ms | Mixed request travel, server pre-dispatch work and return/reader delivery |
| Estimated audible onset minus phone first PCM | 112.20 ms | 112.28 ms | Startup cushion, leading silence, scheduling and output estimate |
| End-to-end first audible estimate | 684.15 ms | 638.38 ms | Agreed metric; does not include the preparation POST |

These are separately computed percentiles and must not be added. Derive paired
durations for each attempt and measure final end-to-end percentiles directly.
The client and server clocks are not synchronized; the mixed remainder is a
subtraction of elapsed durations, not subtraction of wall-clock timestamps.

Two different tails require different remedies:

- The mobile `date` benchmark waited 2,433.18 ms for provider headers, reached
  provider first PCM at 2,612.55 ms and audible onset at 2,983.82 ms. Frontend
  conversion or buffering changes cannot remove that initial response wait.
- The mobile exploratory `shopping` row had provider first PCM at 272.00 ms but
  phone first PCM at 1,069.90 ms. Most of that extra time is outside the measured
  provider-first-PCM duration. It cannot be labelled pure mobile-network delay
  without server and browser traces.

Four completed benchmark header waits are around 205–229 ms; many other waits
are around 82–98 ms. The earlier [Singapore control](../research/19-s4-sarvam-latency-research.md#2-singapore-and-storage-measurements)
observed 145.66 ms first connection setup and approximately 64 ms warm headers.
This makes intermittent connection establishment a worthwhile hypothesis. It is
not proof: that control used unauthenticated 405 responses in another process.

## 2. Exact current execution path

```mermaid
sequenceDiagram
    participant Phone
    participant App as Next.js app
    participant Disk as Durable S4 state
    participant Sarvam
    Phone->>App: Prepare fixed fixture and descriptor
    App->>Disk: Validate selection/budget; persist descriptor
    App-->>Phone: Validated sentence and audio URL
    Note over Phone: S4 clock starts here
    Phone->>App: GET sentence audio
    App->>Disk: Read descriptor; check cache/directory
    App->>Disk: Lock + sync; read ledger; recheck descriptor
    App->>Disk: Persist reservation; unlock
    App->>Disk: Recheck descriptor before dispatch
    App->>Sarvam: POST streaming TTS
    Sarvam-->>App: Headers, then incremental WAV/PCM
    App->>Disk: Recheck descriptor after first PCM
    App-->>Phone: Progressive PCM stream
    Phone->>Phone: Convert PCM; schedule +40 ms; play leading silence
    Note over Phone: Estimate first non-silent output
    Sarvam-->>App: Remaining PCM and completion
    App->>Disk: Persist complete replay and metadata
    App-->>Phone: EOF
    Phone->>App: Read completion metadata
```

Source locations: [player](../../spikes/s1/lib/voice/playback.ts),
[page orchestration](../../spikes/s1/app/voice/page.tsx),
[voice service](../../spikes/s1/lib/voice/service.ts),
[provider adapter](../../spikes/s1/lib/voice/sarvam.ts),
[ledger](../../spikes/s1/lib/verification/ledger.ts),
[replay spool](../../spikes/s1/lib/voice/stream-buffer.ts).

Already removed in v2: complete-provider-file waiting, base64 JSON decoding in
the HTTP path, complete-phone-Blob waiting, and a global ledger lock spanning
network synthesis. Complete audio/metadata writes and the final metadata GET
now occur after first audio. They affect completion, replay and next-turn work;
removing them is not another first-audio optimization.

## 3. Backend: remove I/O around the durable reservation

### 3.1 Four descriptor reads, including one after audio exists

For a fresh clip, `handleClip` reads the descriptor at entry, inside the ledger
operation, after the reservation, and after `spool.ready` before creating the
response. The last read delays forwarding audio that Sarvam has already produced.
The others exist to prevent cancellation/replay races, so deleting them without
a replacement state model is incorrect.

Introduce a bounded `VoiceAttemptCoordinator` in the existing app process:

- Validate the durable descriptor and owner once when opening an attempt.
- Retain immutable fixture/settings/version and mutable cancellation/expiry
  state in that attempt. A bounded descriptor index can be rebuilt from durable
  state after restart; absence or corrupt state fails closed.
- Make GET/join and DELETE use the same coordinator. Mark cancellation and abort
  readers immediately in memory; acknowledge DELETE only after its durable
  write. Check the generation/cancellation state synchronously before dispatch
  and before returning the first stream response.
- Keep the reservation durable before dispatch, and retain it if cancellation,
  crash or dispatch certainty is unresolved. Old IDs never start another call.
- Evict expired/completed idle entries; a restarted process must read durable
  cancellation and reservation state before serving or synthesizing.

This replaces repeated disk reads with explicit state ownership while preserving
their purpose. It remains a one-replica spike design. Multi-replica production
needs transactional shared state and distributed dispatch ownership.

### 3.2 Directory and cache work on every fresh trial

`produce()` calls `mkdir(audio)` and reads cache metadata before reserving even
for a fresh benchmark/smoke UUID that has no existing audio. Initialize and
validate the directory once at service readiness. Track fresh versus replayed
attempts explicitly, so fresh benchmark/smoke work skips the guaranteed cache
miss. Listening still checks its fixed-phrase cache; repeated/recovered IDs
still validate durable replay integrity. Do not infer freshness merely from a
missing audio file: a crashed, already reserved attempt is uncertain.

### 3.3 Durable reservation: optimize its implementation, preserve its order

`withLedger` creates and syncs a lock file, reads and validates the entire JSON
ledger, then `atomicFile` writes/syncs a replacement, renames it and syncs its
directory. The earlier volume control measured approximately 13–14 ms median
per atomic write, but did not separately measure the live lock and descriptor
operations. Sum actual trace durations before selecting an implementation.

Keep this durability boundary in the first small refactor. Removing fsync,
reserving after dispatch, trusting an in-memory budget, or dispatching before
the reservation promise resolves would weaken the spending control.

For production, use the already planned PostgreSQL rather than adding Redis or
an audio-specific database. One short transaction should lock the budget row,
check/allocate the amount, insert a unique attempt/reservation and commit
durably; only then send provider text. No database lock spans synthesis.
Cancellation and completion are separate transactions. Import and reconcile
the existing cumulative reservations without resetting the cap. PostgreSQL's
[durable commit settings](https://www.postgresql.org/docs/18/runtime-config-wal.html#GUC-SYNCHRONOUS-COMMIT)
and [row locks](https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-ROWS)
support that design; neither proves it will be faster on our deployment.

### 3.4 Queueing, event loop and concurrent phones

The existing two-operation limit is suitable for this spike. Record ledger
queue wait, active provider calls, event-loop delay and filesystem durations.
If filesystem waits share an overloaded Node worker pool, investigate that
specifically; increasing CPU, `UV_THREADPOOL_SIZE` or concurrency without a
trace could add cost or make contention worse.

Sarvam documents a v3 Starter limit of 30 REST requests/minute and 30 concurrent
WebSockets. Two simultaneous sequential phone runs can approach an account-wide
request limit even with only two active calls. Verify our tier and HTTP-stream
quota before concurrent paid runs. Rate/concurrency admission stays bounded and
observable; any queue wait remains inside latency measurement. [Rate limits](https://docs.sarvam.ai/api/getting-started/ratelimits).

## 4. API client: distinguish connection churn from inference

### 4.1 Reusing fetch is necessary but not sufficient

The app uses Node's built-in fetch, not a new SDK/client per sentence. The local
runtime is Node 24.21.0 with bundled Undici 7.29.1. The matching
[Undici Client documentation](https://github.com/nodejs/undici/blob/v7.29.1/docs/docs/api/Client.md)
specifies a four-second default idle timeout, server keep-alive overrides,
HTTP/1.1 pipelining of one and opt-in HTTP/2. Current `main` documentation has
different HTTP/2 defaults; do not copy those into our pinned runtime blindly.

Synthesis can finish while the phone is still speaking for several seconds.
That means a connection can become idle and close even during continuous use.
Measure the actual gap from provider EOF to the next request and the socket used
for that request. Start-to-start trial gaps are not connection idle time.

If traces confirm avoidable client-side closure, use a module-scoped, pinned
Undici pool dedicated to `api.sarvam.ai`, starting with two connections,
`pipelining: 1`, and an idle timeout trial around 15 seconds, respecting the
server's limits. Use a request-specific dispatcher rather than changing the
global dispatcher for every provider and unrelated app request. Preserve TLS
verification, redirects policy, cancellation and bounded deadlines. HTTP/2 is
a separate capability/compatibility experiment after actual ALPN verification.

Potential benefit is removal of observed reconnect cost on affected requests,
not a guaranteed reduction on already warm requests. A longer idle timeout
cannot force a server to retain its socket or fix provider queueing. TCP
keep-alive probes and HTTP connection idle timeouts are different controls.
Do not introduce periodic synthesis as a warming mechanism.

### 4.2 Trace connections without exposing credentials

Use [Undici diagnostics channels](https://github.com/nodejs/undici/blob/v7.29.1/docs/docs/api/DiagnosticsChannel.md)
to capture request creation, request-to-socket assignment, connection creation,
response headers, completion and errors. Correlate request IDs to sockets using
internal maps. Connection events can be pooled rather than request-specific;
only claim a request's socket when the send-headers event identifies it.
Collect durations and pseudonymous connection IDs only. Do not log the raw
header string, cookie, API key, text, email or response body shown by some
documentation examples. [Node fetch/dispatcher contract](https://nodejs.org/download/release/v24.21.0/docs/api/globals.html#fetch).

### 4.3 Persistent provider WebSocket is the next architectural option

If warm HTTP requests still show a useful avoidable per-utterance wait, implement
`SarvamWsAdapter` behind the same validated-sentence/PCM iterator contract:

1. Establish a server-side authenticated socket during the active voice session,
   send pinned configuration, and keep it ready without sending user text.
2. Once a sentence is validated and its reservation is durable, send the whole
   sentence and flush immediately. Begin with the existing sentence-split limit;
   changing it is a separate quality experiment.
3. Decode received base64 audio to binary on the server and use the existing
   bounded spool and phone HTTP/PCM player. The browser-to-app transport can
   remain HTTP; a provider WebSocket does not require two WebSocket rewrites.
4. Use final/completion events, rather than an idle three-second timeout, to
   determine completion. Apply one in-flight utterance per socket, isolate
   member/session ownership, ping only active sessions and bound idle lifetime.
5. Stop immediately invalidates playback and closes that utterance's socket.
   Reconnect can prepare the next attempt; it must never resend an uncertain
   already billable sentence automatically.

Sarvam's buffer control has range 30–200 characters, default 50; flush processes
shorter text. This is a **text accumulation control**, not our 40 ms playback
buffer or a byte-size setting on the HTTP endpoint. The 24-character fixture
must never wait for another sentence. [Buffer guide](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/how-to/set-buffer-size-to-start-processing).

The provider guide documents no in-band per-utterance cancel: interruption
requires closing the socket. Its v3 WebSocket reference also says preprocessing
is always enabled, whereas our HTTP request explicitly asks for false. Quality,
normalization, cache behavior and billing therefore need capability checks and
a separate candidate version. Tutorial v4 persona examples are not valid v3
Ritu settings. [WebSocket lifecycle guide](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/streaming-api/web-socket),
[WebSocket reference](https://docs.sarvam.ai/api-reference/text-to-speech/stream).

## 5. Browser and player: reduce avoidable startup without cutting speech

### 5.1 Startup cushion: 40 ms is an explicit, controllable delay

`PcmPlayer.push` schedules initial audio at `currentTime + 0.04`. Trial a 20 ms
cushion first, then 10 ms only if real phone stress checks remain clean. A
40→20 ms change removes approximately 20 ms of deliberately scheduled cushion,
not the entire 112 ms observed after first phone PCM. It cannot fix 77–132 ms
near-misses or a seconds-long provider wait by itself.

Select the minimum proven buffer for each tested delivery profile, not the
minimum that passes one warm trial. Record queued audio duration and arrival
gaps. A larger buffer before a later burst cannot repair an underrun that
already occurred. Maintain conservative interruption and underrun reporting.

### 5.2 Leading silence: inspect before trimming

The real short setup clip measured 43.49 ms to the existing amplitude threshold.
The player currently schedules that silence normally. Investigate trimming only
verified initial silence, using a conservative bounded detector and preserving
a small guard. An amplitude threshold of 164 is an onset estimate, not proof
that everything preceding it is disposable; soft consonants may begin earlier.

Use offline fixture audio and listening first. If safe, stream the shortened
prefix without waiting for the entire sentence; record original silence,
removed frames and residual silence. Validate names, numbers, first consonants,
Tamil/Tanglish quality separately. Preserve internal pauses and sentence tails.
This changes the actual audio and needs a new candidate plus fresh onset
verification; changing only the reported timestamp is not an optimization.

### 5.3 Keep current good choices; measure the hardware floor

The page already starts `playClip` before `setSentence`, retains one AudioContext
and requests the interactive latency hint. Unlock happens from the user gesture
before preparation. Do not add a React render, effect, timer or animation-frame
gate before fetch or scheduling. Batch visual/report work after scheduling and
avoid repeated full report serialization inside the PCM loop.

Record actual context sample rate, base/output latency, output timestamp
availability and state transitions. Our AudioBufferSource nodes already resample
22.05 kHz buffers to the device context rate. Forcing the AudioContext to 16 or
22.05 kHz is not a substitute for correctly handling the actual output device.
Built-in speaker, Bluetooth and OS routing have different floors; annotate them
without requiring new devices or redefining the agreed phone/network slices.

The current fallback chooses `outputLatency || baseLatency`; the Web Audio
specification defines different stages for those properties. Calibrate that
fallback, record which estimator was used, and avoid adding latency twice when
`getOutputTimestamp` already maps the output clock. Capture onset information
near first output rather than relying solely on a mapping sampled at completion.
Correcting an estimator can increase or decrease a reported number; it is not
proof that physical playback became faster. [Web Audio timing definitions](https://webaudio.github.io/web-audio-api/#dom-audiocontext-getoutputtimestamp).

### 5.4 AudioWorklet is a conditional reliability upgrade

Currently every network fragment becomes an AudioBuffer/source on the main
thread. The public-path free diagnostic arrived in 42 fragments, including odd
byte lengths; network fragment boundaries are not audio-frame boundaries.
The code already carries split samples and schedules sources on one audio clock.

If long-task or node-allocation traces show missed scheduling, trial a persistent
AudioWorklet with a bounded ring buffer, explicit sample-rate conversion,
generation invalidation and measured underflow reporting. Preload its module
before a measured turn. Start with transferable buffers and MessagePort; a
SharedArrayBuffer design adds cross-origin-isolation deployment work. Do not
introduce WASM or a worklet merely to replace a tiny PCM conversion loop.

A worklet helps scheduling under UI load; it cannot make provider bytes arrive
earlier. Twenty current benchmark completions report no underruns, so this is
not the first refactor. [Chrome's worklet/ring-buffer design](https://developer.chrome.com/blog/audio-worklet-design-pattern).

## 6. Payload, streaming and intermediary behavior

| Candidate | Calculated payload effect | Main decision |
| --- | --- | --- |
| 22.05 kHz mono PCM16, current | 44,100 bytes/second | Keep as controlled baseline |
| 16 kHz mono PCM16 | 32,000 bytes/second; 27.4% smaller | First encoding/rate experiment if transfer is material |
| `linear16` instead of WAV, same rate | Approximately one WAV header saved | Simplifies framing; not a substantial bandwidth win |
| MP3 at 64 kbit/s | Nominally 8,000 bytes/second, approximately 5.5× smaller | Test encoder/decoder/startup delay and phone compatibility |
| 48 kHz PCM to match some devices | 96,000 bytes/second | Avoid increasing transport load just to remove browser resampling |

The HTTP stream reference documents rate, codec, bitrate and caching fields.
There is no documented `min_buffer_size`/`max_chunk_length` knob in that HTTP
request schema. Keep parameters explicit and provider benchmark caching disabled.
Do not assume smaller output guarantees faster first generation: chunk emission
may depend on frames, text segmentation or buffered bytes. Measure the first
provider chunk's byte count and audio duration for every candidate.
[HTTP reference](https://docs.sarvam.ai/api-reference/text-to-speech/convert-stream),
[sample-rate guide](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/how-to/set-the-sample-rate).

MP3 is not a field-only change in our current player. Fetch chunks cannot be
passed individually to file-oriented `decodeAudioData`. A media-element route
needs its own calibrated onset and progressive Safari range behavior: our
current range handler intentionally waits for `spool.done`, which would undo
startup streaming if copied into a live MP3 media path. A streaming decoder also
needs feature checks and codec-delay handling. Keep one reservation/synthesis
across all range and replay requests. MP3 is consequently later than 16 kHz PCM.

Next.js 16.3.8's installed stream writer flushes headers at its first write,
flushes compression where present, and handles drain/backpressure. The installed
compression filter respects `no-transform`; our audio responses already send it.
The deployed free-tone check delivered a prefix approximately 500 ms before
EOF. These facts argue against a blanket framework/compression rewrite.
Still record actual `Content-Encoding`, headers-to-first-body delay, protocol
and first-fragment sizes in the public path. Do not disable site-wide
compression, add nginx flush settings on a service that has no nginx, or send
fake/padded audio to force a threshold. [Next compression behavior](https://nextjs.org/docs/app/api-reference/config/next-config-js/compress).

## 7. Production pipeline opportunities beyond tuning a GET

These proposals improve real product latency but do not manufacture uncached
acceptance results by moving synthesis before the benchmark timer.

### 7.1 Start speech from the validated server event

The current harness returns a descriptor/sentence, then the phone makes another
GET that triggers TTS. In a real voice turn, the server already knows when the
sentence has passed grounding and when a command has committed. It could start
authorized, budget-reserved TTS then, while delivering the validated sentence
and `speech.ready` event. The GET would join the active spool rather than trigger
synthesis. This overlaps provider startup with sentence delivery and removes a
causal dependency on the second request reaching the server.

Only use this for an active speaking session whose reply mode permits speech;
typed/text-only replies must not incur speculative synthesis. Cancellation,
visibility, unused speech and crash uncertainty need explicit lifecycle states.
Sentence validation and write success still precede any spoken confirmation.
Measure server-validation-to-audible and release-to-reply alongside the agreed
phone-boundary metric. The spike benchmark still starts each fresh synthesis
after its timer, so its results remain comparable.

This is a proposed amendment to production on-demand synthesis in
[Architecture §14.4](../core/02-architecture.md#144-tts-and-speech-lifecycle), requiring
an ADR before adoption; it is not implemented by this plan.

### 7.2 One reply channel, if traces justify it

If the second browser request or resource competition is substantial, consider a
single authenticated binary/framed reply stream carrying validated sentence
events, ordered PCM and completion/error frames, or an existing active app
WebSocket. Plain SSE is text; base64-encoding all audio increases byte count by
roughly one third and should not be added casually. Any single-channel design
needs replay sequencing, cancellation, bounded buffers and sensitive member
isolation. A provider-only WebSocket is the smaller first change.

WebRTC/WebTransport can help sustained interactive media, but would introduce
session servers, capability/fallback work and a second protocol stack. Our
push-to-talk, one-sentence use case and current traces do not yet justify them.

### 7.3 Reuse known, non-personal confirmation audio

For genuine product usage, cache approved complete confirmations such as
"Your list is up to date" by voice, language, text, model, settings and version.
An explicitly managed local phrase pack can avoid network and inference for
those fixed phrases after a successful action. Do not share private sentence
audio between households or casually extend the service worker over authenticated
audio routes. The existing service worker deliberately bypasses `/api/voice`.

A short truthful fixed confirmation followed by on-screen details is another
product option; playing a filler beep/"one moment" or a cached unrelated prefix
does not satisfy the validated-reply onset metric. Concatenated recorded words
can produce poor prosody. Cached, shortened or redesigned replies need their
own quality/product evidence and never count toward uncached S4 acceptance.

## 8. What to deprioritize or treat as external

| Item | Decision and reason |
| --- | --- |
| Singapore/India hosting and unavoidable travel time | Defer region choice; measure network contribution without claiming all mixed remainder is geographic |
| OS/audio hardware output delay | Observe/calibrate it; JS cannot eliminate the physical output pipeline |
| Provider queue/model work after a verified warm dispatch | Cannot rewrite it locally; change transport/model/capacity only through a measured separate candidate |
| Authentication HMAC, small JSON, Zod at current ledger size | Keep checks; CPU controls show no case for weakening or replacing them |
| WAV parser, TypedArray/DataView versus another language/SDK | Lower priority; not a hundreds-of-milliseconds CPU cost in local controls |
| LLM prompts, STT, embeddings and UI page bundle size | Relevant to release-to-reply or app launch, not this already available sentence's measured path |
| Finished-file fsync and metadata GET | Already after onset; retain durability and diagnostics |
| More provider concurrency, automatic retry or hedged duplicate calls | Adds cost/rate pressure; cannot erase failures or uncertain billed attempts |
| Increasing speaking pace or deleting difficult fixtures | Changes quality/corpus and does not establish faster startup for the accepted candidate |
| New audio microservice or agent framework | Extra hops and operational work without trace evidence |

The zero-billing [local CPU control](../../spikes/s1/evals/results/s4-local-cpu-control-2026-10-09.json)
used the real v2 parser/spool and ledger validator with synthetic data. After
40 warm-up iterations, 200 samples gave these p50/p95 values: whole 109,132-byte
parse/spool/copy 0.309/0.630 ms; whole-clip PCM-to-Float32 conversion
0.063/0.079 ms; 70-entry JSON/Zod validation 0.088/0.218 ms; maximum supported
1,000-entry validation 1.076/2.294 ms; two small HMACs 0.008/0.013 ms. These are
local desktop Node CPU diagnostics, not phone rendering, Railway filesystem or
expected savings. They exclude disk and AudioBuffer/source creation.

Bulbul v4 Flash remains an option if an optimized warm v3 path cannot provide
enough margin. It has a different persona catalogue; the wife's v3 Ritu choice
does not automatically transfer. Recheck language/voice quality, account access
and the billing bound before a paid comparison. The reviewed public price table
lists v3 but does not establish a v4 Flash rate. Dedicated inference/capacity is
an escalation if provider traces show persistent overload; increasing app CPU
does not speed a remote model. No numerical latency guarantee or budget-feasible
dedicated deployment is established here.
[Flash guide](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/best-practice-guide-for-bulbul-v-4-flash),
[current pricing](https://docs.sarvam.ai/api/getting-started/pricing).

## 9. First implementation batch and decision gates

| Order | Deliverable | Implement in | Proceed when |
| --- | --- | --- | --- |
| A | Content-free timing and cold/warm controls, audio unchanged | Voice routes, service, adapter, player, report | Traces explain both large-delay patterns without shifting the timer |
| B | Coordinator, fewer descriptor/cache/directory reads | Voice service plus focused attempt module | Cancellation, restart, replay and cap tests retain their guarantees; server pre-dispatch/forwarding waits improve |
| C | Provider pool/idle-lifetime experiment | Sarvam transport module | Socket evidence confirms churn; peer limits honored; isolated dispatch does not regress other APIs |
| D | 20 ms startup candidate; silence trimming only after offline quality proof | Player and rate/quality fixtures | Physical phones retain onset, first consonants, tail and zero underflows under tested load |
| E | 16 kHz PCM or provider WebSocket, selected from A–D evidence | Versioned adapter/config | Transfer or warm-provider interval is still dominant; actual format and lifecycle verified |
| F | Fresh four-slice acceptance on one frozen winner | Report/phone harness | Exploratory results have margin and the live cumulative ledger covers all required trials |

Implement A first and establish a complete trace before claiming B–D savings.
Land small changes with one review covering races, paid idempotence, reporting
and compatibility. The first optimized candidate should remain HTTP/Ritu/PCM
at the current rate. Add an explicit config/profile fingerprint, trace schema
version and new audio candidate version for behavioral changes; retain all v1
and v2 evidence separately. Do not expose arbitrary provider knobs through the
owner UI or allow client text to select an unreviewed payload.

**Telemetry contract:** use `performance.now()` on each host and the existing
attempt ID. Timestamp route entry before cookies/auth, auth completion,
descriptor lookup, queue admission, lock acquisition, reservation completion,
provider dispatch, headers, first raw body, first validated PCM, response
creation, provider EOF and completed persistence. Export durations relative to
that server request; response creation is not proof of wire delivery.

On the phone, capture sentence arrival, fetch invocation, response headers,
first body, PCM conversion/scheduling duration, scheduled start, first non-silent
frame, actual cushion/trim, output estimator, context rate/state and completion.
Use [Resource Timing](https://www.w3.org/TR/resource-timing/) for supported
DNS/connect/TLS/request/protocol values; reused connections or unsupported
fields can be zero/absent and are not proof of zero network cost. Add a user
entered device/OS and speaker-route label, session/first-request labels and a
small arrival-gap histogram. Keep manual network selection and physical onset
verification; do not infer Wi-Fi from browser connection APIs.

Expose timing known at first response through bounded
[Server-Timing](https://www.w3.org/TR/server-timing/) fields. Deliver final
timing through the existing authenticated completion metadata or a content-free
trace read that also supports owner-visible failed/cancelled attempts; reads
never dispatch synthesis. Retain errors and partial telemetry when EOF is absent.
Buffer telemetry and persist it after onset, with bounded non-blocking collection.
Browser capability absence and estimator correction must be explicit, not a
zero or discarded sample. Failed/cancelled traces cannot silently join success
percentiles.

**Zero-billing controls before paid comparison:** delayed synthetic PCM through
the same public path at realistic fragment sizes; immediate and delayed chunks;
odd/split samples; 10/20/40 ms cushions; main-thread busy periods; app switch,
Stop/restart and invalidation; 1/3/6/15/30-second idle gaps against a local fake
provider; two simultaneous readers/phones; maximum queue and cap; process restart
after reservation and before/after first bytes. Render and capture observations
on both real installed phones; desktop layout is not physical phone acceptance.

**Promotion evidence:** first bytes demonstrably precede upstream completion;
no disk operation blocks first-PCM forwarding after initial attempt validation;
any remaining pre-dispatch wait is attributed; no duplicate synthesis;
no late playback or truncated first/last phoneme; no underflow in synthetic
jitter/load controls; ledger uncertainty survives restart; physical onset
estimator checked on both phones. Compare changes on the same fixtures/device
conditions with first/cold requests retained. A few good samples select a
candidate; they do not establish p95.

If verified warm provider response waits remain seconds long, stop app-side
micro-tuning as a p95 remedy and use the provider request IDs/elapsed trace for
an escalation or separately funded model experiment. Do not claim the target
passed by moving to a cached path, retrying a slow request or shrinking a timeout.

## 10. Budget and acceptance constraints

The last owner snapshot reserves ₹11.5596 of the original ₹50; ₹38.4404 remains.
Read the durable ledger again before any future call. A complete fresh v3
200-trial corpus reserves ₹32.832. Protect that allowance while screening ideas.

Proposed first paid experiment allowance: **at most ₹2**, within the same cap,
after zero-billing controls. Four three-sentence bundles (instrumented baseline
and one optimized candidate on the two Android networks) reserve ₹1.6704; two
optional short capability probes add ₹0.1728, totalling ₹1.8432. This would leave
₹36.5972 and, after a fresh 200-trial run, ₹3.7652 at the supplied snapshot.
These are planning bounds, not authorization to exceed the existing cap or
actual invoices. Provider/model price changes need a reverified bound.

Use the free controls on iPhone before selecting a player; later exploratory
phone/quality calls draw from the same remaining allowance. If another candidate
needs more paid evidence, revise the experiment count rather than funding many
full benchmarks. Keep smoke/exploratory purposes out of acceptance statistics.

Final acceptance stays 50 or more unique uncached successes per installed
iPhone/Android × Wi-Fi/mobile slice, required fixture coverage, zero failed
attempts, reverified audible onset and p95 ≤700 ms. Preserve manual Stops and
provider outliers. Region migration, cached production phrases and redesigned
reply channels receive separate measurements. S-VGW and Phase 2 authorization
remain independent gates.

## 11. Validation of this plan

This analysis reviewed the actual pinned source, installed Next.js route/stream
and compression implementation, current primary Sarvam/Node/Undici/browser
documentation and the owner-derived timing artifacts. The CPU controls use
synthetic input and touch no live budget or credentials. No paid request was
made. Documentation links, derived timing values and artifact formatting were
checked. Runtime implementation, deployment and the eventual phone target are
future work; the current deployed candidate remains v2.
