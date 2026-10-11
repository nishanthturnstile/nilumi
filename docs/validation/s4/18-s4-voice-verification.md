# S4 voice verification — October 9, 2026

> Historical evidence: existing spike scope and chronology, reconciled 2026-10-10. Original dates, measurements, failures, exceptions and acceptance limits remain authoritative for that experiment. This is not the new application implementation plan. The [single current plan](../../plans/implementation-plan.md) owns future work; prior acceptance does not validate Pipecat, streaming conversational STT or dynamic Home. Later S4 owner closure and the retained failed timing/phone cases are in [both-phone analysis](25-s4-v4-both-phone-analysis.md). They do not validate the new runtime. Earlier pending labels describe the dated state at that point, not a competing current plan.


**Status October 10: wife selected Ritu; owner closed the current optimization pass. The ≤700 ms p95 acceptance remains deferred and unpassed.**

The deployed v8 implementation, both-phone smoke checks and closure decision are
recorded in [doc 25](25-s4-v4-both-phone-analysis.md). At closure, further tuning and the full phone/network benchmark remained deferred. The protocol below records the old acceptance scope; it is not the new application work sequence or permission for another paid run.

The separately versioned streaming candidate and its validation are recorded in
[doc 20](20-s4-streaming-validation.md). This document preserves the v1 baseline.

