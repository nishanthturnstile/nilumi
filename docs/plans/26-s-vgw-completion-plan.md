# S-VGW completion plan and implementation

> **October 10, 2026 — closed:** S-VGW is accepted for the restricted founding-household pilot under [ADR-052](../adr/adr-052.md). Exact live quota rejection and used-key revocation passed. The historical negative-policy failures remain failed under the approved pilot exception. Durable controls are deployed and validated; household acknowledgement and guarded route activation are verified, including one authenticated smoke call.

**Final evidence:** [Pilot acceptance artifact](../../spikes/s1/evals/results/vgw-pilot-acceptance-2026-10-10.json).
The fifth isolated round passed managed OpenAI chat and 768-dimension embedding,
then performed 318 bounded synthetic quota warm-ups. Authenticated backend spend
was US$1.00071398 against the US$1 cumulative key limit. The final tiny request
returned **HTTP 402 `quota_for_entity_exceeded`**, with no retry or fallback.
Deletion returned 204, readback 404, and the same previously successful credential
returned 401. All temporary canary credentials were removed.

All-round conservative counted spend is **US$1.00428 / US$1.05**; all-round metered
spend is **US$1.0007299**. Prior US$0.002564 counted charges were carried forward.
The original S3 ledger and all four failed diagnostic rounds remain preserved.
The [Vercel reproduction](../validation/s-vgw/27-s-vgw-policy-reproduction.md) remains local and unsent.

| Item | Final status |
| --- | --- |
| Separate team/runtime/evaluation budgets and US$1 canary minimum | Validated; US$0.10 support is unavailable and replaced by the approved US$1.05 total test ceiling |
| Managed OpenAI chat/embedding, no-training receipts and 768 dimensions | Validated for the approved primary synthetic route; fallbacks disabled |
| Canary deletion, used-credential rejection and local secret removal | Validated for all five rounds |
| Aggregate accounting and exact live quota rejection | Validated; 402 with `quota_for_entity_exceeded`, conservative reservations and persistent halt |
| Storage forwarding and retention | Accepted documentary evidence: published contracts plus pinned SDK serialization; no downstream capture or ZDR claim |
| Explicit negative policy rejection | Original four HTTP 500 proofs failed; ADR-052 accepts the pilot exception with primary-only routes and a fresh local catalog guard |
| Durable privacy, budgets, withdrawal and queued dispatch controls | Deployed and validated; 372 local tests, 13 deployed PostgreSQL control cases and 15 live HTTP checks pass; lint/type-check/build pass |
| First family call | Authenticated founding-household route activated and smoke validated after the owner recorded the current notice; complete app/structured NLU integration remains Phase 1/2 work |

## Current activation work

**Deployment, acknowledgement and guarded activation closed October 10.** [Deployment evidence](../../spikes/s1/evals/results/vgw-pilot-deployment-2026-10-10.json) records the live database/app IDs, reviewed source archive hash and content-free checks.

PostgreSQL **18.6** and the privacy controls are online in the existing Railway
**staging** environment, Singapore. The owner explicitly authorized deployment.
The database has persistent storage and no public domain or TCP proxy. Its service
is limited to 0.5 GB memory and one vCPU. The existing `/verification` volume,
stable sign-in secret, Resend configuration and S4 settings are preserved.

The two supplied adult addresses and Nishanth's owner role are configured in the
live household row, with evidence version `s-vgw-adr052-pilot-v1`. Actual addresses
remain in the private configuration; examples and public evidence contain none.
A separate restricted app login can operate privacy and reservation rows, but
cannot change accepted evidence, owner, adult membership, monthly cap or schema.
No migration-owner credential is configured on the app. The dedicated runtime
key is configured; `GATEWAY_PILOT_ENABLED=true` after verified owner acknowledgement
and the fixed authenticated smoke. Legacy S3 evaluation stays off.

Live validation passed:

