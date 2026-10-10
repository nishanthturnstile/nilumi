# S4 application optimization candidate — October 9, 2026

**Status: reviewed, validated and deployed; ready for the owner phone retest. Physical phone acceptance remains pending.**

The owner has supplied a partial Android retest. See [v3 phone analysis](23-s4-v3-phone-retest-analysis.md)
for the new measurements and updated budget; the live deployment checks below
preserve their earlier snapshot.

Candidate `s4-bulbul-v3-stream-3` implements the first application/player batch
from the [low-level plan](../../plans/21-s4-low-level-latency-plan.md). Profile:
`http-pcm-coordinator-20ms`. Ritu, the frozen corpus, Bulbul v3 settings and
HTTP WAV-to-PCM transport remain the controlled baseline. Hosting migration,
silence trimming, a longer provider idle timeout, WebSocket, other codecs and
production pipeline redesign are later evidence-dependent experiments.

## Implementation

- A bounded, process-wide [attempt index](../../../spikes/s1/lib/voice/attempts.ts)
  shares descriptor/cancellation ownership across Next route bundles. Fresh
  descriptors are registered after their durable preparation write. Recovered
  descriptors load from disk once, with concurrent loads coalesced. Producers
  and readers pin entries so the 1,000-entry bound cannot evict active state.
- The [service](../../../spikes/s1/lib/voice/service.ts) initializes directories during
  preparation, skips guaranteed fresh benchmark/smoke cache misses and replaces
  repeated descriptor reads with synchronous owner/ID/expiry/cancellation
  checks. First PCM forwarding has no subsequent descriptor disk read. Durable
  reservation and actual ledger validation still precede dispatch; budget state
  is never trusted from the index. This does not generate speech before the
  agreed phone-boundary clock starts.
- Stop invalidates shared descriptor state and revokes its readers immediately;
  DELETE acknowledges only after the cancellation write is durable. A late
  provider chunk is checked for abort before it can enter the spool. Range
  replies recheck cancellation after awaiting the completed representation.
  Another valid descriptor listening to the same fixed phrase can retain its
  own reader. Reservations remain charged after Stop, failure or uncertainty.
- The [player](../../../spikes/s1/lib/voice/playback.ts) uses a 20 ms startup cushion,
  retains split-sample handling and one audio clock, and freezes the onset
  estimate near first sound rather than resampling its mapping only at
  completion. The amplitude threshold and v2 fallback formula remain explicit;
  no leading audio is removed. The actual output estimator is exported.
- The [provider monitor](../../../spikes/s1/lib/voice/timing.ts) uses request-to-socket
  diagnostics and per-origin async context to record socket reuse, assignment
  wait, socket-to-headers wait and idle intervals. It uses WeakMaps and one
  process-wide subscriber set. It never serializes raw request/response headers,
  URLs, text, email, credentials or audio. A bounded optional `x-request-id`
  value supports escalation when the provider returns one. Native fetch/pool
  defaults are retained until actual retest evidence supports changing them.
- Versioned storage keeps v1/v2 phone evidence separate. Both previous selection
  formats remain readable, including a v2 preferred voice that differs from the
  original v1 choice. The existing cumulative ledger and volume are reused.

## Trace contract

The report includes `profile`, `startupBufferMs`, `traceSchema`, an optional
phone/OS/output note and per-attempt `serverTrace`/`clientTrace` records.
Schema: `s4-latency-1`.

Server marks use the route's monotonic start before cookie/session work:
authorization/prelude, descriptor source/lookup, ledger queue, ledger operation,
reservation save, provider dispatch, first validated PCM, response creation,
provider EOF and completed-audio persistence. `Server-Timing` exposes the early
auth/descriptor/ready durations. Provider raw-body and connection durations use
the provider request's own start. Socket IDs are process-local pseudonyms.
`previousCompletionGapMs` is the gap from the previous completed request to this
origin; it is not proof that this request used that previous socket. Unknown
values are absent/null, not zero-cost claims.

Client marks include fetch start, headers, first PCM, per-chunk processing,
arrival gaps, leading silence and AudioContext/output capabilities. Supported
Resource Timing fields describe browser DNS/connect/TLS/header intervals and
protocol; zero/absent fields do not prove zero network cost. Do not subtract
wall-clock timestamps between hosts or add independently computed percentiles.

The authenticated `?trace=1` read is content-free and cannot synthesize. It
remains available for a cancelled descriptor until its ordinary expiry. Traces
are persisted after completion/failure without holding up first audio or replay
EOF. Missing optional trace persistence does not alter playback status or
release a reservation. Shared fixed-phrase listeners explicitly identify a
shared producer trace; backend outcome and the caller's descriptor cancellation
are separate fields. Metadata/trace reads are bounded after onset, including
failed/cancelled client rows.

The timer still starts when the validated sentence is available on the phone,
before its speech fetch. The onset is an output-clock estimate and needs fresh
physical verification. A changed estimator can change a reported value without
changing physical latency. No desktop result establishes the phone p95 target.

## Review and local validation

One focused correctness review covered dispatch ordering, ownership, active-entry
eviction, cross-bundle state, Stop/range races, restart uncertainty, trace
privacy and output-clock behavior. It identified and fixed the pending-range
cancellation race and ensured cross-route state is process-wide rather than
module-local. The live-check review also fixed completed replay overwriting
the original synthesis trace; memory and disk now retain its evidence across
replay/restart. No separate-agent review was used.

