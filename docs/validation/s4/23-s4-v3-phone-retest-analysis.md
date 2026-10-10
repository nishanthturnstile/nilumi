# S4 v3 Android retest — October 9, 2026

**Status: partial owner phone evidence; S4 remains unaccepted. The next focused
experiment is provider connection lifetime, with a separate silence-quality
investigation and finer ledger timings.**

That focused batch is now deployed as v4. See [implementation validation and
current phone test instructions](24-s4-v4-connection-and-ledger-validation.md).
The measurements below preserve the v3 retest evidence.

The owner supplied [this v3 export](../../../spikes/s1/evals/results/s4-android-stream-v3-2026-10-09.json),
exported at 08:27:02 UTC, and confirmed both cancellations were caused by tapping
Stop. The [computed stage analysis](../../../spikes/s1/evals/results/s4-android-stream-v3-analysis-2026-10-09.json)
records nearest-rank statistics, paired durations, connection details and budget
arithmetic. JSON values are preserved; only line endings were normalized. No
live provider call, deployment or ledger mutation was made for this analysis.

## Results and comparison

The report contains 21 distinct uncached attempts: three Wi-Fi smokes and nine
benchmarks per network. Each benchmark slice has eight completions and one
manual Stop. All rows report zero underruns. Ritu, Bulbul v3, 22,050 Hz, the
frozen sentences and 20 ms startup match the deployed candidate. All client
estimates used `output-timestamp`, with 48 kHz contexts and 24–25 ms reported
output latency. The output route and phone/OS note were not supplied.

| Android network | v2 p50 / p95 | v3 p50 / p95 | v3 completions ≤700 ms |
| --- | ---: | ---: | ---: |
| Home Wi-Fi | 684 / 816 ms | 583 / 760 ms | 7 / 8 |
| Mobile data | 638 / 2,984 ms | 594 / 772 ms | 6 / 8 |

Thirteen of sixteen completed benchmarks meet the target. Typical latency is
lower than the [previous run](20-s4-streaming-validation.md), but these are
sequential, different-sized samples with a changed onset capture method. They
do not isolate the improvement caused by the code. Eight observations make p95
equal the maximum; the missing multi-second provider stall in this sample does
not establish its elimination. No iPhone trials or complete ten-fixture coverage
are present. The audible checkbox is reported true, not an independent physical
measurement from this review.

Manual Stops are user cancellations, not spontaneous playback faults. Their
rows and reservations remain preserved, and the existing zero-failed-attempt
acceptance rule is unchanged. Both server traces report completed synthesis
with the descriptor subsequently cancelled; these are distinct lifecycle events.

## What the stage measurements say

These values cover completed benchmarks only. Each percentile is computed
independently and must not be added to reconstruct an end-to-end percentile.

| Stage | Wi-Fi p50 | Mobile p50 | Decision |
| --- | ---: | ---: | --- |
| Authentication | 0.23 ms | 0.26 ms | No performance refactor justified |
| Prepared descriptor lookup | 0.009 ms | 0.011 ms | Keep the shared index |
| Durable ledger operation | 34.43 ms | 34.33 ms | Investigate its tail; keep durability |
| Request to provider socket assignment | 0.90 ms | 1.35 ms | Warm reuse works; new connections take 127–137 ms across this report |
| Provider request to headers | 102.53 ms | 88.54 ms | Connection/network/provider response combined |
| First raw body to first validated PCM | 169.66 ms | 171.44 ms | Delivery/framing/decoder interval; decoder CPU is not isolated |
| First server PCM to response creation | 0.076 ms | 0.065 ms | Extra descriptor disk wait has been removed |
| Mixed transit/delivery remainder | 157.58 ms | 183.59 ms | Defer geography; do not call this pure network RTT |
| Phone response headers to first PCM | 1.80 ms | 1.90 ms | No evidence of a large extra browser body hold |
| Phone first PCM to onset | 86.63 ms | 84.43 ms | Includes generated silence and output scheduling |
| Leading silence | 40.77 ms | 38.82 ms | One mobile clip has a 331.66 ms tail |
| Phone PCM to onset excluding silence | 46.69 ms | 45.61 ms | 20 ms cushion plus scheduling/output estimate |
| Maximum per-chunk frontend processing | 2.10 ms | 2.20 ms | Worklet/library rewrite has low priority |

The mixed remainder is `phoneFirstPcm - clientFetchStart - serverResponseReady`,
using elapsed durations. It includes inbound travel, pre-route infrastructure,
return travel and reader delivery; it does not compare unsynchronized wall
clocks. Client resource timing reports HTTP/2 to the application; provider socket
traces report HTTP/1.1. These are different network legs. Zero DNS/connect/TLS
resource fields alone do not prove no connection cost.

## The three completed near-misses

1. **Wi-Fi shopping, 760.14 ms.** Socket 3 had served the smokes; after a
   5,373 ms origin completion gap, this benchmark used new socket 4. Assignment
   took 126.66 ms. Later requests on socket 4 reused it after 1.75–3.05 seconds
   and typically assigned in approximately 1 ms. The first mobile request used
   new socket 5 after a 12.65-second gap, with 130.60 ms assignment, but its
   favorable remainder kept onset at 634.43 ms. Connection churn is therefore
   real; it does not explain every slow result. The trace does not identify the
   peer or policy that closed the previous socket.