- All **13 PostgreSQL control cases**, including concurrent reservations,
  withdrawal and stale queued jobs, receipt settlement, unknown-cost halts,
  client/worker reconnection persistence and restricted-role permissions.
  These use isolated synthetic schemas; no paid provider requests occur.
- The actual restricted app login: both adult roles can read state; missing
  acknowledgement blocks reservations; administrative changes are denied;
  synthetic withdrawals for both adults work and are rolled back.
- **15 HTTP checks**: signed-out/invalid/non-member refusal, both adult roles,
  explicit owner attestation, cross-origin/stale-notice/identity-injection
  refusal and disabled family routing. Controlled signed test sessions verify
  role binding; they do not claim both humans completed a new email-code login.
  The existing real owner browser session was separately verified.
- Lint, type-check, all **372 tests** and production build pass. Live testing
  found and fixed the proxy-origin mismatch: production mutations require the
  explicit canonical HTTPS `GATEWAY_PILOT_ORIGIN=https://staging.nilumi.in`;
  forwarded headers cannot override it. Use the canonical staging hostname.
- All temporary test schemas, test SQL roles, SSH access, tunnel and extracted
  credential copies are removed. Both persistent volumes remain. At the initial deployment validation, the real
  household had no acknowledgement, privacy events, reservations or halts.
  Reconnection and app redeployment are tested; no database server restart or
  recovery rehearsal is claimed. Additional paid Gateway requests: **zero**.

**Household acknowledgement is recorded and verified** at 07:47:14.460 UTC for
both adults, the current notice and processors, with no withdrawal. It survives
redeployment. The bounded route is enabled and one fixed authenticated smoke
passed; unauthenticated and sensitive requests remain refused. See the
[activation evidence](../../spikes/s1/evals/results/vgw-household-activation-2026-10-10.json)
and the closing section below. Total conservative validation including activation
is **US$1.004284 / US$1.05**; historical canary accounting is unchanged.

**Next: Phase 1 app foundation, typed turns first.** Build invite-only sessions,
member-scoped saved turns, visible transcript/echo cards and reliable reconnect
without duplicates; then integrate voice and complete recovery/device checks.
S4 timing, production ZDR, external households and complete Phase 1 sign-off
retain their separate gates.

The app was deployed from a frozen, tested local source upload, not a GitHub main
commit. Preserve the recorded source archive and ship these privacy controls in
future deployments; a GitHub main auto-deploy must not replace them with older code.

## Operator configuration reference

Apply the additive schema only with a migration-owner connection. The initialization
command is `pnpm gateway:pilot:init --apply` with the private `--config` and reviewed
`--evidence` paths; it does not acknowledge the notice or clear vetoes. Keep owner
credentials out of app variables. Required app settings are the restricted
`GATEWAY_DATABASE_URL`, dedicated `VGW_RUNTIME_API_KEY`, canonical HTTPS
`GATEWAY_PILOT_ORIGIN` and explicit `GATEWAY_PILOT_ENABLED` switch. Preserve stable
sign-in and verification-volume state. Never replay a halted canary or reset a ledger.

## Historical rounds and original operator plan

The following sections preserve the original, superseded ordering and intermediate
results. ADR-052 permits independent quota validation without repeating the four
failed negative probes. Use the current closure and activation checklist above.

## Results and remaining work

