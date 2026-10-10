# S4 streaming candidate — October 9, 2026

**Status: deployed; partial Android retest shows lower typical onset, but p95 remains above target. S4 remains unaccepted.**

This document preserves v2 evidence. The current testing candidate is
`s4-bulbul-v3-stream-3`; see [application optimization validation](22-s4-application-optimization-validation.md).

Candidate `s4-bulbul-v3-stream-2` preserves the wife's selected Ritu voice,
`bulbul:v3`, `en-IN`, pace 1, temperature 0.6 and 22,050 Hz mono PCM16 output.
It changes the transport and player, keeping the frozen sentences and the agreed
sentence-available-to-audible-playback metric. The [v1 Android results](18-s4-voice-verification.md)
remain the failed baseline and are never pooled with this candidate.

## Implementation and review

- The server uses Sarvam's HTTP streaming endpoint and incrementally validates
  WAV framing, rate and PCM sample alignment. It forwards PCM before synthesis
  completes. The phone schedules it through one gesture-unlocked AudioContext,
  with a 40 ms startup buffer and browser resampling to the output device rate.
- Durable budget reservation precedes every paid dispatch. A bounded replay spool
  joins repeated GETs; range replay cannot synthesize twice. The ledger lock no
  longer spans synthesis. At most two active clips serve the two-phone harness.
  Completed audio and final metadata persist after first-chunk delivery.
- Stop, backgrounding and interruptions abort the stream. Generation checks
  prevent old cleanup or late chunks from stopping or playing in a new attempt.
  Silence, malformed/truncated WAV, underruns and late failures remain failures;
  their reservations are retained. An uncertain descriptor cannot retry synthesis.
- The existing wife selection, v1 browser results and cumulative ₹50 ledger are
  preserved. New results and listening caches use the candidate version. Three
  exploratory sentences are explicitly excluded from acceptance statistics.
- A free, authenticated, delayed-chunk tone checks the player without Sarvam or
  a reservation. Speculative HEAD requests return 405 before any paid work.

One implementation review covered transport parsing, cancellation, timing,
idempotence, spending and result isolation. It found and corrected the stale
cleanup race using player generations and added explicit HEAD rejection.

Validation: **274 offline tests pass**, including split/unknown-length WAV,
progressive delivery, concurrent readers, durable reservations, cancellation,
resampling, underruns and report isolation. Lint/gateway guard, type checking and
the production build pass. The final build has no dynamic-file tracing warnings.

The collaborative desktop browser's free-tone check scheduled the first PCM
461.2 ms before the final byte arrived, with no budget change. The page also fits
a 390 px phone viewport. A Stop followed immediately by another free check
also completed without the old attempt cancelling the new one. These checks
demonstrate progressive scheduling and
layout; they do not establish physical phone audio onset or S4 acceptance.

## Bounded provider validation

At 05:17:41 UTC, the candidate handler ran in an isolated Node subprocess inside
the actual Singapore staging container, before deployment. One fixed `short`
sentence used Ritu and the existing allowlist and durable ledger. No household
content was submitted. Its reservation bound was **₹0.0864**.

| Observation | Result |
| --- | --- |
| Hosted response | HTTP 200, `audio/wav`, PCM16 mono 22,050 Hz |
| RIFF and data sizes | Unknown-length `0xffffffff`; parsed successfully |
| Provider headers / first PCM / complete | 264.05 / 495.26 / 601.00 ms |
| Handler first PCM / complete response | 524.36 / 647.44 ms |
| Progressive PCM | Six chunks, 60,212 bytes total |
| Measured leading silence | 43.49 ms |
| Completed range replay / cancellation | HTTP 206, two bytes / HTTP 200 |
| Wife selection | Original file unchanged |
| Cumulative reservation | ₹6.408 → ₹6.4944, original ₹50 cap |

[Content-free probe evidence](../../../spikes/s1/evals/results/s4-stream-v2-server-smoke-2026-10-09.json)
records the timings and method. Scratch source files were removed; completed
audio/metadata and the reservation remain on the volume. **495 ms is a server-side
first-PCM observation, not sentence-to-audible phone timing or a p95.**

The reservation leaves ₹43.5056 at that snapshot. A fresh 200-trial acceptance
run of this unchanged corpus reserves ₹32.832, leaving ₹10.6736 for tuning and
listening. Read the live ledger before further spending. A three-sentence smoke
reserves ₹0.4176 per run; it never qualifies as an acceptance slice.

## Deployment and next home checks

Railway deployment `d37b6bdd-fb4a-4ef7-a554-3314b9912400` reached **SUCCESS**
at 05:25:18 UTC in the existing Singapore service. The persistent volume, original
₹50 ledger and wife's original Ritu selection survived deployment unchanged.

[Post-deploy public HTTP checks](../../../spikes/s1/evals/results/s4-stream-v2-deployed-check-2026-10-09.json)
returned 200 for the owner, 401 anonymously, 400 for an invalid fixture, 405 for
HEAD, 409 for uncompleted metadata and 200 for cancellation. The free PCM tone
delivered first bytes at 98.14 ms and finished at 598.15 ms in a server-originated
request through the public staging proxy. No synthesis occurred; the ledger hash
and selection hash were unchanged. The disabled S3 evaluator still returns 404.
The collaborative browser confirms the new version and no horizontal overflow
at phone width. Its unauthenticated session correctly cannot run paid tests.
Temporary SSH access was revoked and the local identity removed after validation.

