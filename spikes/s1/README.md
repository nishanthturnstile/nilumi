# S1: Nilumi PWA spike

M1/M2 cover installability, email-code sessions, a ten-minute step-up window,
and microphone capture. Uploads currently return `spike-noop`; they do not
transcribe or store audio. M3 adds a canned SSE turn and two synthetic audio
clips; M4 adds Web Push subscription and immediate/delayed test notifications.
Real speech synthesis and durable push storage are outside this spike.

Use Node.js 24 and pnpm 12.9.1 (pinned in `package.json`).

## Local smoke test

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Next.js, usually http://localhost:3000. Without a
Resend key, both sign-in and step-up show the local development code.

1. Sign in, open `/sensitive` twice, and confirm neither fresh visit asks for
   step-up. After ten minutes, request and verify a fresh code. Clearing cookies
   instead returns you to sign-in, rather than triggering step-up.
2. Hold Talk for a second and release: recording should upload and return to
   idle. Tap Talk and then Stop: exactly one recording should upload, and the
   microphone indicator should turn off.
3. Try sliding away, cancelling a pointer, denying microphone access, and
   releasing a hold while the permission prompt is still open. Cancelled
   recordings should release the microphone and should not upload.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The existing Next.js ESLint rules check React and framework-specific behavior.

## Railway staging

Use the existing Website-Thaarei project, an empty Staging environment, and a
service for this spike. Set the service root directory to `/spikes/s1`, build
command to `pnpm build`, start command to `pnpm start --hostname 0.0.0.0`, and
healthcheck path to `/`. Railway's config-file settings are deprecated; configure
these directly on the service. Run one replica in Singapore
(`asia-southeast1-eqsg3a`), with sleeping disabled: sign-in codes are in memory
and cannot be shared between replicas or survive a restart.

Set service variables:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `AUTH_SECRET` | A generated random secret; keep it stable across deployments |
| `RESEND_API_KEY` | Your Resend key; `CONFIGURE_IN_RAILWAY` is only a placeholder |
| `RESEND_FROM` | `Nilumi <signin@nilumi.in>` (verify this sender in Resend) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public half of a generated Web Push key pair; required at build time |
| `VAPID_PRIVATE_KEY` | Private half of that pair; server only |
| `VAPID_SUBJECT` | `mailto:admin@nilumi.in` |

With a missing or placeholder Resend key, production sign-in returns 503.
Development codes are only exposed locally. Keep credentials in Railway or
ignored `.env.local` files.

Add `staging.nilumi.in` as the service's custom domain on port 3000. Railway
returns the required CNAME and any ownership records; copy the exact values
into Cloudflare DNS, using DNS-only initially. Wait until Railway confirms
DNS and TLS before installing the PWA from that origin.

## Phone checks

On Android, open staging in Chrome and install the app. On iPhone, open it in
Safari and add it to the Home Screen. Test each in standalone mode:

- Sign in; close and reopen; confirm the session persists. Check fresh and aged
  `/sensitive` visits.
- Hold/release, tap/start/stop, slide away, deny/retry permission, and quickly
  release during the permission prompt. Confirm the microphone turns off.
- Record while switching apps, locking the phone, or receiving a call. Note
  whether the interruption prompt appears and whether the clip is kept or
  discarded.
- Note the negotiated MIME type, upload bytes, device/OS, gesture, observed
  phase, microphone indicator, and any friction for both household members.

Desktop fake-microphone checks cannot establish iOS/Android interruption or
permission behavior. Record real phone results before treating M1/M2 as accepted.

## M3/M4 phone acceptance

Use `https://staging.nilumi.in` in the installed app on both phones. Close and
reopen, then reload online to pick up the latest deployment. Confirm the page
contains **Play test turn**, **Enable notifications**, and **Send in 10 seconds**.
On iPhone, use the Home Screen app (iOS 16.4 or later), rather than a Safari tab,
for push. Sign in before enabling notifications or sending tests.