| Step | Evidence | Remaining exit condition |
| --- | --- | --- |
| Account and budgets | Authenticated backend: team US$10 monthly; runtime US$8 monthly; evaluation US$1.72269354 cumulative; canary US$1 cumulative. Dedicated keys have Team attribution and 50/75/100% alerts. Auto-reload disabled; no configured BYOK. | Continue to preserve the S3 ledger; runtime/evaluation credentials are prepared locally, not deployed or enabled. |
| Positive routing | Luna chat and `text-embedding-3-small` succeeded with managed OpenAI, no-training, one provider attempt and cost receipts. | Fallbacks remain disabled; no live challenger acceptance is claimed. |
| Storage and retention | Pinned SDK serialization plus the exact Luna model's published forwarding contract; published OpenAI retention recorded in `config/providers.md`. | Gate review must distinguish documentary forwarding from direct provider observation. No ZDR claim. |
| Negative policy | Arcee and Schematron no-training-ineligible routes returned HTTP 500 in four isolated rounds; streaming and non-streaming both failed. Logs show zero metered cost. Wrapper stopped and retained the reservation. | Diagnose and obtain an explicit policy rejection. A generic server error does not pass. |
| Live quota | Dashboard rejects US$0.10; quota API rejects `limitAmount < 1` with HTTP 400. Local pinned SDK tests verify exact 402 mapping and zero retries/fallbacks. | Supported US$1 key-exhaustion runner implemented and locally tested under the US$1.05 aggregate cap. Execute only after explicit policy rejection passes; no live 402 was observed. |
| Shutdown | DELETE returned 204; key readback 404; the same previously successful credential returned 401 on `GET /v1/credits`. Local canary credential and capture private key removed. | Passed for this run; preserve its failed report and durable ledger. |
| Family gate | Tests require accepted S-VGW and current acknowledgement, including queued-call rechecks and withdrawal. | Remaining S-VGW proofs plus durable household acknowledgement in the Phase 1 foundation. |

The [content-free live artifact](../../spikes/s1/evals/results/vgw-live-controls-2026-10-10.json)
contains account readbacks, probe reports, spend, deletion, inference log metadata
and shutdown. It contains no prompt/response content or credentials.

Three model attempts were made: chat, embedding and negative policy. Metered
spend was **US$0.00000398**. Conservative counted spend remains **US$0.001063**,
including the failed negative reservation. The balance changed from
US$24.88745754 to US$24.88745356. The quota probe was not dispatched.

The preserved S3 ledger still has **289 entries**, **US$0.277306460** counted,
and SHA-256 `efeea19451ce7dda99191ce15a77877f17fd59d81e29777b827d69aa26850b0e`.
The evaluation budget is its US$2 owner allowance minus those historical charges;
the separate runner's US$0.50 hard stop is retained.

## Budget compatibility and the owner amendment

Initial October 10 inspection found only the old **Nilumi's Key**, around
US$0.11/US$5. The first create form accepted a US$0.10 input but did not create
a key. After reconnecting, actual submission exposed the dashboard's US$1
minimum. The owner authorized **US$1** and created the canary key.

An authenticated quota PATCH using the endpoint employed by the official Vercel
CLI returned HTTP 400 for a zero limit: `Invalid request: limitAmount should be
>= 1.` This confirms the backend minimum, not just an HTML input constraint.
The evaluation API accepted the exact US$1.72269354 remainder; the dashboard's
create form allows only two decimal places.

[ADR-050](../adr/adr-050.md) records the new canary ceiling. The US$10 team ceiling
still constrains aggregate spend; individual key ceilings are not additive
allowances. Raising the canary ceiling does not itself establish quota rejection.
The old method of lowering a tiny canary's limit to its metered spend cannot
currently be used. Do not deliberately exhaust credits or waive the live proof
without resolving that method and its bounded allowance.

## Operator workflow

Use Node.js 24 and pnpm 12.9.1 in `spikes/s1`. Version-3 preflight requires
non-secret, dated key/budget readbacks, distinct Team-attributed identities,
positive purchased-credit availability, auto top-up off, no BYOK, S3 ledger
provenance and the reviewed synthetic fixture hash. Creation/readback gates
independent probes; the legacy runner requires quota lowering/readback, while
the separate quota runner requires authenticated US$1 exhaustion readback.

`paidCreditValidThrough` is a conservative purchased-credit validity date;
`creditExpiryEvidence` identifies its provenance. This run derives October 7,
2027 from the owner's October 8, 2026 purchase and the one-year purchase-dialog
contract, rounding down conservatively. This is not a grant-level expiry
readback, and the unused free-credit expiry is unknown.

```sh
pnpm gateway:preflight
pnpm gateway:preflight --catalog
pnpm gateway:canary --dry
```

