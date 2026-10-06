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
