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