All required checks passed: Biome/ESLint/gateway guard, TypeScript, **284 tests**
and a production Next.js 16.3.8 build on Node 24.21.0 / pnpm 12.9.1. No dependency
or provider payload change was needed. Built client assets contain none of the
server provider credential-header or runtime-monitor markers.

The added/extended controls prove coalesced descriptor loads and bounded pinning;
durability before first provider bytes; owner-only and partial traces; Stop
before first PCM rejecting late chunks; cancelled range versus a surviving
fixed-phrase listener; preserved reservations/cancellation in a genuinely new
Node process; v2 selection migration; socket reuse against a local fake HTTP
provider; frozen onset mapping; and separately loaded route modules sharing
prepared state; and completed replay after process restart retaining the original
synthesis trace and charge. Existing underflow, corruption, app-switch, duplicate-reader,
hard-cap and gateway gates also pass. Local/fake controls make no paid calls.

## Deployment and live validation

Final Railway staging deployment `ca85d071-1901-4274-8953-40456103e084` reached
**SUCCESS** and was checked at 06:57 UTC. Initial v3 deployment
`1ee38c88-0782-4c9b-bcc3-c9224f1a9785` supplied the first smoke evidence before
the trace-preservation correction.
It targets only `nilumi-s1` in the existing staging environment and retains the
one-replica `/verification` volume. The upload is a separate source archive,
excluding dotenv files, dependencies, generated builds and private recordings.
Existing working-tree edits are not committed or pushed by this deployment.

The [live evidence](../../../spikes/s1/evals/results/s4-stream-v3-deployed-check-2026-10-09.json)
records the source fingerprints and every check. The desktop free audio UI
passed. Its public HTTP check delivered 61,740 PCM bytes in 38 fragments,
first chunk 374.60 ms and EOF 843.20 ms, without changing the ledger. Anonymous
budget/diagnostic reads returned 401, HEAD 405 and an extra-field payload 400.
Fresh metadata/trace reads returned 409 without dispatching.

One fixed, uncached `short` check on each v3 deployment reserved exactly ₹0.0864
per call, **₹0.1728 total**, without retry. The final deployment returned 56,448
validated PCM bytes, complete metadata and a content-free trace. Its descriptor
source was `prepared`: lookup 0.05 ms, ledger operation 25.70 ms, reservation
save 13.89 ms and provider dispatch at 26.98 ms from route entry. First PCM was
available at 486.91 ms and response creation at 487.02 ms: approximately
**0.12 ms** between the two, with no descriptor disk wait. Provider EOF was at
666.33 ms. The desktop browser received a prefix at 671.60 ms and EOF at
868.20 ms. Compare marks on the same host; these do not establish a physical
phone onset or a controlled v2/v3 performance improvement.

The final probe's first provider connection was cold: request-to-socket
153.82 ms and socket-to-headers 116.79 ms. First raw body was 274.43 ms from
provider dispatch and first PCM 459.41 ms. This confirms the tracer works on
the actual deployed fetch path, but does not prove idle-timeout churn between
sentences. Measured leading silence differed between the two probes
(146.12 versus 26.98 ms); neither justifies blanket trimming or a latency promise.

On the final deployment, the initial probe's ID replayed a two-byte range with
206 after process restart, preserved its original dispatch/first-PCM trace and
added no reservation. DELETE returned 200, subsequent audio GET 404 and its
cancelled-descriptor trace remained readable with 200. No extra synthesis was
needed for these checks.

The initial snapshot was ₹11.5596. The live snapshot before agent checks was
₹11.8908; that intervening ₹0.3312 is outside these checks and cannot be fully
attributed from snapshots alone. After the two bounded checks, cumulative
reservations are **₹12.0636 / ₹50**, leaving **₹37.9364**. The existing Ritu
choice remains unchanged. The fresh full-corpus allowance of ₹32.832 remains
protected; do not reset the budget or release uncertain reservations.

## Owner retest

1. Reload online in the installed app and open
   [staging voice testing](https://staging.nilumi.in/voice). Confirm the displayed
   version is `s4-bulbul-v3-stream-3` and the saved voice is Ritu.
2. Play the free audio check first on each phone. Verify the complete tone,
   foreground playback and Stop; this uses no speech credits.
3. Select home Wi-Fi and run **Try 3 uncached sentences**, letting all three
   finish. Repeat on mobile data. Use the same audio output as the earlier run,
   and optionally describe phone/OS/output in the note field.
4. Download the JSON from each phone after its two networks. Keep v2 exports;
   send the new reports for stage and connection analysis before another full
   50-trial run. Reverify audible onset for this candidate.

Four three-sentence phone/network checks reserve ₹1.6704; with the two bounded
server smokes they total ₹1.8432 within the proposed ₹2 screening allowance.
At the final snapshot, those phone checks plus a fresh complete 200-trial run
would leave ₹3.434, before any other listening or account activity.
Exploratory checks remain excluded from acceptance. The eventual four slices
still require full 50-trial coverage, unique uncached successes, zero failed
attempts, actual onset verification and p95 ≤700 ms. Manual Stops and slow
provider responses remain in their reports. S-VGW remains an independent gate.