2. **Mobile date, 772.33 ms.** A reused socket assigned in 0.81 ms. Phone PCM
   arrived at 395.60 ms; the clip contained 331.66 ms of leading samples before
   the current amplitude threshold. The other 45.08 ms is consistent with
   normal scheduling/output overhead. This is a generated-prefix/onset issue,
   not slow frontend conversion or a reconnect. An amplitude threshold does
   not establish that all preceding sound is disposable silence.
3. **Mobile answer, 735.63 ms.** The ledger operation took 162.53 ms, versus a
   slice p50 of 34.33 ms. The atomic save itself took only 18.60 ms and the
   in-process queue wait was 0.0027 ms. Approximately 143.93 ms occurred in the
   rest of the ledger transaction. The existing marks cannot split lock-file
   open/write/sync, read/parse/validation, cleanup or event-loop/storage delay.
   Removing the durable reservation save would target the wrong measured stage.

## Next experiments, in order

**1. Provider connection lifetime.** Extend the connection diagnostics with
content-free disconnect reason/time and effective idle policy. Use the actual
Node 24.21.0 / Undici 7.29.1 behavior as the baseline: its documented idle
default is four seconds, overridable by server hints. The observed gap/new-socket
pattern is consistent with that policy, but does not prove client-side closure.
[Matching Undici Client documentation](https://github.com/nodejs/undici/blob/v7.29.1/docs/docs/api/Client.md).

Trial a process-wide, Sarvam-only pinned dispatcher/pool with two connections,
`pipelining: 1` and approximately 15-second idle lifetime, subject to provider
hints. Keep the request-specific dispatcher rather than changing unrelated
providers' global pool. Retain aborts, TLS verification, redirect rejection,
bounded deadlines, no automatic retry of uncertain synthesis and one durable
reservation per utterance. Do not synthesize periodically to keep it warm.

Local/fake controls must cover body completion versus application persistence,
3/6/12-second idle gaps, provider-initiated close, Stop before/after headers,
two simultaneous requests and process restart. Compare cold and reused traces
in a separately versioned phone candidate; cold first requests remain measured.
Potential savings apply to avoidable reconnects, not already reused sockets or
the independent silence/ledger tails.

**2. Ledger substage instrumentation.** Add optional timing around lock acquire,
lock write/sync, ledger read, parse/validate, callback/save and lock cleanup, plus
an event-loop-delay indicator if necessary. Use bounded synthetic local
concurrency/storage controls first. Preserve the current durable-before-dispatch
contract. Do not cache spending, remove fsync, auto-recover uncertain attempts,
or move latency outside the clock only in the benchmark. Decide on a smaller
transaction or storage design only after the long substage is identified.

**3. Conservative prefix investigation.** Inspect already-generated fixture
audio offline if the durable clips remain available; no new synthesis is needed
to examine this date clip. The server keeps valid completed clips, but the export
contains timings rather than audio, so waveform/listening validation remains
pending. Measure low-energy windows and quiet first consonants against the
current 164-amplitude estimator. If initial silence is safely separable, trial
a streaming detector with a retained guard, strict removal bound and fail-open
unmodified playback for ambiguous prefixes. Never remove internal pauses or
wait for the complete utterance before starting. Export original/removed/residual
frames, preserve bytes after the prefix, and reverify physical onset and quality
on both phones. Use separate candidate evidence for altered audio.

The [Sarvam HTTP streaming schema](https://docs.sarvam.ai/api-reference/text-to-speech/convert-stream)
documents codecs, rates, preprocessing and caching, but no initial-silence
control. Keep benchmark caching disabled and the chosen voice/settings frozen
for the connection experiment. Temperature, pace or a new model would add a
voice-quality variable; they are not a documented silence fix. WebSocket,
16 kHz/codecs, 10 ms startup and AudioWorklet remain conditional, lower-priority
experiments. The raw-body-to-PCM interval needs raw byte-count/parser-state and
decoder-work marks before treating it as removable parser CPU. Hosting migration
remains deferred as requested.

## Tooling validation and budget

The offline `voice:report` command initially refused v3 exports because its strict
trial schema omitted `clientTrace` and `serverTrace`. It now permits optional
`s4-latency-1` diagnostics with additive fields while retaining strict acceptance
metadata. Diagnostics do not determine acceptance. A subprocess regression
checks full valid coverage, missing audible verification, a cancelled row and
rejection of undeclared acceptance fields. The owner's actual export now produces
the same four summaries as the phone, with exit code 1 for incomplete/failed
acceptance rather than a parsing refusal. This is a local reporting correction;
the deployed player remains v3.

Lint, type-check, **285 tests** and the production build passed after the
reporting fix. An independent replay through the actual summarizer exactly
matched the phone's four summaries. Unique IDs, trace ordering, lifecycle
states, artifact fingerprint, preserved JSON values and local document links
also passed verification.

The export's cumulative reservation snapshot is **₹16.0416 / ₹50**, leaving
**₹33.9584**. A fresh complete four-slice run has a conservative maximum of
₹32.832, leaving only **₹1.1264** for other work at that snapshot. The 21 rows
represent ₹3.3264 of conservative allowances; ₹0.6516 of the increase from the
earlier ₹12.0636 snapshot is not represented by these rows. Snapshots alone
cannot attribute other account activity. No reservation was released or reset.

Do the next local/fake checks first. Any subsequent paid diagnostic allowance
must fit the remaining ₹1.1264 headroom at a refreshed actual ledger balance.
Repeating all four three-sentence smokes costs ₹1.6704 and would no longer
preserve the complete-run allowance. Avoid another full benchmark on the current
candidate while the three identifiable tails are still under investigation.
S-VGW and final phone acceptance remain independent gates.
