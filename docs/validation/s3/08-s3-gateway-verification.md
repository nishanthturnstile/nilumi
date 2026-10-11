# S3 Gateway configuration verification — October 7, 2026

> Historical evidence: existing spike scope and chronology, reconciled 2026-10-10. Original dates, measurements, failures, exceptions and acceptance limits remain authoritative for that experiment. This is not the new application implementation plan. The [single current plan](../../plans/implementation-plan.md) owns future work; prior acceptance does not validate Pipecat, streaming conversational STT or dynamic Home. Latest S3 synthetic correctness selection and its deferred application-latency limits are in [live acceptance](13-s3-live-acceptance.md); current restricted Gateway closure is in [verification](08-s3-gateway-verification.md#vgw-closure). Earlier pending labels describe the dated state at that point, not a competing current plan.


> **October 8 decision ([ADR-017](../../adr/adr-017.md)).** Nilumi stays on Vercel AI Gateway (Hobby) with purchased credits. Cloudflare AI Gateway was evaluated and not chosen for household traffic ([research](../../research/04-research.md#dated-finding-cloudflare-ai-gateway-primary-docs-checked-8-oct-2026)). The S3 spike keeps an explicitly selected, unfunded Cloudflare adapter for synthetic tests only; its preparation and blockers are in [doc 09](09-s3-cloudflare-gateway.md), and no Cloudflare live acceptance is claimed. Founding-household data waits for spike S-VGW and the household acknowledgement, which the owner records for both adults; ZDR moves to the production privacy gate. S3 stays synthetic under [Historical experiment permission (040)](08-s3-gateway-verification.md#historical-experiment-permissions). This file preserves the Vercel evidence; later S3 rounds are in docs [10](10-s3-paid-vercel-validation.md), [11](11-s3-v11-validation.md) and [12](12-s3-deadline-reliability.md). See [the October 8 section](#october-8--gateway-decision-and-s-vgw-evidence) for the gateway decision and S-VGW evidence.

## Evidence and provenance

The owner supplied a Windows native chat report from the authenticated in-app
browser, inspected October 7, 2026 at 19:51 IST (UTC+05:30). This WSL chat did
not inspect the dashboard itself. No settings were changed and no billable
model calls were made during inspection.

| Item | Observed state |
| --- | --- |
| Team | `mnishanth02's projects`, slug `mnishanth02s-projects` |
| Plan and role | Hobby, Active; Nishanth Murugan / `mnishanth02`, Owner |
| Team-wide ZDR | Unchecked, disabled; unavailable on Hobby |
| Prompt-training control | No separate toggle; documentation link says included in ZDR |
| Settings restriction | “AI Gateway settings are only available on Pro and Enterprise plans.” |
| Provider and model allowlists | Inactive and disabled; no active dashboard restrictions |
| Candidate models | Luna and Nano checkboxes disabled; actual request access untested |
| Gateway API key | Only visible candidate “Nilumi's Key”; Active, never expires, User attribution |
| Railway key identity | Unconfirmed; prior names-only Railway check established presence only |
| Key exemptions/bypass | Not exposed in inspected detail screens; unknown |
| OpenAI BYOK | No configured credential; OpenAI row offers Add |
| Balance and spend | US$5.00 remaining; US$0 month-to-date and candidate key spend |
| Renewal/expiry | Specific date not visible; overview says US$5 each month; purchase credit dialog says expires one year after purchase |
| Automatic top-up | Off |
| Team budget | No configured team budget |
| Candidate key budget | US$5 enabled; US$0 used; Never / No Refresh; requests fail once used up |
| Policy surcharges | No amounts exposed in Settings; documentation links only |

An unchecked, disabled provider/model checkbox on Hobby does not demonstrate
that requests to that provider/model are prohibited. Absence of an OpenAI BYOK
credential does not establish which key Railway uses. Neither uncertainty is
recorded as a successful runtime verification.

Dashboard evidence:

- [Gateway Overview](https://vercel.com/mnishanth02s-projects/~/ai-gateway)
- [Gateway Settings](https://vercel.com/mnishanth02s-projects/~/ai-gateway/settings)
- [API Keys](https://vercel.com/mnishanth02s-projects/~/ai-gateway/api-keys)
- [BYOK](https://vercel.com/mnishanth02s-projects/~/ai-gateway/byok)
- [Budgets and Spend](https://vercel.com/mnishanth02s-projects/~/ai-gateway/budgets?dimension=api-key)
- [Billing](https://vercel.com/mnishanth02s-projects/~/settings/billing)
- [Members](https://vercel.com/mnishanth02s-projects/~/settings/members)

## Gate result

**Failed for family-data ZDR; synthetic-only staging testing approved separately.** The current team cannot meet
[ADR-022](../../adr/adr-022.md)'s accepted team-wide ZDR baseline. This evidence
supersedes earlier “green / controls set” statements for the Gateway LLM and
embedding path. Other processors' S0 evidence is unaffected.

Official documentation confirms:

- [ZDR](https://vercel.com/docs/ai-gateway/security-and-compliance/zdr) requires
  Pro or Enterprise for both request-level and team-wide enforcement. ZDR
  includes no-training. Team-wide ZDR costs US$0.10 per 1,000 successful
  responses returning usage data; request-level enforcement adds no fee.
- [No-training](https://vercel.com/docs/ai-gateway/security-and-compliance/disallow-prompt-training)
  is available per request on all plans at no additional charge. It does not
  enforce zero retention and does not apply to BYOK.
- [Provider restrictions](https://vercel.com/docs/ai-gateway/security-and-compliance/provider-allowlist)
  can use the request-level `only` filter on all plans at no additional charge.
- [Team model restrictions](https://vercel.com/docs/ai-gateway/security-and-compliance/model-allowlist)
  require Pro or Enterprise. Provider/model team restrictions incur one combined
  US$0.10 per 1,000 successful requests surcharge when active.

The current application approval lists are intended policy, not evidence of
enabled dashboard allowlists. Verification timestamps now record inspection
of a failed gate; readiness flags remain false. The candidate key's US$5 cap
does not replace the evaluator's cumulative US$0.50 testing cap or enforce a
monthly reset, since that key budget has no refresh.

If paid team controls are enabled later, include their applicable surcharges
in reservations and settlements before live testing. Current token-cost-only
reservations must not be treated as complete accounting for that configuration.

## Approved Hobby synthetic-only evaluation exception

The owner explicitly replied “Approve synthetic-only Hobby evaluation” in the
implementation chat on October 7. [Historical experiment permission (040)](08-s3-gateway-verification.md#historical-experiment-permissions) records the exception.
The implemented mode follows these bounds:

1. The implemented synthetic-only evaluation mode was added while preserving the strict
   ZDR mode and ADR-038 requirement for family-data use.
2. Accept only the committed, owner-reviewed fixture IDs and exact reviewed
   file hash; never accept uploaded audio, real transcripts, household context
   or arbitrary caller text in this mode. Runtime household paths remain gated.
3. Enforce Gateway-managed OpenAI routing with `disallowPromptTraining: true`,
   `only: ['openai']`, OpenAI `store: false`, low reasoning, no tools/retries or
   model fallback. Record clearly that provider ZDR is unavailable; `store:
   false` and no-training do not prove zero retention.
4. Confirm the Railway key belongs to the inspected team and that its relevant
   OpenAI route uses Gateway-managed credentials before enabling paid testing.
5. Start with three development cases on `openai/gpt-6-luna`; compare
   `openai/gpt-5-nano` only within the same cumulative US$0.50 test budget. The
   US$5 monthly allowance remains shared with all other work. (October 8: buying
   credits under ADR-046 ends this free allowance; S3 then uses a separate
   evaluation key with its remaining cap.)
6. Label every report synthetic-only, with no ZDR claim or production acceptance.
   Retain owner fixture review, staging access checks and durable budget gates.

The server selects `NLU_EVALUATION_MODE=synthetic_hobby`; callers cannot choose
the mode. Missing mode defaults to `zdr`; invalid values block evaluation.
The mode requires approval metadata and the fixed synthetic corpus SHA-256,
as well as the independently recorded owner review and credential verification.
Every stream start, result and runner report labels the mode, no-training
requirement, lack of a ZDR requirement, and absence of production acceptance.
Unknown or mismatched runtime route metadata stops subsequent calls.

The owner subsequently approved all 60 expected actions and confirmed that
“Nilumi's Key” is the credential copied into Railway. Both approvals are
recorded in `spikes/s1/config/nlu-privacy.json`, including the exact reviewed
SHA-256. These are owner attestations; per-call managed OpenAI routing remains
a runtime check. The original dashboard observations above preserve what was
known at inspection time.


## Alternatives without a monthly gateway subscription — October 7, 2026

The recommendation for this testing increment is to use the existing Vercel
free balance with ADR-040's synthetic-only mode. A different gateway does not
improve measured Tamil/Tanglish correctness by itself. No alternative account,
purchase, subscription or provider migration was made during this research.

| Option | Billing | Fit for Nilumi |
| --- | --- | --- |
| Vercel Hobby | Existing US$5 monthly free credit | Best immediate testing fit; per-request no-training and OpenAI-only routing work, but ZDR remains unavailable |
| OpenRouter Standard | Pay-as-you-go, 5.5% platform fee | Strongest managed alternative to investigate for ZDR without a monthly subscription; requires a funded account and an eligible route |
| OpenCode Zen | Pay-as-you-go; card processing fee | One key and multiple models, but documented OpenAI/Anthropic retention makes it unsuitable for the accepted family-data ZDR baseline |
| Cloudflare AI Gateway | Core gateway free on all plans; 5% Unified Billing credit fee | Managed billing is possible; upstream ZDR for the selected model remains unverified |
| LiteLLM self-hosted proxy | Separate hosting and upstream inference charges | Own gateway key and routing controls; additional operations and separate upstream accounts |

### OpenCode Zen

[Zen documentation](https://opencode.ai/docs/zen/) describes a reusable API key
and model-specific endpoints, including GPT-6 Luna and GPT-5 Nano through the
Responses endpoint. Its listed Luna input/output prices match our Vercel
shortlist. The docs quote card fees of 4.4% plus US$0.30 per transaction and
provide spend/model controls. OpenAI and Anthropic requests are explicitly
retained for 30 days. Several temporary free models permit training or service
improvement; some others claim zero retention. Their identity, Tamil quality
and long-term availability have not been validated for this project.

The [Zen landing page](https://opencode.ai/zen) offers a US$20 starting balance
plus US$1.23 processing and advertises automatic US$20 reload below US$5.
The documented percentage formula and displayed fee differ; actual checkout
must settle that discrepancy. The advertised funding offer exceeds this
month's US$5 allowance. Auto-top-up would need to be disabled before any use.

[OpenCode Go](https://opencode.ai/docs/go/) is a separate subscription, starting
at US$10/month (Go Plus US$40/month). It does not fit the owner's request to
avoid a recurring paid plan. Zen is the pay-as-you-go product the owner is
looking for, but its privacy exceptions make it a weaker fit here.

### OpenRouter

[Standard pricing](https://openrouter.ai/pricing) includes data-policy routing,
provider preferences, budgets and admin controls under pay-as-you-go billing
with a 5.5% platform fee. The free plan lacks those controls.
[Terms](https://openrouter.ai/terms), section 4.1, specify a US$5 minimum credit
purchase; fees/taxes can take the checkout total above US$5. No account-specific
checkout or final payment total was inspected.

[ZDR documentation](https://openrouter.ai/docs/guides/features/zdr) supports
account, model-group, guardrail and per-request enforcement. OpenAI-group ZDR
excludes first-party OpenAI endpoints while retaining Azure routes. Unknown
endpoint policies are treated conservatively. This makes OpenRouter the
strongest subscription-free managed candidate, rather than evidence that our
exact future deployment already meets ADR-038.

[Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)
can combine `only`, `allow_fallbacks: false`, `require_parameters: true`,
`data_collection: "deny"` and `zdr: true`. A future implementation should fail
closed if the pinned endpoint cannot satisfy every required parameter and
privacy policy. An Azure route would require an explicit processor/routing
policy update; the current OpenAI-only synthetic approval does not authorize it.

A nonbillable inspection of the
[public Luna endpoint catalog](https://openrouter.ai/api/v1/models/openai/gpt-6-luna/endpoints)
found an Azure endpoint at US$0.10/M input and US$0.50/M output with structured
output and reasoning-effort support. The catalog response did not provide a
ZDR attestation. Endpoint availability, account privacy settings, downstream
terms and actual billed routing still need verification before any family-data
migration. Do not choose Flex or another route solely for a lower advertised
price; latency and policy eligibility must also pass.

### Cloudflare and self-hosting

[Cloudflare pricing](https://developers.cloudflare.com/ai-gateway/reference/pricing/)
states that core AI Gateway features are free on all plans, with a 5% fee on
Unified Billing credit purchases. The current
[Unified Billing guide](https://developers.cloudflare.com/ai-gateway/features/unified-billing/)
requires loaded credits and gateway authentication; it does not list a Workers
Paid subscription as a prerequisite. Managed OpenAI, Anthropic and Google
billing can avoid separate upstream keys. It warns that delayed accounting can
occasionally produce a negative balance, so prepaid credits alone are not an
absolute spend cap.

[Logging controls](https://developers.cloudflare.com/ai-gateway/observability/logging/)
can suppress gateway logs or their payloads. Disabling gateway payload storage
does not prove upstream ZDR. The selected managed model's provider retention
agreement remains a research gap, making Cloudflare a secondary candidate.

[LiteLLM's proxy](https://docs.litellm.ai/docs/proxy/quick_start) supports multiple
providers, virtual keys, model mapping and spend controls. Core self-hosting
adds another service to operate and normally still requires separate upstream
credentials and billing. It cannot create upstream ZDR agreements. Our existing
in-process model registry is adequate for the current two-model spike, so an
extra proxy has little immediate benefit at this budget.

The October 7 comparison left OpenRouter route/privacy eligibility unverified. The October 8 decision retained Vercel with purchased credits; the proposed gateway migration was retired ([ADR-017](../../adr/adr-017.md)).


## Deployment preflight findings

The Railway CLI was authenticated with the owner's approval. Only the existing
`nilumi-s1` service in the `staging` environment was targeted. The first CLI
upload failed with a transient HTTP 500; the retry reached a clean build and
exposed pnpm's missing explicit build-script decision for `esbuild`, brought
in by `tsx`. Recording `esbuild: false` resolved the install; a clean local
frozen-lockfile install and `tsx` execution passed.

The first healthy deployment's authenticated, invalid-body preflight rejected
its origin before any model access. Next.js exposed the internal request URL
behind Railway TLS termination. The gate now accepts only the configured
Origin and either its direct URL or Railway's exact public forwarded host and
single HTTPS scheme in staging. Regression tests cover both paths and reject
wrong hosts, ports, suffixes, missing headers and ambiguous lists. Railway's
[networking specifications](https://docs.railway.com/networking/public-networking/specs-and-limits)
document these edge-set headers. No model calls occurred during these failures.


## Live validation result — October 7, 2026

The strict-schema implementation was deployed successfully to Railway staging
as deployment `6bc05332-c29a-4bd1-9f03-08d4f1659ee8`. The existing HMAC session
mechanism and a temporary evaluator allowlist protected the test. Auth secrets
and Gateway credentials were read into memory, never printed or saved. Only
the approved synthetic development cases were submitted; the held-out fixtures
and their expected actions were unchanged.

| Probe | Result | Consequence |
| --- | --- | --- |
| Initial three Luna staging cases | Three model errors | No usable output or individual cost metadata |
| One local Luna diagnostic | HTTP 403 | Routing/access failure, not an accuracy measurement |
| One local Nano diagnostic | HTTP 400, schema/`oneOf` rejection | Fixed before further evaluation |
| One local Nano after schema fix | Five-second timeout | No parsed result or routing attestation |
| One local Luna after schema fix | HTTP 403, `no_providers_available` | No eligible provider under the approved options; no repeated retry |
| Three Nano staging cases after schema fix | Shopping, memories and dates all timed out at approximately 5,005 / 5,003 / 5,002 ms | Failed live smoke; full corpus run stopped to preserve the budget |

The provider schema now uses nested `anyOf`; every object field is required,
and optional semantic slots accept null in the wire schema. The SDK removes
those provider-only nulls before applying the semantic Zod contract. Required
missing values still fail. Actual SDK output parsing and strict schema shape
have offline regression coverage. This follows OpenAI's
[Structured Outputs requirements](https://developers.openai.com/api/docs/guides/structured-outputs).
Prompt version is `s3-extract-v2`; the model configuration remains
`s3-openai-low-v2`. No retry, tools, fallback or timeout extension was added.

**No model is selected.** The three-case Nano report records zero successful
outputs, three failures and unknown individual costs. These are smoke failures,
not a measured 60-case accuracy result. Model-call latency percentiles cannot
be established without returned calls. No actual runtime route/credential
attestation was obtained from either model. The 48 development / 12 held-out
comparison, classifier experiments and production shadow gates remain open.

### Spending and shutdown

At **2026-10-07 15:28:24 UTC**, authenticated Gateway credits reported
**US$0.00150695 total used** and **US$4.99849305 balance**. This is the observed
account-wide balance, rather than a sum of individual response costs; delayed
accounting can change it. Ten attempted calls across all probes had no reliable
individual cost metadata, so the durable local ledger conservatively retains
**US$0.062862125** toward the **US$0.50 cumulative testing cap**. Retained
allowances are not billed spend. The ledger and full reports are ignored local
files under `spikes/s1/validation-results`; do not reset or delete the ledger.

The final three-case staging report is
`nlu-2f665d68-d538-4810-9d9e-b3d299c1e082.json`. Earlier report IDs are preserved
alongside it. All 180 automated tests, lint, type checking and production build
passed. A current zero-call dry run reserves US$0.026951125 for the three Luna
cases or US$0.255969 for the full Nano corpus.

After the smoke, staging variables were set to `NLU_EVALUATION_ENABLED=false`
and `NLU_EVALUATOR_EMAILS=` with a service redeploy. The variable-triggered GitHub build used the linked
branch, so the current local S3 implementation was uploaded again with evaluation
disabled. Verify its JSON `evaluation_disabled` response before any later run;
a generic missing-route 404 is not evidence of the new configuration. Final
deployment `d86131df-6ae8-4a7e-8a87-3541741a9ab1` succeeded; an unauthenticated
POST confirmed HTTP 404 with JSON `{"error":"evaluation_disabled"}`. The
evaluator allowlist is empty. No production environment, paid plan,
auto-reload setting, provider account or provider migration was changed.

At this point Luna's eligible-provider smoke had failed; the existing conditions did not establish family-data acceptance. The later restricted-pilot exception and current eligibility gates are in [ADR-017](../../adr/adr-017.md).

## Follow-up investigation — October 7, 2026

An approved-fixture Luna diagnostic at 16:25:21 UTC returned HTTP 403 with
`no_providers_available` and the explicit message “Free tier users do not have
access to this model.” This establishes free-credit eligibility as the cause
for this key; no paid-credit purchase or routing relaxation was attempted.
The public model page's embedded provider metadata marks both Luna and
GPT-5.6 Luna unavailable to the free tier. GPT-5 nano, GPT-4.1 nano and
GPT-4.1 mini are marked available. The endpoint catalog advertises OpenAI
no-training support for all of these; global capability is distinct from
account eligibility. Sources: [Luna](https://vercel.com/ai-gateway/models/gpt-6-luna),
[GPT-4.1 nano](https://vercel.com/ai-gateway/models/gpt-4.1-nano),
[GPT-4.1 mini](https://vercel.com/ai-gateway/models/gpt-4.1-mini).

A single approved GPT-5 nano timing diagnostic dispatched its SDK HTTP request
after approximately 23 ms and received no response headers before the
five-second abort. Its prompt budget counted 51,384 bytes. This locates the
dominant wait after dispatch, but does not distinguish Gateway queueing,
upstream inference or network response time. No deadline extension was made.

The owner explicitly approved GPT-4.1 nano, then GPT-4.1 mini, as additional
synthetic-only challengers. [Historical experiment permission (040)](08-s3-gateway-verification.md#historical-experiment-permissions) records the scope. Both
models omit the unsupported reasoning-effort option; all other controls and
the frozen corpus remain unchanged.

### Inline routing receipt

GPT-4.1 nano returned a schema-valid response locally, but immediate generation
lookup returned 404. Its inference response already contained Gateway routing,
credential and cost metadata. The adapter now validates the inline receipt:
one successful model/provider attempt, consistent original/canonical model
and final provider, explicit system or BYOK credential type, and enabled
no-training. Missing, malformed or inconsistent receipts fail closed. BYOK
remains rejected by the evaluator. The separate bounded lookup remains a
compatibility path only when no inline routing metadata exists.

This follows Vercel's [credential-routing guidance](https://vercel.com/academy/ai-gateway/bring-your-own-keys).
Regression coverage includes missing receipts, unknown credentials, wrong
provider/model, multiple attempts, failed attempts and invalid costs. All
181 tests, lint, type checking and the production build passed after this change.

### GPT-4.1 nano staging smoke

Deployment `0e4154d8-e2b1-42db-8718-d6b9f263f2d1` succeeded. Report
`nlu-e4701341-a93b-47f9-8c56-7d6641792def.json` records three development cases:
shopping correct at 3,681 ms; memory schema failure at 3,826 ms; date extraction
schema-valid but incorrect at 2,126 ms. Both valid responses verified the
requested model, OpenAI provider, system credentials and reported cost.
Accuracy was 1/3 and schema validity 2/3. These are smoke measurements, not
full-corpus accuracy or stable latency percentiles. A separate memory diagnostic
also returned an incorrect correction command and violated the semantic schema.
The full GPT-4.1 nano corpus run was not started.

An earlier runner request during deployment rollout reached the previous
disabled evaluator. It made no model call; its conservative US$0.0071864
reservation remains in the ledger. Later smoke work waits for deployment
success and the authenticated zero-call `invalid_request` preflight.

At 16:34:39 UTC, Gateway credits reported US$0.00852835 used and
US$4.99147165 remaining. The durable ledger retained US$0.108565925, including
unsettled calls and the rejected endpoint reservation. These figures precede
the separately approved GPT-4.1 mini smoke; they are not its final accounting.

### GPT-4.1 mini staging smoke and final result

Deployment `6f54ded5-d374-4185-94c8-3926a77b43aa` succeeded and the
authenticated invalid-body preflight returned 400 before billable work.
Report `nlu-7c52354b-2325-41d1-8e19-b4355e0c773d.json` records shopping correct
at 3,523 ms, memory incorrect at 3,100 ms, and dates correct at 4,554 ms.
All three responses were schema-valid and verified OpenAI system credentials,
the exact model and reported costs. The three calls cost US$0.0143188.
Smoke accuracy was 2/3; this small sample cannot establish corpus accuracy or
the 1,400 ms p95 target.

For the development transcript “I prefer coffee”, the model emitted `correct`
against a contextual memory with `changed_in_world` instead of the reviewed
`remember` action. Its evidence ended at UTF-16 offset 13 instead of supporting
the whole value, so validation rejected it as `unsupported_value`. GPT-4.1
nano also chose a correction on this case. This suggests development-prompt
clarity around ordinary statements versus explicit correction cues is a useful
next investigation; it does not justify changing expected actions or weakening
evidence checks. No prompts, fixtures or expected actions were changed here.

The owner approved three development cases first with a stop on smoke failure.
That semantic smoke condition was not met. No full 60-case run was started,
no model was selected, and S3 acceptance remains pending. The successful
transport/schema/routing checks do not establish semantic acceptance or
family-data privacy. Future work needs a revised development prompt or another
approved candidate followed by a new smoke before spending on the full corpus.

At **16:37:54 UTC**, authenticated credits reported **US$0.02284715 used** and
**US$4.97715285 remaining**. The ledger retained **US$0.122884725** toward the
US$0.50 testing cap, leaving **US$0.377115275** available conservatively. It was
not reset or deleted. Account totals may still change with delayed accounting.
The final code passed all **181 tests**, lint, type checking and production build.

Shutdown variables were set to `NLU_EVALUATION_ENABLED=false` and
`NLU_EVALUATOR_EMAILS=` and the current local implementation was uploaded as
deployment `901dd67c-a29e-4bab-a9c6-a5a67f7e374e`.
Railway marked that identical-code upload `SKIPPED`, so it was not treated as
shutdown evidence. A redeploy of the existing artifact, without pulling the
linked GitHub source, was requested as `abbda753-1114-4120-8967-e4bca9eabcbf`.
That redeploy succeeded. The public staging endpoint returned HTTP 404 with
JSON `{"error":"evaluation_disabled"}`; Railway variables separately confirmed
the disabled flag and empty evaluator allowlist. No production environment,
paid plan, credit purchase, new provider account or family-data route changed.

## Subscription-only synthetic prompt development — October 7

The owner approved the subscription evaluation plan with “pls proceed”. Both
the Windows CLI and the actual runner authentication preflight reported
`Logged in using ChatGPT`. The Linux CLI installation was missing its optional
executable dependency; evaluation therefore uses the existing Windows
`codex-cli 0.161.0` from WSL. No API key, new installation, hosted subscription
integration, Gateway call or deployment was needed.

The new `scripts/evaluate-subscription-nlu.mjs` uses a fresh ephemeral Codex
session per extraction, explicit `gpt-6-luna`/low selection, the unchanged
provider schema, literal synthetic input, and parser instructions replacing
the built-in coding instructions. It creates an isolated temporary directory
outside the repository; expected answers stay with the parent scorer. User
config, project instructions, hooks, plugins, memories, shell and browser
tools are disabled. Tool activity, incomplete turns, account errors and
timeouts stop new dispatch. API credential variables are removed and ChatGPT
authentication is required. The runner does not retry or fall back; Codex's
built-in transport behavior still applies. Its 120-second process guard is
separate from the unchanged five-second deployed NLU deadline.

Reports are saved separately in ignored `validation-results/subscription/`.
They use the existing deterministic scorer and validation without claiming
Gateway routing receipts, API pricing, no-training verification or ZDR.
Subscription allowance consumption is not assigned a fabricated USD cost.
Only reviewed synthetic fixtures are permitted; no family data was used.

Development evidence (all 12 held-out cases excluded):

- Baseline `s3-extract-v2` smoke: **2/3 correct**, **3/3 schema valid**;
  report `3aba281d-3269-4197-8d9c-61c1086e8dbf.json`.
- Baseline full development: **27/48 correct (56.25%)**, **100% schema validity**
  on 47 model calls; one sensitive case was refused locally. Report
  `aebb2522-7e62-4f9e-9c8c-afe32492ba73.json`; prompt SHA-256
  `7e1815f760a3663e51dd10372a124281270f6e9974f7b1119790c44479714c9c`.
- First revision `s3-extract-v3` smoke: **3/3 correct and schema valid**;
  report `bb33d544-54c7-42dd-93d0-4ef0e44144ca.json`.
- First revision full development: **37/48 correct (77.08%)**, **100% schema
  validity** on 47 model calls; dates **8/10**, privacy **3/6**. Report
  `be022fe4-f96e-48b7-a13f-2a138cf02ef6.json`; prompt SHA-256
  `5f8d14dcc2b818485b0724b0e28f94164bf31d2cda3c8670333f7f548ffddb11`.
- Second revision targeted development checks: **8/8 correct and schema
  valid**, including ambiguous clock phrases, adult reminder targets, query
  shapes/history and correction targets. Report
  `7fa52a7a-a1f6-4aa3-b199-658b6173cff8.json`. This was before the subsequent
  explicit restrictive-privacy-cue wording was added to the second revision.
- Second revision `s3-extract-v4` full development: **43/48 correct (89.58%)**,
  **100% schema validity** on 47 model calls; dates **6/10**, privacy **6/6**.
  Report `ea19b497-4450-4eb8-b792-c1d5f9104684.json`; prompt SHA-256
  `47d31759a4e0f617a193b8551d7e51bd82cf4953c14d02301743e7145e3099b1`.
- Third revision `s3-extract-v5` targeted checks: **8/8 correct and schema
  valid**, including the original three-case smoke plus the five remaining
  development failures. Report `f4b35d0e-4845-4892-8226-868d60b0ffea.json`;
  prompt SHA-256
  `9f4c5f7144ff90995268650d49e6a8c70eab0a677efed6f42ffc35304ba26e7c`.
- Third revision full development: **47/48 correct (97.92%)**, **100% schema
  validity** on 47 model calls; dates **10/10**, privacy **5/6**. Report
  `48e46844-23ad-4fe2-8206-5f1735090ad7.json`. `privacy-05` used the resolved
  speaker name as its mention instead of the literal Tamil pronoun, so
  unchanged evidence validation rejected `unsupported_subject` and
  `unsupported_clause`. This failure is retained as evidence of variability;
  it is not erased by targeted successes or a subsequent benchmark result.

After the three planned revisions, freeze `s3-extract-v5` at SHA-256
`9f4c5f7144ff90995268650d49e6a8c70eab0a677efed6f42ffc35304ba26e7c`
for the 60-case subscription benchmark. Development accuracy exceeded the
90% correctness threshold, but the one privacy failure prevents treating
development as fully successful. The unchanged full benchmark must independently
pass all date/privacy cases and at least 11/12 held-out cases. No fourth prompt
revision or held-out-driven tuning is part of this round.

The frozen **60/60-case** benchmark completed with **57/60 correct (95%)**,
**100% schema validity on 58 model calls**, **11/12 held-out correct**,
**11/12 dates correct**, and **8/8 privacy correct**. Two sensitive synthetic
cases were refused locally without a model call. Report:
`e5348f7f-06b1-4732-9f44-5f494b08610e.json`, in
`spikes/s1/validation-results/subscription/`. The report explicitly returns
`syntheticCorrectnessPass=false` and
`deploymentAcceptance="pending_live_gates"`: the mandatory all-dates gate
failed despite passing the overall, held-out and privacy thresholds.

Failed cases were `memories-11` (held out), `dates-06` (development) and
`corrections-02` (development). For `dates-06`, the model resolved “next
Saturday morning” to October 17 instead of the specified upcoming October 10;
unchanged validation returned `date_disagreement` and clarification. For
`corrections-02`, it selected the correct memory and change value but used an
explicit entity/predicate selector instead of the required last-record
reference form. The held-out failure remains in the report and was not used
to revise the prompt. No failed cases were retried to replace their scores.

The prior development `privacy-05` failure passed in this benchmark, confirming
variability rather than invalidating the retained failure. The third revision
remains frozen after this run. At that point hosted correctness and the two-model comparison remained pending. A larger model's subscription pass did not transfer acceptance to Nano; ordinary preference/correction semantics and failed cases remained preserved.
Final shutdown verification: deployment
`1f309d7c-d73f-49cc-a822-077e19c2afb2` reached **SUCCESS**. The previous enabled
deployment was removed. An authenticated empty-body request now returns HTTP
**404** with `evaluation_disabled`; service configuration has enabled=false
and zero allowlisted evaluators. No model call is made by that probe. Shutdown
is verified, not merely requested. Documentation and content-free evidence were
checked with the existing pinned Biome tooling; no application source changed
in this validation increment.

## Deterministic interpretation increment — October 7–8

Existing delivered S3 work was committed as `becd350`. The owner then requested
research, implementation and validation of the next correctness increment.
The new pipeline keeps model extraction separate from deterministic interpretation:
complete supported dates are calculated locally, and unique visible share/unshare
note targets are canonicalized to their existing memory ID. Raw extraction scores
and normalization paths remain in reports. No additional model call or invented-ID
repair occurs. Ownership, evidence, ambiguity and privacy validation remain in force.
An omitted adjacent numeric clock invalidates a temporal interpretation.

Research and the implementation sequence are recorded in
the retired S3 plan (historical sequence; current work is in [P4](../../plans/implementation-plan.md#p4)).
The original approved corpus hash and golden actions are unchanged. Only
development transcripts and expected actions informed this revision. Repeating
the original held-out split is regression evidence, with prior aggregate metrics
and failed-ID exposure disclosed; it is not a new independently authored holdout.

Development evidence, all under ignored `validation-results/subscription/`:

- `s3-extract-v6` three-case smoke: **3/3**; report
  `d35a6608-9292-4ee2-b44d-a80ccfce03e3.json`.
- `s3-extract-v6` full development: **44/48**, raw **43/48**, dates **10/10**,
  privacy **5/6**; report `8e4d63a7-c9b6-4917-9700-8420ffe8c1ea.json`.
  The privacy mismatch selected the correct note through entity/predicate
  selectors, and validation still rejected sharing it with `not_owner`.
- A preliminary v7 prompt accidentally included exact development transcript
  examples. The existing golden-leak test detected this. The wording was removed.
  Reports `b8730306-8b1c-4740-bfe8-eedf2b2504fb.json` and
  `2c5330f7-d3c2-44a5-b778-17cb35adbeb2.json` are excluded from final evidence.
  The latter also detects the source change during its run and explicitly
  returns unsuccessful acceptance despite 48 correct rows.
- Final v7 three-case smoke: **3/3 interpreted**, **2/3 raw extraction**,
  all schema-valid; report `00935d88-8bd4-4e59-a2a4-3eb5ba896286.json`.
  One supported date was normalized deterministically.

Final v7 prompt SHA-256:
`6c6015e80485a058374473fd2f49843590a4312244da3eef940a4bfc9e4a6397`.
The earlier v7 smoke used interpretation `s3-interpret-v2`, pipeline SHA-256:
`008141c692d5d4cf959cc98a5780ee416d0356854b003fdf2fbecec61b305023`.
The freeze includes the runner, NLU/config sources, few-shots, package manifest
and lockfile. Held-out evaluation requires both hashes. Source changes during
a run invalidate acceptance. Subscription process timings remain separate from
Gateway latency and cannot establish the production five-second deadline.

Final v7 live development: **47/48**, raw **47/48**, dates **9/10**, privacy
**6/6**, all 47 model outputs schema-valid. Report
`fdcbf119-2a59-4b88-aaac-3a1343f72595.json`. The sole mismatch omitted the
unique member ID for “me”; missing reminder time still correctly required
clarification. No date/time was invented.

Interpretation `s3-interpret-v3` adds deterministic unique member-alias binding
for reminder targets and task assignees. Supplied conflicting IDs and ambiguous
aliases remain unchanged and fail validation. The prompt stayed frozen.
Replaying the captured 48 development extractions through v3 scored **48/48**,
raw **47/48**, dates **10/10** and privacy **6/6**, with one member reference
normalization and no new model calls. Report `development-v7-replay.json` is
explicitly labeled `offline_development_replay`; it does not replace the live
development scores. The v3 pipeline SHA-256 was:
`66ef6d281deac59bfcf93897a9f5b6f99baae59ed3a5c76983d58f3681d46edb`.

A fresh v3-pipeline three-case smoke scored **3/3**, raw **2/3**, all
schema-valid; report `76aabab5-258e-4d99-9eab-8d3fe406d193.json`.
The original approved 60-case regression is run only after these checks, with
both prompt and final pipeline hashes required and no held-out-driven edits.

Offline checks: **199 tests passed**, lint, type checking and production build
passed. New regressions cover timezone-equivalent weekday anchors, standalone
daypart defaults, conflicting/partial/ranged dates, omitted adjacent clocks,
raw-output immutability, stable note IDs, unchanged ownership, invisible and
ambiguous records, and shared interpretation in both evaluator paths.
No Gateway calls, paid purchases or deployment occurred in this increment;
the conservative Gateway ledger remains **US$0.122884725** under its
**US$0.50** cap. Family-data ZDR and deployment model selection remain pending.

The final prompt's configured-price Mini dry run reserves at most
**US$0.065440** for the three development cases and **US$1.2657788** for the
whole corpus. These are offline maximum reservations, not charges or newly
verified live prices. The smoke fits the conservative remaining
**US$0.377115275** allowance; the full maximum does not. Actual sequential
settlement may be lower, but no complete paid comparison is guaranteed under
the current cap. A future live smoke requires deployment of this local revision,
current price/routing checks and evaluator shutdown afterward.

The initial frozen full attempt stopped at **33/60** cases after a rejected
`collab_tool_call` event. Report `2a72908f-03bd-4437-989a-b029951d1cd7.json`
records **30/33 correct**, **2/4 held-out**, and unsuccessful acceptance.
Failed held-out IDs were `shopping-11` and `memories-11`; their contents did
not inform subsequent changes. Codex CLI 0.161.0 exposes two separate feature
switches: `multi_agent` defaults on, while `multi_agent_v2` defaults off.
The runner previously disabled only v2. It now disables both, plus goal,
sleep and tool-suggestion features; event inspection still rejects every tool
item. No rejected tool result is accepted as an extraction.

An attempted Code Mode host disable failed closed before extraction. Report
`37651388-ec0c-434a-b6df-abd55d38bef4.json` records the startup error. The
installed CLI requires that host even for this structured parser workflow,
so it remains available while individual action tools stay disabled.

After this isolation fix, a development smoke returned **2/3** in report
`c00e267f-877d-4078-a9a9-77ab04ba31b1.json`. Its only mismatch used “weekend”
instead of the literal “this weekend”; the computed instant and validation
outcome were correct. Interpretation `s3-interpret-v4` preserves the literal
modifier only when the transcript has exactly one weekend occurrence preceded
by “this”. It does not infer a missing time or change the weekend instant.
The prompt was unchanged throughout this follow-up.

The final v4 development replay remains **48/48**, raw **47/48**, with one
member-ID normalization. A fresh final smoke scored **3/3** and emitted no
tool activity; report `8c58a1a6-8d11-4f02-8921-7a7e6d376767.json`.
Final pipeline SHA-256:
`45fe8f19dfe2401255df46d74770eef27dba9c68b50a24b85df829c8f8df2cf6`.
The new full regression follows the isolation fix; the aborted run and failed
smokes are retained rather than overwritten or used to replace individual scores.

The complete new regression attempted **60/60** cases and scored **57/60
(95%)**, raw **56/59** scoreable extractions/refusals. All **12/12 dates**
passed. Held-out **10/12** fails the required 11/12 threshold; privacy **7/8**
fails its all-cases gate. Schema validity is **57/58 (98.28%)** when the
failed model call remains in the denominator; all 57 returned parser objects
were schema-valid. Report `36f888fc-5a53-4644-a7a7-86e96382a316.json`
returns `syntheticCorrectnessPass=false` and pending deployment acceptance.

The two semantic failures were held-out `shopping-11` and `memories-11`.
Development `privacy-03` failed with `tool_activity_rejected:collab_tool_call`
despite disabling both multi-agent flags. The runner rejected that result;
no rejected output was validated or accepted. Therefore the requested CLI
feature settings do **not** establish absence of collaboration tools. Resolving
this isolation limitation is required before treating the subscription runner
as a reliable tool-free evaluation path. It is not a reason to permit tool
outputs, silently retry failed cases or claim acceptance.

After the frozen run, a TypeScript narrowing error was corrected with an erased
`as string` annotation. TypeScript 5.9.3 emitted **identical JavaScript** before
and after the change, SHA-256
`f76965e1aa15392c291035bd1ffa69a45a7438d89f8b5475064234e49c290f98`.
The final source pipeline hash is
`84c7656466a6d1cc94595d261027cb1408329e4b13765deceec8c705e9d6e33e`;
the benchmark's frozen source hash remains the earlier v4 hash. This is an
explicit type-only source difference, not a revised prompt or runtime behavior.
Type checking and production build passed after the correction.

Checked-in [compact evidence](../../../spikes/s1/evals/results/subscription-v7.json)
contains phase summaries, report hashes, per-case scores, normalization paths,
the aborted run and runtime-equivalence proof. It contains no held-out transcript,
expected answer or raw model text. Original reports remain ignored locally.

At this dated point CLI tool registration/isolation and blind shopping/memory generalization remained unresolved. No paid selection comparison or deployment followed the failed gate; observed holdouts could not establish fresh independent acceptance.

## October 8 — explicit tool controls and passing v8 synthetic regression

The owner requested research, planning, implementation and validation of the
remaining tool/correctness item. Official
[Codex schema](https://learn.chatgpt.com/docs/config-schema.json) research found
`agents.enabled` defaults to true independently of the old switches. The
installed Luna catalog selects a V2 multi-agent backend. These observations
explain why relying only on switches was insufficient; they do not prove the
exact internal dispatch path. Added `agents.enabled=false`, strict config, and
[documented code-mode namespace exclusions](https://learn.chatgpt.com/docs/config-file/config-reference)
for collaboration and clock. No persistent client settings or auth changed.

The runner parses bounded UTF-8 JSONL during execution, kills the subprocess on
an observed tool/error event, waits for closure before ordinary cleanup, and
rejects output. Started events may follow dispatch; no claim that rejection
prevented the first tool call or that the entire CLI tool catalog is empty.
All successful model calls in this increment had **no observed tool activity**.
The CLI remains distinct from a direct `tools: []` API call.

Prompt `s3-extract-v8` extracts supported actions before ownership/ambiguity
validation, preserves every literal shopping item and fact clause, and uses only
supplied visible notes for share targets. No contract, validator, scorer, golden
answer, fixture split or acceptance threshold changed. Held-out transcripts,
expected answers and failed raw outputs were not inspected for tuning.

| Phase | Report ID | Result |
| --- | --- | --- |
| v7 configuration probe | `f9952acb-cb37-4639-b94a-a53fc0f18072` | 2/3; privacy-03 returned unsupported; no tool events |
| v8 prompt smoke | `edeeef60-2c43-4221-b91e-20eb1b65e55b` | 3/3 |
| v8 development | `61db888f-24f8-4866-80fe-3a47fe405958` | 48/48 interpreted, 45/48 raw; dates 10/10; privacy 6/6 |
| final pipeline smoke | `cee552e4-c2cf-474e-b923-9a3cdff80935` | 3/3 after subprocess cleanup refinement |
| frozen original-corpus regression | `83100a34-8243-492c-9523-e0e6c40ccfad` | 60 attempted; 59 correct; no abort |

The completed frozen run passes synthetic gates: **98.33% overall (59/60)**,
**91.67% held-out (11/12)**, **dates 12/12**, **privacy 8/8**, and **schema validity
58/58 model responses**. Two sensitive fixtures were locally refused. Raw
extraction plus those local refusals scored 57/60; interpreted scoring is 59/60,
with two normalization cases. `memories-11` fails commands/outcomes; that failure
is retained. No selective retries or subsequent full rerun were used to improve
the reported pass. Prior aggregate/failed-ID exposure means this is regression
evidence rather than a newly independent holdout.

Frozen identifiers:

- Prompt SHA-256: `1489153ba0a363531ce5612019d8bec3fbe3af517008d3ba1ace7c2a8046a773`.
- Pipeline SHA-256: `45db537f269896c863d0c57a54fd0c511d4aa12f362fd942ce964cdc466aaccf`.
- Corpus SHA-256: `962a1af2ba29d60cf3a16d6df1a2891d0d2c6713a0d852b41731dddfbf8caadd`.
- Model: CLI-pinned `gpt-6-luna`, low reasoning, ChatGPT authentication,
  Codex CLI 0.161.0. Subscription route has no Gateway provider receipt.

[Compact checked-in evidence](../../../spikes/s1/evals/results/subscription-v8.json)
records each report hash, configuration, score rows and limitations without raw
model text, transcripts or golden answers. Full reports remain ignored under
`spikes/s1/validation-results/subscription/`. Source was unchanged during each
scored phase. The final cleanup refinement changes only the runner fingerprint
between development and final smoke; prompt/interpretation/scoring remain fixed.

All **202 tests**, lint, type checking and production build passed. No Gateway
calls, deployment, purchases, auth changes or model selection occurred. Ledger
retention remains **US$0.122884725**, leaving **US$0.377115275** under the
US$0.50 cumulative testing cap. Subscription charges are unknown; paid Gateway
spend for this increment is zero. Subscription results do not establish the
five-second deadline, managed OpenAI routing, no-training or family-data ZDR.

Offline configured-price maximum reservations for v8: Nano three-case smoke
US$0.0167944; Nano full pass US$0.3248431; combined US$0.3416375. Mini smoke
US$0.0671776; Mini full pass US$1.2993724. These are upper allowances, not fresh
rate checks or actual spend. A Nano smoke/full pass fits the current allowance;
a guaranteed full Mini pass did not. Hosted S3 acceptance remained pending at this point; the actual subsequent smoke result follows below. These reservations were not additional spending authorization.

Owner authorized the hosted next step with “ok ple proceed”. All configured
model rates matched the current public Gateway catalog before deployment and
again inside the authoritative runner. The initial retained ledger was
US$0.122884725 across 22 entries (SHA-256
`dea2128839b6fd4386b36dc9934afae9245f111d7f57deba3f48f65370b9e10f`).
No rates, spend caps, privacy controls or deadlines were changed.

Uploaded reviewed commit `81d9a65` directly to the existing staging service;
deployment `3d390548-da23-4d87-8952-50a9718d50b8` became healthy. Only the owner
was temporarily allowlisted. The authenticated empty-body preflight returned
HTTP 400 `invalid_request`, with no model access. The smoke used only original
development cases `shopping-01`, `memories-01`, `dates-01`, through the durable
budget runner. Server reports confirmed `s3-extract-v8`, `s3-interpret-v4` and
the unchanged approved corpus hash; no previous deployment was scored.

| Development case | Correct | Schema | Model-call latency | Reported cost |
| --- | --- | --- | --- | --- |
| shopping-01 | Yes | Valid | 2622.65 ms | US$0.0006368 |
| memories-01 | No | Valid | 2187.46 ms | US$0.0002126 |
| dates-01 | Yes after deterministic date resolution | Valid | 1866.40 ms | US$0.0001948 |

All three calls completed within the five-second deadline. Managed routing
receipts verified OpenAI / `openai/gpt-4.1-nano`, with BYOK false and required
no-training receipt handling. Requests retained `only:['openai']`,
`disallowPromptTraining:true`, `store:false`, no reasoning-effort field, zero SDK
retries, no fallback and the five-second timeout. This is the synthetic-only
Hobby exception; it does not establish family-data ZDR.

**Smoke failed: 2/3 interpreted correctness; 1/3 raw extraction correctness.**
`memories-01` was an ordinary preference statement but the model emitted a
correction of the earlier contextual preference. The unchanged validator asked
for clarification instead of treating that unsupported correction as executable.
No intent rewrite was added to make the result pass. The dates case's raw
resolution failed before the existing deterministic stage corrected it.

Smoke p50 was 2187.46 ms and p95 2622.65 ms over only three successful model
calls; this exceeds the separate 1400 ms target and is not a full latency
benchmark. Cache hits were observed on two calls (11776 cached input tokens
out of 18258 input tokens), so no cold-cache performance claim is made.

The full 60-case run and further paid tests were **not started** after the smoke
failed. No model was selected. Report
`nlu-e5a5431c-418e-4cde-8535-a0d7e54a8df1.json` remains ignored in validation-results;
[compact checked-in evidence](../../../spikes/s1/evals/results/gateway-v8-nano-smoke.json)
contains versions, scores, latencies, usage, routing, costs and limitations.
All three reservations settled to reported costs totaling **US$0.0010442**.
The ledger now retains **US$0.123928925** across 25 entries, leaving
**US$0.376071075** under the cumulative US$0.50 cap. Historical unresolved
reservations were retained. Read-only Gateway accounting at
2026-10-08T02:26:27Z reported total used **US$0.02389135**, remaining credits
**US$4.97610865**; account-wide usage and the conservative testing ledger are
separate measures.

Shutdown was initiated by setting `NLU_EVALUATION_ENABLED=false` and clearing
`NLU_EVALUATOR_EMAILS`, then redeploying the tested artifact as
`1f309d7c-d73f-49cc-a822-077e19c2afb2`. Final runtime shutdown verification is
recorded below. No Git push, new service, family-data call or purchase occurred.

At that point hosted correctness and the two-model comparison remained pending. A subscription pass did not transfer acceptance to Nano; failed cases remained recorded.
Final shutdown verification: deployment
`1f309d7c-d73f-49cc-a822-077e19c2afb2` reached **SUCCESS**. The previous enabled
deployment was removed. An authenticated empty-body request now returns HTTP
**404** with `evaluation_disabled`; service configuration has enabled=false
and zero allowlisted evaluators. No model call is made by that probe. Shutdown
is verified, not merely requested. Documentation and content-free evidence were
checked with the existing pinned Biome tooling; no application source changed
in this validation increment.

## October 8 — v9 prompt development, frozen regression failed

Researched the official GPT-4.1 prompting guide and consolidated extraction
instructions, grouped complete visible context separately from current input,
and added independently authored preference/correction and sharing examples.
The static prefix decreased from 10065 to 9041 UTF-8 bytes (10.2%). Contracts,
the corpus, scorer, interpreter, model configuration and privacy controls stayed
unchanged. Whole-input secret scanning and visibility filtering still precede
provider input construction. All **203 automated tests**, lint, type checking
and production build passed.

Initial development scored 45/48. Its three failures informed general rules for
changed existing attributes, unique sharing targets, and all actions in a
multi-command transcript. The revised focused rerun passed 3/3, followed by
development **47/48**, dates **10/10**, privacy **6/6**. An unnecessary person
type hint in an ambiguous query remained a scoring failure; validation still
required clarification. Failed reports are retained. A malformed few-shot
authoring prototype was caught by the new contrast-example test and corrected;
prototype `94a6aa79-3d50-4dc4-9c46-2b8c43167f08` is excluded from evidence.

The final prompt and pipeline were frozen before one full original-corpus run:

| Gate | Result | Required |
| --- | --- | --- |
| Overall interpreted correctness | 54/60 | At least 54/60 |
| Held-out correctness | 8/12 | At least 11/12 |
| Date cases | 11/12 | 12/12 |
| Privacy cases | 7/8 | 8/8 |
| Schema validity | 58/58 model calls | All valid |

Two sensitive cases were refused locally. Raw extraction correctness was 51/60;
three cases used the unchanged deterministic normalizer. No tool activity was
observed and no source change invalidated the freeze. Failed IDs are
`shopping-11`, `memories-11`, `dates-05`, `questions-06`, `questions-07`,
`privacy-08`. Held-out transcripts, expected answers and raw outputs were not
inspected for tuning. Repeated original holdout remains regression evidence.

**v9 fails synthetic acceptance and is an unaccepted local candidate.** No
hosted smoke, paid calls, deployment or model selection followed. Report
`aff1175e-e06d-4dc5-bfad-0736f657d3d6.json` retains the complete local evidence;
[content-free v9 evidence](../../../spikes/s1/evals/results/subscription-v9.json)
records every valid development phase and the failed frozen regression.

Frozen prompt SHA-256:
`0ecf1438a5d4cda0d035c3f8ff266d6eb6f50ec69a39967ec17a4be6a7f21928`.
Pipeline SHA-256:
`ae0d54538e5db8921e05aa6ff987e12c9d7e3c17d9358becc629e1363447bac8`.
Corpus SHA-256 remains
`962a1af2ba29d60cf3a16d6df1a2891d0d2c6713a0d852b41731dddfbf8caadd`.

The unchanged ledger retains **US$0.123928925**, leaving **US$0.376071075** under
the cumulative US$0.50 cap. Ledger SHA-256 remains
`b188a6eea794613301e45172fb14b742c7778bb7c3a441a34d429873cd61f3d2`.
Offline Nano maximum reservations are US$0.0164956 for smoke and US$0.3190663
for a full pass; these are neither actual charges nor fresh price verification.
Authenticated zero-call preflight still returns **404 evaluation_disabled**;
configuration remains enabled=false with zero allowlisted evaluators. The
previous disabled v8 deployment remains in staging.

This closes the v9 simplification experiment, not S3 acceptance.

## October 8 — v10 development fixes and passing frozen regression

Owner authorized the next correctness item. Development evidence identified
discarded ambiguous clock phrases and inferred types on ambiguous names. Keep a
stated clock with unresolved time for clarification; leave an unstated type
null. A first v10 development run scored 46/48, exposing supported shopping
completion incorrectly marked unsupported and a speaker-note unshare using an
entity selector. Added explicit shopping command mappings and unique speaker
subject/note memory lookup for both share and unshare. Clarified Tamil/English
mixed language using the known development sample. Four independent examples
and two new tests validate these distinctions with the unchanged validator.
New tests caught and corrected an incomplete example context before model use.

Both focused development smokes passed 5/5. Revised development scored 47/48:
`privacy-04` emitted list instead of value answer shape; visibility filtering
still held. This failure remains recorded alongside the successful comparison.
No contract, interpreter, scorer, reviewed fixture, model setting, privacy
control or spend cap changed. All **205 automated tests**, lint, type checking
and production build passed.

One frozen original-corpus regression scored **59/60**, held-out **11/12**,
dates **12/12**, privacy **8/8**, schema **58/58** model calls; two sensitive
inputs were refused locally. Raw extraction scored 57/60 and two cases used
the unchanged deterministic stage. `memories-11` remains failed. No tool
activity was observed. These results meet the synthetic gates. The original
holdout is repeated regression evidence; its transcripts, expected answers
and raw outputs were not inspected for tuning. Development failures and all
phase hashes remain in [v10 evidence](../../../spikes/s1/evals/results/subscription-v10.json).

Frozen prompt SHA-256:
`9dc9129360a2a07dd6edef5f221279f21a0f619902549b571787ff9f87240f17`.
Pipeline SHA-256:
`198926c5ee6af13636a8d29d7f58d58fdf97da6cab1df413c9f62321a8b1b65a`.
Full report: `71e8a69f-b310-43f7-b1cb-b862399c822b.json`. The static prefix is
12194 UTF-8 bytes versus v9's 9041; correctness clarifications increased size.
No latency improvement is claimed from subscription process timing.

This qualifies only for the authorized three-case hosted Nano smoke. Verify
current catalog rates and managed OpenAI routing before further live work,
then stop if the smoke fails. Configured-price maximum reservations are
US$0.0174415 for smoke and US$0.3373537 for one full pass, combined US$0.3547952
within retained remaining allowance US$0.376071075. No historical reservation
was removed. Subscription evaluation added no Gateway charge. Hosted acceptance,
model selection and family-data ZDR remain pending live evidence.

## October 8 — v10 Nano hosted smoke failed; shutdown verified

Uploaded reviewed commit `b7a11fc` to the existing staging service. Deployment
`1b6431b4-75ac-49f3-aae1-793778c12ea4` reached SUCCESS; owner-only authenticated
zero-call preflight returned 400 `invalid_request`. Configured rates matched the
live catalog at 2026-10-08T03:21:25.450Z and again inside the authoritative runner.
The original three development smoke cases used the unchanged durable ledger.
Server reports confirmed v10, interpreter v4 and the reviewed corpus hash.

| Case | Correct | Model-call latency | Reported cost |
| --- | --- | --- | --- |
| shopping-01 | Yes | 2434.01 ms | US$0.0007011 |
| memories-01 | No | 2243.01 ms | US$0.0007065 |
| dates-01 | Yes after existing deterministic resolution | 2112.09 ms | US$0.0006975 |

**Smoke failed at 2/3 interpreted correctness; raw extraction 1/3.** All three
schemas were valid and calls met the five-second deadline. Managed OpenAI Nano
routing was verified, BYOK=false. The configured request retained OpenAI-only,
no-training, store:false, no reasoning effort, zero retries and no fallback.
The memory case again emitted a correction for an ordinary preference, with
an altered literal value. The unchanged validator required clarification
(`correction_reason_unclear`); no intent or value repair was added.

P50 over three calls was 2243.01 ms; p95 2434.01 ms exceeds the separate 1400 ms
target. This is not a full latency benchmark. No input cache hits were reported
for these three calls (20115 input tokens, 234 output tokens); no general
cold-cache performance inference is made. Subscription v10's passing correctness
does not establish Nano reliability. **The full hosted comparison and further
paid calls stopped after this failed smoke. No model was selected.**

Report `nlu-5ccea0a9-6370-465a-975a-072f6e27d4f9.json` is retained locally;
[checked-in smoke evidence](../../../spikes/s1/evals/results/gateway-v10-nano-smoke.json)
contains content-free versions, scores, timing, routing, accounting and shutdown.
The smoke settled to **US$0.0021051**. Retained ledger is **US$0.126034025** across
28 entries, leaving **US$0.373965975** under the cumulative US$0.50 cap. Historical
reservations remain intact; ledger SHA-256:
`874982ab82557d820b120ff27b9d525e286f65af283c650d3504e589e74fadab`.
Read-only account verification at 2026-10-08T03:26:02.417Z reported total used
US$0.02599645 and remaining credits US$4.97400355. Account-wide usage remains
distinct from the conservative testing ledger.

Disabled evaluation and cleared the allowlist, then redeployed the tested
artifact as `db46f970-7a61-449e-830d-2641785e801a`. Shutdown deployment reached
**SUCCESS**, the enabled deployment was **REMOVED**, and an authenticated zero-call
probe returned **404 evaluation_disabled**. Configuration is enabled=false with
zero allowlisted evaluators. No model was called by shutdown verification.

V10 development and synthetic validation are delivered, but hosted S3 acceptance
remains pending. Two prompt revisions now retain the same Nano preference-intent
failure.

## October 8 — paid-credit follow-up

The owner funded Vercel credits and restored Vercel as the default spike gateway.
The [paid validation report](10-s3-paid-vercel-validation.md) records a complete
60-case Luna run, failed hard semantic gates, a stopped mini smoke, retained costs
and shutdown verification. This supersedes the earlier free-credit access blocker;
it does not establish S3 acceptance or family-data eligibility. Later rounds are
in [V11 validation](11-s3-v11-validation.md) and the
[deadline investigation](12-s3-deadline-reliability.md). The later
[synthetic correctness acceptance](13-s3-live-acceptance.md) selects Luna low
for the spike; production deadline reliability and the complete two-model
comparison remain pending.

## October 8 — gateway decision and S-VGW evidence

**Decision.** The owner compared Cloudflare AI Gateway with Vercel. Not every
Cloudflare model is ZDR-enabled, and Unified Billing adds a 5% fee on credit
purchases. [ADR-017](../../adr/adr-017.md) therefore keeps Vercel AI Gateway on Hobby,
funded by purchased credits, with no paid Vercel plan.
- **Pilot.** ZDR is not required for the founding-household pilot. Every request
  still sets `disallowPromptTraining`, `only` routing and OpenAI `store: false`.
- **Production.** ZDR on every call is part of the production privacy gate.
- **Credits.** Buying credits ends the US$5 monthly free credit. Credits expire one
  year after purchase. Auto top-up stays off.
- **S3.** Evaluation stays synthetic under [Historical experiment permission (040)](08-s3-gateway-verification.md#historical-experiment-permissions), with a separate
  evaluation key. The hosted rounds recorded above and in docs 10–12 used the
  existing staging key (“Nilumi's Key”) under the US$0.50 cap the runner enforces;
  US$0.210533395 was counted after the deadline round. The later correctness
  acceptance brings conservative cumulative charges to US$0.277306460. The
  owner's October 8 amendment raises the cumulative S3 cap to US$2.00, leaving
  US$1.722693540 under the owner cap. The runner still enforces US$0.50, with
  US$0.222693540 remaining, until its constants and ledger are migrated
  ([ADR-040 amendment](08-s3-gateway-verification.md#historical-experiment-permissions)).

No account, purchase, setting or model call was made while this decision was
recorded. Afterwards, the owner reported buying US$20 of credits on October 8
and planning about US$10 a month.

### S-VGW evidence (restricted pilot accepted)

**Closed October 10 under [ADR-022](../../adr/adr-022.md).** The [final acceptance artifact](../../../spikes/s1/evals/results/vgw-pilot-acceptance-2026-10-10.json) preserves the fifth round and all prior conservative charges.

| Proof | Accepted evidence and limits |
| --- | --- |
| Credits, auto top-up off, no BYOK | Authenticated account readbacks; paid-credit provenance retained. Final balance US$23.88672764; no auto-reload or BYOK. |
| Separate team/runtime/evaluation/canary budgets | Team US$10 monthly, runtime US$8 monthly, evaluation US$1.72269354 cumulative, canary US$1 cumulative; distinct Team-attributed identities and 50/75/100% alerts. US$0.10 support unavailable. Original S3 ledger preserved. |
| Exact live budget exhaustion | Fifth round: 318 sequential bounded synthetic warm-ups, backend key spend US$1.00071398 / US$1; final tiny request returned HTTP 402 `quota_for_entity_exceeded`, no retry/fallback, persistent halt. |
| No-training and provider allowlist | Positive chat and 768-dimension embedding receipts: managed OpenAI, no-training, one attempt. Pinned SDK serialization and primary-only local catalog guard pass. Fallbacks disabled. |
| Explicit negative policy rejection | Four HTTP 500 rounds remain failed; no canonical rejection claimed. ADR-052 accepts the founding-pilot exception with approved OpenAI roles, fresh catalog checks, no fallback and terminal receipt/error controls. |
| Supported `store:false` forwarding and retention | Published model/provider contracts plus pinned SDK serialization accepted as documentary pilot evidence. No direct downstream observation or ZDR claim; [provider record](../../../spikes/s1/config/providers.md). |
| Used-key revocation and local cleanup | All five canary keys revoked. Final DELETE 204/readback 404; same previously successful credential 401; temporary canary and capture secrets removed. |
| Durable compensating controls | PostgreSQL acknowledgement, veto, evidence, reservations and halts deployed and validated: 13 deployed PostgreSQL control cases, 15 live HTTP checks and 372 local tests; lint/type-check/build pass. Actual restricted-role and no-ack runtime blocks pass. [Deployment evidence](../../../spikes/s1/evals/results/vgw-pilot-deployment-2026-10-10.json). |
| Conservative aggregate ceiling | US$1.00428 counted / US$1.05 including US$0.002564 carried from prior rounds; US$1.0007299 total metered. Final aggregate SHA-256 `1f6ad2b2174ca2a5a4ce48cbe755d0354983b877d27ebe0c0883391f066f7f01`. |

Durable controls and both adult roles are deployed and validated. The owner
recorded the current notice at 07:47:14.460 UTC; readback and post-redeploy persistence
passed. Guarded routing is enabled and one authenticated fixed-input smoke passed;
[activation evidence](../../../spikes/s1/evals/results/vgw-household-activation-2026-10-10.json).
Configuration and synthetic tests do not substitute for that explicit acknowledgement. Production ZDR, external households and challengers
retain their own gates. The Vercel reproduction remains local and unsent.

The dated sections below preserve historical intermediate results and failures.

## October 9 — S-VGW implementation and account preflight

Inspected the authenticated Vercel team `mnishanth02s-projects`. The Overview
shows **US$24.89** credit (rounded dashboard balance); the credit dialog states
**Auto-reload is disabled**. The owner's prior US$20 purchase report remains the
purchase provenance. The BYOK inventory offers Add for every provider, with no
configured credentials. No credit purchase or model request was made during this
inspection.

Set the team budget to **US$10 monthly**, with **50/75/100%** creator alerts enabled,
and verified its readback. The newly configured budget initially shows US$0/US$10;
it is distinct from historical spend. The existing `Nilumi's Key` still has its
US$5 cumulative budget and approximately US$0.11 dashboard spend. Separate runtime
US$8 monthly and S3 remaining-allowance key budgets are not yet verified or changed.
The historical S3 ledger and runner caps remain preserved.

The create-key dashboard permits a US$0.10 input with Team attribution and Never
refresh, but backend creation and lowering-to-counted-spend support remain
unverified. No canary key was created or model called. The US$1 CLI minimum has
not been resolved by this input-only observation.

Local verification passes: approved chat/answer/embedding controls, managed
receipt enforcement, sensitive-input refusal, current household acknowledgement
and job-time withdrawal rechecks, accepted S-VGW gating before family dispatch,
terminal quota/credit/policy errors, durable conservative reservations, and the
provider-access guard. Tests exercise the actual pinned AI SDK 7.0.130 and Gateway
4.0.106 transport with synthetic HTTP errors, proving serialized `store:false`,
no-training, provider allowlists and exactly one attempted request. These are
local injected proofs, not live quota or downstream provider evidence.

The fixed negative probe uses Vercel's documented
[`arcee-ai/trinity-large-thinking` / `arcee-ai` pairing](https://vercel.com/ai-gateway/models/trinity-large-thinking).
The public model catalog currently marks no-training `none`; the runner rechecks
that status before dispatch and retains `disallowPromptTraining:true`. It is a
synthetic test route only. All runtime fallbacks remain disabled.

**S-VGW remains pending.** Live positive/negative routing, quota rejection,
provider-side storage forwarding, separate key budgets and final key revocation
still need evidence. The canary runner refuses live dispatch while any required
preflight is incomplete. No family LLM/embedding endpoint is enabled by this work.

## October 10 — S-VGW completion work started

The [Dated Gateway evidence](08-s3-gateway-verification.md#vgw-closure) records the implementation and
remaining live steps. Initial authenticated API-key inventory showed only
**Nilumi's Key**, approximately US$0.11/US$5. Dedicated runtime, evaluation and
canary budget readbacks remain missing. A Team-attributed US$0.10 Never-refresh
create form did not produce an observed successful creation/readback and was
cancelled; this is not backend compatibility evidence. The preview later moved
to T3 pairing, so final inventory/backend checks need reconnection.

Version-2 preflight validates dated actual budget values, refresh periods, team
attribution, distinct key IDs, alerts, credits/expiry, reviewed fixture hash and
preserved S3 ledger provenance. The canary binds its credential and evidence to
one durable session, enforces chat → embedding → policy rejection → quota, refuses
replays/incomplete previous reports, and stops on costs above reservation.
Exact quota proof requires HTTP 402 and `quota_for_entity_exceeded`; credit
exhaustion still degrades but cannot pass that proof. The propagation readback
must follow the canary-only edit by at least five minutes.

The [public-catalog preflight](../../../spikes/s1/evals/results/vgw-preflight-2026-10-10.json)
reports a four-probe maximum reservation of **US$0.002205**, within US$0.10, with
Luna/embedding no-training `all` and Arcee `none`. This made **zero model calls**;
it is a planning bound, not charged spend or live route evidence. Dispatch
refreshes both pricing and these policy annotations.

Local pinned-SDK tests cover the complete four-probe path, embedding serialization,
exact quota versus credit exhaustion, budget/identity/fixture/expiry mismatches,
probe ordering, crash-report gaps, failed reservations, changed catalog policies,
shutdown fencing and used-key rejection. A read-only `GET /v1/credits` verifier
requires HTTP 401 on the same credential after a successful recorded positive
probe. It does not delete keys; authenticated account deletion and temporary
access removal remain separate evidence, required on every exit.

**S-VGW remains pending.** No production privacy row is promoted, no household
acknowledgement is inferred, and no family LLM/embedding endpoint is enabled.
Provider-side `store:false` forwarding, complete live controls, key-budget backend
compatibility and final canary deletion still need matching evidence.

Final local validation for this increment: lint (including the gateway guard),
type-check, **346 tests** and production build passed. Twelve new canary tests
are local injected proofs; live evidence rows remain pending.

### October 10 — preview reconnected

Reopened the signed-in Vercel API Keys preview after the owner's reconnect
request. Final hydrated inventory again shows only **Nilumi's Key** at about
US$0.11/US$5; no compatibility-test key was created in the earlier attempt.
Read back the team budget: **US$10, monthly**, with **50/75/100%** alerts all
checked. The edit dialog was cancelled without saving changes. Dedicated
runtime/evaluation/canary key budgets and US$0.10 backend compatibility remain
unverified. The signed-in preview is left on API Keys. No model call was made.

## October 10 — US$1 canary and live results

The owner authorized US$1 after the signed-in dashboard rejected the original
US$0.10 limit. [Historical experiment permission (050)](08-s3-gateway-verification.md#historical-experiment-permissions) records this narrow allowance amendment;
team US$10, runtime US$8 and S3 cumulative allowance remain separate controls.
The authenticated quota API independently returned HTTP 400 for a limit below
US$1. Raising the canary ceiling does not resolve the required live quota proof.

The [content-free live artifact](../../../spikes/s1/evals/results/vgw-live-controls-2026-10-10.json)
records actual account readbacks and three attempts through `ai` 7.0.130 /
`@ai-sdk/gateway` 4.0.106:

| Probe | Outcome | Metered cost |
| --- | --- | --- |
| Fixed Luna chat | Passed; managed OpenAI, no-training, one attempt | US$0.0000038 |
| Fixed embedding | Passed; managed OpenAI, no-training, one attempt | US$0.00000018 |
| No-training-ineligible Arcee | Failed/unclassified SDK error; account log HTTP 500, unavailable routing details | US$0 |
| Exact quota rejection | Not dispatched; supported quota method unresolved and previous probe failed | None |

Total metered spend is **US$0.00000398**; durable conservative spend remains
**US$0.001063** including the failed reservation. The key budget readback and
credit balance decrease agree. No failed reservation was refunded locally.
The S3 ledger still contains 289 entries, US$0.277306460 counted and unchanged
SHA-256 `efeea19451ce7dda99191ce15a77877f17fd59d81e29777b827d69aa26850b0e`.

Runtime, evaluation and canary were separately created with Team attribution and
50/75/100% alerts. Backend limits are US$8 monthly, US$1.72269354 cumulative and
US$1 cumulative respectively. The evaluation value was set exactly through the
API because the dashboard create form accepts two decimal places. Runtime and
evaluation credentials are in ignored, mode-600 local environment files; they
are not deployed and did not make any calls. The pre-existing Nilumi key was not
changed. The US$10 team limit still constrains aggregate spend.

On failure, inference stopped without retries/fallbacks. Canary deletion
returned 204, subsequent account lookup 404, and the same previously successful
credential returned 401 on read-only `GET /v1/credits`. The local canary file and
capture private key were removed. The durable state/report remains closed;
restarting or replacing it is not permitted as a successful replay.

Version-3 preflight separates confirmed key-budget creation from the quota-only
lowering/readback requirement, so independent proofs can proceed under ADR-050.
Purchased-credit validity is conservatively derived from the owner's October 8
purchase and the currently visible one-year expiry contract; this is not an
exact grant expiry readback. New error handling preserves sanitized HTTP status
and recognized codes, including SDK `response` objects, without raw messages.
The earlier failed live report is preserved; later classifier tests do not
retroactively pass that probe.

Published retention and the forwarding-contract chain are dated in
[config/providers.md](../../../spikes/s1/config/providers.md). `store:false` is not ZDR;
OpenAI publishes abuse-monitoring retention and separate prompt-cache state.
Forwarding is documented for the exact Luna route, while direct observation at
the downstream provider is unavailable. Canary reports keep that distinction.

**S-VGW remains pending:** explicit negative policy rejection and exact live
quota enforcement still need valid evidence. Family LLM/embedding traffic stays
blocked, and household acknowledgement requires its separate durable foundation.

Final validation after the US$1 amendment and SDK diagnostic fixes: **lint,
type-check, all 347 tests and production build passed**. The new regression
verifies that an unclassified HTTP 500 retains safe diagnostics and conservative
reservation, stops progression, and cannot pass negative policy acceptance.

## October 10 — approved US$1.05 follow-up and remaining policy failure

The owner approved US$1.05 total, including all prior counted spend, for the
bounded live quota test ([Historical experiment permission (051)](08-s3-gateway-verification.md#historical-experiment-permissions)). The new aggregate runner
imports the first run's US$0.001063 once, verifies its source-ledger digest before
every paid step, reserves before dispatch and preserves incomplete attempts.
The historical ledger remains byte-for-byte unchanged; no halted run was replayed.

A fresh Team-attributed US$1 cumulative canary key was created and read back,
with 50/75/100% alerts. Account rechecks confirmed the existing team/runtime/S3
budgets, purchased credits, zero BYOK credentials and no auto-reload. After the
budget activation window, live chat passed with one managed OpenAI attempt;
embedding passed with one managed OpenAI attempt and **768 observed dimensions**.
The negative Arcee request returned **HTTP 500 again**, without the explicit
`no_providers_available` code in either the wrapper's SDK error or the safe
transport capture. Gateway logs agree and show zero metered negative-call cost.

The round stopped before quota warm-up. Key deletion returned 204, readback 404,
and the same previously successful credential returned 401 on `GET /v1/credits`.
Temporary credential and capture private-key files were removed. Across both
rounds, total metered spend is **US$0.00000796**, and conservative aggregate
counted spend is **US$0.002126**, including both failed reservations. The balance
is US$24.88744958. No runtime or S3 key was used and no family call was enabled.

Lint, type-check, **349 tests** and production build passed after the aggregate
runner and live dimension check were added. The first test run exposed an overly
expensive mock catalog relative to the diagnostic manifest; the fixture was
corrected without raising the US$0.005 diagnostic bound, and the full suite passed.

[Content-free follow-up artifact](../../../spikes/s1/evals/results/vgw-followup-controls-2026-10-10.json)
contains the reports, preserved-source hash, spend, gateway log IDs and shutdown.
The [policy reproduction packet](../s-vgw/27-s-vgw-policy-reproduction.md) is prepared but
has not been sent to Vercel. The exact live policy rejection and quota rejection
remain pending. Quota warm-up is deliberately not enabled in the diagnostic-stage
runner while its preceding policy proof fails. The approved US$1.05 allowance
persists for subsequent work; it does not change any privacy or family-call gate.

## October 10 — quota implementation and two Schematron controls

The bounded quota runner is implemented under the existing US$1.05 aggregate
approval. Its fixed quota-only OpenAI profile reserves US$0.00928 per request,
checks the complete SDK payload before transport, retains unknown charges and
requires successful prior diagnostics plus fresh authenticated exhaustion
readback. It distinguishes exact quota rejection from credit exhaustion and
stops without retries/fallbacks. Conservative reservation rounding cannot
prematurely substitute for confirmed metered exhaustion.

Two further isolated rounds used the no-training-ineligible Schematron profile.
Chat and 768-dimension embedding passed in each, but both non-streaming and
streaming negative controls returned **HTTP 500 without `no_providers_available`**.
Sanitized transport diagnostics and gateway logs agree; negative metered cost
was zero. This does not prove the cause of the gateway failure. No quota warm-up
was dispatched. All four used canary keys are revoked (204/404/401), and their
local credentials/capture keys are removed. Runtime/evaluation keys remain
prepared locally; no family call is enabled.

Across all four rounds: **US$0.002564 conservative counted**, **US$0.00001592
metered**. Prior halted states, failed reservations and the original S3 ledger
are preserved. Separate team/runtime/evaluation budgets, attribution, no BYOK
and disabled auto-reload were rechecked through the authenticated backend.

[Third-round artifact](../../../spikes/s1/evals/results/vgw-closure-controls-2026-10-10.json)
and [fourth-round artifact](../../../spikes/s1/evals/results/vgw-stream-controls-2026-10-10.json)
contain content-free proof and shutdown metadata. The [updated support packet](../s-vgw/27-s-vgw-policy-reproduction.md)
is prepared and retained locally at the owner's request. The implemented quota path
and passing local tests are not live quota proof. S-VGW remains pending, and
its first-family-call prerequisites remain gated.

Final validation: **lint, type-check, all 357 tests and production build passed**.
The focused gateway suite has 23 passing tests, including a near-budget regression
that retains conservative reservations while allowing the bounded final crossing
until confirmed receipt costs reach US$1. Dry quota invocation performs zero
model calls. SHA-256 checks confirm the first three S-VGW ledgers and original
S3 ledger are unchanged; temporary canary credentials are absent.

## October 10 — founding-household acknowledgement and activation

The owner recorded the current notice at 07:47:14.460 UTC. Current adults/processors,
revision 2, no veto/halts and accepted evidence were read back. The bounded route was
activated on the reviewed deployment and one authenticated fixed-input smoke passed
HTTP 200 with a managed OpenAI/no-training/one-attempt receipt (US$0.0000038).
Acknowledgement survived redeployment; unauthenticated and sensitive requests were
refused. This does not claim full app NLU integration or production latency acceptance.
Total counted validation including the activation is US$1.004284 / US$1.05; the prior
canary total and ledgers remain unchanged. See [activation evidence](../../../spikes/s1/evals/results/vgw-household-activation-2026-10-10.json).

## Reconciled completed observations from former document 06

Dated historical evidence reconciled on 2026-10-10. These observations describe the existing spike or design reference only. Future work is owned by the [implementation plan](../../plans/implementation-plan.md) (the link is resolved from the validation directory).

The existing spike now contains the Zod contract, deterministic validators,
sensitive-input guard, 60 manually authored synthetic cases, review document,
versioned prompt/registry/model options, injectable Gateway adapter, authenticated
staging evaluation route, scoring, and a durable local comparison budget ledger.
Parser results can omit unresolved date slots; validated results cannot. The
schematic TargetRef additionally uses `task_id` for visible synthetic tasks.
Mock recovery instrumentation remains disconnected from scored calls.

[Expected-action review](07-s3-expected-actions.md) contains all 60 cases with
concrete dates and outcomes; 48 development / 12 held out, 23 Tamil/Tanglish
and 10 multi-command cases. These expectations are authored offline, not
outputs generated by either model being scored.

Offline checks and production build are recorded in the spike README. All 60
expectations and Railway key identity are owner-approved. The implementation
has been deployed to Railway staging and live probes have begun under ADR-040.
Luna returns HTTP 403 (`no_providers_available`) under the approved restrictions.
Nano initially rejected the generated `oneOf` schema; the provider schema now
uses `anyOf`, requires all fields and represents optional slots as nullable.
The SDK normalizes those nulls before the unchanged semantic Zod validation.
Nano's first probe with this fix exceeded the five-second deadline. The frozen
corpus comparison and model selection remain gated on a successful live smoke;
failed probes do not establish accuracy. See [verification evidence](08-s3-gateway-verification.md)
for final results and accounting. Family-data ZDR, classifier experiments and
production shadow work remain deferred; this is not S3 acceptance.

Follow-up: Luna's HTTP 403 explicitly identifies free-credit exclusion.
Owner-approved GPT-4.1 nano and mini challengers omit unsupported reasoning
effort while preserving all synthetic-only controls. Their staging smoke
accuracy was 1/3 and 2/3 respectively; no full comparison or selection was
started after the failed semantic smoke. Inline Gateway response receipts
now verify managed routing and reported cost despite delayed generation
lookup. All 181 tests, lint, type checking and build passed. The reviewed
fixture corpus, expected actions and extraction prompt are unchanged.

Subscription follow-up: the owner approved local synthetic prompt development
using existing ChatGPT-authenticated Codex access. A separate isolated runner,
`pnpm nlu:eval:subscription`, keeps expected answers in the parent scorer and
the paid Gateway ledger untouched. Three development-only prompt revisions
improved development accuracy from 27/48 to 47/48 without changing contracts,
validation or approved fixtures. The frozen `s3-extract-v5` benchmark completed
all 60 cases: 57 correct (95%), 100% schema validity, 11/12 held-out, 11/12 dates
and 8/8 privacy. It **failed the mandatory all-dates gate**. The earlier
development privacy failure remains recorded as variability evidence.
All 187 automated tests, lint, type checking and build passed. No prompt tuning
used held-out evidence, no Gateway requests were made, no deployment model was
selected, and S3 acceptance remains pending. See
[the complete subscription evidence](08-s3-gateway-verification.md) for hashes,
reports, known failures, scope and remaining budget constraints.

The prior full run's aggregate results and failed IDs were already observed.
This revision does not use held-out transcripts or expected answers to tune;
the repeated original holdout will be labeled as regression evidence. A new
holdout requires independent authoring and owner review.

Research supports this separation: OpenAI's
[Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs)
establishes schema constraints, while semantic checks remain application work.
[Chrono's documentation](https://github.com/wanasit/chrono) exposes matched
text/index, ranges, explicit reference instants/timezones and certainty flags;
these allow complete-phrase validation rather than accepting a partial match.
[Luxon's calendar math documentation](https://github.com/moment/luxon/blob/master/docs/math.md)
supports calendar-day arithmetic in an explicit household timezone. The
upcoming-Saturday convention remains Nilumi's product rule.

This increment delivered deterministic date/reference interpretation and
**199 passing automated tests** plus lint, type checking and build. The complete
v7 regression is **57/60**, dates **12/12**, held-out **10/12**, privacy **7/8**.
Synthetic acceptance still fails: two blind semantic cases and a rejected
collaboration tool call remain. CLI multi-agent disable settings alone did not
establish isolation. Resolve that before further subscription benchmarks, then
improve blind shopping/memory generalization without tuning to held-out answers.
Inspecting failed held-out content requires replacing and independently reviewing
the holdout before claiming a fresh test. No paid comparison or deployment
followed this failed gate; the Gateway ledger remains unchanged.

This failed increment did not establish hosted model selection or family-data authorization. Its subsequent smoke/correctness outcomes follow below; the old proposed work sequence is retired.
October 8 result: development **48/48**, final smoke **3/3**, frozen complete
regression **59/60 (98.33%)**, held-out **11/12**, dates **12/12**, privacy **8/8**,
and schema validity **100% (58/58 model responses)**. Two sensitive cases were
refused locally with no model call. Raw extraction plus local refusal scoring
was **57/60**; deterministic interpretation produced **59/60**, with two
normalization cases. No tool events or execution failures were observed, no
source changed during the frozen run, and all synthetic thresholds pass.
`memories-11` remains incorrect; its transcript, expected answer and raw output
were not used for tuning. This increment is closed with that failure retained.
It is a repeated-corpus regression, not a newly independent holdout.

All **202 automated tests**, lint, type checking and production build passed.
The complete content-free score record is
[subscription-v8.json](../../../spikes/s1/evals/results/subscription-v8.json), and
[verification notes](08-s3-gateway-verification.md) retain phase hashes and
limits. No paid Gateway calls, deployment, purchase or model selection occurred.
At that dated stage hosted S3 acceptance had not passed; later scoped acceptance is recorded separately.
Hosted follow-up on October 8: deployed reviewed v8 to staging and ran the
three approved development smoke cases through managed OpenAI GPT-4.1 nano.
Schema/routing passed and all calls completed within five seconds, but semantic
correctness was **2/3**. An ordinary preference was misclassified as a correction;
validation required clarification. The full run and further paid tests stopped.
No model selection occurred. Three reported charges total US$0.0010442; retained
ledger US$0.123928925, remaining testing allowance US$0.376071075. Evaluator
disable/allowlist clearing and tested-artifact redeploy followed the failure.
See [hosted smoke evidence](08-s3-gateway-verification.md).

The owner approved the dated v9 simplification experiment after the failed v8 Nano smoke. It kept `openai/gpt-4.1-nano`, command/output contracts, corpus/scorer/interpreter/privacy, the five-second hosted deadline and cumulative budget unchanged; development evidence alone informed the changes.

The official [GPT-4.1 prompting guide](https://developers.openai.com/cookbook/examples/gpt4-1_prompting_guide)
recommends clearly grouped instructions and examples demonstrating desired
behavior, followed by empirical evaluation. It is an archived model-family
recipe; no SDK, account access or performance guarantee is inferred from it.
Prompt v9 consolidates repeated rules into sections and makes intent selection
precede history lookup. An ordinary preference remains remember even when a
prior preference differs. Only explicit correction/change wording selects
correct. Two separate pottery/cycling examples demonstrate this distinction;
neither copies an approved fixture. Their outputs validate against the same
prior context, and the unsupported correction of an ordinary statement is
rejected by the unchanged validator.

Model input now groups the complete visible context as `reference_context` and
the transcript, UTF-16 length and spans as `current_input`. No visible context
record was removed. Visibility filtering and whole-input secret scanning still
run before input construction. Full golden-set leakage and privacy tests pass.
Static prefix UTF-8 size decreases from 10065 to 9041 bytes (10.2%). The provider
schema remains complete and unchanged.



Final v9 outcome: revised development 47/48, dates 10/10 and privacy 6/6;
frozen original-corpus regression 54/60, held-out 8/12, dates 11/12, privacy 7/8,
schema 58/58. **Synthetic acceptance failed.** The prompt is an unaccepted local
candidate and was not deployed. No paid calls followed. All 203 automated tests,
lint, type checking and build passed. Staging remains disabled and the budget
ledger is unchanged. See [v9 verification](08-s3-gateway-verification.md) and
[retained score evidence](../../../spikes/s1/evals/results/subscription-v9.json).
The simplification experiment is complete; S3 acceptance remains pending a
qualifying correctness revision, then hosted validation. Do not rerun a frozen
pipeline to select a favorable score or tune using held-out content.

V10 follow-up uses development evidence to preserve stated unresolved clocks,
suppress inferred entity types, map shopping completion to its supported command,
and identify speaker-note share/unshare targets. The first development result
46/48 informed the latter fixes. Revised development 47/48 retains one note-query
answer-shape failure. One frozen comparison passed: 59/60 overall, 11/12 held-out,
12/12 dates, 8/8 privacy, 58/58 valid schemas. The one held-out memory failure
remains recorded; no held-out content was inspected for tuning. All 205 tests
and quality checks pass. See [v10 verification](08-s3-gateway-verification.md).
The subsequent bounded Nano hosted smoke retained routing, privacy, five-second deadline and cumulative budget controls; its actual result follows.

Hosted v10 follow-up: managed OpenAI Nano smoke scored 2/3, schemas valid and all
calls within five seconds. Ordinary-preference intent failed again; validation
required clarification. Full hosted comparison and further paid calls stopped.
Smoke cost US$0.0021051; retained ledger US$0.126034025, remaining cap
US$0.373965975. Evaluator disable/empty allowlist and tested-artifact redeployment
were verified with authenticated 404 `evaluation_disabled`. No model selection.
V10 development is delivered; S3 acceptance still requires a reliable eligible
model/route that fits the deadline and retained budget. See the verification
notes and [hosted evidence](../../../spikes/s1/evals/results/gateway-v10-nano-smoke.json).

## Reconciled completed observations from former document 26

Dated historical evidence reconciled on 2026-10-10. These observations describe the existing spike or design reference only. Future work is owned by the [implementation plan](../../plans/implementation-plan.md) (the link is resolved from the validation directory).

**Deployment, acknowledgement and guarded activation closed October 10.** [Deployment evidence](../../../spikes/s1/evals/results/vgw-pilot-deployment-2026-10-10.json) records the live database/app IDs, reviewed source archive hash and content-free checks.

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
[activation evidence](../../../spikes/s1/evals/results/vgw-household-activation-2026-10-10.json)
and the closing section below. Total conservative validation including activation
is **US$1.004284 / US$1.05**; historical canary accounting is unchanged.

The app was deployed from a frozen, tested local source upload, not a GitHub main
commit. The frozen source archive and privacy-control evidence are retained; this was not a GitHub-main auto-deployment.

The following table records intermediate observations before the later accepted closure.

| Step | Intermediate evidence |
|---|---|
|  Account and budgets  |  Authenticated backend: team US$10 monthly; runtime US$8 monthly; evaluation US$1.72269354 cumulative; canary US$1 cumulative. Dedicated keys have Team attribution and 50/75/100% alerts. Auto-reload disabled; no configured BYOK.  |
|  Positive routing  |  Luna chat and `text-embedding-3-small` succeeded with managed OpenAI, no-training, one provider attempt and cost receipts.  |
|  Storage and retention  |  Pinned SDK serialization plus the exact Luna model's published forwarding contract; published OpenAI retention recorded in `config/providers.md`.  |
|  Negative policy  |  Arcee and Schematron no-training-ineligible routes returned HTTP 500 in four isolated rounds; streaming and non-streaming both failed. Logs show zero metered cost. Wrapper stopped and retained the reservation.  |
|  Live quota  |  Dashboard rejects US$0.10; quota API rejects `limitAmount < 1` with HTTP 400. Local pinned SDK tests verify exact 402 mapping and zero retries/fallbacks.  |
|  Shutdown  |  DELETE returned 204; key readback 404; the same previously successful credential returned 401 on `GET /v1/credits`. Local canary credential and capture private key removed.  |
|  Family gate  |  Tests require accepted S-VGW and current acknowledgement, including queued-call rechecks and withdrawal.  |

The [content-free live artifact](../../../spikes/s1/evals/results/vgw-live-controls-2026-10-10.json)
contains account readbacks, probe reports, spend, deletion, inference log metadata
and shutdown. It contains no prompt/response content or credentials.

Three model attempts were made: chat, embedding and negative policy. Metered
spend was **US$0.00000398**. Conservative counted spend remains **US$0.001063**,
including the failed negative reservation. The balance changed from
US$24.88745754 to US$24.88745356. The quota probe was not dispatched.

An authenticated quota PATCH using the endpoint employed by the official Vercel
CLI returned HTTP 400 for a zero limit: `Invalid request: limitAmount should be
>= 1.` This confirms the backend minimum, not just an HTML input constraint.
The evaluation API accepted the exact US$1.72269354 remainder; the dashboard's
create form allows only two decimal places.

[Historical experiment permission (050)](08-s3-gateway-verification.md#historical-experiment-permissions) records the new canary ceiling. The US$10 team ceiling
still constrains aggregate spend; individual key ceilings are not additive
allowances. Raising the canary ceiling does not itself establish quota rejection.
The old method of lowering a tiny canary's limit to its metered spend cannot
currently be used. Do not deliberately exhaust credits or waive the live proof
without resolving that method and its bounded allowance.

The verifier uses only `GET /v1/credits`, fences inference and binds to the used
credential. An unrelated invalid key, HTTP 402/403, active key or network error
cannot pass. Account deletion and local access removal are separate recorded
proofs. Credentials are removed after verification; ledgers/reports are retained.

The initial implementation passed lint, type-check, 346 tests and production
build. The US$1/version-3 amendment adds safe HTTP diagnostics for unclassified
SDK failures and a pinned SDK regression ensuring HTTP 500 cannot pass a policy
proof. Final check results are recorded in doc 08. Local mocked proofs remain
separate from the initial three live attempts above.

Latest quota/profile/streaming implementation: lint, type-check, **357 tests**
and production build passed; the focused gateway suite has 23 passing tests.
Four live rounds are recorded separately from these local checks.

Preserve all halted rounds and their US$0.002564 counted spend. The implemented
versioned follow-up runner carries an aggregate ledger across old and new sessions.
It binds each predecessor ledger's digest and carries its conservative charges
forward exactly once. A fresh key does not create a fresh spending allowance. Do not remove the
old halt, reclassify its HTTP 500 or replay a completed probe.

Four rounds have completed positive controls followed by one negative probe each.
Arcee and Schematron profiles keep their fixed provider allowlist and
`disallowPromptTraining: true`; the streaming variation retains the pinned SDK. The diagnostic transport must retain only HTTP
status, recognized error code and safe request identifiers; discard raw error
messages and prompt/response bodies. Check the embedding vector's length in
memory and retain only its dimension count, so the requested 768 dimensions
also have an observed live result.

The original negative-proof criterion required explicit no_providers_available. Four HTTP500 rounds failed it. The later restricted-pilot closure retained those failures and accepted compensating controls; the prepared reproduction remains local and unsent.

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

Mark S-VGW passed only after the account, privacy/routing, storage, exact policy
rejection, exact live quota rejection and used-key shutdown rows have accepted
evidence. The HTTP 500 in the first run remains failed even if a later round
passes. No challenger fallback becomes eligible merely because the primary
route passes; keep unvalidated fallbacks disabled.



At this dated stage credential activation depended on reviewed controls/provider rows and a minimal guarded smoke. The fixed synthetic canary did not require household acknowledgement and did not close application/voice gates. The subsequent actual activation is recorded below.

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
integration or production latency acceptance. [Activation evidence](../../../spikes/s1/evals/results/vgw-household-activation-2026-10-10.json).

The fixed call reserved US$0.000532 and conservatively settled US$0.000004. Canary
accounting stays US$1.00428; total counted validation including this activation is
**US$1.004284 / US$1.05**. The runtime key and PostgreSQL monthly hard cap remain US$8.
Historical canary ledgers are unchanged.

<a id="historical-experiment-permissions"></a>
## Historical experiment permissions and limits

October7–10 owner-scoped approvals formerly recorded in ADR-040/050/051 are historical, not reusable permission for new paid calls. Synthetic S3 owner cap moved fromUS$0.50 toUS$2.00 cumulative; the durable runner still enforcedUS$0.50, with countedUS$0.277306460 and remainingUS$0.222693540 at closure (owner remainingUS$1.722693540). The ledger had289 entries and SHA-256 efeea19451ce7dda99191ce15a77877f17fd59d81e29777b827d69aa26850b0e; S3 remains disabled. No ledger reset or new key resets counted spending.

S-VGW originally soughtUS$0.10; dashboard/API rejected limits belowUS$1. The owner then approved an isolatedUS$1 cumulative canary andUS$1.05 aggregate conservative ceiling across rounds. Closing quota work returned exactHTTP402 quota_for_entity_exceeded, DELETE204/readback404 and used-credential401. Conservative closureUS$1.00428, meteredUS$1.0007299; activation addedUS$0.0000038 reported cost and raised conservative total toUS$1.004284/US$1.05. Four negative-policy HTTP500 rounds remain failed; no explicit negative rejection or ZDR proof is implied. Existing restricted-pilot controls are [ADR-022](../../adr/adr-022.md); current acknowledgement is [ADR-017](../../adr/adr-017.md).

<a id="vgw-closure"></a>
## Latest S-VGW closure scope

Validated within the restricted founding-household spike scope on October10: positive managed OpenAI routing, quota rejection, used-key revocation and documentary forwarding/retention with the recorded negative-test exception. Staging PostgreSQL18.6 controls passed13 live cases/15 HTTP checks; explicit household acknowledgement at07:47:14.460 UTC survived redeploy and fixed-input activation passed. Total conservative validationUS$1.004284/US$1.05. No database server restart or new production-app acceptance is claimed. Earlier pending entries above describe their dated point in the chronology.

The new Home/streaming voice application remains unimplemented. New production policy/media/cost and both-phone gates belong to [P1/P2](../../plans/implementation-plan.md#p1); old spike approval is not copied to production.
