# S4 v4 Android and iPhone results — October 9, 2026

**Status: partial phone evidence reviewed. The connection experiment works in
these traces; S4 remains unaccepted. The focused lock-file change is now
implemented, reviewed, validated and deployed as v5. The subsequent eight v5
Wi-Fi smoke replies completed without underruns; three exceeded 700 ms and need
more precise client timing. Offline prefix listening
controls are ready; Bulbul v4 Flash remains a separate feasibility candidate.**

**Latest implementation:** v6 browser/audio diagnostics and free-only report
downloads are reviewed, validated with 311 tests and deployed. The final section
records live controls and the small phone test sequence. The October 10 review
below isolates an iPhone pre-request delay and Android cold-network costs;
p95 acceptance is pending.

The analysis below preserves the `s4-bulbul-v3-stream-4` results. The
[v4 implementation and deployment record](24-s4-v4-connection-and-ledger-validation.md)
is the baseline; the later v5 implementation and test handoff are recorded at
the end. No paid synthesis or budget reset occurred in either increment.

## Evidence and owner confirmations

The Android export is dated 10:56:52 UTC and the iPhone export 11:01:39 UTC.
Both use Ritu, the frozen Bulbul v3 settings, 22,050 Hz WAV-to-PCM transport,
20 ms startup and the installed app. The phone/OS/output notes are empty.
The original exports remain byte-for-byte in ignored
`spikes/s1/validation-results/s4/v4/`; original SHA-256 fingerprints are in the
[computed stage analysis](../../../spikes/s1/evals/results/s4-stream-v4-phone-analysis-2026-10-09.json).
That content-free artifact also records the clip controls and confirmations.

The owner confirmed all three cancellations were manual Stops and the Android
Wi-Fi interruption occurred when the phone locked. These are explained user
actions, rather than evidence of spontaneous playback failures. The source
exports have `audibleOnsetVerified: false`; the owner subsequently confirmed
checking displayed timing against audible startup on both phones. The
[merged report](../../../spikes/s1/evals/results/s4-stream-v4-merged-report-2026-10-09.json)
uses the reporting CLI's explicit audible-verification flag to record that
confirmation. Source checkboxes, trial states and timings are unchanged.

## Results

There are 55 unique uncached rows: six smokes and 49 benchmarks. Of the
benchmarks, 45 completed and **43 of 45 were at or below 700 ms**. All rows
report zero underruns. Four smokes are Android Wi-Fi and two are iPhone Wi-Fi;
neither report contains a mobile smoke pair.

| Phone/network | Completed / attempted benchmarks | p50 | p95 | Completed ≤700 ms |
| --- | ---: | ---: | ---: | ---: |
| Android Wi-Fi | 12 / 13 | 572 ms | 691 ms | 12 / 12 |
| Android mobile | 9 / 10 | 550 ms | 1,197 ms | 8 / 9 |
| iPhone Wi-Fi | 9 / 10 | 499 ms | 625 ms | 9 / 9 |
| iPhone mobile | 15 / 16 | 546 ms | 762 ms | 14 / 15 |

These are nearest-rank percentiles of completed eligible benchmarks. With
9–15 completions, p95 is the observed maximum. Neither Wi-Fi result establishes
the required 50-trial p95. Each slice has a retained cancellation/interruption
and only one or two attempts per fixture, below the five-per-fixture gate.
User-initiated rows remain in the existing zero-failed-attempt acceptance rule;
they are not silently deleted or converted into successes. A future report
batch design must preserve every attempt inside its declared batch, including
manual Stops, rather than selecting only favorable rows.

The prior v3 Android p95 values were 760/772 ms, but changed sample sizes and
sequential runs prevent attributing the entire difference to the pool change.
The connection-specific evidence below provides the stronger finding.

## Connection result

Of 54 rows with provider traces, 52 reused a socket and two opened a new one.
The second sentences of the pause checks reused sockets after actual idle gaps
of **7.73–7.92 seconds**. Other smoke rows also reused sockets after 7.40–8.30
seconds. The six-second UI pause follows playback, so it is shorter than the
provider's idle interval.

Every available trace reports an effective 15-second client idle policy, no
numeric server keep-alive hint and no explicit server-close instruction.
Previous origin disconnects are classified `local-idle-timeout`; an origin
event does not identify the socket used by the following request. Cold requests
occurred after origin completion gaps of 28.41 and 37.97 seconds, with socket
assignment taking 123.28 and 142.25 ms. The Android cold smoke measured 781 ms;
the iPhone cold mobile benchmark still measured 664 ms. Warm reuse therefore
removes an avoidable cost but does not guarantee the overall target.

Keep the current bounded pool. Increasing lifetime indefinitely or generating
paid keep-warm speech is not justified by these reports. Cold first replies
remain a separate measured condition, not excluded from the product clock.

## Section-by-section decisions

Stage percentiles are independent; do not add their p50/p95 values to reconstruct
end-to-end percentiles. The artifact contains the four full stage distributions.

| Section | Measured finding | Decision |
| --- | --- | --- |
| Auth/descriptor lookup | Across traced rows, auth ≤2.71 ms; descriptor lookup ≤0.057 ms | Keep the existing checks and shared index |
| In-process queue | Maximum recorded wait 2.10 ms | No new queue architecture justified |
| Durable ledger | Completed-slice medians 31–53 ms; one transaction 174 ms | Review the specific flush below; retain durable reservations |
| Provider connection | 52/54 reused; two cold assignments 123–142 ms | Retain v4 pool; avoid another transport change in the same experiment |
| Raw stream/parser | 53 first-body observations contain exactly the 44-byte WAV header and zero PCM; first-PCM decoder CPU ≤0.81 ms | Header-to-PCM wait is chiefly delivery/provider framing, not decoder computation |
| Decoder total | Maximum CPU across traced rows 1.72 ms | A parser/library rewrite has little measured upside |
| Frontend conversion | Completed-benchmark maximum per-chunk work ≤7.5 ms; no underruns | Keep progressive playback and the 20 ms cushion |
| Phone output | Prefix-excluded p50 ≈47 ms Android, ≈16 ms iPhone | Preserve per-device measurement; do not promise one universal hardware latency |
| Generated prefix | Android date 599 ms, iPhone short 278 ms to amplitude threshold | Investigate existing audio offline before removing quiet samples |
| Geography/transit | Mixed delivery-remainder medians 129–167 ms | Defer hosting migration; this remainder is not pure network RTT |

The mixed remainder is `phoneFirstPcm - clientFetchStart - serverResponseReady`.
It combines inbound travel, pre-route infrastructure, return travel and reader
delivery; it uses elapsed durations rather than comparing unsynchronized wall
clocks. The raw-header-to-PCM slice medians are 163–167 ms, much larger than
measured parser CPU. Browser resource traces report h2 on Android and h3 on
iPhone, while provider sockets use H1; these are different network legs.

