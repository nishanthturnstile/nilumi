# S3 — Command understanding implementation plan

> **Status:** Implementation delivered. Latest subscription regression passes synthetic gates: 59/60 overall, 11/12 held-out, 12/12 dates, 8/8 privacy; no observed tool activity under strengthened controls. One semantic failure remains. Hosted S3 acceptance/model selection remain pending; Gateway evaluator disabled. Family-data ZDR remains blocked.
> **Date:** October 7, 2026
> **Next acceptance work:** Synthetic correctness, then a successful live smoke and budget-bounded deployment comparison. The 60 expected actions are already owner-approved.
> **Prerequisite:** S2 owner approval is recorded; no additional recordings are needed.

## 1. Objective and agreed decisions

Validate whether Nilumi correctly converts a transcript into structured commands,
then checks those commands deterministically. For example, “Add milk and sugar”
must produce one shopping-add command containing two distinct items.

The deliverables are a runtime-validated contract, 60 synthetic golden cases,
an expected-action review, an offline test harness, and a gated comparison of
two models through an explicitly selected gateway. October 8 Cloudflare
preparation and the preserved Vercel option are documented in
[the gateway migration plan](09-s3-cloudflare-gateway.md); live acceptance remains pending.

Decisions confirmed during planning:

| Decision | Selected approach |
| --- | --- |
| Credential setup | Owner adds the Gateway key directly in Railway; no secret is shared in chat |
| Privacy | Family data requires ADR-038 ZDR; owner approved the separate synthetic-only Hobby evaluation exception in ADR-040 |
| Budget | US$5 for the entire month; this S3 testing increment is capped at US$0.50 including smoke calls, repeats, and retained reservations |
| Models | Start with `openai/gpt-6-luna` at low reasoning; `openai/gpt-5-nano` at low reasoning is the cheaper comparator; Claude comparison is deferred |
| Comparison repetitions | One pass by default; up to three only within the same US$0.50 testing allowance |
| Current increment | Core NLU contract, golden cases, validation, and Gateway comparison |
| Classifier experiments | Deferred and recorded as remaining roadmap S3 work |
| Production shadow traffic | Deferred; prepare mockable comparison instrumentation only |

S3 proposes interpretations and policy outcomes. It does not persist household
memories, modify shopping lists, schedule notifications, synthesize answers, or
implement production database access controls. Synthetic visibility fixtures
can validate interpretation policy; they cannot establish that production RLS
is correct. Those implementations and their integration gates remain in later
phases.

## 2. Repository grounding and source of truth

Extend the existing application in `spikes/s1/`; do not create a second PWA or
start the Phase 1 monorepo as part of this increment.

- Use Node.js 24 and pnpm 12.9.1, as documented and pinned in the spike.
- Keep pinned Biome for supported files and extend its current scoped includes
  to cover S3 code, fixtures, and tests. Retain existing Next.js ESLint rules for
  framework-specific checks without adding a second formatter.
- Read the spike's `README.md`, `AGENTS.md`, and installed Next.js documentation
  before implementing route handlers or server/client boundaries.
- Add pinned Zod 4, AI SDK, Gateway provider, and date-library dependencies as
  needed, with a committed pnpm lockfile. Verify compatible versions against
  current official documentation at implementation time.
- Keep credentials in Railway variables or ignored local environment files.
  Keep evaluation results and any later consented household fixtures ignored.

The governing references are:

