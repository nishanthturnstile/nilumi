# S4 v4 connection and ledger candidate — October 9, 2026

> Historical evidence: existing spike scope and chronology, reconciled 2026-10-10. Original dates, measurements, failures, exceptions and acceptance limits remain authoritative for that experiment. This is not the new application implementation plan. The [single current plan](../../plans/implementation-plan.md) owns future work; prior acceptance does not validate Pipecat, streaming conversational STT or dynamic Home. Later S4 owner closure and the retained failed timing/phone cases are in [both-phone analysis](25-s4-v4-both-phone-analysis.md). They do not validate the new runtime. Earlier pending labels describe the dated state at that point, not a competing current plan.


**Status: implemented, reviewed, validated and deployed; ready for the owner phone retest. Phone acceptance remains pending.**

The owner has since supplied both-phone v4 results. See the
[dated phone analysis](25-s4-v4-both-phone-analysis.md), including
the refreshed ₹27.288 cumulative reservation. The deployment checks and original
test allowance below preserve the earlier handoff, not today's remaining budget.

The [v3 phone analysis](23-s4-v3-phone-retest-analysis.md) identified three
independent tails: connection setup after pauses, quiet initial audio and a long
ledger operation outside its reservation save. V4 implements the connection
experiment and finer ledger/decoder diagnostics, and replaces the three-sentence
smoke with a budgeted two-sentence pause check. Audio-prefix alteration is deferred
on the basis of the retrieved waveform, not silently assumed safe.

## Candidate and implementation

Version `s4-bulbul-v3-stream-4`; profile `http-pcm-pool15s-ledger-20ms`.
Ritu, Bulbul v3 settings, 22,050 Hz WAV-to-PCM transport, 20 ms startup, frozen
sentences and the sentence-available-to-audible-playback clock are preserved.
Old v1/v2/v3 phone storage and previous selection files remain separate/readable.
The cumulative budget and existing staging volume are retained.