1. Refresh [the installed staging voice page](https://staging.nilumi.in/voice)
   and confirm `s4-bulbul-v3-stream-2`. Keep Ritu; repeat voice comparison only
   if its quality has changed.
2. Play the free audio check, then try three uncached sentences on both phones,
   on home Wi-Fi and mobile data. Download the exploratory results before
   deciding whether to fund the complete benchmark.
3. Verify audible onset again for the new player, including the last word,
   ordering, Stop, app-switch interruption and continuation. The estimate uses
   the scheduled first non-silent sample and output timestamps/latency; browser
   clocks cannot independently prove physical sound onset.
4. If the exploratory results justify it, run the unchanged 50-trial benchmark
   per phone/network slice. Retain cold starts, slow results, cancellations and
   failures. Do not combine v1 and v2 or selectively replace failed trials.

Acceptance still requires all four slices, full fixture coverage, zero failures,
actual onset verification and p95 ≤700 ms. S-VGW remains a separate unchanged
Phase 2 gate; this staging voice harness does not authorize family LLM calls.

## Owner-provided Android retest — 05:30:55 UTC

The owner supplied 28 standalone, uncached Ritu attempts using the unchanged
settings: six exploratory smoke rows and 22 benchmark rows. All 26 completed
attempts reported zero underruns. The owner explicitly confirmed tapping Stop on
the final benchmark attempt of each network run. These two cancellations indicate
manual interruption, rather than reported spontaneous playback failure; they
remain failed attempts for acceptance. The export asserts audible-onset
verification; an independent recording and iPhone measurements were not supplied.

Recomputing with the deployed report helper matches the export exactly. Smoke
rows are excluded; no slow result or cancelled row is discarded.

| Benchmark slice | Attempts / completed / manual Stop | p50 | p95 | Completed ≤700 ms |
| --- | --- | --- | --- | --- |
| Android / home Wi-Fi | 11 / 10 / 1 | 684.15 ms | 815.52 ms | 6 / 10 |
| Android / mobile | 11 / 10 / 1 | 638.38 ms | 2,983.82 ms | 7 / 10 |
| iPhone / both networks | No evidence supplied | Pending | Pending | Pending |

The respective v1 p50 values were 1,220.06 and 1,288.46 ms, suggesting about 44%
and 50% lower typical onset in these runs. This is a descriptive comparison of
different small samples and onset estimators, not a controlled or accepted
performance result. With ten successes per slice, nearest-rank p95 is the maximum.
Both slices remain incomplete and above the target.

| Completed benchmark diagnostics, nearest-rank p50 | Wi-Fi | Mobile |
| --- | --- | --- |
| Provider response headers | 90.03 ms | 97.82 ms |
| Provider first PCM | 277.89 ms | 269.97 ms |
| Provider complete response | 729.17 ms | 745.52 ms |
| Phone first PCM minus provider-first-PCM duration | 283.70 ms | 229.76 ms |
| Estimated audible onset minus phone first PCM | 112.20 ms | 112.28 ms |

The paired first-PCM remainder combines phone/server request travel, server work
before provider dispatch, response travel and incremental parsing. It is not a
pure network measurement or a clock-offset calculation. Onset after the phone's
first chunk includes startup buffering, leading silence and estimated output
latency. Stage percentiles cannot be summed into an end-to-end percentile.

The mobile `date` outlier waited **2,433.18 ms for provider headers**, then reached
provider first PCM at 2,612.55 ms, phone first PCM at 2,852.00 ms and estimated
audible onset at 2,983.82 ms. Most of this spike is within the measured
server-to-provider response wait. These timers cannot distinguish connection,
provider queue or backend processing; they do not establish Singapore geography
as the cause. The same date fixture reached 640.80 ms on Wi-Fi. Streaming avoids
waiting for the complete sentence, but cannot remove a long initial response wait.

The mobile exploratory shopping row separately reached 1,177.23 ms despite
provider first PCM at 272.00 ms: the phone did not receive first PCM until
1,069.90 ms. This shows variation outside the provider-first-PCM duration too;
that smoke row remains diagnostic evidence and is not pooled into the benchmark.

The exported cumulative reservation is **₹11.5596 / ₹50**, leaving **₹38.4404**.
The 28 exported fixtures account for ₹4.4136 at the existing conservative bound;
the increase since the post-deploy snapshot is ₹5.0652. The remaining ₹0.6516
is not attributable from this export alone, which does not contain listening or
every ledger entry. Treat the cumulative snapshot as authoritative for planning
and do not release reservations. A fresh 200-trial run would reserve ₹32.832,
leaving ₹5.6084 at this snapshot, before further tuning or listening.

Preserve this partial run and defer another full paid run while diagnosing the
remaining path. The next useful implementation experiment would measure request
arrival, authorization/reservation duration, provider dispatch and first-chunk
forwarding, plus client scheduling/leading-silence/output latency separately.
Only then choose a bounded buffer, connection or transport experiment. A smaller
player buffer alone cannot resolve the 2.43 s provider-header outlier; no automatic
retry, warmed-only selection or discarded outlier may manufacture acceptance.

[Content-free retest evidence](../../../spikes/s1/evals/results/s4-android-stream-v2-2026-10-09.json)
preserves all supplied IDs, purpose/status fields, timing pairs and audio sizes.
It is derived from the pasted export, not a byte-identical original file. This
analysis made no provider request and changed no budget, voice or runtime code.

The follow-on [low-level analysis and experiment plan](../../plans/21-s4-low-level-latency-plan.md)
separates the remaining backend, connection, payload and player work, with local
CPU controls and a bounded implementation sequence. It leaves hosting migration
for later and does not change this deployed v2 evidence or acceptance status.
