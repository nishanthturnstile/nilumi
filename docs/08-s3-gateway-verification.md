# S3 Gateway configuration verification — October 7, 2026

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
[ADR-038](adr/adr-038.md)'s accepted team-wide ZDR baseline. This evidence
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
implementation chat on October 7. [ADR-040](adr/adr-040.md) records the exception.
The implemented mode follows these bounds:

1. Add an explicit synthetic-only evaluation mode while preserving the strict
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
   US$5 monthly allowance remains shared with all other work.
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

Next provider decision: investigate OpenRouter Standard's exact Azure model
route, privacy settings and eligibility before proposing an ADR-038 migration.
Keep current synthetic evaluation on Vercel and preserve the production gate.


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

Next live work must first resolve Luna's eligible-provider failure or validate
a faster small model against the same corpus and restrictions. A longer timeout
would change the acceptance conditions and should not hide this failed smoke.
The existing Vercel Hobby credits remain useful for synthetic testing; a future
OpenRouter route requires its own eligibility/privacy verification and an ADR
before family-data use. Family-data ZDR remains blocked under ADR-038.

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
synthetic-only challengers. [ADR-040](adr/adr-040.md) records the scope. Both
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
remains frozen after this run. The next correctness work should target date
and reference consistency on development inputs; if held-out evidence is used
for further tuning, replace and independently review the holdout before
claiming a fresh held-out result. This run establishes that subscription-based
local evaluation is usable, not that Luna or another model is deployable.
No Gateway smoke or 60-case deployment comparison followed this failed gate.

Prompt changes supply computed UTF-16 clause spans without inferring intent,
clarify ordinary facts versus explicit changes/corrections, preserve temporal
prepositions, expand reminder adult targets, constrain unsupported optional
fields, and clarify minimal reference targets and query answer shapes.
The duplicate schema copy was removed from static prompt prose; the same
schema is still supplied at the structured-output boundary and included in
budget accounting. Contracts, validation, approved expected actions and the
frozen corpus hash are unchanged.

The Gateway ledger remains **US$0.122884725 retained**, leaving
**US$0.377115275** conservatively under the cumulative US$0.50 cap. A dry run
of the first revised prompt estimates **US$1.1865508** for the complete Mini
maximum reservation and **US$0.061342** for its three-case smoke. These are
conservative maximum allowances, not measured charges. Sequential settlement
could cost less, but a full maximum-reserved comparison cannot be guaranteed
within the remaining cap. No further Gateway calls were made, and the
evaluator stays disabled.

The frozen third revision's Mini dry run updates the complete maximum
reservation to **US$1.2452932**. The prior smaller figure above belongs to
the first revision, not the frozen prompt. No spending cap or reservation
formula was weakened to make a full run appear affordable. The new local
runner and frozen prompt passed **187 automated tests**, lint, type checking
and production build. Meaningful new regression checks cover subscription
credential isolation, held-out selection, tool/turn rejection, bounded
dispatch, correctness-versus-deployment status, and UTF-16 span boundaries.

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
[the S3 plan](06-s3-command-understanding-plan.md#next-correctness-increment--deterministic-interpretation).
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

Checked-in [compact evidence](../spikes/s1/evals/results/subscription-v7.json)
contains phase summaries, report hashes, per-case scores, normalization paths,
the aborted run and runtime-equivalence proof. It contains no held-out transcript,
expected answer or raw model text. Original reports remain ignored locally.

Next acceptance work is to resolve CLI tool registration/isolation and improve
blind shopping/memory generalization. Do not deploy or run a paid model selection
comparison on the basis of this failed synthetic gate. If the failed held-out
contents are inspected for tuning, retire them as regression cases and obtain
independent authoring/owner review of a replacement holdout before a fresh claim.

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

[Compact checked-in evidence](../spikes/s1/evals/results/subscription-v8.json)
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
a guaranteed full Mini pass does not. The next hosted step is current
price/routing verification, staging deployment, a passing Nano smoke, then its
frozen full pass through the durable ledger runner. Stop if smoke fails and
disable evaluator afterward. That single-model validation does not complete the
original two-model comparison. **Hosted S3 acceptance remains pending.**
## October 8 — hosted v8 Nano smoke, stopped at the correctness gate

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
[compact checked-in evidence](../spikes/s1/evals/results/gateway-v8-nano-smoke.json)
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

The next correctness work should target a simpler extraction prompt/input for
the small hosted model using development cases and fresh separately authored
examples. Preserve ordinary preference versus explicit correction semantics;
do not weaken scoring or convert an unsupported model correction into a write.
Freeze and validate any changed prompt synthetically before another bounded
hosted smoke. A larger model's subscription pass does not transfer automatically
to Nano. S3 hosted acceptance and the two-model comparison remain pending.
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
[content-free v9 evidence](../spikes/s1/evals/results/subscription-v9.json)
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

This closes the v9 simplification experiment, not S3 acceptance. Next work must
address correctness with development evidence and separately authored examples;
do not tune from held-out content or repeat a frozen run until a lucky pass.
Preserve the failed comparison against v8 and obtain a qualifying synthetic
pipeline before any further paid smoke. Hosted latency, model selection and
family-data ZDR remain unverified.

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
phase hashes remain in [v10 evidence](../spikes/s1/evals/results/subscription-v10.json).

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
[checked-in smoke evidence](../spikes/s1/evals/results/gateway-v10-nano-smoke.json)
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
failure. Next work should assess a stronger eligible model/route against the
remaining cumulative allowance and deadline before further paid dispatch.
Recheck worst-case reservations: the current Mini full-pass bound is four times
Nano's and cannot fit this remaining cap. Do not purchase credits, reset the
ledger, weaken accuracy/privacy gates or repair wrong model intent to force
acceptance. Family-data ZDR and the original two-model comparison remain pending.