Preflight is offline by default. `--catalog` reads public model policy/pricing,
without inference or credentials. The four-probe conservative manifest is
US$0.002205 at the October 10 catalog: chat 0.000532, embedding 0.000083,
negative 0.001058 and quota 0.000532. Prices and eligibility are refreshed
before dispatch. The US$1 allowance is a ceiling, not a spending target.

Keep working configs and durable state in ignored `validation-results/`; keep
keys in ignored local environment files. Paid paths never initialize missing
ledgers or replace existing state. A session binds its credential digest, team,
key and fixture. Probes are ordered chat → embedding → negative → quota, with
one attempt each and no retry/fallback. Failed, uncertain and over-reservation
calls stop progression; reservations survive failures and crashes.

**This run is closed.** Its canary key is deleted and state persistently halted.
Do not replay it or reset its ledger. A future diagnostic run needs a reviewed
manifest, fresh isolated access and explicit accounting for prior counted spend.
A quota probe requires a supported edit preserving counted spend, matching
`quotaReadback`, and at least five minutes for propagation. Only HTTP 402 plus
`quota_for_entity_exceeded` passes; credit exhaustion cannot substitute.

On every exit, delete the canary key and verify the previously used credential:

```sh
VGW_STATE_DIR=/private/durable/vgw pnpm gateway:canary --verify-revocation
```

The verifier uses only `GET /v1/credits`, fences inference and binds to the used
credential. An unrelated invalid key, HTTP 402/403, active key or network error
cannot pass. Account deletion and local access removal are separate recorded
proofs. Credentials are removed after verification; ledgers/reports are retained.

## Local verification

The initial implementation passed lint, type-check, 346 tests and production
build. The US$1/version-3 amendment adds safe HTTP diagnostics for unclassified
SDK failures and a pinned SDK regression ensuring HTTP 500 cannot pass a policy
proof. Final check results are recorded in doc 08. Local mocked proofs remain
separate from the initial three live attempts above.

Latest quota/profile/streaming implementation: lint, type-check, **357 tests**
and production build passed; the focused gateway suite has 23 passing tests.
Four live rounds are recorded separately from these local checks.

## Proposed sequence to close S-VGW

**October 10 follow-up:** The owner approved the US$1.05 aggregate ceiling and
bounded live quota test in [ADR-051](../adr/adr-051.md). Implementation and live
outcomes remain evidence requirements. The signed-in
backend was checked again at 05:58 UTC: team US$10/month, runtime US$8/month and
evaluation US$1.72269354 cumulative remain active; the deleted canary is absent.
The public catalog still classifies Luna and the embedding model as
`no_training: all`, and the Arcee negative route as `none`.

The remaining work has two separate outcomes: passing the synthetic S-VGW
verification, then enforcing the prerequisites for a real family call.

### 1. Prepare a new bounded verification round

Preserve all halted rounds and their US$0.002564 counted spend. The implemented
versioned follow-up runner carries an aggregate ledger across old and new sessions.
It binds each predecessor ledger's digest and carries its conservative charges
forward exactly once. A fresh key does not create a fresh spending allowance. Do not remove the
old halt, reclassify its HTTP 500 or replay a completed probe.

Use a new Team-attributed, US$1 cumulative canary key, never the prepared runtime
or S3 keys. Refresh account, credits, attribution, BYOK, budget and catalog
readbacks. Wait for the documented activation window before inference. Freeze
the synthetic inputs and their hashes before the paid phase. No caller-supplied
family text, background jobs, provider tools, retries or fallbacks are allowed.

### 2. Resolve the negative policy error first

Four rounds have completed positive controls followed by one negative probe each.
Arcee and Schematron profiles keep their fixed provider allowlist and
`disallowPromptTraining: true`; the streaming variation retains the pinned SDK. The diagnostic transport must retain only HTTP
status, recognized error code and safe request identifiers; discard raw error
messages and prompt/response bodies. Check the embedding vector's length in
memory and retain only its dimension count, so the requested 768 dimensions
also have an observed live result.