- A process-wide [Sarvam-only pool](../../../spikes/s1/lib/voice/transport.ts) uses
  pinned Undici 7.29.1, two connections, pipelining one, HTTP/1.1 and a 15-second
  idle timeout/maximum. The request-specific dispatcher is passed to native
  fetch; unrelated providers' global dispatcher is unchanged. Pool construction
  makes no network call. No periodic warming or retry interceptor is added.
  Server keep-alive hints can shorten the idle policy; longer client limits
  cannot force the server to retain a socket. The installed Next fetch wrapper
  preserves the dispatcher for this string-URL POST with an abort signal.
  [Matching Undici pool](https://github.com/nodejs/undici/blob/v7.29.1/docs/docs/api/Pool.md)
  and [client options](https://github.com/nodejs/undici/blob/v7.29.1/docs/docs/api/Client.md).
- Content-free provider traces include configured policy, safe numeric server
  idle hints, derived H1 idle policy and the previous origin disconnect's reason
  and elapsed gap. Reasons use a fixed classification; raw errors, socket info,
  URLs and response headers are not exported. This origin event need not refer
  to the socket assigned to the next request. First raw-body byte count/PCM
  byte count and decoder CPU before first PCM/total separate framing/delivery
  wait from parser work.
- Optional [ledger timings](../../../spikes/s1/lib/verification/ledger.ts) split lock
  acquire/write/sync, ledger read, parse/validation, callback and lock cleanup.
  At most four atomic-save traces record serialization, file open/write/sync/
  close, rename and directory open/sync/close. The callback duration contains
  the save; the totals overlap and must not be added. Budget contents/paths are
  not included. Exclusive locking, ledger validation, atomic replacement,
  file/directory sync, retained uncertain reservations and durable-before-
  dispatch behavior are unchanged. This instrumentation identifies the next
  optimization; it does not claim to have fixed the 163 ms transaction tail.
- **Check 2 sentences with a pause** runs short/shopping, with six seconds after
  the first playback finishes. The pause is outside each individual sentence
  clock and generates no audio. Stop during it cancels the timer and prevents
  preparing or charging the second sentence. Reports include smoke fixtures and
  pause duration; exploratory rows remain excluded from acceptance.

## Existing date-clip control

The already-generated v3 mobile date clip was read from the retained volume,
with no synthesis. Its 135,476 PCM bytes matched the stored SHA-256
`611fad1cfcd8e2aec57a65e73699d49a3a49d5589399310fe8a7b79eac9d021f`.
The temporary SSH access key was unregistered and its local key material removed
after retrieval. Original PCM remains outside the repository; the content-free
[prefix control](../../../spikes/s1/evals/results/s4-v3-date-prefix-control-2026-10-09.json)
preserves the provenance and measurements.

| First sample meeting absolute amplitude | Onset from clip start |
| --- | ---: |
| 1 — first nonzero sample | 110.02 ms |
| 16 | 143.45 ms |
| 32 | 201.22 ms |
| 64 | 328.25 ms |
| 164 — existing onset threshold | 331.66 ms |

The initial 2,426 frames are exactly zero, but the remainder of the measured
331.66 ms prefix contains quiet nonzero samples. Waveform data alone cannot
decide whether those samples are disposable noise or quiet speech. V4 preserves
every original frame. A later bounded exact-zero-prefix experiment can preserve a guard;
threshold-based removal of the whole prefix requires listening/quality checks.
No reported timestamp is changed to manufacture a latency improvement.

## Review and verification

The focused review covered pool lifetime across route bundles, server idle
hints, bounded two-reader concurrency, POST retry behavior, cancellation,
durability, trace privacy, previous voice selection and versioned phone reports.
The existing streaming test's teardown raced optional post-EOF trace persistence;
it now verifies the persisted synthesis trace before deleting its fixture.
Caller-specific cancellation/shared-listener fields are checked separately from
the durable original synthesis record. Playback EOF still avoids that optional
disk wait.

Local provider controls used actual native fetch against a loopback HTTP server:
one socket survived sequential real 3/6/12-second idle gaps; explicit peer close
was classified and the next request obtained a new socket. Two simultaneous POST
streams remained isolated when one was aborted. A partial response failed without
resending its POST. Tests also verify server hints/explicit close, all ledger
substages with retained charging after callback failure, v2/v3 selection
migration, Stop during the pause and the four-combination allowance. These local
controls use no provider credentials or speech credits.

All **291 tests**, lint, type-check and the production build passed after the
teardown correction. Built client assets contain none of the server pool,
credential-header or provider-monitor markers.
Local controls establish correctness and connection behavior, not Sarvam's
actual peer idle policy or the phone p95.

## Deployment and live checks

Railway staging deployment `ac8e48b8-3c1b-48a4-b250-476fb020a45a` reached
**SUCCESS**; final checks completed at 09:24 UTC. The separate source upload
contains 142 files and excludes dotenv files, recordings, dependencies and
generated builds. It targets only the existing `nilumi-s1` staging service and
retains the `/verification` volume. No working-tree changes were committed or
pushed. The [deployed evidence](../../../spikes/s1/evals/results/s4-stream-v4-deployed-check-2026-10-09.json)
records source fingerprints and the checks.

The authenticated page/API report the v4 version/profile, saved Ritu selection,
two-sentence button and unchanged ₹16.0416 balance. Preparing a descriptor
without speech succeeds; metadata/trace return 409, HEAD 405, DELETE 200 and a
subsequent audio read 404. All are non-billable. Browser anonymous budget and
diagnostic reads return 401; anonymous HEAD returns 405 and an extra-field
payload is rejected with 400. Direct non-browser HTTP requests were rejected
by the edge with 403/error 1010; the authenticated and anonymous browser-path
checks above verify the application behavior.

The free HTTP diagnostic returned 61,740 PCM bytes in seven fragments, first
chunk 163.30 ms and EOF 660.70 ms, with no content encoding. The native shared
browser's free audio button passed, reporting a 592 ms desktop onset estimate.
These free checks do not establish phone or provider latency. Snapshot inspection
was unavailable in the preview; DOM evaluation and native click/wait completed
the UI check. **No paid provider calls were made**, and the live ledger remained
unchanged. Actual Sarvam pool policy and v4 phone p95 await the owner retest.

## Historical limits from this experiment


The authenticated predeployment ledger read is **₹16.0416 / ₹50**, unchanged
from the owner's export; remaining allowance is **₹33.9584**. One two-sentence
check reserves at most **₹0.234**. Four checks reserve **₹0.936**, leaving
₹33.0224 and preserving the fresh complete 200-trial allowance of ₹32.832 with
₹0.1904 remaining. No additional listening, repeated smokes or agent paid probe
is included in that arithmetic. Read the current balance again before paid work.

The original protocol required four full 50-trial slices and p95 ≤700 ms, including
uncached corpus coverage, no failed attempts and physical onset verification.
Hosting migration, codecs/WebSocket, further buffer reduction and audio trimming
remain separate evidence-dependent work. Later owner closure in doc25 retains incomplete timing coverage and scoped exceptions; P0 owns new continuous-voice acceptance.

Further application work belongs to the [current implementation plan](../../plans/implementation-plan.md#p0); no historical retest sequence remains active.

## Reconciled completed observations from former document 21

Dated historical evidence reconciled on 2026-10-10. These observations describe the existing spike or design reference only. Future work is owned by the [implementation plan](../../plans/implementation-plan.md) (the link is resolved from the validation directory).



The [v2 Android retest](20-s4-streaming-validation.md#owner-provided-android-retest--053055-utc)
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
are around 82–98 ms. The earlier [Singapore control](../../research/19-s4-sarvam-latency-research.md#2-singapore-and-storage-measurements)
observed 145.66 ms first connection setup and approximately 64 ms warm headers.
This makes intermittent connection establishment a worthwhile hypothesis. It is
not proof: that control used unauthenticated 405 responses in another process.