- [Architecture §7: NLU contract](02-architecture.md#7-nlu-contract), including
  evidence, polarity, references, sharing, and deterministic validation.
- [Architecture §12: Dates](02-architecture.md#12-dates-times-and-recurrence).
- [Architecture §15.3: Sensitive-input boundary](02-architecture.md#153-sensitive-input-boundary-before-persistence-and-before-the-llm).
- [Architecture §16.2: Evaluation gates](02-architecture.md#162-evaluation-harness-and-gates).
- [ADR-038: Gateway privacy and routing](adr/adr-038.md).
- [Roadmap: Phase 0 / S3](05-implementation-roadmap.md#phase-0--spikes-and-decisions).

ADR-038 governs routing where older architecture or stack paragraphs still
describe direct provider calls. This plan does not authorize bypassing the
Gateway or adding direct OpenAI/Anthropic keys.

## 3. Command contract and deterministic validation

### Contract

Implement Zod schemas and infer TypeScript types from them. Generate the
provider JSON Schema from the same definitions so fixtures, prompts, runtime
validation, and evaluation cannot silently drift.

Preserve Architecture §7's `NluResult`: `language` is `en`, `ta`, or `mixed`;
`commands` contains zero to five ordered commands; `smalltalk_reply` is allowed
only when there are no commands. Reject oversized command arrays rather than
silently dropping requested actions.

Support the documented command union: remember, correct, forget, share,
unshare, undo, ask, inspect, list add/complete/remove/read, task
create/complete/list, reminder create, clarify answer, and unsupported. The
60-case set concentrates on the five capabilities requested for this increment;
the other variants receive contract and focused unit coverage.

Retain typed fact values, entity references, target references, predicate keys,
visibility hints, explicit share intent, correction reasons, effective dates,
recurrence, quantities, units, and notes. Facts carry their polarity and exact
transcript evidence span. Define evidence offsets as zero-based JavaScript
UTF-16 indices with an exclusive end, and test Tamil text and surrogate pairs.

Complete the schematic reference types needed for the spike: `ListRef` uses a
list mention with an optional fixture list ID; `MemberRef` uses a member mention
with an optional fixture member ID. Validate IDs against the supplied context,
never against model-invented records. Use the entity categories documented in
Architecture §8 and a synthetic predicate registry covering the golden set.

Use separate parser and validated-command types. At the parser boundary only,
allow a reminder's `at` and a date expression's `resolved` value to be absent
when the transcript does not supply enough information. The validated type
requires all necessary slots. Document this addition to the schematic contract;
an unresolved parser result must never be treated as executable.

### Validation outcomes

Return a per-command outcome of `interpreted`, `clarification_required`,
`confirmation_required`, or `invalid`. Whole-turn secret refusal uses `refused`
and contains no parsed commands or raw transcript. Whole-turn request/model
errors are recorded separately from command outcomes.

Validation applies the following rules:

- Reject malformed structures and unsupported IDs; resolve visible references
  using fixtures and clarify ambiguous targets or missing required slots.
- Check evidence bounds and normalized value/entity support in the relevant
  clause. Validate negation and hypothetical cues; do not propose affirmed
  writes from negated or hypothetical assertions.
- Validate predicates, subject/value compatibility, and value/object exclusivity.
  Mark `new:*` predicates provisional rather than treating them as established.
- Apply documented visibility defaults. A model hint can make a fact more
  private; less-private sharing requires a verified explicit cue and ownership.
- Require confirmation for health/allergy facts. Distinguish a correction of
  wrong information from a change in the world; retain the stated effective time.
- Use ordered command indices so a mixed turn can retain independent outcomes
  without claiming that any action was committed.
- Detect sensitive input before a Gateway call, report only a refusal category,
  and stop the entire turn. A benign command in the same transcript does not
  authorize sending its accompanying secret to the model.

Implement the documented checksum/cue detectors and normalization, including
spoken numbers. Keep allowed dates, amounts, and phone-number controls so
refusal does not become indiscriminate. Detection is heuristic; passing the
synthetic cases is not a claim that every possible secret will be detected.

### Dates and context

Resolve relative dates from the fixture's `occurred_at` in `Asia/Kolkata`, never
from the machine clock. Cross-check English expressions using `chrono-node`
`en.GB` and timezone-safe date arithmetic. Use explicit, tested rules for the
Tamil/Tanglish date phrases represented in the fixtures; do not assume the
English parser understands them.

Retain documented defaults: morning 09:00, afternoon 14:00, evening 18:30,
tonight 20:30, and weekend Saturday 10:00. Cover day-first dates, next Saturday,
month/year precision, recurrence, midnight/year boundaries, and already-past
times. Disagreement or unresolved ambiguity requires clarification rather
than silently selecting an invented timestamp.

Each call receives the synthetic speaker, member relations, current time,
visible entity shortlist, up to three prior turns, and any pending clarification.
Invisible records must be excluded before prompt construction. Preserve the
documented five-minute clarification expiry in fixture validation.

## 4. Golden set and next review

Commit exactly 60 synthetic cases, with stable IDs, in
`spikes/s1/evals/nlu.jsonl`. Each case has one primary category; language,
privacy, dates, and multi-command tags may overlap.

| Primary category | Cases | Required coverage |
| --- | ---: | --- |
| Shopping | 12 | Multiple items, quantities/units, brands, add/read/complete/remove, negation, repeated items |
| Memories | 12 | Preferences, contacts, locations, subject relations, polarity, evidence, private notes, health confirmation |
| Reminders and dates | 12 | Relative/absolute dates, day-first ambiguity, time defaults, missing slots, past times, recurrence |
| Questions | 8 | Entity/predicate extraction, answer shape, historical intent, ambiguous and unavailable references |
| Corrections and undo | 8 | Wrong vs changed facts, last-turn references, ambiguous targets, effective dates, expired context |
| Privacy and sharing | 8 | Explicit sharing, ownership, invisible targets, mixed visibility, secret refusal and benign controls |
| **Total** | **60** | |

Include at least 20 Tamil/Tanglish cases across romanized and Tamil-script
transcripts, and at least 10 multi-command cases. Use synthetic names, aliases,
and records throughout. No family recordings or private household transcripts
are required for this set.

Each fixture includes:

- ID, category, tags, transcript, fixed occurrence time, and synthetic speaker.
- Visible entities/members/lists, relevant memory/operation fixtures, previous
  turns, and pending clarification where applicable.
- Expected structured commands and expected deterministic outcomes, including
  expected refusal/clarification/confirmation reasons.
- A plain-language description of what Nilumi should understand and a short
  explanation of any potentially surprising behavior.
- Development or held-out designation.

For “Add milk and sugar”, expect `list_add` for the shopping list with separate
`milk` and `sugar` entries, no invented quantities, and no memory or reminder.
Questions expect a query plan; answer generation and retrieval correctness are
outside this comparison.

Allocate 48 cases for development and 12 held out, with two held-out cases per
primary category and language/multi-command coverage across the held-out set.
All 60 expected actions require owner review before live evaluation. The [authored review](07-s3-expected-actions.md) records the owner's approval of all 60 cases. Held-out transcripts and
answers must not enter prompt examples or tuning; if they do, replace them
before claiming held-out performance. Few-shot examples are separate synthetic
examples, not copies of golden cases.

The next review presents all 60 cases as transcript → expected actions →
clarification/confirmation/refusal, with concrete dates shown. Finalize the
expected actions before enabling live evaluation. Do not generate the golden
answers using the same model being scored or change them merely to accommodate
its output.

## 5. Railway and Gateway prerequisites

The verified deployment target at planning time is:

| Resource | Value |
| --- | --- |
| Railway project | Website-Thaarei |
| Project ID | `9acde490-30a2-4452-889a-fa5c67a79271` |
| Environment | staging |
| Environment ID | `ab1b8903-8615-484e-9410-04481200abbf` |
| Service | nilumi-s1 |
| Service ID | `2b23798e-f3ef-46c4-bb20-29e518784bfa` |
| Root directory | `/spikes/s1` |
| Origin | `https://staging.nilumi.in` |
| Region | Singapore (`asia-southeast1-eqsg3a`) |

Planning inspection originally found no Gateway key. On October 7 the owner
added it, and a names-only Railway check confirmed `AI_GATEWAY_API_KEY` is
present on `nilumi-s1` in staging. Existing privacy controls were documented
green under S0. The owner's October 7, 19:51 IST Windows native dashboard report
supersedes that configuration claim: the team is on Hobby, where team-wide ZDR
and provider/model allowlists are unavailable. No OpenAI BYOK is configured,
but the Railway key's identity is not confirmed. Balance is US$5 with US$0
spend and auto-reload off. No settings were changed or model calls made.
[Verification evidence and the approved synthetic-only exception](08-s3-gateway-verification.md)
record this failed gate; verified metadata must not be mistaken for readiness.

Both team-wide and per-request ZDR require Pro or Enterprise. Request-level
no-training and OpenAI-only filtering are available on Hobby, but do not
establish ZDR. The owner explicitly approved the separate synthetic-only
exception in [ADR-040](adr/adr-040.md); ADR-038 remains the baseline for family
data. The default evaluator mode continues to require ZDR. The server may
explicitly select `NLU_EVALUATION_MODE=synthetic_hobby` after owner fixture review
and confirmation of the Railway key's team and Gateway-managed OpenAI route.
That mode requires the fixed synthetic corpus hash and separate exception
approval; callers cannot submit transcripts or choose the mode.

Before any live model test:

1. Owner sets `AI_GATEWAY_API_KEY` directly in Railway staging. It must belong
   to the approved Vercel team and must not bypass the team's restrictions.
2. In default `zdr` mode, owner verifies team-wide Zero Data Retention (including
   no prompt training) with provider/model allowlists restricted to approved
   routes. In approved `synthetic_hobby` mode, require the fixed synthetic file
   hash and recorded ADR-040 exception; do not claim ZDR or family-data approval.
3. Verify Gateway-managed provider credentials are used. Do not use BYOK,
   which bypasses the documented no-training routing filter.
4. Record non-secret verification metadata: team identity, verification date,
   enabled policies, approved model/provider IDs, and the verifier. Do not
   store key values or screenshots containing secrets.
5. Confirm owner review of expected actions, then enable the staging evaluator.
   Missing credential or missing privacy/review verification blocks evaluation.

Every call sets `disallowPromptTraining = true` and a hard `openai`-only provider
allowlist. The default `zdr` mode also sets
`providerOptions.gateway.zeroDataRetention = true`; the approved Hobby mode
omits that unavailable control and labels reports accordingly.
Claude/Anthropic testing is deferred and is not allowed by the evaluator.
If no compliant route is available, record failure; never relax a mode's privacy
requirements or switch to an unapproved processor to obtain a result. Unknown
or mismatched Hobby route metadata stops subsequent calls.

Do not send credentials to the browser, print variable values, put secrets in
logs or fixtures, or configure a `NEXT_PUBLIC_*` Gateway key. Verify credential
presence using names/presence only. Require server-side checks rather than
trusting browser-supplied privacy flags.

Official implementation references:

- [Gateway authentication](https://vercel.com/docs/ai-gateway/authentication-and-byok).
- [Zero Data Retention](https://vercel.com/docs/ai-gateway/security-and-compliance/zdr).
- [No prompt training](https://vercel.com/docs/ai-gateway/security-and-compliance/disallow-prompt-training).
- [Gateway SDK routing options and BYOK caveat](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway).

## 6. Evaluation interfaces and implementation shape

Group the implementation under the existing spike:

- `lib/nlu/`: contracts, synthetic context/registry, prompt builder,
  sensitive-input checks, validators, Gateway adapter, scoring, and runner.
- `evals/`: the golden JSONL set, separate few-shot examples, and synthetic
  recorded responses used for offline regression tests.
- `config/`: exact model-role mapping and non-secret provider/privacy metadata.
- A staging-only `POST /api/nlu/evaluate` route and a local report-download
  script; no new public UI is required for this increment.

The endpoint requires the existing authenticated spike session and a
server-configured evaluator email allowlist. Apply same-origin protection and
permit one active run per service instance. An explicit staging/evaluation
enable flag is required; the endpoint is disabled by default.

The request accepts only `{ caseIds, modelIds, passes }`: unique IDs from the
committed set, one or both approved candidates, and one to three passes.
Reject arbitrary text, URLs, provider IDs, credentials, prompt overrides, and
client-defined budgets. Cap selections at 60 cases. Validate the request before
any billable work.

Stream progress/results through the response, including run/case/model IDs,
pass index, status, parsed synthetic output, validation outcomes, score,
latency, token/cache usage, and cost metadata. The local script saves reports
under ignored `validation-results/`. On disconnect, abort undispatched work
and account conservatively for in-flight calls. Do not leave a detached batch
running after the response is gone.

Keep the adapter injectable so all offline tests use mocks or recorded synthetic
outputs. Keep model-role selection and shadow/fallback comparisons outside the
contract. The scored run pins each candidate and disables SDK retries,
cross-model fallback, and schema-repair retries to preserve attribution.
Exercise the later fallback/repair wrapper separately with mocks and label
that evidence as offline only.

Use a versioned static prompt prefix containing rules, schema, registry, and
separate few-shot examples; append minimized dynamic context. Record prompt,
registry, fixture, and model configuration versions in every report. Use the
lowest supported reasoning setting appropriate to structured extraction and
record the effective per-model options; do not send unsupported common options.

## 7. Comparison, scoring, and budget accounting

Run each selected case once per model before beginning a second pass, then a
third. Alternate model order by case/pass and keep one call in flight to limit
budget races and avoid conflating concurrency with latency. Use a five-second
NLU timeout and a bounded output-token allowance of 4,096 per request.

Measure full Gateway request time until the structured output is available,
and validation time separately. Report nearest-rank p50/p95 over successful
model calls with sample counts; report failures/timeouts independently. Do not
claim a household or end-to-end voice latency benchmark from these results.

Structural correctness requires the expected command kinds and order, item/fact
counts, semantic slots, references, polarity, dates, visibility, and outcomes.
Normalize only documented harmless variations such as object-key ordering,
Unicode NFC, and explicitly allowed name aliases. Validate evidence separately
so alternate valid spans can pass without accepting fabricated support. Do
not discard unexpected commands or merge two requested items during scoring.

Report:

- First-attempt schema validity and structural correctness by model, category,
  language, multi-command tag, pass, and development/held-out split.
- Date and privacy scenario correctness separately. Secret cases that are
  locally refused are boundary tests with zero model calls; exclude them from
  model-call latency, token, and schema-validity denominators.
- Failures as incorrect attempted cases, without hiding them through
  success-only accuracy. Mark cases not attempted because of the cap as not
  evaluated; incomplete coverage cannot pass the completion gate.
- Prompt size, input/output and cached tokens, actual routed provider/model,
  reported charge when available, calculated charge otherwise, and total cost.
- First-pass vs repeated-pass cache observations; do not label a request cold
  unless supported by usage metadata or assume a cache hit in estimates.

Reserve conservative uncached input cost plus maximum output cost and applicable
fees before dispatch. Obtain current rates for the pinned routes, include all
billable calls, and stop before another reservation would exceed the US$0.50 testing cap (inside the US$5 monthly total). Use
reported usage to settle reservations. Unknown rates block dispatch; missing
usage retains the full reservation. Keep charges without reliable metadata
clearly labeled as estimates.

Make the local evaluation script the authoritative comparison runner. It sends
one case/model/pass per request and maintains an ignored, content-free budget
ledger under `validation-results/`, using an exclusive run lock and atomic file
replacement. Reserve the full request allowance in that ledger before sending
it; settle it after receiving usage. Retain the reservation after a disconnect,
timeout, or process interruption, and load the ledger on resume. Do not reset
the US$0.50 testing allowance or US$5 monthly allowance per HTTP request, per model, or after a Railway restart.

All billable comparisons and smoke calls must go through this script. The
endpoint enforces request bounds and access control, but is not itself a durable
account-wide spending limiter; the script enforces the selected comparison
budget. Record this limit in the operator instructions and use Gateway
account/key spend controls as an additional cap where available. No new
database or Railway volume is needed for this spike.

## 8. Tests, acceptance, and rollout

### Offline checks

- Assert exactly 60 unique fixtures, category totals, language/multi-command
  minima, and a stratified 12-case held-out split.
- Validate all expected structures and context references; test malformed
  outputs, extra commands, missing slots, invalid evidence, and invented IDs.
- Test shopping splitting, quantities, negation/hypotheticals, correction
  reasons, reference ambiguity, health confirmation, sharing ownership, and
  invisible-record exclusion.
- Test all fixed date rules and Tamil/Tanglish expressions used in the set,
  including disagreement and expired clarification behavior.
- Spy on the adapter to prove refusal cases make no model call and no secret
  reaches errors, logs, progress events, or stored reports.
- Mock missing credentials, disabled evaluation, unapproved callers/models,
  privacy verification failure, no compliant route, timeout, malformed JSON,
  absent usage, budget exhaustion, reconnect/disconnect, and concurrent runs.
- Test semantic scoring denominators, failures, held-out reporting, nearest-rank
  percentiles, and cumulative budget reservations across separate requests,
  runner interruption/resume, and service restarts.

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` in the existing
spike before reporting implementation complete. Preserve the S1/S2 regression
checks. No live call is required for ordinary CI.

### Live acceptance

After the review and configuration gates pass, verify the deployed authenticated
route with a small synthetic subset, counting those calls toward the US$0.50 testing cap, then
run the full comparison within the remaining allowance.

- Require structural correctness at least 90% on the complete set and held-out
  subset for every reported pass; with 12 held-out cases this means at least
  11 correct.
- Require dates and privacy 100% in every relevant slice and pass. A privacy
  failure disqualifies a candidate regardless of aggregate correctness.
- Compare qualifying candidates by structural correctness, then p95 latency,
  schema-valid rate, and cost. Do not select a model that misses a hard gate.
- Report the documented 1,400 ms NLU p95 target separately; cache hits are not
  assumed. If no model qualifies or coverage is incomplete, record the unmet
  gate and leave selection pending.
- Record the measured configuration and reproducible report, then update the
  roadmap/spike notes with the actual outcome. Model selection is evidence,
  not permission to deploy production traffic.

Disable the live evaluator after the comparison. Roll back S3 application
changes through the existing Railway workflow if needed; no database migration
or data deletion is part of this increment.

The core increment is complete when the reviewed cases, contracts, offline
checks, verified Gateway configuration, and budgeted comparison report are
delivered with any unmet gates stated. Do not mark all roadmap S3 complete:
offline classifier experiments and production shadow validation remain deferred.

## 9. Implementation order and handoff checklist

1. Implement contracts, synthetic context, validators, fixtures, and offline
   scoring; keep live evaluation disabled.
2. Present all 60 transcripts and expected actions for the owner's next review.
   Finalize fixtures and freeze the held-out set.
3. Owner configures Railway credentials and verifies the approved Gateway
   team's effective privacy settings. Record only non-secret verification.
4. Wire the protected runner, local cumulative budget ledger, model
   registry, reporting, and privacy-enforcing Gateway adapter.
5. Complete offline checks and production build; deploy staging changes through
   the established workflow, with evaluation still disabled until gates pass.
6. Run the synthetic smoke subset and comparison under the US$0.50 testing cap within the US$5 monthly total.
   Save reproducible results, failures, costs, and cache observations.
7. Record selection or unmet gates, disable evaluation, and explicitly retain
   deferred classifier/shadow work in the roadmap.

## 10. Implementation handoff — October 7, 2026

The existing spike now contains the Zod contract, deterministic validators,
sensitive-input guard, 60 manually authored synthetic cases, review document,
versioned prompt/registry/model options, injectable Gateway adapter, authenticated
staging evaluation route, scoring, and a durable local comparison budget ledger.
Parser results can omit unresolved date slots; validated results cannot. The
schematic TargetRef additionally uses `task_id` for visible synthetic tasks.
Mock recovery instrumentation remains disconnected from scored calls.

The models were checked against the current public Gateway catalog: Luna
US$0.10 input / US$0.50 output per million tokens, Nano US$0.05 / US$0.40.
Luna's US$0.125/M cache-write premium is included in reservations. No tools,
search calls, SDK retries, repair retries, model fallback or premium tiers run
in the scored path. Price drift blocks subsequent live runs.

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

## Next correctness increment — deterministic interpretation

1. Commit the delivered S3 implementation and subscription evidence as a
   reviewable baseline (`becd350`).
2. Resolve complete, literal date phrases locally using the existing Chrono
   and Luxon dependencies. Reject partial parses, ranges and conflicting
   relative expressions; retain clarification for missing or ambiguous times.
3. Improve literal self mentions and last-record reference instructions using
   development inputs. Preserve contracts, expected actions and scorer.
4. Report raw extraction and interpreted results separately. Add regression
   tests for all weekday anchors, timezone equivalence, unsupported phrases,
   invented IDs, privacy refusals and integration with both evaluators.
5. Run the three failing development examples, then the 48-case development
   set. Freeze prompt plus pipeline before the repeated 60-case regression.
6. Record actual results and commit the new implementation. Proceed to a paid
   deployment smoke only once synthetic gates pass and the reserve fits the
   remaining cumulative allowance. No subscription result selects a hosted
   model or proves five-second latency, Gateway routing or family-data ZDR.

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

## October 8 follow-up — subscription tool controls and blind regression

The next item is to resolve the observed collaboration activity and improve
synthetic correctness before any paid deployment validation. Preserve the 60
owner-approved fixtures, semantic scorer, privacy/date thresholds, five-second
Gateway deadline and cumulative US$0.50 cap. Do not inspect held-out transcripts,
expected answers or failed raw outputs for tuning.

Research found a separate `agents.enabled` setting in the official
[Codex configuration schema](https://learn.chatgpt.com/docs/config-schema.json).
It defaults to true; disabling feature switches alone was insufficient in the
previous run. The runner now sets `agents.enabled=false`, retains both disabled
multi-agent feature switches, uses `--strict-config`, and excludes collaboration
and clock from the nested code-mode surface. The
[configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
documents nested namespace exclusions. Runtime JSONL is checked as it arrives;
any observed tool/error event stops the subprocess and rejects that case.
This is defense in depth: a started event can follow dispatch, and the CLI is
not an API request with `tools: []`. Passing runs establish no observed tool
activity, not proof that every tool definition is absent.

Implementation and validation order:

1. Probe only development cases that previously triggered tool activity.
2. Clarify extraction versus execution policy: supported actions still reach
   deterministic validation even when ownership, missing slots or ambiguity
   prevent execution. Strengthen shopping item and literal memory extraction
   using development evidence, never held-out answers.
3. Run the 48 development cases and automated regression checks.
4. Freeze prompt and complete pipeline; run one 60-case regression and retain
   every attempted failure. Do not rerun selectively to obtain a passing score.
5. Check in compact content-free evidence and record whether the hard gates
   pass. Only then consider hosted smoke/model comparison within the existing
   remaining allowance. Family-data ZDR remains a separate gate.
The offline deployment budget calculation for prompt v8 reserves at most
US$0.0167944 for GPT-4.1 nano's three original development smoke cases, and
US$0.3248431 for its full 60-case pass. Together, US$0.3416375 fits the retained
US$0.377115275 remaining testing allowance, leaving US$0.035477775 at maximum
reservation. Mini's smoke reserves US$0.0671776 and its full pass US$1.2993724;
a complete Mini pass cannot currently be guaranteed within the cap. These are
configured-price upper allowances from dry runs, not live charges or fresh rate
verification. No ledger entries were added.

The concrete hosted next step, after synthetic gates pass, is to verify current
Nano pricing and eligible OpenAI-only/no-training/store:false routing, deploy
the reviewed extraction changes to staging, run the authorized three-case Nano
smoke with the five-second deadline, and stop if any smoke case fails. Only a
passing smoke permits the frozen 60-case pass through the durable budget runner.
This affordable single-candidate validation does not by itself complete the
original two-model comparison. No model selection or family-data authorization
can be derived from subscription results.
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
[subscription-v8.json](../spikes/s1/evals/results/subscription-v8.json), and
[verification notes](08-s3-gateway-verification.md) retain phase hashes and
limits. No paid Gateway calls, deployment, purchase or model selection occurred.
Hosted S3 acceptance remains pending the budget-bounded live workflow above.
Hosted follow-up on October 8: deployed reviewed v8 to staging and ran the
three approved development smoke cases through managed OpenAI GPT-4.1 nano.
Schema/routing passed and all calls completed within five seconds, but semantic
correctness was **2/3**. An ordinary preference was misclassified as a correction;
validation required clarification. The full run and further paid tests stopped.
No model selection occurred. Three reported charges total US$0.0010442; retained
ledger US$0.123928925, remaining testing allowance US$0.376071075. Evaluator
disable/allowlist clearing and tested-artifact redeploy followed the failure.
See [hosted smoke evidence](08-s3-gateway-verification.md).

The next implementation item is development-only prompt/input simplification
for the hosted small model, followed by a frozen synthetic evaluation and another
bounded smoke only when the revised pipeline qualifies. Preserve correction
semantics, privacy/date gates, the deadline, and the ledger. The successful Luna
subscription regression does not establish Nano accuracy or hosted acceptance.

## October 8 — small-model prompt simplification

Owner approved continuing after the failed v8 Nano smoke. Simplify extraction
instructions and the presentation of context using only development evidence.
Keep `openai/gpt-4.1-nano`, the full command/output contracts, reviewed corpus,
semantic scorer, deterministic interpreter, privacy requirements, five-second
hosted deadline and cumulative budget unchanged.

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

Validation order: corrected development smoke, all 48 development cases, freeze
prompt and pipeline, one original-corpus 60-case regression, then a bounded Nano
hosted smoke only if synthetic gates pass. Retain every failure. The original
holdout remains regression evidence; do not inspect its transcripts, expected
answers or raw outputs to tune this revision. Subscription correctness cannot
establish the hosted model's accuracy or latency.

A newly added contrast-example test caught an authoring serialization error.
That error was corrected before the valid v9 smoke/development run. Prototype
report `94a6aa79-3d50-4dc4-9c46-2b8c43167f08` is excluded from correctness evidence
because its few-shot array was malformed. No held-out cases or paid calls were
used in that prototype.

Offline v9 configured-price reservations: Nano smoke US$0.0164956; full pass
US$0.3190663; combined US$0.3355619, within the current US$0.376071075 retained
remaining allowance. Verify current rates and budget again before live dispatch;
these figures are maximum allowances, not charges. Stop and disable evaluation
if the hosted smoke fails. No cap reset or removal of historical reservations.

Final v9 outcome: revised development 47/48, dates 10/10 and privacy 6/6;
frozen original-corpus regression 54/60, held-out 8/12, dates 11/12, privacy 7/8,
schema 58/58. **Synthetic acceptance failed.** The prompt is an unaccepted local
candidate and was not deployed. No paid calls followed. All 203 automated tests,
lint, type checking and build passed. Staging remains disabled and the budget
ledger is unchanged. See [v9 verification](08-s3-gateway-verification.md) and
[retained score evidence](../spikes/s1/evals/results/subscription-v9.json).
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
Next authorized gate is the bounded Nano hosted smoke with unchanged routing,
privacy, five-second deadline and cumulative budget controls.

Hosted v10 follow-up: managed OpenAI Nano smoke scored 2/3, schemas valid and all
calls within five seconds. Ordinary-preference intent failed again; validation
required clarification. Full hosted comparison and further paid calls stopped.
Smoke cost US$0.0021051; retained ledger US$0.126034025, remaining cap
US$0.373965975. Evaluator disable/empty allowlist and tested-artifact redeployment
were verified with authenticated 404 `evaluation_disabled`. No model selection.
V10 development is delivered; S3 acceptance still requires a reliable eligible
model/route that fits the deadline and retained budget. See the verification
notes and [hosted evidence](../spikes/s1/evals/results/gateway-v10-nano-smoke.json).