| Check | Expected result |
| --- | --- |
| Play test turn | Two lines (milk, then “Anything else?”), two distinct beeps, status done |
| Play another turn | Both lines and beeps play again, with no accumulating duplicates |
| Switch apps/lock after the first beep finishes | Return and hear only the remaining beep; two lines total |
| Interrupt during a beep | Return and tap **▶ Play reply** if shown; the interrupted clip resumes, then the remaining clip plays |
| Briefly disconnect Wi-Fi/mobile data mid-turn, then restore | Reconnect completes the turn without repeating completed clips or lines |
| Audio permission/interruption blocks playback | A visible **▶ Play reply** appears; tapping recovers, rather than failing silently |
| Navigate to Sign in during a turn | Audio stops and the old turn does not reconnect |
| Enable notifications → allow → Send test notification | Notification appears; status counts push-service acceptance, not confirmed device delivery |
| Send in 10 seconds | Wait for “Scheduled”, immediately swipe away and lock; notification arrives with the app closed |
| Tap the notification | Installed app opens or the existing app window gains focus |
| Deny notification permission | Clear denial message; allow in device settings and retry |

A freshly launched iPhone app does not necessarily reject `play()`: the fallback
is conditional, not an expected failure on every launch. Repeat cold-launch
playback, and use interruptions to check recovery. Focus mode and notification
settings can suppress visible alerts; record delays separately with those
settings noted.