Only an explicit `no_providers_available` passes the negative proof. Each
HTTP 500 closes that round without quota warm-up. Further paid diagnostics await
a concrete supported resolution from Vercel; do not repeat these failed profiles. Prepare a content-free Vercel
reproduction packet using the request ID, time, model, SDK versions and routing
flags; owner-authorized vendor contact is a separate action. Do not turn off the
privacy filter to obtain a successful request, or treat another API format's
rejection as proof of the wrapper's SDK path.

### 3. Use a supported live quota method

The proposed method is to accumulate bounded **synthetic-only** usage on that
same US$1 canary key until its backend spend reaches/exceeds US$1, wait for
metering to settle, then send one tiny wrapper request. Keep the US$1 budget
active throughout; no lowering below the documented minimum, deleting/recreating
the budget, or exhausting the team's credit balance is needed.

The required outcome is HTTP 402 with `quota_for_entity_exceeded`, immediate
degraded mode, and no retry/fallback. The follow-up preflight must support
`spend >= limit >= 1` as a distinct exhaustion method. The current version-3
`spend == lowered limit` check and four-call manifest cannot perform this plan;
they must not be bypassed with invented readbacks. The new
`scripts/gateway-quota.mjs` implements the distinct exhaustion method without
changing or replaying the original runner.

**Approved aggregate reservation ceiling: US$1.05 across all rounds.**
All US$0.002564 already counted remains inside this allowance. Its envelope is:

| Item | Maximum counted cost / rule |
| --- | --- |
| Preserved October 10 rounds | US$0.002564, never refunded from the local allowance |
| New positive/negative diagnostics | At most US$0.005 reserved in total; stop on any unexpected outcome |
| Synthetic quota warm-up | Sequential only; at most 400 attempts; at most US$0.01 reserved per request; stop as soon as the authenticated key spend reaches US$1 |
| Tiny post-exhaustion probe | At most US$0.001 reserved; require the exact quota rejection |
| Aggregate stop | Reserve before dispatch; all charges, unknown outcomes and outstanding reservations must fit US$1.05 |

The implemented quota-only profile uses managed OpenAI `openai/gpt-5.5`, a
fixed synthetic number-enumeration fixture, 224 maximum output tokens and at most
512 UTF-8 bytes for the complete serialized SDK request. `store:false`,
`reasoningEffort:none`, no-training and `only:[openai]` are required. The refreshed
base catalog reservation is **US$0.00928** per request, below US$0.01. No cache
savings are assumed. This profile is never a family runtime role or fallback.
Prices, catalog eligibility and the actual payload bound are checked before
transport. Calls are sequential, at most 400 and at most 45 minutes.

The runner stops for authenticated exhaustion readback when confirmed receipt
costs reach US$1; conservative rounding and retained negative reservations still
count against the US$1.05 hard cap. Backend readback must show the matching key,
active US$1 cumulative limit and spend >= US$1, be at most five minutes old and
at least 20 seconds after the final successful warm-up. Only then can the tiny
quota request run. Exact 402 quota rejection, generic errors, credit exhaustion
and local cap breaches have separate tested outcomes.

This deliberately spends about US$1 to exercise Vercel's real enforcement, as
authorized by the owner in ADR-051. Confirmed per-request receipts bound warm-up progression; the crossing
request is reserved at less than US$0.01. Authenticated backend spend is required
for the final quota proof. The historical charge, diagnostics and final
probe leave room inside US$1.05. If metering disagrees with receipts, a call has
unknown cost, the attempt/time bound expires, or a receipt/policy check fails,
stop and retain the reservation; passing is never guaranteed by the allocation.

**Alternative if the owner later restores an exact US$1 aggregate ceiling:** continue local
validation and policy diagnostics within the remaining US$0.998937, but leave
the live quota gate pending. Accepting fault injection plus backend budget
configuration in place of a live quota rejection would require a separate,
explicit baseline amendment and must be described as that evidence standard.

### 4. Close the round and review the complete evidence

