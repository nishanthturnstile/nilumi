# S1: Nilumi PWA spike

M1/M2 cover installability, email-code sessions, a ten-minute step-up window,
and microphone capture. Uploads currently return `spike-noop`; they do not
transcribe or store audio. M3 playback and M4 push delivery are still pending.

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