Subscriptions are scoped to the signed-in email and held in process memory.
After any redeploy/restart, tap **Enable notifications** again on each phone.
Delayed sends use a ten-second in-process timer: closing the phone app does not
cancel it, but restarting the server does. This requires one always-on replica.
The service worker excludes APIs and authenticated pages from its cache.
Audio responses support byte ranges (including Safari's two-byte probe), with
explicit lengths and `no-store, no-transform` to preserve the WAV bytes.

Record device/OS, scenario, pass/fail, notification delay, whether the fallback
appeared, and any friction your wife encounters. M3/M4 remain pending real-phone
acceptance until these results are recorded; M5/M6 and the S1 outcome decision
follow afterward.

2026-10-06 phone results: Android acceptance reported pass. iPhone Safari M3
reported “audio unavailable” on the first turn. The missing byte-range support
has been corrected; iPhone acceptance remains pending a retest of that deployment.

## S2: STT validation and household recording kit

From the home screen, tap **STT bakeoff** to open `/bakeoff`. Tap **Back to home**
at the top of the bakeoff screen to return, including in the installed phone app.
Select the audio files, enter one shared truth or load a
per-clip JSON manifest, edit the keyterms, and press **Run bakeoff**. Filenames
match by basename; duplicates and missing truths are rejected before provider
calls. The batch can contain up to 80 clips, each at most 10 MiB, with 80 MiB
combined. Keep every clip under 30 seconds (Sarvam REST limit).

`clips/clips.json` now contains **40 recording prompts per adult**, not recorded
household evidence. Meena, Kavin and Diya are example names. Replace them with
consented names, and replace brands/places with those you actually use. Keep
real clips, aliases and handwritten transcripts under ignored `clips/local/`.
Do not copy private household information into the committed examples.
Record the same set separately for each adult. Use speaker prefixes in the
filenames (`adult-a-001.webm`, `adult-b-001.mp4`) and update the local manifest
accordingly. Tag the actual speaker, noise and device/MIME. Prompts distribute ten recordings to each of quiet, kitchen/fan, TV,
and distance, including two Tanglish cases in each condition. Transcribe what was
actually said; a prompt is only a starting truth.

The 50-term seed is editable in the page. Sarvam defaults to `saaras:v4`,
`mode=codemix`, and auto-detected language. Codemix writes Tamil in Tamil script
and English words in Latin script. Use the provided Tamil-script truths for
codemix; if you select **Latin script**, replace those truths with the
`truthTranslit` examples and correct them by hand. WER does not equate scripts
or normalize equivalent number spellings. Inspect dates, quantities, negation
and corrections manually as well as reading the aggregate scores.

Results contain each truth, full transcript, status, tags/noise, request time,
WER, entity hit rate, and per-provider summary. **Download results JSON** saves
these locally. Entity rate is N/A when no configured keyterm appears in truth.
Means are per successful clip, not weighted corpus WER; entity mean only uses
clips with expected keyterms. p50/p95 use nearest-rank successful provider
request times, including upload; they exclude browser time and failed calls.
A small synthetic sample cannot establish household p95 or select an STT
winner. Provider requests time out after 30 seconds.

ElevenLabs stays blocked on the server even if a browser requests it unless
both `ELEVENLABS_API_KEY` and `ELEVENLABS_S0_APPROVED=true` are present. Set the
approval flag only after recording the green S0 row in Tech §7. Sarvam remains
the only provider exercised live by the validation script.

The focused S2 files use pinned Biome for formatting/linting. Existing Next.js
ESLint rules remain for framework checks. `pnpm format` formats only this scope;
`pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` check the project.

To repeat **synthetic integration checks** with locally installed `espeak-ng`
and `ffmpeg` (no TTS API or household data needed):

```sh
python3 scripts/generate-validation.py
node scripts/validate-live.mjs https://staging.nilumi.in
```

`ESPEAK_BIN`, `ESPEAK_DATA_PATH`, and `FFMPEG_BIN` optionally override tool paths.
Generation creates 40 synthetic speech fixtures, three format conversions,
low-volume/fast/slow/hum/competing-speech variants, silence and corrupt audio.
The generated manifest and audio stay in ignored `clips/generated/`; reports
stay in ignored `validation-results/`. The live script makes 50 Sarvam calls
and is a billable smoke test. A pipeline pass means a valid response, not an
accurate transcript. It records accuracy separately and excludes negative
controls from speech averages. Synthetic inputs cannot establish real fan/TV/
reverb behavior, phone capture behavior or both adults' accuracy. The owner's
subsequent manual approval is recorded below. ElevenLabs comparison remains gated.

Sarvam references: [REST formats and clip limit](https://docs.sarvam.ai/api-reference/speech-to-text/transcribe),
[output modes and scripts](https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/how-to/select-output-mode),
[keyterm rules](https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/how-to/keyterms).


### October 7 validation status

The initial live synthetic run exposed an MP4 MIME rejection and a hallucinated
word on digital silence. The adapter now sends MP4/M4A as `audio/mp4` and rejects
exactly silent 16-bit PCM WAV before making a provider call. This silence guard
is deliberately narrow: it does not detect silence in WebM/MP4 or suppress
non-silent background noise. A real-device VAD decision remains separate.

Live different-truth batches, custom keyterms, Tamil `translit` with `ta-IN`,
ElevenLabs refusal, malformed manifests, invalid modes and excess keyterms were
also exercised. The automated suite has 38 tests covering scoring, validation,
adapters, silence and existing Safari WAV ranges. Exact benchmark outcomes are
in the ignored `validation-results/` JSON reports; synthetic accuracy is not a
household acceptance gate. This was the initial automated-validation status;
the subsequent owner approval below is the current S2 status.


### S2 owner approval: October 7, 2026

**Status: approved to proceed with Sarvam Saaras v4.** The owner reports that
manual review and validation succeeded and explicitly requests S2 approval
and progression to the next spike. No further S2 recordings are required to
honor that approval.

Recorded supporting evidence:

- 38 automated tests, lint, type-check and production build passed.
- The final 50-scenario synthetic run passed processing checks: 48 speech
  uploads processed, exact digital silence refused locally, and corrupt audio
  refused. Synthetic mean WER was 31.2%, mean entity accuracy 67.8%, provider
  p50 255 ms and p95 511 ms. These are synthetic results, not household scores.
- One real M4A result was supplied in chat: a milk-and-sugar shopping request
  retained both items, provider time 518 ms, WER 0.1 (one inserted article),
  and configured-keyterm accuracy 1.0. This sample does not establish household
  p50/p95 or recognition of unconfigured entities.
- Home-to-bakeoff and return navigation were deployed and verified live; the
  owner reported successful phone validation.

The complete manual test files, speaker counts and noise coverage were not
supplied to the repository. Approval records the owner's acceptance, without
claiming a measured 40-clip-per-adult benchmark or an ElevenLabs comparison.
ElevenLabs still requires its green S0 row and server approval flag before use.
Later real-turn latency and regression gates remain as defined in the roadmap.

**Next: S3, NLU bake-off.** Build the command schema and a 60-case golden set,
then evaluate structured command extraction, dates, evidence spans, privacy,
clarifications and multi-command handling through the approved AI Gateway path.
The spike evaluates interpretations; persistent memory/list/reminder execution
belongs to the later implementation phases. S4 voice selection and S5 platform
checks follow before the Phase 1 walking skeleton.

## S3: command understanding (October 7, 2026)

The implementation is available for offline validation in this spike. It does
not save memories, change shopping lists, schedule reminders, or answer queries.
It parses and scores proposed commands and policy outcomes. The 60 synthetic
cases include 23 Tamil/Tanglish cases, 10 multi-command cases, and a stratified
48 development / 12 held-out split. The owner approved all 60 cases in
[the expected-action review](../../docs/07-s3-expected-actions.md).

Run from `spikes/s1`:

```sh
pnpm nlu:review
pnpm nlu:eval
pnpm nlu:eval --cases=all --models=openai/gpt-6-luna,openai/gpt-5-nano
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`nlu:eval` defaults to a **dry run with zero model calls**, showing the conservative
maximum reservation. Default live selection is three development cases on
`openai/gpt-6-luna`, low reasoning. The cheaper candidate is `openai/gpt-5-nano`,
also low reasoning. Prices were checked against the public Gateway catalog on
October 7: Luna $0.10/$0.50 input/output per million tokens, Nano $0.05/$0.40.
Luna cache writes cost $0.125/M; reservations account for that premium. These are
candidates, not measured winners. Claude comparison is deferred for this testing
increment. No search, external tools, repair calls, retries, cross-model fallback,
priority tiers or direct-provider keys are used in the scored comparison.

Follow-up: Luna is excluded from free-credit access; buying credits was not
authorized. The owner approved `openai/gpt-4.1-nano` and `openai/gpt-4.1-mini`
as synthetic-only challengers with unsupported reasoning-effort settings
omitted. Their three-case staging smoke scores were 1/3 and 2/3 respectively;
neither passed the semantic smoke gate. Mini returned three schema-valid,
verified OpenAI-managed responses within five seconds. No full-corpus run or
model selection followed. Inline Gateway receipts now verify routing without
requiring an immediately available generation lookup. The final code passed
181 tests, lint, type checking and build. See the
[follow-up evidence](../../docs/08-s3-gateway-verification.md) for reports,
accounting and shutdown verification.

### Live evaluation gates

The owner's October 7, 19:51 IST dashboard report confirms **Hobby**, with ZDR
and provider/model allowlists unavailable. The family-data gate fails; the
US$5 monthly allowance remains the spending ceiling. The owner-approved
[synthetic-only exception](../../docs/adr/adr-040.md) is implemented as a separate
server mode. The owner approved all 60 expected actions and confirmed that
Railway uses the inspected “Nilumi's Key”. Live probe results are recorded below.

Vercel is the default gateway. The owner added paid Vercel credits on October 8
and requested live synthetic validation within the unchanged USD 0.50 cap.
The [paid validation report](../../docs/10-s3-paid-vercel-validation.md) records
Luna's complete 60-case run (54/60), failed privacy/held-out gates and mini's
failed smoke. No model is selected; S3 acceptance remains pending.
The [V11 follow-up](../../docs/11-s3-v11-validation.md) fixes development failures
and improves hosted Luna to 56/60 with privacy 8/8. Three deadline failures and
mini's failed smoke keep selection pending; evaluator shutdown is verified.
The [deadline investigation](../../docs/12-s3-deadline-reliability.md) delivers
strict elapsed-time enforcement, cleanup, numeric transport diagnostics and a
56% smaller equivalent wire schema. The new Luna smoke scored 2/3 with one timeout
waiting for response headers. Paid testing stopped; shutdown is verified and
live acceptance remains pending.
Cloudflare transport remains available only through explicit selection, with no
automatic fallback. Its gateway and private credential setup are verified, but
live Cloudflare privacy validation is pending. See the [Cloudflare setup and budget plan](../../docs/09-s3-cloudflare-gateway.md).
Production needs acceptance on its actual paid model and verified privacy route.

The `POST /api/nlu/evaluate` route is disabled by default. Before enabling it:

1. Review all 60 expected actions and freeze the held-out set. Record the exact
   fixture hash from `pnpm nlu:review` and reviewer in the selected gateway's
   privacy profile (`config/cloudflare-privacy.json` or historical `config/nlu-privacy.json`).
2. Select the server mode. Default `zdr` requires team-wide ZDR (including
   no-training), approved provider/model restrictions and Gateway-managed
   credentials. The owner-approved `synthetic_hobby` exception requires its
   fixed corpus hash and approval metadata instead of team ZDR. Both modes
   require team verification, reviewed fixture hash, approved model IDs and
   confirmed Gateway-managed OpenAI credentials. The owner confirmed the
   Railway key's team; runtime routing must still be checked. Hobby calls enforce no-training,
   `only: ['openai']`, low reasoning and `store: false`; reports explicitly
   disclose no ZDR requirement and no production acceptance. Unknown or
   mismatched Hobby runtime routing stops further calls. Callers cannot choose
   a mode or submit transcripts; a changed corpus fails the Hobby gate.
3. Deploy the reviewed code to Railway staging. Confirm server variables:

| Variable | Value |
| --- | --- |
| `NLU_GATEWAY` | `vercel` (default) or explicit `cloudflare`; unknown values block calls |
| `CLOUDFLARE_API_TOKEN` | Cloudflare only; install privately with scoped inference/management read permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare only; must match the verified privacy profile |
| `CLOUDFLARE_AI_GATEWAY_ID` | Cloudflare only; explicit named gateway |
| `AI_GATEWAY_API_KEY` | Vercel only; existing staging credential; never expose the value |
| `RAILWAY_ENVIRONMENT_NAME` | `staging` (Railway supplies it) |
| `NLU_EVALUATION_ENABLED` | `true`, only after review/privacy gates |
| `NLU_EVALUATION_MODE` | `synthetic_hobby` for the approved fixture-only exception; default `zdr`; other values block calls |
| `NLU_EVALUATION_ORIGIN` | `https://staging.nilumi.in` |
| `NLU_EVALUATOR_EMAILS` | Comma-separated exact authenticated evaluator emails |

The route checks the existing session, caller allowlist, configured origin,
committed case/model IDs, unique IDs and one active run per service instance.
The request allows only `caseIds`, `modelIds` and `passes` (1–3). It never accepts
arbitrary transcripts or client budgets. Missing configuration blocks calls.

Keep an authenticated `nilumi_session` cookie in `NLU_SESSION_COOKIE` in a local
ignored environment file, and load it into the process without printing it.
This is a session credential; do not put it in command arguments or tracked
files. Once gates pass, all smoke/comparison calls go through the local runner:

```sh
# Three development cases, one pass, Luna low:
pnpm nlu:eval --live --gateway=vercel
# Full comparison, one pass (only after the smoke results are checked):
pnpm nlu:eval --live --gateway=vercel --cases=all --models=openai/gpt-6-luna
```

For approved Hobby testing, add `--mode=synthetic_hobby` to both dry and live
commands. Use `--gateway=vercel` with matching server `NLU_GATEWAY=vercel` for
explicit Vercel testing. Cloudflare pricing for additional challengers remains
unverified. The runner verifies the server's reported gateway and mode; CLI flags cannot
select or relax the server policy. Use one mode throughout a comparison.

### Budget and report behavior

**The owner has $5 for the entire month, not $5 for S3.** The runner limits this
S3 testing increment to **$0.50 total**, including smoke tests, repeats, failed
calls and retained reservations. One pass is the default. It reloads the
content-free `validation-results/nlu-budget.json` ledger before every run,
locks it exclusively and uses atomic file replacement with fsync. Before each
request it reserves uncached UTF-8 input (including both schema copies and an
envelope margin) plus all 4,096 allowed output tokens. It verifies public prices
before live execution and blocks changed/unknown rates. There are no tool fees
because this workload uses no tools. Cache hits are only reported when observed.

Settlement uses reported charge when available, otherwise token usage with
pinned rates. Missing usage, timeouts, disconnects and process interruptions
retain the whole allowance. Budget exhaustion marks pending cases not evaluated.
These bounds are intentionally pessimistic: a full two-model reservation can
exceed $0.50, while settlement may allow coverage within the cap. Never raise
the cap just to finish a report. Incomplete coverage cannot qualify a candidate.

**Do not delete or reset the budget ledger** between runs, models, service
restarts or smoke tests. If a killed process leaves `nlu-budget.lock`, first
verify that its recorded PID is no longer running and there is no outstanding
comparison, then remove only that stale lock. Keep its unsettled charges in the
ledger. Calls made outside this script or by other applications are not covered
by this local ledger; use Gateway key/account spend controls as an additional
monthly safeguard. The endpoint is not an account-wide durable limiter.

Reports are saved under ignored `validation-results/`. They contain version and
fixture hashes, parsed synthetic output, deterministic outcomes, correctness,
schema validity, per-model/pass/category/language/split/tag slices, nearest-rank
p50/p95, usage/cache observations, route metadata, and known versus reserved
costs. Secret-bearing turns are refused before prompt construction and reports
contain only the refusal category and content-free identifiers. Provider error
text is never logged. Latency measures the model call through structured output,
with deterministic validation timing separate; it is not voice latency.

Selection requires all 60 cases and 12 held-out cases for every reported pass,
>=90% overall and at least 11/12 held-out correct, 100% relevant date/privacy
cases and verified managed routing. The 1,400 ms NLU p95 target is reported
separately. With missing routing metadata, incomplete coverage or failed hard
gates, selection stays pending. A mock/recorded-response pass demonstrates the
harness, never real model accuracy. `lib/nlu/recovery.ts` exercises repair and
challenger behavior offline only and is not connected to the live evaluator.

Contract details: evidence uses JavaScript UTF-16 offsets with an exclusive end.
Parser date `resolved` and reminder `at` may be absent; validated commands require
those slots, resolve supplied fixture references and remain interpretation-only.
The schematic target adds `task_id` for visible synthetic task fixtures; memory
IDs cannot complete tasks. Supported Tamil/Tanglish date phrases are explicit
spike rules. Unresolved/unsupported phrases, disagreements and already-past
reminder times require clarification. Synthetic visibility checks do not validate
production RLS. Secret detection is heuristic, not a complete secret recognizer.

**Current status:** All 60 expected actions and Railway key identity are
owner-approved. The synthetic-only evaluator has been deployed to Railway
staging. Live validation found Luna unavailable under the approved routing
restrictions and a provider schema incompatibility affecting Nano. The schema
fix uses nested `anyOf`, required nullable optional fields, and SDK normalization
before semantic validation. All three staging development probes with this fix exceeded the five-second
Nano deadline. Evaluation was disabled and its allowlist cleared afterward. See [live results and budget accounting](../../docs/08-s3-gateway-verification.md)
for the final smoke result, retained allowances and actual Gateway balance.
The full comparison and model selection remain incomplete. Family-data ZDR,
classifier experiments and production shadow validation remain deferred.

October 7 offline verification: **180 automated tests passed**, including
38 existing S1/S2 tests and 142 S3 tests. `pnpm lint`, `pnpm typecheck` and
`pnpm build` passed. Regression coverage includes strict provider schema output,
SDK parsing of nullable optional fields, routing restrictions, authenticated
proxy origin handling, corpus approval, failure attribution and durable budgets.
The current three-case Luna dry run reserves at most US$0.026952; a complete
60-case Nano dry run reserves at most US$0.255969. These are maximum allowances,
not measured charges. No model winner is established by offline fixtures.

Railway terminates TLS before Next.js. The evaluation origin gate accepts the
configured public origin either directly or through Railway's exact
`X-Forwarded-Host` plus a single HTTPS `X-Forwarded-Proto` value in staging.
Wrong origins, suffix hosts, ports, missing headers and comma-separated values
fail before model access. Session and evaluator allowlist checks still apply.
A clean frozen-lockfile install and `tsx` execution also passed after explicitly
recording `esbuild: false` in pnpm's build-script policy, matching the existing
policy for platform packages whose prebuilt binaries are used.

Subscription-only prompt development is available through
`pnpm nlu:eval:subscription`. It requires an existing ChatGPT-authenticated
Codex CLI and accepts only the frozen synthetic corpus. Default scope is the
48 development cases; `--cases shopping-01,memories-01,dates-01` runs the smoke.
Use `--concurrency 2` for at most two independent extraction sessions.
`--codex-bin <executable>` and `--work-root <temporary-directory>` support a
Windows Codex executable launched from WSL. Each session receives only parser
instructions, the output schema and its visible synthetic input. Expected
answers remain in the parent scorer; sessions have no repository context.

Reports are saved under ignored `validation-results/subscription/` and never
modify `nlu-budget.json`. To run all 60 cases after freezing, use `--split all
--frozen-prompt-sha256 <hash-from-development-report>
--frozen-pipeline-sha256 <hash-from-development-report>`. Held-out cases must not
inform prompt revisions; replacing an exposed holdout requires new owner
review. Subscription results establish synthetic correctness only. They do
not verify Gateway routing, prices, latency, no-training or ZDR, and cannot
select a deployment model. Subscription rate limits stop new dispatch without
an API-key fallback. See [ADR-040](../../docs/adr/adr-040.md) for scope and
[validation evidence](../../docs/08-s3-gateway-verification.md) for outcomes.

Completed subscription benchmark: frozen `s3-extract-v5` reached **57/60 correct
(95%)**, **100% schema validity**, **11/12 held-out**, **11/12 dates**, and
**8/8 privacy**. It **did not pass synthetic correctness acceptance** because
every date case must pass. Development improved from 27/48 to 47/48; its one
privacy failure is retained as variability evidence. All **187 tests**, lint,
type checking and production build passed. The updated prompt is local; the
Gateway evaluator remains disabled, its retained ledger remains US$0.122884725,
and deployment model selection/family-data ZDR remain pending.

The next interpretation stage calculates supported literal dates locally and
records each normalization. Reports retain `extractionScore` beside final
scores. Unique visible note selectors receive their existing ID; conflicting,
ambiguous and invented IDs are not repaired. No model retry runs. Frozen evaluation fingerprints
the NLU/config sources, few-shots, runner, package manifest and lockfile.
Changes during a run invalidate its acceptance result. Repeating the original
held-out split is regression evidence, with prior metric/failed-ID exposure
disclosed in the verification notes.

The deterministic increment passes **199 automated tests**, lint, type checking
and production build. The full v7 regression scored **57/60**, dates **12/12**,
held-out **10/12**, privacy **7/8**. It **fails synthetic acceptance**: two
held-out semantic failures and a rejected collaboration-tool call remain.
Disabling both CLI multi-agent flags did not establish tool-free isolation.
See [compact checked-in evidence](evals/results/subscription-v7.json) and
[the complete verification notes](../../docs/08-s3-gateway-verification.md).
No paid Gateway calls or deployment followed this failed gate.

October 8 follow-up passes synthetic regression gates: prompt v8 development
**48/48**, smoke **3/3**, frozen original corpus **59/60**, held-out **11/12**,
dates **12/12**, privacy **8/8**, schema **58/58 model calls**. Two sensitive cases
were refused locally. The one `memories-11` semantic failure remains recorded;
held-out content was not used for tuning. All **202 automated tests**, lint,
type checking and build passed. See [v8 evidence](evals/results/subscription-v8.json).

The subscription runner now requires strict configuration, disables
`agents.enabled` alongside both feature switches, excludes collaboration/clock
from nested code mode, and rejects tool/error events as they arrive. No tool
activity was observed in these completed runs. The CLI does not guarantee an
empty tool catalog; event observation can follow dispatch. Subscription process
timing remains separate from Gateway latency and no-training/ZDR verification.

No paid calls or deployment occurred. The conservative remaining cap is
US$0.377115275. Current configured-price Nano smoke plus full-pass maximum is
US$0.3416375; Mini's full pass alone reserves US$1.2993724. Verify current prices
and routing before live dispatch. Hosted S3 acceptance and model selection remain
pending; the Gateway evaluator remains disabled.
October 8 hosted validation: v8 deployment smoke with GPT-4.1 nano scored **2/3**
(schema 3/3; all calls under five seconds; managed OpenAI routing verified).
The memory intent case failed, so the full run and further paid tests stopped.
Reported smoke spend US$0.0010442; retained ledger US$0.123928925; remaining cap
US$0.376071075. No model selection or hosted S3 acceptance. See
[smoke evidence](evals/results/gateway-v8-nano-smoke.json) and
[verification/shutdown notes](../../docs/08-s3-gateway-verification.md).

The local v9 prompt simplification is an **unaccepted candidate**: development
47/48, frozen regression 54/60, held-out 8/12, dates 11/12, privacy 7/8. Schema
was valid for all 58 model calls; two sensitive inputs were refused locally.
All 203 automated tests, lint, type checking and build pass, but synthetic
acceptance failed. No deployment or paid smoke followed. Staging remains disabled
and the retained remaining cap is US$0.376071075. See
[v9 evidence](evals/results/subscription-v9.json) and the verification notes.

V10 passes the frozen synthetic regression: **59/60**, held-out **11/12**,
dates **12/12**, privacy **8/8**, schema **58/58**. All **205 automated tests**,
lint, type checking and build pass. Earlier development failures remain recorded;
the original holdout is regression evidence. See
[v10 evidence](evals/results/subscription-v10.json). Hosted S3 acceptance and
model selection remain pending the bounded staging workflow.

V10 hosted Nano smoke failed **2/3** despite valid schemas and all calls under
five seconds. Full hosted testing stopped. The evaluator is verified disabled;
remaining retained allowance is **US$0.373965975** after US$0.0021051 smoke spend.
See [hosted v10 evidence](evals/results/gateway-v10-nano-smoke.json). Hosted S3
acceptance and model selection remain pending.