iPhone contexts report 16 kHz and Android 48 kHz; the source remains 22,050 Hz.
The player already uses native AudioBuffer resampling. These observations do
not establish a resampling defect or justify changing the provider rate.
Output timestamps estimate device rendering time; the owner's subsequent
confirmation supplies the human observation. The estimate is not an independent
microphone measurement. [Web Audio output timestamp contract](https://www.w3.org/TR/webaudio/#dom-audiocontext-getoutputtimestamp).

## Two mobile outliers: existing audio inspected without synthesis

Authenticated metadata reads confirmed both clips were complete. Their existing
PCM was replayed, saved outside the repository and checked against the persisted
byte count/SHA-256. The budget read before and after remained ₹27.288.

| Clip | Phone first PCM | Prefix to threshold 164 | Reported onset | Exactly-zero initial prefix |
| --- | ---: | ---: | ---: | ---: |
| Android mobile date | 550 ms | 599 ms | 1,197 ms | 153 ms |
| iPhone mobile short | 468 ms | 278 ms | 762 ms | 89 ms |

The Android clip has quiet nonzero samples between its initial zeros and the
threshold crossing. The first amplitude-64 sample occurs at 306 ms, and there
is an internal zero interval around 500 ms. The iPhone clip similarly contains
quiet nonzero samples before strong speech. An amplitude threshold is not proof
that everything before it is disposable silence. Never remove internal pauses.

An idealized exact-zero-only trim retaining a 20 ms guard could remove at most
133 ms from the Android clip and 69 ms from the iPhone clip. Holding other timing
constant would give approximately **1,064 ms** and **692 ms** respectively.
These are arithmetic hypotheses, not replayed or accepted results. Exact-zero
trimming alone does not solve the Android tail. Sarvam's current HTTP streaming
schema does not document an initial-silence control; settings/model changes must
be evaluated as separate voice-quality experiments. [Sarvam REST stream schema](https://docs.sarvam.ai/api-reference/text-to-speech/convert-stream).

## Focused next plan

1. **Review S4's temporary lock-file flush first.** The Android mobile clarify
   transaction took 174.37 ms; `lock.sync()` accounted for 145.98 ms, while its
   durable reservation save took 20.45 ms. The current PID/timestamp lock contents
   are diagnostic; repository code does not read them to authorize spending or
   automatically reclaim a stale lock. The hypothesis is that S4 can retain
   exclusive `open('wx')` creation and fail-closed stale-lock behavior without
   flushing these diagnostic contents before every request. Keep the Gateway
   canary's behavior unchanged. This is a design inference, not a proven safety
   claim or implemented change. Node distinguishes file flushing from exclusive
   creation. [Node 24 sync](https://nodejs.org/docs/latest-v24.x/api/fs.html#filehandlesync)
   and [open flags](https://nodejs.org/docs/latest-v24.x/api/fs.html#file-system-flags).
2. **Prove spending durability before a new runtime candidate.** Exercise
   cross-process exclusivity, lock/write failures, missing/invalid ledgers,
   duplicate IDs, cap exhaustion, process termination around reservation
   save/dispatch and uncertain prior attempts. Preserve reservation file sync,
   atomic rename and directory sync before provider access. Do not remove the
   52–58 ms reservation file-sync tails also observed on iPhone; those are a
   different operation protecting the spending record. Offline fault injection
   and ordering checks support, but do not replace, a crash-durability review.
3. **Investigate prefix quality using the saved clips.** Compare original
   playback with a bounded exact-zero-only variant and inspect quiet first
   phonemes. Preserve a guard, strict maximum removal, fail-open unmodified
   output and byte-identical samples after the prefix if a variant proceeds.
   Keep original/removed/residual frame counts and freeze a new version.
   Any treatment of nonzero quiet samples requires listening and physical onset
   checks on both phones; changing threshold 164 solely to lower the report is
   not a latency optimization. The Android tail may require a provider-side
   quality investigation with the existing request ID and clip, not more local
   frontend rewriting. No provider message was sent during this review.
4. **Evaluate the newly documented low-latency model separately.** Sarvam's
   current model guide recommends `bulbul:v4-flash` for new integrations, and
   its best-practice guide describes it as the interactive low-latency tier.
   It supports the existing HTTP streaming endpoint; a transport rewrite is
   not a prerequisite. This is a potentially more relevant provider experiment
   than further parser optimization, not a measured speedup for our phones.
   [Current model guide](https://docs.sarvam.ai/api/getting-started/models/bulbul)
   and [Flash best practices](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/best-practice-guide-for-bulbul-v-4-flash).
   The persona catalog differs from v3; `ritu` cannot be assumed to be a valid
   unchanged speaker selection. Review en-IN/Tamil suitability, current billing
   and adapter parameter compatibility before a bounded comparison; wife voice
   approval and a new version are required if a different persona proceeds.
   [Current voice catalog](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/voices).
   The guide and endpoint schema disagree on some supported controls, so do not
   add pitch/loudness or alter preprocessing on assumption. No Flash synthesis
   or additional allowance was used in this review.
   The [current pricing table](https://docs.sarvam.ai/api/getting-started/pricing)
   lists v3 at ₹30 per 10,000 characters but does not separately list Flash.
   Verify its actual rate before enabling paid access; do not reuse the v3
   reservation formula for a model with unverified billing.
5. **Keep other variables fixed and use free/offline checks first.** No buffer
   reduction, AudioWorklet rewrite, codec switch, WebSocket migration, repeated
   paid smoke or hosting change is justified as the immediate next batch.
   Benchmark batch isolation is a reporting improvement to design separately;
   it must not hide failures or retroactively redefine these runs.
6. **Reconcile funding before fresh acceptance trials.** Refresh the live
   ledger and calculate the exact planned allowance before dispatch. Keep the
   cumulative cap intact. If a larger allowance is needed, present a concrete
   bounded run and cap change for owner authorization rather than resetting
   retained reservations. After a reviewed new candidate, run only the agreed
   small phone check before attempting complete acceptance.

The lock change can remove the measured 146 ms flush in an analogous request,
but that particular trial already completed at 622 ms. It is a reliability
margin improvement, not evidence that it resolves the separate 1,197 ms prefix
outlier. Neither proposed change guarantees the final p95.

## Budget and validation

The authenticated live ledger is **₹27.288 / ₹50**, leaving **₹22.712**. A
fresh 200-trial run's conservative maximum is **₹32.832**, a **₹10.12 shortfall**
before additional diagnostics. Hold further full paid benchmarks at this cap.
Do not assume past manual Stops can release already-dispatched reservations.
Snapshot differences also include activity outside these two reports and cannot
attribute all account spend to the 55 exported rows.

The actual offline CLI accepted both original exports and exactly matched all
four timing/attempt summaries, recording the owner's audible confirmation.
Its exit code 1 correctly signals failed/incomplete acceptance, rather than a
parser refusal. Source hashes, unique IDs, fixture coverage, trace policy,
waveform threshold marks and unchanged replay budget were independently checked.
Focused report regression and evidence formatting checks validate this analysis;
the runtime at analysis time remained the previously deployed v4 candidate.
S-VGW remains an independent prerequisite for the first family LLM call in Phase 2.

## V5 implementation, validation and phone handoff

The owner requested proceeding with the focused plan. Version
`s4-bulbul-v3-stream-5`, profile `http-pcm-pool15s-diagnostic-lock-20ms`, is now
deployed at [staging voice testing](https://staging.nilumi.in/voice).
Railway deployment `cc893a09-b614-489b-a7e6-9363b7dca082` reached **SUCCESS**;
authenticated checks completed at 11:36:54 UTC. The existing service, volume,
configuration and cumulative ₹50 cap are retained. No changes were committed
or pushed. [Deployment evidence](../../../spikes/s1/evals/results/s4-stream-v5-deployed-check-2026-10-09.json).

### What changed and why

[S4 ledger transactions](../../../spikes/s1/lib/verification/ledger.ts) still acquire an
exclusive `wx` lock and write diagnostic PID/time metadata. Only S4 skips
`lock.sync()`; Gateway canary transactions retain it. Lock contents are not
used to authorize a writer or reclaim a lock. A leftover lock still fails
closed until an operator verifies no writer remains. Metadata may be incomplete
after a crash; that does not authorize reclaiming it.

The reservation save still flushes its file, atomically renames it, and flushes
the parent directory before provider dispatch. Missing/invalid ledgers, replay
and cap failures continue to block. A directory-sync failure can already expose
the replacement reservation, so that reservation remains charged/uncertain;
the same ID cannot dispatch later. Tests distinguish this case from a known
failure before reservation commit/provider access.

Optional traces now record `ledgerStages.lockDurability: "diagnostic-only"` for
S4; `lockSyncMs` is absent rather than invented as a zero-duration measurement.
Canary traces record `"flushed"`. New versioned storage separates v5 phone
results and accepts saved voice selections from versions 1–4. The new migration
test verifies the immediately previous v4 selection with its retained budget.

Playback, original audio, provider payload/settings, 20 ms cushion, bounded
pool and Gateway dispatch sources are unchanged from v4. Removing the redundant
diagnostic flush targets that measured delay only; no measured v5 phone speedup
or final acceptance is claimed.

### Review and checks

All **301 tests**, lint, type-check and the production build passed. Nine new
[ledger controls](../../../spikes/s1/tests/verification-ledger.test.mjs) exercise real
FileHandle operations: S4's file/directory flush ordering before fake dispatch,
the unchanged canary lock flush, lock-write/file-sync/directory-sync failures
with zero actual speech-adapter calls, cross-process exclusion with empty lock
contents, process termination before save/after save/after fake dispatch, and
missing/malformed ledgers. Committed crash reservations still reject replay and
overspend after deliberate recovery of the isolated test lock. These are process
and fault-injection controls, not a physical power-loss test.

The source archive contains 144 files and excludes credentials, private audio,
phone exports, dependencies and generated builds. Fingerprints match the reviewed
sources. Built client assets exclude server credential/pool/lock-policy markers.
The live UI reports v5 and saved Ritu; the free tone plays successfully.
Preparing without speech returns 200; pre-synthesis metadata/trace return 409,
HEAD 405, revocation 200, and a revoked read 404. Anonymous budget/diagnostic reads
return 401; extra-field preparation returns 400. No paid audio endpoint was
opened. The live ledger remained **₹27.288** before and after these checks.

### Free prefix listening controls

The [offline builder](../../../spikes/s1/scripts/voice-prefix-controls.py) verifies the
two existing clip fingerprints, emits original/control WAV files and a portable
`listen.html` with all four audio players embedded. Controls remove only initial
exact zeros, retain at least 20 ms and remove at most 120 ms. All subsequent PCM
is byte-identical. Android removes 120 ms; iPhone removes 69.25 ms. The
[content-free control record](../../../spikes/s1/evals/results/s4-offline-prefix-controls-2026-10-09.json)
preserves frame counts and fingerprints. Raw WAV/HTML remain under ignored
`validation-results/s4/prefix-controls/`.

The native preview decoded all four embedded WAV files with expected durations
and no external resource entries recorded by resource timing. The temporary
local server was stopped after verification. Download/open the self-contained
HTML on each phone and compare the first sounds at the same output/volume.
Report a clipped consonant, click, changed first word or unnatural start, plus
which version sounds better. These controls have not changed runtime playback
and are not phone latency trials. Quiet nonzero samples require further listening
before any broader treatment; exact-zero removal still cannot solve the Android
tail alone.

Flash feasibility review found model-specific persona IDs and inconsistent
parameter guidance; the official pricing table and public TTS page still identify
v3 pricing without an explicit Flash rate. No Flash adapter or paid model switch
was enabled. Its actual rate and wife-approved persona must be established
before a separately funded comparison.

### Exactly what to test now

1. Reload online in each installed phone app. Confirm
   `s4-bulbul-v3-stream-5` and selected Ritu. Add phone/OS/audio-output notes.
2. Run **Play free audio check** first. Use that free check for Stop/phone-lock
   recovery testing, separately from paid latency trials.
3. On each phone/network combination, run **Check 2 sentences with a pause**
   once only. Allow approximately 20 seconds of speech inactivity before each
   pair, keep the phone unlocked in the foreground, and let both sentences and
   the six-second pause finish. Do not tap Stop during these checks.
4. Recheck audible onset for v5, mark the verification checkbox after observing
   both phones, and download each phone's JSON after Wi-Fi and mobile data.
   Expect four smoke rows per phone; smoke rows do not populate benchmark p95.
5. Compare the saved offline original/control audio on both phones, without
   making additional speech requests, and share the listening observations.

**Do not press Run 50 uncached trials yet.** Four two-sentence checks reserve
at most ₹0.936, leaving **₹21.776** from the checked balance. A fresh complete
200-trial benchmark still does not fit the current cap. Review the v5 lock-policy
trace, retained file/directory sync, socket reuse, prefix timing and underruns
before allocating another paid batch. No paid agent calls were made.

## V5 Wi-Fi smoke results — owner exports at 12:00–12:01 UTC

The owner supplied four Android and four iPhone smoke rows using v5, Ritu,
standalone playback and audible-onset verification. Both pairs on each phone
were on Wi-Fi; the owner explicitly confirmed the labels are correct and
reported no phone lock, app switch or notification during the slower replies.
Device/OS notes are empty and the audio output remains unspecified. These
reports do not supply mobile-data coverage or offline prefix listening approval.

The [selected-field analysis](../../../spikes/s1/evals/results/s4-stream-v5-wifi-smoke-analysis-2026-10-09.json)
preserves the eight IDs, source export times, numeric trace fields and derived
remainders. It is an extraction from the pasted reports, not a byte-identical
original export; no original-file fingerprint is claimed.

| Phone | First pair: short / shopping | Second pair: short / shopping | ≤700 ms | Playback |
| --- | ---: | ---: | ---: | --- |
| Android Wi-Fi | 565 / 525 ms | 910 / 575 ms | 3 / 4 | All completed, no underruns |
| iPhone Wi-Fi | 739 / 586 ms | 1,188 / 551 ms | 2 / 4 | All completed, no underruns |

Every row is `purpose: "smoke"`, so all benchmark attempt counts correctly remain
zero. Four smoke observations per phone do not establish a benchmark p95.
The reports are useful diagnostic evidence, while S4 remains unaccepted.

### What the traces establish

All eight server traces report `lockDurability: "diagnostic-only"`, omit
`lockSyncMs` and retain a file sync plus a directory sync before dispatch.
Ledger transactions range from **15.41 to 41.96 ms**. Auth is at most 0.49 ms,
descriptor lookup at most 0.014 ms and queue wait at most 0.0039 ms. The
deployed lock policy is working. These sequential, small samples do not prove
an end-to-end speedup attributable to that policy.

Six provider requests reused sockets. All four shopping replies reused sockets
after approximately 7.64–8.01 seconds of idle time and met 700 ms. The two cold
short replies opened sockets after roughly 69 and 88 seconds since previous
provider completion. Socket assignment took **210.04 ms on iPhone** and
**131.54 ms on Android**, compared with 0.94–3.95 ms on reused connections.
Cold connection cost contributes to the tails, but is not their only source.
Cold first replies remain inside the product clock.

All initial provider bodies contained only the 44-byte WAV header. The wait
from that header to first PCM ranged from **155.94 to 223.10 ms**; first-PCM
decoder work remained **0.061–0.495 ms**. Frontend per-chunk work was at most
2.40 ms and total conversion work at most 7.10 ms. A decoder/library rewrite
does not address the measured hundreds of milliseconds.

### Distinguishing the three slow replies

The following decomposition uses elapsed durations and preserves the full
sentence-to-audible metric. Server-ready includes reservation and provider
work. The mixed remainder is phone first-chunk minus client fetch-start minus
server-ready; it includes travel, infrastructure and client delivery. It is
not pure network RTT. The post-chunk remainder subtracts the recorded prefix
from audible-onset minus first-chunk; it includes scheduling, output-clock
mapping and any unmeasured delay. Rounded values do not sum exactly.

| Reply | Server ready | Mixed delivery | Recorded prefix | Post-chunk remainder | Audible onset |
| --- | ---: | ---: | ---: | ---: | ---: |
| iPhone first short, cold | 558 ms | 128 ms | 33 ms | 20 ms | 739 ms |
| iPhone second short, reused | 261 ms | 866 ms | 40 ms | 21 ms | 1,188 ms |
| Android second short, cold | 478 ms | 189 ms | 32 ms | 209 ms | 910 ms |

The iPhone second short reply has a particularly useful discrepancy:
JavaScript resumed after `fetch()` at **1,127 ms**, while resource timing reports
**369 ms** from network request start to response start. Client fetch-start
was zero, leaving **758 ms outside that recorded network interval**. The
current export omits the absolute request and response offsets, so it cannot
separate browser request scheduling, service-worker dispatch overhead and
delayed JavaScript resumption. This is not proof of a 758 ms main-thread task
or of a slow provider: provider first PCM was 241 ms on a reused socket.
The service worker's code does not call `respondWith()` for `/api/voice` or
speech clips, so there is no application speech-cache/proxy path to remove.
Browser overhead remains a hypothesis to measure.

On Android's second short reply, the **209 ms post-chunk remainder** is much
larger than the other Android rows' 46–47 ms. That trial's conversion CPU was
only 4 ms in total, its prefix 32 ms, and its maximum inter-chunk arrival gap
5.5 ms. The trace cannot distinguish source scheduling, device output startup
and timestamp mapping. The owner reported no external interruption; the
result must remain in the evidence rather than being explained away.

The first iPhone short reply shows the simpler cold-provider case: its recorded
prefix and post-chunk remainder are small, while socket assignment is 210 ms.
These findings favor targeted browser/audio diagnostics before another model,
buffer, codec or hosting change. The v4 prefix outliers and v5 client gaps are
different observed conditions; prefix trimming cannot fix all of them.

### Focused next increment

1. Record resource `startTime`, `fetchStart`, `workerStart`, `requestStart`,
   `responseStart` and, when available, `finalResponseHeadersStart`, all relative
   to the same trial origin as `fetch()` resumption. Preserve missing/unsupported
   distinctly from zero. This separates time before network dispatch from time
   after network response. [Resource Timing contract](https://www.w3.org/TR/resource-timing/).
2. Capture bounded first-chunk/first-source scheduling marks, AudioContext state
   and clock, the scheduled onset, and the raw output-timestamp mapping at onset
   capture. Preserve the estimator and playback behavior. These marks should
   explain the Android 209 ms remainder without assuming conversion CPU is its
   cause. Do not export audio samples or turn text in timing diagnostics.
3. Feature-detect long-task observation and retain aggregate timing/counts only;
   unsupported means unknown, not no blocking. Long Tasks surfaces tasks of at
   least 50 ms, not every source of browser delay. Avoid names/stack traces and
   continuous per-frame polling. [Long Tasks contract](https://www.w3.org/TR/longtasks/).
4. First validate these diagnostics with the existing free tone and saved clips,
   including deliberate callback delay and output-clock mapping controls.
   Keep the extra instrumentation bounded and verify that it cannot change
   synthesis, ledger charging, interruption handling or reported onset.
5. After diagnostic review, run only one two-sentence pair per phone on mobile
   data with the page explicitly set to mobile. Retain a cold first request and
   the paused reused request. Two pairs reserve at most ₹0.468. This would add
   missing smoke coverage; it would still not establish acceptance.

This section records analysis and the next implementation plan. Runtime and
deployment are unchanged; no paid synthesis was initiated by the agent.
Independent arithmetic/count checks, local documentation links, lint,
type-check, all 301 tests and the production build passed. The actual offline
reporting CLI accepts the extracted trial metadata and returns four empty,
unaccepted benchmark summaries, matching the supplied exports. Nine runtime,
configuration and dependency fingerprints still match the deployed v5 record.

### Budget reconciliation

The latest iPhone export snapshots **₹28.998 reserved of ₹50**, leaving
**₹21.002**. This is an exported balance, not a fresh live account read.
Eight short/shopping smoke rows account for at most **₹0.936** in reservations.
The increase from the prior checked ₹27.288 is ₹1.710; **₹0.774 is not explained
by these eight rows**. No report rows or charges are invented to reconcile it.
The later iPhone snapshot exceeds the Android snapshot by ₹0.468, matching its
four smoke rows. A fresh 200-trial run requires up to ₹32.832 and remains
unfunded under the current cap. Do not run another full benchmark or reset
reservations while investigating these specific delays.

## V6 browser and audio diagnostics — implementation and review

Version `s4-bulbul-v3-stream-6`, profile
`http-pcm-pool15s-client-trace-20ms`, implements the focused diagnostic plan.
Local validation and deployment are complete. Final Railway deployment
`c8391da0-e5c2-4a39-b5fc-3a24707b1f29` reached **SUCCESS** at the existing
[staging voice page](https://staging.nilumi.in/voice), with live checks completed
at **12:48:40 UTC**. The prior v6 upload was superseded after the free-only
download review fix. The service configuration, replica, region, volume and
cap remain unchanged. [Final deployment evidence](../../../spikes/s1/evals/results/s4-stream-v6-deployed-check-2026-10-09.json).

The [client timing module](../../../spikes/s1/lib/voice/client-timing.ts) records
resource start/fetch/worker/request/response offsets relative to the same trial
origin as JavaScript fetch resumption. `beforeRequestMs` measures from the
application's fetch call to network request start. `afterHeadersMs` measures
from final response headers to fetch resumption when that timestamp exists;
otherwise it uses the first response timestamp and identifies that fallback.
Missing/unsupported timestamps remain null, distinct from valid zero offsets.
Small negative differences caused by clock precision are retained, not silently
clamped to improve a result. Both clocks are local browser clocks; these marks
are never compared to the server's absolute clock.

The [PCM player](../../../spikes/s1/lib/voice/playback.ts) preserves its original
scheduling formula, threshold 164, frozen output timestamp/fallback estimator,
20 ms startup and resampling. It captures the first buffer's scheduling
performance/context clocks and frame count, the onset sample's detection and
scheduled clock, and the actual output timestamp used by the original estimator.
The exported mapping must reconstruct the same `firstAudioMs`; it does not
replace that number or assert independent physical onset calibration. Stop and
interruption retain partial audio marks for the old attempt without overwriting
a newer player generation.

Long-task capture feature-detects support, holds at most 128 numeric intervals
per attempt, drains pending entries and disconnects on every completion path.
Only counts, maximum duration and overlap aggregates through audible onset
are exported, divided before/after first PCM arrival. Names, task attribution,
URLs, stack traces and audio samples are omitted. Unsupported/failed observation
is unknown; truncated capture is explicitly marked. No extra polling timer,
per-frame observation or telemetry request is introduced. Optional observer or
resource-diagnostic failures cannot turn successful playback into failure.

The [voice page](../../../spikes/s1/app/voice/page.tsx) stores the latest ten free tone
checks in versioned phone storage and exports them in **`diagnostics`**. It uses
the selected network and actual standalone state. Paid rows remain in **`trials`**;
the acceptance CLI ignores free diagnostics, even if that array contains many
successful rows. Old v1–v5 report storage remains intact and the prior Ritu
selection remains readable with its cumulative reservations.
The live review caught the existing download button requiring paid rows even
after a free check was saved. Its enablement now accepts either free diagnostics
or paid rows, so free-only reports can actually be downloaded.

### Validation and scope

Lint, type-check, **311 tests** and the production build pass. Eight new timing
controls verify dispatch versus callback delays, final/interim response timing,
missing timestamps, unsupported/failed long-task observation, overlap clipping,
pending entry drainage, cleanup, content omission and the fixed capture bound.
An additional playback control injects optional diagnostic failures without
changing completion, bytes or onset. The v5 selection migration is covered;
progressive playback, interruptions, frozen onset and the actual offline
acceptance CLI have stronger assertions for the new fields.

Two existing synthesis-failure tests exposed cleanup racing the producer's
background atomic trace write. They now wait for the trace rename, assert its
failure outcome and absence of private provider error content, then remove their
isolated temporary directories. This fixes the test race and verifies the
intended asynchronous failure trace; production failure handling is unchanged.
The two suites also use bounded Node filesystem removal retries during isolated
fixture teardown to accommodate other background trace writes. This retries
cleanup only; no synthesis, ledger operation or primary assertion is retried.

The reviewed upload contains **125 files**, excludes all evaluation-result
exports, private recordings, ignored phone data, credentials, dependencies and
generated builds. SHA-256 comparisons show the durable ledger, Sarvam payload,
service/coordinator, provider transport, Gateway client and dependency files are
unchanged from the deployed v5 archive. Only the browser trace/storage/version,
its tests and README change. Built client chunks contain the v6 diagnostic
markers and exclude the server credential, pool and ledger-policy markers.

### Live browser and account checks

The authenticated page reports v6/profile and the retained Ritu choice. Six
free diagnostics are saved: five complete and one deliberately stopped, with
zero reported underruns. Stop followed by another tone recovers; all six checks
survive reload. These are shared desktop Chromium/Electron controls, not physical
phone observations. The network-selector control changes the exported label;
it does not turn the desktop into a mobile-data test.

A browser-only wrapper delayed free-tone fetch resumption by 200 ms; the new
`afterHeadersMs` measured **210 ms**. A separate 100 ms busy callback measured
**100.7 ms** after headers and **100 ms** of long-task overlap before first PCM.
Both completed, and all completed controls reconstruct exactly the reported
onset from the exported output timestamp. Temporary wrappers were removed.
These validate diagnostic attribution, not a reduction in real phone latency.

The live free-only download button is enabled. The actual generated download
Blob was captured through its page handler while suppressing the disk download;
it contains six `diagnostics`, zero paid `trials`, v6 diagnostic markers and
four empty acceptance summaries. The original saved representation remains in
ignored `validation-results/s4/v6/`. The actual reporting CLI parses it and
correctly exits 1 for unaccepted/incomplete evidence, rather than parser refusal.

Preparing an unused smoke descriptor returns 200; its pre-synthesis metadata
and trace return 409, HEAD 405, revocation 200 and its subsequent read 404.
Anonymous budget/diagnostic reads return 401 and extra-field preparation 400.
No unrevoked paid audio endpoint was opened. The final live balance remained
**₹28.998 reserved of ₹50**, leaving **₹21.002**, before and after the checks.
The next four pairs reserve at most ₹0.936, leaving **₹20.066**. No paid agent
dispatch, reservation release, cap increase, commit or push occurred.

### Phone handoff after live validation

1. Reload online in both installed apps. Confirm `s4-bulbul-v3-stream-6` and
   Ritu; keep the phones on their built-in speakers and note model/OS/output.
   Old report rows are preserved separately; do not re-audition the voices.
2. Set the correct current connection. Run **Play free audio check** twice on
   each network, allowing each tone to finish. Free checks now appear in the
   downloaded JSON's `diagnostics`. Download once on each phone after both
   networks, even if a free check fails; note any phone lock or external event.
3. If the tones play normally, run **Check 2 sentences with a pause** once per
   phone/network combination. Wait roughly 20 seconds without speech before
   each pair; keep the app foreground/unlocked and let the two sentences and
   pause finish. Set **Mobile data** in the page after actually switching off
   Wi-Fi. Four pairs reserve at most ₹0.936.
4. Verify audible onset again for v6, mark the checkbox after observing both
   phones, and download both complete reports. Keep deliberate Stop/lock checks
   separate and use the free tone for them. Do not run 50 paid trials yet.

These small checks establish diagnostic coverage and playback behavior, not
50-trial p95 acceptance. If an outlier repeats, use the recorded dispatch,
callback, scheduling and mapping spans to choose the next actual fix. A browser
or provider delay must not be discarded merely to make the target pass. Hosting
migration, Flash pricing/persona approval, offline prefix listening approval and
funding for a full acceptance run remain separate unresolved items. This
increment does not claim that all phone latency issues are fixed.


## V6 physical-phone results — October 10, 2026

The Android attachment supplies four smoke replies and four free diagnostics,
two of each on mobile data and Wi-Fi. The inline iPhone report supplies two
smoke replies and two free diagnostics, all **Wi-Fi**. Both exports mark
standalone mode and audible-onset verification. All twelve rows completed with
zero underruns. Device notes say Pixel 8/latest Android and iPhone 18/latest OS;
exact OS builds and audio output are unspecified. iPhone mobile v6 coverage is
missing. Every paid row is a smoke check, so benchmark counts correctly remain
zero and no p95 acceptance is established.

The [computed stage evidence](../../../spikes/s1/evals/results/s4-stream-v6-phone-analysis-2026-10-10.json)
retains twelve unique IDs and numeric diagnostics. The Android attachment is
copied byte-for-byte into ignored `validation-results/s4/v6/`, with SHA-256.
iPhone fields are an extraction from the inline report; no complete original
export or original-file fingerprint is claimed. Source timings remain unchanged.

| Phone/network | Free checks | Short reply | Shopping reply | Underruns |
| --- | ---: | ---: | ---: | ---: |
| Android mobile | 1,251 / 224 ms | 1,191 ms | 502 ms | 0 |
| Android Wi-Fi | 309 / 151 ms | 733 ms | 521 ms | 0 |
| iPhone Wi-Fi | 137 / 238 ms | 1,502 ms | 468 ms | 0 |
| iPhone mobile | Not supplied | Not supplied | Not supplied | Unknown |

Three of six speech replies met 700 ms. All short replies used cold provider
sockets; all shopping replies reused sockets. This confounds sentence and
connection state. Cold replies stay inside the metric, and fast shopping replies
cannot replace the slower rows in acceptance.

### What the new marks establish

**The slow iPhone reply is delayed before network dispatch.** Application fetch
starts at 0 ms, worker-start is 1 ms, resource start/fetch-start are 803 ms and
request-start is 806 ms. Headers arrive at 1,432 ms, and JavaScript resumes at
1,433 ms: **806 ms before request, only 1 ms after headers**. Server readiness
is 446 ms, including 126 ms cold provider socket assignment. Backend relocation
does not directly remove a pre-dispatch browser delay. This is not the delayed
JavaScript continuation that v5 diagnostics could not exclude.

The approximately 802 ms worker-to-fetch gap makes service-worker dispatch,
activation/scheduling or browser bookkeeping candidates, not proven causes.
Safari long-task observation is unsupported, which means unknown rather than
zero blocking. Our worker does not call `respondWith()` for voice APIs, but an
ordinary fetch event still needs dispatch before the browser can discover the
handler's return. The short reply followed a successful prepare request, so a
simple cold-worker-start explanation is not established either.

**The first Android mobile free check exposes connection readiness.** DNS is
796 ms and connection setup 127 ms, including 117 ms TLS; TLS is inside connect
time and must not be added twice. Before-request time is 1,008 ms. Only 23 ms of
long-task overlap occurred through onset. The next free mobile check is 224 ms
with zero DNS/connect time and no long tasks. This is separate from synthesis.
A finite readiness request can move connection setup to launch or network
change, but cannot guarantee a warm path or justify excluding cold acceptance
rows. A routine keepalive loop is not justified by these observations.

**The slow Android mobile speech has a mixed delivery residual.** Request-to-
headers is 1,099 ms versus 499 ms server readiness, leaving **600 ms** for
transport/infrastructure and any unmeasured pre-handler delay. Application-fetch
to request is 5 ms; post-header continuation is 3 ms. The entire PCM arrives
in one reader chunk, consistent with late/coalesced delivery, but the report
cannot identify a carrier, proxy, browser or another layer as its cause. The
shopping reply on that network has 32 chunks and starts in 502 ms. Rewriting
the progressive decoder is not supported by this evidence.

### Audio startup and additive decomposition

All six output mappings exactly reconstruct `firstAudioMs` from
`timestampPerformanceMs + scheduledContextMs - timestampContextMs`. The following
uses local elapsed durations, not unsynchronized absolute clocks. Network/
infrastructure residual is request-to-headers minus server readiness, not pure
RTT. Before request includes the small application interval before fetch.
Rounded values may not sum exactly.

| Reply | Before request | Server ready | Network/infrastructure residual | Headers → PCM | Prefix | Post-PCM residual | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Android mobile short | 8 ms | 499 ms | 600 ms | 9 ms | 27 ms | 48 ms | 1,191 ms |
| Android mobile shopping | 4 ms | 284 ms | 132 ms | 5 ms | 29 ms | 48 ms | 502 ms |
| Android Wi-Fi short | 4 ms | 447 ms | 193 ms | 7 ms | 42 ms | 40 ms | 733 ms |
| Android Wi-Fi shopping | 9 ms | 257 ms | 172 ms | 10 ms | 32 ms | 41 ms | 521 ms |
| iPhone Wi-Fi short | 806 ms | 446 ms | 180 ms | 2 ms | 49 ms | 19 ms | 1,502 ms |
| iPhone Wi-Fi shopping | 4 ms | 271 ms | 133 ms | 6 ms | 37 ms | 18 ms | 468 ms |

Post-PCM startup excluding prefix is 17.67–18.67 ms on iPhone and 40.48–48.36 ms
on Android. The earlier 209 ms Android remainder did not recur; this does not
prove permanent resolution. Frontend maximum chunk conversion is 4.3 ms across
these replies; a reported zero reflects timer resolution rather than zero CPU.
First-PCM decoder work is at most 0.803 ms and ledger work 21.67–29.25 ms.
Those are smaller targets than dispatch/delivery. Cold socket assignment is
121–149 ms, compared with 1.16–2.55 ms for reused requests.

### Focused next implementation

1. Add **feature-detected static network routing** for exact same-origin
   `/api/voice` and `/api/voice/*` at worker installation. Use the `network`
   source, never a race that could duplicate paid dispatch. Preserve the
   unsupported-browser fallback, shell cache, push, sessions, one-producer rules,
   durable budgets and audio arithmetic. This removes supported-browser voice
   fetch-handler dispatch; it does not prove the worker caused all 806 ms.
   Chrome documents support from version 123; WebKit documents the feature in
   Safari 27 beta. Detect the API, rather than infer it from "latest OS".
   [Chrome guide](https://developer.chrome.com/blog/service-worker-static-routing),
   [WebKit release documentation](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/).
2. Review path/origin boundaries, supported/unsupported/rejected installation,
   worker upgrades, offline shell and push. Retain matched/final router source
   where supported to confirm the actual request path; a new page version alone
   does not prove worker routing changed.
   [Resource Timing routing fields](https://www.w3.org/TR/resource-timing/).
3. Test **free checks first**, cold and warm after launch/idle and network change.
   Retain slow first checks. If supported bypass lowers pre-request time, use a
   small speech confirmation. Collect missing iPhone mobile coverage only after
   its free checks complete, with Wi-Fi actually off and Mobile selected.
   Do not run 50 trials or repeat paid batches before resolving these tails.
4. Keep phone-origin DNS/connect, mobile delivery and provider cold connections
   as separate experiments. Region migration stays separate. Avoid continuous
   keepalive, speculative paid synthesis or automatic retries/hedging. Do not
   alter onset arithmetic, trim quiet speech or switch Ritu to obtain a pass.

This review updates evidence and planning only. **Runtime remains deployed v6;
static network routing is not implemented or deployed by this review.** These
reports narrow the next optimization without another broad instrumentation
cycle. They do not establish that all latency issues are fixed.

### Budget and review validation

The latest export snapshots **₹30.0312 reserved of ₹50**, leaving **₹19.9688**;
this is not a fresh live account read. The increase since the live v6 check is
₹1.0332; six supplied smoke rows account for at most ₹0.702, leaving **₹0.3312
unexplained by these rows**. Free checks make no speech calls. No rows or charges
are invented and no reservation is reset. Fresh 200-trial acceptance at up to
₹32.832 remains unfunded.

Independent checks verify unique IDs, all six additive stage sums and output
mappings. The actual reporting CLI parses Android's attachment plus selected
iPhone trial metadata and returns four empty, unaccepted benchmark summaries,
matching the exports. Free checks remain separate. Lint, type-check, all 311
tests and the production build pass. No paid agent calls, budget changes or
deployment occurred in this review.


## Test convenience follow-up — October 10

The owner connected both phones to Windows and authorized automated checks.
WSL reaches Windows PowerShell. Native T3 device automation is disabled, so
Android uses official Platform Tools 37.0.1 and the physical phone's Chrome
DevTools socket. The owner approved USB debugging. Pixel reports Android 17/API
37, Chrome 154, standalone mode and a valid existing session. Serial, trust keys
and cookie values are not included in saved evidence. Debugger-attached controls
remain separate from uninstrumented latency acceptance.

The owner requested preventing automatic screen lock and repeated sign-in.
Authentication already uses a 90-day signed cookie and stable deployment key.
Home and Sign in previously did not recognize that saved session. The update
shows existing sign-in, redirects already-signed-in visits to Home and retains
explicit Switch account. Anonymous paid requests, caller allowlists and
sensitive-view step-up remain enforced. No cached boolean authorizes requests.

Harness revision `s4-controls-1` adds a visible-page screen wake lock with a
checkbox, held/pending/unavailable states and explicit Retry. It releases on
hide, toggle-off and navigation, releases stale grants and reacquires when
visible again. OS release does not cause a retry loop or change audio status.
Unsupported/refused locks show the manual timeout fallback. Manual locks still
interrupt playback. V6 speech settings, audio arithmetic and existing local
report storage are preserved; static voice routing remains a future optimization.

Six lifecycle/race tests and three session lifetime/restart/step-up controls
bring the suite to **320 passing tests**; lint, type-check and production build
pass. Final deployment `9e9a128e-8352-4632-9b20-deadf1cd8760` reached
**SUCCESS** at 03:25:32 UTC. All 130 uploaded source files match the validated
working source. Home remains statically prerendered and generic; its session
notice comes from an uncached authenticated status request. Live saved-session
recognition, default Sign-in redirect, explicit Switch account and anonymous
voice/diagnostic rejection pass. The budget remains ₹30.0312/₹50 with no agent
paid synthesis.

After the owner reconnected the Pixel, the real standalone app reports a held
screen lock. It remained awake beyond its normal 30-second timeout with the
Android USB stay-awake setting restored to its original zero. Toggle off/on,
closing and reopening the installed app, saved sign-in and lock reacquisition
pass. Three free controls returned `ok` (375 ms), intentional `cancelled` and
`ok` recovery (260 ms), with zero underruns. Actual report generation includes
`s4-controls-1` and active screen state, preserving four prior speech trials.
These debugger-attached synthetic checks are not first-audio p95 evidence.

Apple Devices 1.1540.24088.0 was installed from Apple's Microsoft Store entry.
The owner confirmed that it detects the iPhone. A Windows-local inspection
bridge now sees Nilumi on the physical iPhone. Its original wake request was
refused, and the explicit user-gesture Retry acquired the lock. Existing sign-in
survives reload. Free tone completes at 189 ms with zero underruns and standalone
mode; generated reports contain the control revision and held lock. The owner
confirmed app-switcher closure/reopen returns to the installed app without
requesting an email code. Inspection after reopening confirms the signed
session and active screen lock, with the budget unchanged.
No device serials, cookies or trust material are included in
[the deployment/control evidence](../../../spikes/s1/evals/results/s4-controls-deployed-check-2026-10-10.json).

## Physical latency investigation and v7/v8 fixes — October 10

Both installed apps were inspected directly through the owner's authorized USB
connections. These debugger-attached checks diagnose stages; they are not the
uninstrumented 50-trial acceptance runs. Both phones were first on Wi-Fi. The
owner then turned iPhone Wi-Fi off and selected Mobile; Android Wi-Fi was
temporarily disabled through ADB and restored afterward.

### Fetch dispatch

V7 deploy `c330a0df-e5e1-4c25-8462-24e376893d14` succeeded with 328 passing
tests. A dedicated `/voice` worker has no fetch listener, so the browser does
not dispatch voice requests to a worker. The root worker continues to own the
offline home and push subscription; push enrollment explicitly finds that root
registration after SPA navigation. Both physical phones show the new controller,
no fetch-worker start in request timing, existing authenticated sessions, cached
home and existing root push subscriptions. No push notification was sent.

A Chromium-only static routing implementation would not cover this iPhone's
Safari 26.6.1. The worker with no fetch listener follows the
[Service Worker specification's Handle Fetch skip condition](https://www.w3.org/TR/service-workers/#handle-fetch),
without requiring Safari 27 static routing. Chrome's
[static routing guidance](https://developer.chrome.com/blog/service-worker-static-routing)
and [Safari 27 beta announcement](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/)
were checked before choosing the compatible implementation.

Four free network-only controls per phone/network show no worker dispatch on
v7. The first Android mobile request still incurred 361 ms DNS and 178 ms
connection setup; subsequent requests had zero DNS/connect time. The first
mobile iPhone control took 474 ms to first bytes, then 120–201 ms. Removal of
worker dispatch is structurally verified; these small controls do not prove
that all browser/network tails have disappeared. DNS, TLS, phone-to-server
transport and infrastructure outside the instrumented handler remain distinct.

### Zero samples and audio startup

V7 Wi-Fi speech smoke results were iPhone 661/458 ms and Android 1,102/598 ms,
with zero underruns. The slow Android short sentence contained 167 ms of exact
zero PCM followed by very quiet, non-zero samples. Its threshold-based onset was
334 ms into the original audio. A read of the already-completed clip preserved
the budget and confirmed this in the actual PCM; this was not another synthesis.

V8 removes only excess exact zeros in the first complete PCM chunk. It retains
10 ms of leading zero samples, caps removal at 200 ms and preserves at least
80 ms of playable first-chunk data. An all-zero first chunk is scheduled
unchanged, and later chunks/internal pauses are unchanged. Quiet non-zero
samples are never removed. No second chunk or additional network operation is
awaited. Exports record the policy, original onset offset and actual removed
prefix separately. Provider byte-count validation still covers the original
received stream. The clock starts before the speech GET, and actual scheduled
output mapping is unchanged.

The offline control on the captured Android clip removes **156.9 ms**, with
all remaining samples byte-identical; its remaining threshold offset is
177.5 ms. This is a demonstrated waveform transformation, not a newly measured
phone latency or proof of p95 improvement. Six tests cover non-zero preservation,
internal pauses, caps, first-chunk minimum, all-zero chunks, odd-byte boundaries
and resetting the player. The full **334-test** suite, lint, type-check and
production build pass. Review confirms provider settings, durable reservations,
authentication, root worker and provider dispatch are unchanged. V8 deploy
`e655e917-7f03-4dbb-b27a-325f35aeddc1` succeeded at **04:09:01 UTC**, matching
135 validated source files. Voice selection migrates; old reports stay separate.

An independent free Android output probe also showed `resume()` resolving in
35 ms while the first audio-clock tick took 497 ms. Later freshly created
contexts reached their first tick in 152, 29 and 16 ms; the sequential order
means this does not establish that a longer silent buffer fixes the cold start.
Before the first device tick, output timestamps are invalid and are excluded
from interpretation. The slow v7 free tone had first PCM at 179 ms and onset at
645 ms, with the context clock still zero when PCM was scheduled. This is separate
from the slow speech clip's zero prefix, whose audio clock was already advancing.

Do not hide output readiness by moving a warm-up wait outside the measured
sentence-to-playback interval. For the actual app, initialize and retain the
speaker context from the Talk gesture so output startup can overlap microphone
capture and reply generation; record that readiness separately alongside the
release-to-reply metric. Integration with recording is future app work. No
permanent silent loop, fake onset, amplitude-threshold trimming or model/voice
substitution has been added here.

### Mobile findings after v8 deployment

Both phones retained sign-in and the network-worker controller. Free tones
completed at Android 321 ms and iPhone 155 ms with zero underruns. Two fresh
mobile speech smokes completed per phone: iPhone **676/468 ms**, Android
**912/736 ms**, all without underruns. These are individual smoke timings,
not per-combination p95 values.

Android's measured pre-request delay is 5–8 ms and server provider dispatch is
21–26 ms. The residual between instrumented response-ready and browser headers
is 370–390 ms; iPhone's corresponding residual is 121–149 ms. This residual
includes phone-to-server transport and any infrastructure before/after the
instrumented handler. It cannot identify a single hop or be attributed entirely
to geography. Both phones use HTTP/3 on this leg; Sarvam's pooled connection is
separate HTTP/1.1. No protocol switch, region migration, durability weakening or
retry was made based on these four observations.

The 700 ms acceptance remains pending. Cold cases and slow rows remain visible.
A complete fresh four-combination run reserves at most ₹32.832; the preserved
₹50 cap cannot cover that after existing experiments. Funding must be resolved
before running a complete benchmark. S-VGW and Phase 2's first-family-call gate
remain separate and unchanged.

V8 Android Wi-Fi smokes subsequently completed at **733/519 ms**, without
underruns. An intentional Stop of the free diagnostic remained `cancelled`, and
a following free diagnostic recovered successfully. Actual exports contain the
ready network-routing state, active screen locks and the zero-prefix policy.
The owner confirmed iPhone Wi-Fi is back on and the page is set to Wi-Fi.
Both phones sounded clear, with complete first words and no clicks or gaps.
USB reconnection restored inspection. The final v8 iPhone Wi-Fi pair completed
at **671/484 ms**, without underruns, with `voice-network` recorded for both.
The short sentence had **109.4 ms** of exact leading zeros removed. Two fresh
speech calls were dispatched during this final follow-up. Audio clarity
confirmation is recorded separately from verification of displayed audible-onset
timing.
The fresh v8 exports still have audible-onset verification unchecked. Preserved
spend is now **₹31.4352/₹50**, leaving **₹18.5648**. The full new 200-trial run
would require up to ₹32.832, exceeding that remaining allowance by ₹14.2672.
See [v7 physical evidence](../../../spikes/s1/evals/results/s4-stream-v7-deployed-check-2026-10-10.json)
and [v8 deployment and physical checks](../../../spikes/s1/evals/results/s4-stream-v8-deployed-check-2026-10-10.json).


### Home-to-Voice controller regression found during reconnection

The reconnected iPhone entered Voice through the existing Home app document.
Its active controller remained `/sw.js`, despite an already-active `/voice`
registration. The free tone completed at 168 ms but recorded `shell-fetch`;
that diagnostic remains in the export. This exposed a missed navigation case: an
SPA URL transition does not select a new document's service-worker controller,
and re-registering an existing active worker does not replay activation.

Home's **Voice selection** entry now uses native document navigation. The other
links, auth, audio pipeline, API dispatch and worker registrations are unchanged.
This does not add an automatic reload to the voice page or modify the measured
interval. V8's speech version remains unchanged because its processing and
recorded routing policy are unchanged; actual per-attempt routing remains
visible. The uploaded source differs from the initial v8 archive only in
`app/page.tsx` and its README. All **334 tests**, lint, type-check and production
build pass. Navigation-fix deployment
`96fa86ca-6003-4869-8970-692ba220f36d` succeeded at **04:33:01 UTC** and matches
135 validated source files.

On both actual phones, loading Home and selecting Voice produces a new document:
Home has the root controller, Voice has `/voice-sw.js?revision=s4-network-1`,
and saved authentication, standalone mode and old reports remain intact.
Post-navigation free tones complete at iPhone 201 ms and Android 296 ms, without
underruns. iPhone wake lock was reacquired through explicit Retry. Its final
Wi-Fi speech pair used the expected controller. All eight v8 speech smokes now
cover two sentences per phone/network combination and completed without
underruns. This closes smoke coverage, not the 50-trial-per-combination p95 gate.

## October 10 owner closure and next work

The owner closed the current S4 optimization effort on October 10 and asked to
move toward the actual app. Keep the deployed v8 candidate and Ritu as the
baseline. Its eight speech smokes cover both phones on Wi-Fi and mobile data;
all completed without underruns, and the owner confirmed clear speech with
complete first words and no clicks or gaps. Local validation passed 334 tests,
lint, type-check and production build before deployment.

**Optimization pass closed; latency acceptance deferred.** These smoke checks
do not establish p95 ≤700 ms. The full 50-trial-per-combination benchmark,
fresh audible-onset confirmation, cold audio-output readiness, provider tails
and remaining transport/infrastructure latency stay recorded as follow-up
work. No further synthesis calls, budget changes or runtime deployment are
part of this closure. The ₹50 ledger remains at ₹31.4352 reserved.

The next work is to finish S-VGW's outstanding account controls and capped
synthetic canary proofs, then build the Phase 1 production foundation: adult
sign-in, household-scoped storage/RLS, voice/text turns, resumable receipts,
privacy checks and recovery. Foundation work can use synthetic data while
gateway verification is pending. S-VGW plus household acknowledgement still
gate family LLM/embedding calls. The first useful product slice after that is
the Phase 2 shared shopping list: add, tick, correct and undo, with both-phone
sync and offline receipts. This closure does not mark Phase 1 complete.