Open [the staging voice page](https://staging.nilumi.in/voice) from each installed
PWA. The owner's confirmed sign-in account is the sole allowlisted evaluator;
one account can be used on both phones. Sign in from Home if access is unavailable,
then return to Voice selection. Only committed synthetic sentences are sent.

## Historical home-session protocol

Uncached latency runs of `s4-bulbul-v3-1` were paused because supplied Android measurements exceeded the target. Failed partial runs remain evidence. The steps below describe the complete historical protocol, including slices not completed; they do not claim the whole protocol was run.

1. On iPhone, listen to the same six samples for candidates A–D. Let the wife
   choose **This is my preferred voice**. Check her choice on Android too.
2. Run **50 uncached trials** on home Wi-Fi, then on mobile data, on each phone.
   Select the actual connection before each run and keep the app foreground.
3. Download results after both networks on each phone. Keep both exports;
   the report on one phone does not include the other phone's trials.
4. Check actual audible onset on sample trials on both phones. Browser `playing`
   plus measured leading silence is an estimate and needs this observation.
5. Check Stop, app-switch interruption, Resume, ordered playback, Auto with
   voice versus typed input, Always speak, Text only, and unavailable-speech
   text fallback. Record failures; a resumed benchmark attempt stays failed.

The benchmark freezes ten English sentences, five per run. Every phone/network
slice requires at least 50 unique uncached successes, complete sentence coverage,
zero failed attempts and nearest-rank p95 ≤700 ms. Do not discard failures or
fund selective reruns after seeing results. Setup and listening cache hits do not
qualify uncached latency. Release-to-reply timing remains a separate metric.

| Required slice | Trials | First-audio p50 / p95 | Acceptance |
| --- | --- | --- | --- |
| iPhone / home Wi-Fi | Pending | Pending | Pending |
| iPhone / mobile data | Pending | Pending | Pending |
| Android / home Wi-Fi | 16 attempted; 15 completed; 1 cancelled | 1,220.06 / 4,500.29 ms | Partial; above target |
| Android / mobile data | 15 attempted; 14 completed; 1 cancelled | 1,288.46 / 1,591.02 ms | Partial; above target |

| Listening / functional evidence | Result |
| --- | --- |
| Wife's selected voice and listening quality | Ritu selected through the wife-choice action at 2026-10-09T04:19:53.061Z; detailed listening scores not supplied |
| Voice/version/settings recorded | `ritu` / `s4-bulbul-v3-1`; pinned settings below match the owner export |
| Ordering, cancellation, interruption and resume on both phones | Pending |
| Reply modes and text degradation on both phones | Pending |
| Actual audible-onset sample verification | Owner-attested `audibleOnsetVerified=true` in the export |
| Final costs reconciled within ₹50 | Export snapshot retains ₹6.408 / ₹50; invoice reconciliation pending |

## Deployed configuration and setup evidence

Railway staging deployment `a327c84d-9737-4d23-b992-d3423211ad7a` reached SUCCESS
in Singapore. One 500 MB persistent volume is mounted at `/verification`;
S4 uses `/verification/s4`. Initialization is explicit and refuses replacement.
Existing server credentials are reused and remain server-only. The S3 evaluator
is disabled with an empty evaluator allowlist.

Pinned configuration: `s4-bulbul-v3-1`; Sarvam `bulbul:v3`; candidates `ritu`,
`priya`, `simran`, `shubh`; `en-IN`; pace 1; temperature 0.6; mono PCM16 WAV,
22,050 Hz. Fixtures and settings are in
[`config/voice.ts`](../../../spikes/s1/config/voice.ts). The four-voice listening set plus
200 uncached trials reserves ₹37.2096 at the published ₹3/1,000 characters, with
20% billing/tax headroom and conservative UTF-8 counting. This is a reservation
bound, not a reconciled provider invoice; preserve failures and reverify billing
before any further scope or price change.

Authenticated zero-call checks returned 200 for the owner, 401 anonymously,
400 for an unknown fixture, and 404 for the disabled S3 evaluator. Browser
inspection at phone width found no horizontal overflow and 46 px action targets;
this desktop viewport check is not an installed-phone result.

One deployed setup clip, `shopping` / `ritu`, returned HTTP 200 with 109,176
WAV bytes. Provider round trip was **1,040.27 ms**; measured leading silence was
45.94 ms. Safari's two-byte replay returned HTTP 206 with exactly two bytes and
reused the synthesis. The descriptor was then cancelled. The cumulative ledger
retains **₹0.1476**, leaving **₹49.8524**; no authoritative per-request charge was
returned, so the reservation is not reduced. This fixed listening clip remains
in the template cache. At that setup point, no wife selection or benchmark trial had been recorded;
the later owner export is recorded below.

**The setup clip does not demonstrate the ≤700 ms first-audio target.** Its
single synthesis already exceeds that threshold; it is not a p95 or physical
phone measurement. Run the frozen benchmark before claiming acceptance and use
provider, transfer, startup and leading-silence data to guide bounded tuning.
Any voice/model/corpus change needs a new version and a fresh comparison within
the same remaining allowance. Do not pool results across versions.

Local validation passes 245 tests, lint/guard, type checking and production build.
The result merger rejects overlapping exports and mismatched selected voices;
its synthetic passing fixture is tool validation only. Usage and operational
limits are in the [spike README](../../../spikes/s1/README.md#s4-voice-comparison-and-phone-benchmark).
S-VGW remains an independent gate in [doc 08](../s3/08-s3-gateway-verification.md).


## Owner-provided Android results — 04:22:44 UTC

The owner supplied an export at 2026-10-09T04:22:44.695Z with the selected Ritu
voice, unchanged settings, and audible-onset verification asserted. Its 31 trials
are all standalone Android PWA attempts with `cached=false`. Fourteen mobile and
fifteen Wi-Fi trials completed; one in each slice was cancelled. Both cancellations
remain failed attempts, including the mobile cancellation that already had an onset
measurement. Cancellation causes were not supplied. No iPhone latency trials appear
in this export.

Recomputed nearest-rank percentiles match the supplied summary. **All 29 completed
trials exceed 700 ms**; the fastest is 882.19 ms on Wi-Fi. These are partial samples,
not completed 50-trial acceptance runs. The observed p95 values retain the 4.50 s
Wi-Fi outlier; no failed attempt or slow result is removed to improve the result.

| Completed-trial diagnostic | Android / home Wi-Fi | Android / mobile data |
| --- | --- | --- |
| Provider round-trip p50 | 724.23 ms | 744.34 ms |
| Provider round-trip p95 | 4,086.85 ms | 1,020.81 ms |
| Paired first-audio minus provider duration, p50 | 433.17 ms | 472.16 ms |
| Paired first-audio minus provider duration, p95 | 791.07 ms | 859.00 ms |

The remainder includes the phone/server request path, server work outside the
provider timer, audio transfer, decoding, playback startup and leading silence;
it is not a pure network measurement. The Wi-Fi outlier has a 4,086.85 ms provider
round trip within 4,500.29 ms first-audio timing, so that spike is predominantly
inside the measured server-to-Sarvam path. It cannot be attributed to home Wi-Fi
from this export. Typical provider round trips alone are already above 700 ms.

The v1 implementation waits for the complete synthesized WAV on the server
and then for the complete response Blob on the phone before playback. Improving
only phone playback startup will not resolve that provider wait. The next candidate
should investigate first-chunk synthesis and progressive playback while preserving
Ritu, sentence validation, the same start boundary, cancellation and spending limits.
Sarvam documents [Bulbul v3 REST audio streaming](https://docs.sarvam.ai/api-reference/text-to-speech/convert-stream)
and [WebSocket streaming](https://docs.sarvam.ai/api-reference/text-to-speech/stream).
Streaming is a proposed next candidate, not a measured latency guarantee or a
change applied by this evidence update. Transport/model/corpus changes need a
new version, appropriate phone lifecycle checks and fresh acceptance measurements;
preserve v1 as the failed comparison. No switch to another provider is warranted
by these data alone.

The export's conservative budget snapshot is **₹6.408 reserved**, leaving
**₹43.592** under the original ₹50 cap at export time. No charge is released for
cancelled or uncertain synthesis, and no new paid request was made to analyze this
report. Budget and selection were not reset.

[Content-free timing evidence](../../../spikes/s1/evals/results/s4-android-v1-2026-10-09.json)
retains all supplied trial IDs, fixture IDs, statuses and timing pairs. It is derived
from the pasted export, not a claim of a byte-identical source file or independent
device capture. S4 stays pending performance and complete phone/functional evidence;
S-VGW remains a separate, unchanged gate.

The subsequent [Sarvam latency research](../../research/19-s4-sarvam-latency-research.md) records
primary-source recommendations, unbilled Singapore connection/storage probes and a
prioritized transport/playback experiment plan. It adds no acceptance trial and
does not change the selected voice or cumulative spending allowance.

## Reconciled completed observations from former document 17

Dated historical evidence reconciled on 2026-10-10. These observations describe the existing spike or design reference only. Future work is owned by the [implementation plan](../../plans/implementation-plan.md) (the link is resolved from the validation directory).



The spike now includes `/voice` for four Sarvam candidates, persisted wife
selection, fixed sentence playback and uncached phone benchmarking. A shared
durable reservation ledger preserves both the ₹50 S4 allowance and the separate
US$0.10 gateway allowance; failed or uncertain calls retain their reservations.
Synthetic fixture IDs are the only accepted TTS input. Member-bound, expiring
clip descriptors and range/replay reuse prevent arbitrary paid synthesis.

The timer starts before the speech fetch and includes synthesis, transfer and
playback startup. Its `playing` event plus measured leading-silence estimate needs
real-phone audible-onset verification. Each slice needs all ten frozen benchmark
sentences at least five times, unique trial IDs, no failed attempts, standalone
phone playback and p95 ≤700 ms. Phone exports can be combined with `voice:report`.
The full 24-clip listening set and 200 benchmark attempts reserve ₹37.2096,
including the 20% billing margin. No chosen voice or measured latency is claimed.

The gateway wrapper enforces S-VGW acceptance and current household acknowledgement
before family dispatch and rechecks both after reservation. The synthetic capability
accepts only two frozen fixtures. Routing receipts, missing costs, terminal SDK
errors and direct-provider import violations fail closed. The four-attempt canary
manifest includes the documented `arcee-ai/trinity-large-thinking` / `arcee-ai`
negative route; its current catalog must still report no-training `none` at dispatch.
No fallback is enabled. Pinned SDK tests capture serialized storage and routing
controls and inject terminal errors without network or provider charges.

This is verification infrastructure. The new application needs durable reviewed gate
and household acknowledgement state, structured NLU integration and a family
endpoint. The shared wrapper's server-side callbacks are not a substitute for
that persistence. Actual provider forwarding, live routing, quota rejection,
separate runtime/evaluation key budgets and canary revocation remain required
S-VGW evidence. The runner stays disabled until its preflight is complete.

Validation: 245 automated tests, Biome/ESLint and gateway guard, TypeScript, and
production build pass. Mocked report aggregation passes four complete slices;
that fixture is local tool validation, not real-device performance evidence.
The historical S3 ledger and evaluator remain unchanged and disabled.


Staging handoff: `/voice` is deployed in Singapore as
`a327c84d-9737-4d23-b992-d3423211ad7a`, with a preserved 500 MB verification volume.
One synthetic setup clip returned valid WAV and a range-safe replay; the S4
ledger retains ₹0.1476. Its 1,040.27 ms provider round trip is not a qualifying
phone latency result. Home instructions and pending acceptance are in
[doc 18](18-s4-voice-verification.md). Temporary Railway SSH access used for
initialization and verification was revoked and its local identity removed.

A public-catalog rate check at 2026-10-09T04:16:45Z bounds the four canary
reservations at US$0.002205 total: chat US$0.000532, embedding US$0.000083,
negative route US$0.001058, and quota attempt US$0.000532. This fits US$0.10
without sending a model request. The live runner rechecks rates before reserving;
account preflight remains incomplete and no canary key was created.


At 04:22 UTC the owner supplied the Ritu selection and partial Android export:
14/15 mobile attempts completed (p95 1,591.02 ms), 15/16 Wi-Fi attempts completed
(p95 4,500.29 ms), with one retained cancellation in each slice. All completed
trials exceed 700 ms. The conservative snapshot retains ₹6.408 of ₹50. Preserve
these partial results and tune a separately versioned candidate before further
uncached acceptance runs. [Doc 18](18-s4-voice-verification.md#owner-provided-android-results--042244-utc)
records the selection, provider/remainder diagnostics and unresolved acceptance.
No new paid request, deployment, provider switch or allowance change was made
while recording this export.