On every exit, revoke the new key, verify 401 with its previously successful
credential, remove temporary secrets, and retain all ledgers/reports. Reconcile
per-call receipts, key spend and credit deltas without dropping unknown charges.
Run lint, type-check, the full test suite and production build after runner
changes. Review the storage-control evidence: pinned SDK serialization and the
published provider-option forwarding contract are documentary proof, not a
direct downstream capture or a ZDR guarantee. Record the accepted evidence
basis explicitly before marking that row complete.

Mark S-VGW passed only after the account, privacy/routing, storage, exact policy
rejection, exact live quota rejection and used-key shutdown rows have accepted
evidence. The HTTP 500 in the first run remains failed even if a later round
passes. No challenger fallback becomes eligible merely because the primary
route passes; keep unvalidated fallbacks disabled.

### 5. Complete the first-family-call prerequisites

In the Phase 1 foundation, persist the accepted S-VGW evidence version and wire
it into the wrapper's `verificationPassed` dependency. Implement Settings →
Privacy and durable acknowledgement rows covering exactly the current adults,
notice version and processors. The notice includes children's facts, calendar
titles/locations, published retention, withdrawal and provider deletion limits.
The owner records acknowledgement for both adults after explaining the notice.

Verify that missing/stale acknowledgement, changed membership/processors and
withdrawal block new and queued LLM/embedding dispatch. Preserve the withdrawing
adult's exclusive right to record the next acknowledgement. Wire the same
checks into the worker, with a recheck immediately before each provider call.
Persist reservations and role halts in the application's Postgres ledger;
in-memory test callbacks are insufficient for runtime activation. Exercise the
sensitive-input scanner for text, voice, imports and background inputs. Keep
deterministic lists/tasks/reminders/inbox usable in degraded mode.

Deploy the runtime credential only after these controls and the founding-pilot
provider rows are reviewed. Then validate one minimal family call through that
path. Household acknowledgement is not required for the fixed synthetic canary,
and passing S-VGW alone does not complete these application prerequisites or
the independent S4/Phase 1 sign-off requirements.

Sources: [Vercel budgets and soft-cap contract](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets),
[explicit no-training policy rejection](https://vercel.com/docs/ai-gateway/security-and-compliance/disallow-prompt-training),
and [ADR-046 household rules](../adr/adr-046.md).

## October 10 — acknowledgement and guarded activation closed

The owner explicitly recorded acknowledgement on Settings → Privacy at
**07:47:14.460 UTC**, covering both current adults and processors with no withdrawal.
Readback verified notice/member/processor match, revision 2, accepted S-VGW evidence
and no halts. The reviewed build was redeployed with the bounded pilot route enabled;
acknowledgement survived redeployment. Unauthenticated access returns 401.

One authenticated request using the fixed smoke fixture passed HTTP 200 with managed
OpenAI Luna, no-training, one attempt, a nonempty result and US$0.0000038 receipt.
No household facts or response content were retained in this validation artifact.
Sensitive text was then refused with 403 before provider dispatch; acknowledgement
remained current and no role halted. The endpoint completes durable receipt settlement
before returning 200. This is a successful guarded route smoke, not structured NLU
integration or production latency acceptance. [Activation evidence](../../spikes/s1/evals/results/vgw-household-activation-2026-10-10.json).

The fixed call reserved US$0.000532 and conservatively settled US$0.000004. Canary
accounting stays US$1.00428; total counted validation including this activation is
**US$1.004284 / US$1.05**. The runtime key and PostgreSQL monthly hard cap remain US$8.
Historical canary ledgers are unchanged.

**Next activity: Phase 1 app foundation**, starting with a typed-turn milestone:
invite-only adult sessions, member-scoped turn storage and isolation, sensitive-input
checks before storage, visible transcript/echo cards, saved history and idempotent
reconnect/replay. Integrate the approved gateway and privacy controls into that path,
then connect voice input and per-sentence replies. Recovery/rollback and device checks
complete Phase 1 before Phase 2's first memory/shopping-list release.
