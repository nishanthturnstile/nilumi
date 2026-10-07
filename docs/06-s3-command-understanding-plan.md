# S3 — Command understanding implementation plan

> **Status:** Implementation and approved synthetic-only staging smoke delivered. Owner fixture review and Railway key identity are confirmed. Luna has no eligible provider; Nano misses the five-second deadline. Full comparison and model selection remain incomplete; evaluator disabled. Family-data ZDR remains blocked.
> **Date:** October 7, 2026
> **Next owner review:** The 60 transcripts and their expected actions.
> **Prerequisite:** S2 owner approval is recorded; no additional recordings are needed.

## 1. Objective and agreed decisions

Validate whether Nilumi correctly converts a transcript into structured commands,
then checks those commands deterministically. For example, “Add milk and sugar”
must produce one shopping-add command containing two distinct items.

The deliverables are a runtime-validated contract, 60 synthetic golden cases,
an expected-action review, an offline test harness, and a gated comparison of
two models through the approved Vercel AI Gateway.

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
