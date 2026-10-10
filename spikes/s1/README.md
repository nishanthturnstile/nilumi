# S1: Nilumi PWA spike

M1/M2 cover installability, email-code sessions, a ten-minute step-up window,
and microphone capture. Uploads currently return `spike-noop`; they do not
transcribe or store audio. M3 adds a canned SSE turn and two synthetic audio
clips; M4 adds Web Push subscription and immediate/delayed test notifications.
The S4 verification harness adds real Sarvam sentence synthesis. Durable push storage remains outside this spike.

Use Node.js 24 and pnpm 12.9.1 (pinned in `package.json`).

## S-VGW pilot closure and privacy controls

S-VGW is accepted for the restricted founding household under [ADR-052](../../docs/adr/adr-052.md).
Privacy controls and PostgreSQL 18.6 are deployed and validated at
[staging Settings → Privacy](https://staging.nilumi.in/settings/privacy).
Both supplied adults are configured; the owner recorded the current notice,
which survived redeployment. The bounded route is enabled and one authenticated
fixed-input smoke passed. [Activation evidence](evals/results/vgw-household-activation-2026-10-10.json). [Deployment evidence](evals/results/vgw-pilot-deployment-2026-10-10.json) records 15 live HTTP checks.
Live HTTP 402 `quota_for_entity_exceeded` and used-key 401 passed. Conservative
all-round spend is US$1.00428 / US$1.05. The historical negative-policy tests remain
failed under the accepted exception; only verified OpenAI roles are eligible.
Published forwarding/retention plus pinned SDK serialization are accepted pilot
storage evidence; no ZDR or downstream observation is claimed.

`/settings/privacy` provides explicit owner acknowledgement and either adult's
withdrawal veto. PostgreSQL persists the accepted evidence, member set, notice,
reservations and halts; queued dispatch rechecks all controls. The bounded
`/api/gateway` route defaults disabled and requires production sign-in, a restricted
`GATEWAY_DATABASE_URL`, dedicated `VGW_RUNTIME_API_KEY`, and
`GATEWAY_PILOT_ENABLED=true`, and the canonical HTTPS
`GATEWAY_PILOT_ORIGIN` (staging: `https://staging.nilumi.in`). Local development sign-in never enables family calls.
No acknowledgement is recorded by configuration or deployment.

Lint, type-check, all 372 tests and production build pass. Fourteen control cases
use embedded PostgreSQL and proxy-origin checks. Thirteen control cases also pass
on deployed PostgreSQL 18.6, including real concurrent reservations, client/worker
reconnection and restricted SQL roles. The actual deployed app login cannot change
accepted evidence, membership, cap or schema; synthetic withdrawal tests roll back. See the [activation checklist](../../docs/plans/26-s-vgw-completion-plan.md#current-activation-work).

## Local smoke test

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Next.js, usually http://localhost:3000. Without a
Resend key, both sign-in and step-up show the local development code.

1. Sign in once in the installed app. A signed, HttpOnly cookie lasts 90 days
   with the existing stable `AUTH_SECRET`, including app closure and redeployment.
   Home shows the saved session, and visiting Sign in reuses it unless you select
   **Switch account**. Browser tabs and installed iPhone apps may have separate
   storage; do not clear site data or reinstall between tests.
2. Open `/sensitive` twice, and confirm neither fresh visit asks for
   step-up. After ten minutes, request and verify a fresh code. Clearing cookies
   instead returns you to sign-in, rather than triggering step-up.
3. Hold Talk for a second and release: recording should upload and return to
   idle. Tap Talk and then Stop: exactly one recording should upload, and the
   microphone indicator should turn off.
4. Try sliding away, cancelling a pointer, denying microphone access, and
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
[the expected-action review](../../docs/validation/s3/07-s3-expected-actions.md).

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
[follow-up evidence](../../docs/validation/s3/08-s3-gateway-verification.md) for reports,
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
An October 8 owner amendment raises the cumulative cap to USD 2.00; it takes
effect only after a reviewed change to `config/models.ts`, `lib/nlu/budget.ts` and
the ledger that keeps every counted entry ([ADR-040](../../docs/adr/adr-040.md)).
Until then the runner enforces USD 0.50.
The [paid validation report](../../docs/validation/s3/10-s3-paid-vercel-validation.md) records
Luna's complete 60-case run (54/60), failed privacy/held-out gates and mini's
failed smoke. No model is selected; S3 acceptance remains pending.
The [V11 follow-up](../../docs/validation/s3/11-s3-v11-validation.md) fixes development failures
and improves hosted Luna to 56/60 with privacy 8/8. Three deadline failures and
mini's failed smoke keep selection pending; evaluator shutdown is verified.
The [deadline investigation](../../docs/validation/s3/12-s3-deadline-reliability.md) delivers
strict elapsed-time enforcement, cleanup, numeric transport diagnostics and a
56% smaller equivalent wire schema. The new Luna smoke scored 2/3 with one timeout
waiting for response headers. Paid testing stopped; shutdown is verified and
live acceptance remains pending.
The [final correctness acceptance](../../docs/validation/s3/13-s3-live-acceptance.md) selects
Luna low after owner-approved 30-second synthetic evaluation: **58/60** overall,
held-out **11/12**, dates **12/12**, privacy **8/8**, schemas **58/58** and every
managed OpenAI route verified. All **226 tests**, lint, type checking and build
pass. Two semantic errors remain. Conservative cumulative spend is
**US$0.277306460 / US$0.50**; evaluator shutdown is verified. The core synthetic
spike is complete; production timing/ZDR, independent acceptance, fallback/shadow
validation and classifier experiments remain pending. The application deadline
stays five seconds; the longer allowance is opt-in and synthetic-only.
Cloudflare transport remains available only through explicit selection, with no
automatic fallback. Its gateway and private credential setup are verified, but
live Cloudflare privacy validation is pending. See the [Cloudflare setup and budget plan](../../docs/validation/s3/09-s3-cloudflare-gateway.md).
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
Nano deadline. Evaluation was disabled and its allowlist cleared afterward. See [live results and budget accounting](../../docs/validation/s3/08-s3-gateway-verification.md)
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
[validation evidence](../../docs/validation/s3/08-s3-gateway-verification.md) for outcomes.

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
[the complete verification notes](../../docs/validation/s3/08-s3-gateway-verification.md).
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
[verification/shutdown notes](../../docs/validation/s3/08-s3-gateway-verification.md).

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


## S4 voice comparison and phone benchmark

Open `/voice` in the installed staging app and sign in with the configured
`S4_EVALUATOR_EMAILS` account. Listen to six fixed synthetic samples per candidate,
let the wife choose **This is my preferred voice**, and then measure the selected
voice on iPhone and Android, separately on home Wi-Fi and mobile data. Each run
makes 50 uncached attempts using ten frozen sentences, five times each. Keep the
app in the foreground. Download the report on each phone after both networks;
keep those files outside Git. A desktop browser cannot qualify a phone run.

Current candidate: `s4-bulbul-v3-stream-6`, preserving the selected Ritu voice
and 22,050 Hz settings. Sarvam HTTP streaming WAV is validated incrementally and
forwarded as PCM16 to one gesture-unlocked AudioContext. Start with **Play free
audio check**, then **Check 2 sentences with a pause** on each phone/network.
This runs short/shopping with a six-second gap and reserves at most ₹0.234 per
check (₹0.936 for all four combinations). Exploratory rows are exported but
excluded from acceptance. Old v1/v2/v3/v4/v5 results remain separate.
The player uses a 20 ms startup cushion. A bounded process-wide coordinator
shares attempt/cancellation state across Next route bundles, skips fresh-trial
cache misses and forwards first PCM without another descriptor read. The durable
reservation still precedes provider dispatch. V4 uses one Sarvam-only Undici
7.29.1 pool, two connections, pipelining one and a 15-second idle limit subject
to server hints. It does not change the global dispatcher, synthesize to warm
connections, or trim leading audio. Fine ledger lock/read/validation/save/cleanup
timings, provider idle policy, previous origin disconnect classification and
decoder CPU/first raw-body sizes distinguish the remaining tails. An origin
disconnect is not proof that it belongs to the next request's socket.
V5 preserves exclusive lock creation and skips flushing only S4's diagnostic
PID/timestamp lock contents. `ledgerStages.lockDurability` identifies this policy;
`lockSyncMs` is absent for S4. Reservation file sync, atomic rename and parent
directory sync still finish before provider dispatch. Gateway canary lock
flushing is unchanged. Previous voice selections remain readable across versions.

V6 adds bounded browser resource offsets, first source/onset scheduling and the
output-timestamp mapping used by the unchanged estimator. Resource traces split
time before network dispatch from time after final response headers (falling
back to the first response timestamp when final-header timing is unavailable).
Long-task observation retains at most 128 numeric intervals, exports aggregates
only and clips overlap to first audible onset. Unsupported/failed observation
is unknown, not zero. No task names, attribution, samples or URLs are exported.
The latest ten free tone checks are stored locally by version and included in
the download's separate `diagnostics` array; they never populate `trials` or
benchmark acceptance. Use the current network selector for these checks too.

The latest owner reports are partial: all eight v5 Wi-Fi smoke replies completed,
five within 700 ms. Cold connections and unexplained client/output tails remain;
v4 also had two mobile replies with long quiet prefixes. See the
[phone analysis and next implementation](../../docs/validation/s4/25-s4-v4-both-phone-analysis.md).
The latest export's ₹21.002 remaining cannot cover a fresh 200-trial acceptance run;
hold full paid benchmarks until the exact allowance is reconciled.

Build a free, self-contained listening comparison from the two saved PCM clips:

```sh
python3 scripts/voice-prefix-controls.py \
  --report evals/results/s4-stream-v4-phone-analysis-2026-10-09.json \
  --pcm-dir /private/saved-pcm \
  --output validation-results/s4/prefix-controls
```

Open the generated `listen.html` on each phone. It embeds original and bounded
exact-zero controls, makes no network request, preserves a 20 ms guard and never
removes quiet nonzero samples. This is an offline quality comparison, not a
phone latency benchmark. Runtime audio remains unmodified. Bulbul v4 Flash
remains a separate feasibility candidate with unverified pricing/voice approval.

Exports include content-free `serverTrace` and `clientTrace` records: authorization,
descriptor source, reservation/queue waits, provider dispatch/first bytes,
socket reuse, transfer, conversion, leading silence and output-estimator source.
The owner-only `?trace=1` read cannot dispatch; cancelled attempts remain readable.
Onset is frozen near first sound rather than remapped at completion. Reverify
physical onset on both phones. An optional phone/OS/output note describes the
test conditions. These traces and free desktop checks do not establish phone p95.

The timer starts immediately after the validated sentence reaches the phone,
before the speech fetch. The estimate ends at the scheduled first non-silent PCM
sample, mapped to output timestamps or estimated output latency. Verify actual
audible onset again on sample trials on
both phones before asserting acceptance. Failures, blocked playback, background
interruptions, underruns and cancellations remain failed attempts. Continue recovers listening
playback; it does not repair a failed benchmark trial.

The four slices each require at least 50 uncached successes, complete corpus
coverage, zero failed attempts and nearest-rank p95 ≤700 ms. Combine the two
non-overlapping exports locally, after audible-onset verification:

```sh
pnpm voice:report --audible-onset-verified /private/iphone.json /private/android.json
```

This flag records a human observation; automated browser events cannot verify
physical audible onset. The merged report does not itself pass the listening,
functional playback or reconciled-cost checks.

S4 uses a separate cumulative ₹50 ledger. The frozen four-voice listening set
plus 200 trials reserves ₹37.2096 at ₹3/1,000 characters with 20% billing headroom
and conservative UTF-8 byte counting. Errors keep their full reservation. Listening
clips reuse only fixed template audio; benchmark clips synthesize once per unique
trial. At most two synthesis operations run concurrently; repeated readers join
a bounded spool. Completed range requests and replays cannot cause another synthesis.
Late or uncertain failures retain reservations and the same ID cannot redispatch.
HEAD and metadata requests cannot dispatch. No arbitrary
text or household recording is accepted by this API.

Use one replica and a persistent volume at `/verification`. Configure
`S4_ENABLED=true`, `S4_STATE_DIR=/verification/s4`, `S4_ORIGIN` to the exact staging
origin, `S4_EVALUATOR_EMAILS` to the approved sign-in email, `S4_PRICE_VERIFIED_AT`
to `2026-10-09`, and `S4_BILLING_MAX_MULTIPLIER=1.2`. Reuse the existing server-only
`SARVAM_API_KEY` and `AUTH_SECRET`; do not place keys in the client. Initialize once:

```sh
pnpm verification:init --scope=s4 --directory=/verification/s4
```

Paid paths never initialize a missing ledger. Initialization refuses an existing
ledger. Preserve the volume, budget files and uncertain reservations across
redeploys. A leftover exclusive lock after a process crash requires an operator
to verify that no writer remains before removing only the lock; never reset the
budget to recover access. Reverify price and billing bounds before changing them.

## S-VGW synthetic controls canary

The workflow below preserves the original diagnostic method. Current acceptance
is recorded above; ADR-052 permits independent quota validation and keeps all
historical failed rounds closed. No canary should be replayed or ledger reset.

The shared gateway wrapper pins approved models/providers, no-training and
supported storage options, validates managed routing receipts, stops a role on
terminal control errors, and checks accepted S-VGW evidence plus current household
acknowledgement before runtime dispatch and again after reservation. The application
now has an opt-in bounded family model endpoint backed by durable PostgreSQL
privacy and spending controls. Deployment, live database control checks, current owner acknowledgement and
bounded route smoke pass. Full structured NLU integration belongs to Phase 2.

```sh
pnpm gateway:guard
pnpm gateway:preflight
pnpm gateway:preflight --catalog
pnpm gateway:canary --dry
```

The dry run sends no model requests. Preflight is offline by default;
`--catalog` reads public pricing without credentials or inference. Live execution
requires dated version-3 budget/key readbacks in `config/gateway-canary.json`
(or an ignored working config selected with `--config`), an explicitly initialized durable
US$1.00 ledger, and a separate ignored-local `VGW_CANARY_API_KEY`. Never reuse the
S3/runtime key or reset the S3 ledger. The manifest permits at most four attempted
requests: chat, embedding, a no-training-ineligible Arcee route, and final quota
rejection. Each probe can dispatch once; failure or crash retains its allowance.
Probes must run in that order; the session binds the credential, team/key identity
and reviewed fixture hash. Fallback remains disabled.

```sh
pnpm verification:init --scope=vgw --directory=/private/durable/vgw
VGW_STATE_DIR=/private/durable/vgw pnpm gateway:canary --live --probe=chat
```

The owner's October 10 US$1 amendment is recorded in ADR-050. Backend readbacks
confirm separate Team-attributed runtime, evaluation and canary budgets.
The quota API rejects limits below US$1, so lowering the canary to its tiny
metered spend is unsupported. A quota probe requires a supported edit and
readback at least five minutes later. Account spend differs from conservative
rejection reservations.
Only HTTP 402 plus `quota_for_entity_exceeded` passes the quota proof;
credit exhaustion halts dispatch but does not pass. Dashboard input accepting a
sub-dollar number does not establish backend support. The harness fails closed
until preflight is complete. It does not administer or automatically revoke
Vercel keys: the operator must revoke the canary key in every exit path and record
shutdown. After account deletion, `pnpm gateway:canary --verify-revocation`
checks the used credential through read-only `GET /v1/credits` and fences further
dispatch. Only HTTP 401 after a successful positive probe verifies rejection;
record actual account deletion and remove local temporary access separately.
SDK serialization tests prove `store:false` reaches the gateway; the exact Luna
model's published provider-option contract documents forwarding. This is
documentary evidence, not direct provider observation. The October 10 live run
passed chat, embedding and used-key revocation; negative policy returned HTTP
500 and quota was not dispatched. Its state is closed and must not be reset.
See [the implementation plan](../../docs/plans/17-phase-1-gateway-and-voice-plan.md)
and [gateway evidence](../../docs/validation/s3/08-s3-gateway-verification.md) before live work.
The [S-VGW completion plan](../../docs/plans/26-s-vgw-completion-plan.md) has the complete
readback, live-probe, shutdown and remaining-evidence workflow.

October 10 follow-up: ADR-051 authorizes **US$1.05 total across all rounds**.
`scripts/gateway-followup.mjs` carries the predecessor ledger's digest and counted
charges into a separate aggregate ledger; historical halted runs are never reset.
`scripts/gateway-quota.mjs` implements bounded sequential US$1 key exhaustion with
a fixed quota-only OpenAI profile, <=512-byte complete SDK payload, <=US$0.01
reservation per request and fresh authenticated exhaustion readback before the
tiny final quota probe. It requires all three preceding diagnostic proofs to pass.
Its default command is dry and makes no model calls:

```sh
node --import tsx scripts/gateway-quota.mjs
```

All four live diagnostic rounds are closed. Chat, embedding and used-key
revocation passed; both Arcee and Schematron negative controls returned HTTP 500,
including the Schematron streaming path. Counted spend is US$0.002564, including
retained failed reservations. No quota workload was dispatched and family calls
remain gated. The [Vercel reproduction packet](../../docs/validation/s-vgw/27-s-vgw-policy-reproduction.md)
is retained locally at the owner's request.


## S4 test convenience controls — October 10

The v6 speech settings and timing remain frozen. Harness revision
`s4-controls-1` adds **Keep screen awake on this test page**, enabled initially.
The visible state distinguishes held, pending, unsupported/denied and OS-released
locks. Leaving/hiding the page releases the lock; visible return requests it
again, and Retry permits an explicit user gesture. Turning it off or navigating
away releases both current and late-granted locks. A wake-lock failure does not
alter playback, Stop handling or acceptance. Manual power-button locks remain
interruptions. If the OS refuses a lock, temporarily extend Screen timeout on
Android or Auto-Lock on iPhone, then restore the previous setting after testing.

Sign-in already had a 90-day signed cookie. Home and Sign in now recognize a
valid cookie instead of always offering another email-code flow. The explicit
Switch account link retains that flow. Authentication, paid caller allowlists,
the stable deployment secret and sensitive-view ten-minute step-up remain in
force. A cached authentication boolean is not used as authorization, and secrets
are not copied into localStorage. Keep the installed app and origin consistent
between runs; old reports remain in their existing versioned local storage.

## S4 v7 network path — October 10

`s4-bulbul-v3-stream-7` keeps Ritu, provider HTTP streaming, the 15-second
connection pool, durable reservations, 20 ms audio startup and audible-onset
arithmetic. It registers `/voice-sw.js?revision=s4-network-1` with scope `/voice`.
This worker has no fetch listener: voice-page requests use the network without
service-worker fetch dispatch, including Safari without static routing support.
The existing root worker owns the generic offline home shell and notifications.
Push enrollment explicitly selects the root registration, including after SPA
navigation from Voice to Home. The voice page remains online-only.

Exports contain `routing.policy`, registration state, current controller and
`clientTrace.requestRoute` at each attempt. Registration failure retains the old
route and reports it; it never retries audio, duplicates synthesis or blocks the
measured path. V6 reports remain in their old local-storage keys and are not
mixed into v7 acceptance. Previously saved voice selection is retained.

Reload both installed apps online. First verify the free check and exported
routing state, then compare launch/idle and warm speech checks. A zero
resource `workerStart` plus `requestRoute: "voice-network"` verifies the worker
fetch-dispatch bypass; it does not establish provider/network p95 acceptance.
Keep both cold and slow rows. Use Mobile only with Wi-Fi actually off.

For rollback, restore the old deployment and unregister only the `/voice`
registration before reloading the voice page. Keep root registration,
subscriptions, cookies, local reports and the verification volume intact.

## S4 v8 exact-zero prefix — October 10

`s4-bulbul-v3-stream-8` retains the v7 network worker and adds conservative
playback trimming. Only exact zero-valued PCM samples at the start of the first
complete chunk are eligible. Keep 10 ms of that prefix, remove at most 200 ms,
and preserve at least 80 ms of playable first-chunk data. All-zero first chunks
are scheduled immediately without trimming; later chunks and internal pauses
are untouched. Every non-zero sample, including quiet speech, is preserved.
The transformation introduces no additional network read or buffering wait.

Exports include `zeroPrefixPolicy` and per-attempt `trimmedZeroPrefixMs`,
`originalLeadingSilenceMs` and the remaining `leadingSilenceMs`. The latency
clock still starts before the speech GET and uses the actual scheduled non-silent
output timestamp. Received byte counts and provider metadata describe the
original stream. Voice selection migrates; old versioned reports stay separate.

A physical Android check found that `resume()` can resolve while the audio
clock remains at zero. This cold output startup is retained in measured latency;
no synthetic warm-up wait is moved outside the timing window. Initialize audio
from the user's Talk gesture when integrating recording with reply playback,
and measure readiness alongside release-to-reply latency. That integration is
future app work, not a claimed fix in this speech-only spike.

The Home **Voice selection** entry uses document navigation rather than an SPA
transition. A service-worker controller belongs to the loaded document; simply
changing its URL through the client router can retain the root worker even when
`/voice` already has an active worker. Loading the voice document selects its
scope before speech. No automatic page reload, repeated registration, changed
speech timing, new sign-in flow or report migration is introduced by this entry
fix. Direct `/voice` visits continue to work.
