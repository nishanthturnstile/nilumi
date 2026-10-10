# Phase 1 gateway and voice verification plan

> **Status October 10:** Verification harnesses implemented; S4 optimization closed by owner, latency acceptance deferred; S-VGW, deployed controls, owner acknowledgement and guarded route smoke closed for the ADR-052 restricted pilot; Phase 1 app foundation is next.
> **Date:** October 9, 2026.
> **Owner decisions:** Sarvam first, with ElevenLabs considered only if preference or latency requires it; ₹50 total for S4 synthesis, separate from S-VGW's final US$1.05 aggregate validation ceiling (ADR-051).
> **S4 measurement confirmed October 9:** First validated sentence available on the foreground phone → audible playback; each installed phone must meet p95 ≤700 ms on home Wi-Fi and mobile data.
> **References:** [Roadmap](../core/05-implementation-roadmap.md), [gateway evidence](../validation/s3/08-s3-gateway-verification.md), [ADR-046](../adr/adr-046.md), [voice architecture](../core/02-architecture.md#144-tts-and-speech-lifecycle).

**October 10 S-VGW follow-up:** [Completion plan and operator workflow](26-s-vgw-completion-plan.md)
records the implemented budget/key readback validation, ordered canary, exact quota
error proof and read-only used-key rejection verifier. Exact live quota and shutdown
passed; documentary forwarding and the negative-test pilot exception were accepted
in ADR-052. Durable controls, current owner acknowledgement and guarded route activation
are deployed and tested; one authenticated fixed-input smoke passed. Full app
integration remains Phase 1/2 work.

Complete both verification tracks before Phase 1 sign-off. S-VGW also remains a hard dependency for Phase 2's first family LLM or embedding call, together with the household acknowledgement. Passing these two tracks does not replace the other Phase 1 completion requirements.

**October 10 owner decision:** close the current S4 optimization pass and move
toward the actual app. Ritu and the deployed v8 playback remain the baseline;
this decision does not pass the ≤700 ms p95 gate or waive Phase 1 sign-off
requirements. Full benchmark and further latency tuning are deferred. Next,
finish S-VGW's outstanding controls and synthetic canary evidence, and begin
Phase 1's app foundation with synthetic data. Family LLM/embedding calls still
require S-VGW and the household acknowledgement. See
[the closure evidence](../validation/s4/25-s4-v4-both-phone-analysis.md#october-10-owner-closure-and-next-work).

## Current baseline

S3 selects Luna low for synthetic correctness only. Its receipts do not establish every gateway control required by S-VGW. The existing S1 speech endpoint generates WAV tones, and its turn stream uses canned sentences; S4 needs real synthesis through the deployed sentence playback path.

Sarvam's provider eligibility is green in [Tech Stack section 7](../core/03-tech-stack.md#7-provider-eligibility-and-data-policies-release-gate). ElevenLabs remains gated. S4 starts with reviewed synthetic sentence text so voice selection does not depend on family LLM traffic or require recordings.

The existing spike documents Node.js 24 and pnpm 12.9.1, with `ai` 7.0.130 and `@ai-sdk/gateway` 4.0.106 pinned. Reuse the spike's adapter, receipt parsing, budget accounting and playback behavior where appropriate, but its synthetic NLU adapter is not yet the shared household wrapper. Implementation must verify controls against the installed versions. This plan does not mark either gate complete or initiate paid calls.

## Delivery sequence and ownership

1. Prepare the gateway wrapper, control tests, canary ledger and real TTS playback harness locally. Keep the S3 evaluator disabled.
2. Inspect Vercel account controls and resolve the small-budget compatibility issue below before any canary request.
3. Run the capped synthetic gateway proofs, record evidence and revoke the canary key.
4. Present three or four Sarvam voices to the wife, then benchmark her preferred voice on both installed PWAs.
5. Review the evidence, record the household acknowledgement and demonstrate withdrawal enforcement before Phase 1 sign-off.

The implementation work covers harnesses, tests, timing and evidence. The owner handles account access and settings, acknowledgement and final acceptance. The wife selects the voice and judges its listening quality; device testing needs both phones. Local preparation for S4 can proceed while S-VGW's account checks are pending because Sarvam is a separate processor.

### Work packages and reviewable outputs

| Work package | Dependency | Output and exit check |
| --- | --- | --- |
| G1 — Account preflight | Owner account access | Dated controls/key/budget inventory; actual S3 allowance calculated from the preserved ledger; sub-dollar budget support resolved before paid dispatch |
| G2 — Shared gateway controls | Phase 1 role registry and wrapper | Chat, NLU, answer and embedding controls, receipt validation, terminal-error mapping and CI guard pass local tests; approved routes have provider records |
| G3 — Canary harness | G2; G1 before live execution | Frozen synthetic fixtures, conservative reservations, explicit probe manifest and content-free reports; dry run fits US$0.10 |
| G4 — Live proofs and shutdown | G1–G3 | Each required doc 08 row has matching evidence; no unresolved proof is counted as passed; canary key revoked and temporary access removed |
| V1 — Real sentence synthesis | Existing S1 playback; green Sarvam eligibility | Server-side Sarvam adapter, member-bound audio access, range-safe synthesis reuse, playback timing and ₹50 ledger; local lifecycle/security checks pass |
| V2 — Listening session | V1 | Same synthetic sentences across three or four voices; wife selects an acceptable voice; exact settings recorded |
| V3 — Phone benchmark | V2; frozen corpus and cost bounds | Frozen uncached trials, separate cache results, per-combination p50/p95, every failure, functional checks and reconciled costs |
| C1 — Gate review | G4; Phase 1 acknowledgement implementation | S-VGW reviewed and current household acknowledgement enforced before family LLM/embedding dispatch; S4 reviewed independently from V3 |

G2/G3 preparation and V1 can proceed independently. S4 does not require a successful LLM canary. G4 and the active household acknowledgement unlock family model traffic; passing S4 alone does not. S3 production latency and fallback acceptance keep their own validation work.

## S-VGW scope and proofs

### Account and spending preflight

Record dated, non-secret evidence of purchased credits, current balance and expiry, auto top-up off, no team BYOK credentials, and key identities and attribution. Verify the team budget is US$10 monthly with 50/75/100% alerts, the runtime key is US$8 monthly, and S3 has its separate cumulative evaluation key.

Calculate the S3 key allowance from its preserved ledger at setup: US$2.00 minus all conservative counted charges. The last recorded balance under that owner cap is US$1.722693540; it is not a fresh US$2 allowance. The runner's US$0.50 hard stop and historical entries stay intact unless separately migrated. The owner's October 10 [ADR-050 amendment](../adr/adr-050.md) gives S-VGW its own key and reservation ledger with a US$1 hard stop, including failed attempts and costs that cannot be reconciled.

**Compatibility check:** The October 10 dashboard and quota API both reject limits below US$1, matching Vercel's [CLI budget documentation](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets). The owner authorized US$1; backend creation/readback now gates independent synthetic probes. Lowering to tiny metered spend is unsupported, so the live quota proof remains pending until a supported method or accepted proof amendment exists. Do not deliberately exhaust the allowance. Read back a supported edit after documented propagation before making a rejection probe. [Doc 26](26-s-vgw-completion-plan.md) records live positive receipts, the failed negative probe and verified shutdown.

Gateway budgets are soft caps; the canary's durable reservation ledger is the spending limit. Existing runtime and evaluation keys are not used to trigger quota failures.

### Wrapper and local tests

Use the Phase 1 wrapper and role registry for chat, structured NLU, answer generation and embeddings. Pin model IDs and SDK versions. Record each enabled route's no-training status, published retention, supported storage control and fallback eligibility in the provider configuration.

Before paid calls, test these properties:

- Every enabled call sets `disallowPromptTraining: true`, a role-specific approved `only` list, and `store: false` where supported. Callers cannot override those controls or supply BYOK credentials.
- A CI guard rejects gateway model construction and direct provider calls outside the wrapper. The old synthetic evaluator is either isolated as tooling or explicitly covered by the guard.
- Missing, unknown, BYOK or out-of-list routing receipts stop further calls for the affected role. Record only permitted metadata, usage and costs.
- Budget exhaustion, credit exhaustion and `no_providers_available` are terminal, including when wrapped in the pinned SDK's error classes. Assert zero retries and zero fallback calls, with hard-cap degraded mode selected.
- Missing, outdated or withdrawn household acknowledgement prevents every new or queued LLM/embedding request. Test changed adults/processors and the withdrawing adult's veto with synthetic household records, including job-time rechecks.
- Fallback uses the same controls and receipt checks. A challenger cannot be enabled for family traffic before its own route and performance validation. Local failure injection proves control propagation; it does not establish live challenger acceptance.

### Live synthetic canary

Freeze a tiny reviewed fixture set with bounded output and call count. A server-selected canary mode accepts only the exact reviewed fixtures; it permits this synthetic verification before household acknowledgement without opening a runtime bypass for caller text or family data. Start with one small chat request and one embedding request through the wrapper; reserve maximum cost before each call. Stop on an unexpected route, missing cost/receipt evidence or an exhausted allowance.

The probe manifest identifies the fixture hash, role/model/provider, required flags, maximum input/output and cost, expected success or error, and the evidence collected. Include the non-compliant-route probe, any enabled live fallback and the final quota rejection probe in the call/cost bound. Even an expected rejection needs a reservation in case the request is unexpectedly accepted; failed or uncertain attempts keep their conservative charge. A replay is a new attempted call against the same ledger.

Prove the approved route's controls and routing receipts. Exercise any fallback intended to be enabled using synthetic inputs and controlled primary failure; leave unvalidated fallbacks disabled and their live acceptance pending. For embeddings, lack of a verified no-training route means full-text/trigram retrieval only, with embeddings disabled and the evidence row explicitly scoped.

Select a currently documented route that cannot meet the no-training policy for the negative probe. A model/provider mismatch alone does not prove no-training enforcement. If no suitable route can be identified, leave that proof pending rather than sending requests without the required controls.

Capture the serialized storage option under the pinned SDK and cite the gateway's supported forwarding contract. Distinguish proof of `store: false` sent to the gateway from evidence that it reaches the provider; request capture alone cannot pass ADR-046's provider-forwarding requirement or prove ZDR.

After positive probes, edit only the canary key's budget to its counted spend, without deleting/recreating the budget. When readback confirms propagation, send one request and expect HTTP 402 `quota_for_entity_exceeded`; verify the wrapper enters degraded mode without retry or fallback. If the setting is unsupported, this proof remains blocked by the compatibility check.

Reconcile spend conservatively, revoke the canary key in all exit paths, remove temporary access and record shutdown. Append results to [doc 08's existing evidence register](../validation/s3/08-s3-gateway-verification.md#s-vgw-evidence-restricted-pilot-accepted), distinguishing live, local and dashboard evidence. Every required proof must be satisfied or explicitly resolved by an accepted baseline amendment before S-VGW passes.

## S4 voice selection and playback

### Listening session

Shortlist three or four available `bulbul:v3` en-IN voices from the [Sarvam voice catalog and REST contract](https://docs.sarvam.ai/api-reference/text-to-speech/convert). Use the same six to eight synthetic sentences for each: shopping confirmations, dates and numbers, a short answer, unfamiliar names, and a small Tamil/Tanglish compatibility sample. English remains the release language.

Present candidates as A/B/C/D in varied order on the installed iPhone, at the same pace and volume. The wife scores clarity, naturalness and comfort, then picks a preferred voice and, if useful, a runner-up. Verify the preferred voice on Android too. Record the exact voice ID, model, language, pace, codec and sample rate.

Use sentence clips and the established playback queue, audio unlocking, cancellation and resume behavior. Verify iOS range requests do not trigger repeated paid synthesis. Use authenticated, member-bound speech access; private sentence audio is not placed in the shared phrase cache. Cache only fixed synthetic/template phrases using a key that includes all audio-affecting settings.

### Latency measurement

The owner-confirmed S4 measure starts when the first validated sentence becomes available to the foreground phone, before dispatching its speech fetch, and ends at audible reply playback. It includes server access, synthesis or cache lookup, audio transfer and browser playback startup. Do not defer the start until a later `speech.ready` event or until synthesis completes. Record provider latency separately. Use a monotonic client clock for this interval; verify actual audible onset in a sample so silence or a premature browser event does not count as speech.

Benchmark the selected voice through deployed Railway from the installed iPhone and Android on home Wi-Fi and mobile data. Plan at least 50 uncached first-sentence trials per phone/network combination, using short and medium sentences in a frozen corpus. Record sentence lengths and keep the first request after deploy in the set. Report p50/p95 per combination, with cold starts identifiable. Report template-cache hits separately; they cannot make the uncached result pass.

The owner confirmed that all four combinations must pass independently; pooling results across them cannot qualify S4:

| Installed PWA | Network | Required uncached first-audio p95 |
| --- | --- | --- |
| iPhone | Home Wi-Fi | ≤700 ms |
| iPhone | Mobile data | ≤700 ms |
| Android | Home Wi-Fi | ≤700 ms |
| Android | Mobile data | ≤700 ms |

Use nearest-rank p95 (`ceil(0.95 × n)` after sorting). Record every attempted trial, failure and blocked-playback outcome. A benchmark with missing playback does not pass solely because successful requests are fast. Background/resume and cancellation are separate functional checks; user time spent tapping Resume is not removed from a failed foreground trial and recast as a fast result.

**Acceptance:** the wife chooses an acceptable voice, foreground first-audio p95 is ≤700 ms in each phone/network combination, and playback ordering, cancellation, interruption/resume, voice-reply modes and text-only degradation pass. The architecture's 600 ms TTS target remains unchanged; 601–700 ms passes S4 with an explicit performance follow-up. Full release-to-first-audio latency remains a separate product gate involving STT and NLU.

Reserve against the ₹50 total S4 cap before every synthesis. It covers listening clips, benchmark trials, failures and repeats. Freeze a corpus that fits the current price and cap; if the benchmark cannot finish within ₹50, stop with an incomplete result. Do not reduce the sample after seeing results or silently fund repeats. Existing deployment/hosting costs retain their own accounting.

**Cost feasibility, checked October 9:** Sarvam's [published Bulbul v3 price](https://www.sarvam.ai/api-pricing) is ₹3 per 1,000 characters. An illustrative four-voice, six-sentence listening set averaging 50 characters costs ₹3.60; 200 uncached trials averaging 50 characters cost ₹30.00. That leaves ₹16.40 before applicable tax, setup probes, failures and tuning. This is a planning estimate, not measured spend: verify the account's billing/counting rules, total corpus characters and any charges before freezing. Reserve uncertainty conservatively. Replay already-generated listening clips locally; each uncached timing trial must perform fresh synthesis.

If Sarvam's preferred voice fails, first inspect sentence length, synthesis time, network transfer, browser startup and leading silence. Try bounded tuning or let the wife consider the runner-up within the same cap. ElevenLabs is considered only after its eligibility checks pass, with a fresh comparison and explicit accounting for the remaining allowance. Any change to the sentence-clip architecture needs separate review.

Record S4's selection, raw timing metadata, cost and acceptance in a dedicated result document; keep private material outside committed fixtures. Update the roadmap and exact provider/voice configuration only from accepted evidence.

## Phase 1 completion evidence

- S-VGW's required account, routing, storage and failure proofs are recorded; the canary key is revoked.
- Household acknowledgement is visible and current for both adults; withdrawal blocks new and queued model calls while deterministic lists, tasks, reminders and inbox remain available.
- S4 has the wife's chosen voice, timing results, functional playback evidence and spend within ₹50.
- Both gates are marked complete only after evidence review. Gateway provider rows become **Green — founding-household pilot only** once S-VGW and the household acknowledgement pass; production ZDR and other Phase 1 requirements retain their own gates.

## Decisions carried into implementation

Sarvam first and the ₹50 S4 cap are confirmed. On October 9, the owner also confirmed the sentence-available-to-audible-playback interval and independent acceptance on both phones over home Wi-Fi and mobile data. Release-to-first-audio latency remains a separate product metric.

No user clarifications remain for this plan. Small-budget support, a valid non-compliant-route probe, provider-forwarding evidence and live fallback eligibility are technical preflights to resolve before claiming gateway acceptance. Local harness preparation can proceed; live acceptance uses the confirmed measurement definition and frozen corpus/cost bounds.


## October 9 implementation evidence

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

This is verification infrastructure. Phase 2 still needs durable reviewed gate
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
[doc 18](../validation/s4/18-s4-voice-verification.md). Temporary Railway SSH access used for
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
uncached acceptance runs. [Doc 18](../validation/s4/18-s4-voice-verification.md#owner-provided-android-results--042244-utc)
records the selection, provider/remainder diagnostics and unresolved acceptance.
No new paid request, deployment, provider switch or allowance change was made
while recording this export.
