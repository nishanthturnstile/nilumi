# Tech Stack

Baseline: 2026-10-10. Application code is **unimplemented**. Existing spike dependencies establish reproducibility of those experiments, not installed production services. Decisions are in the [catalogue](../adr/README.md); work and validation belong to [P0–P8](../plans/implementation-plan.md).

## 1. Existing repository and exact versions

Values below are verified against the actual manifests and lockfiles, not proposed latest versions. Root and spikes use pnpm 12.9.1; Node 24 is the declared engine. No production workspace apps or Python lockfile exist.

| Installed scope | Locked dependencies |
|---|---|
| Root/UI workspace | shadcn 4.21.4; Tailwind/CLI 4.3.3; TypeScript 5.9.3; clsx 2.1.1; class-variance-authority 0.7.1; tailwind-merge 3.7.0; tw-animate-css 1.4.0; Phosphor core 2.1.1. UI peer resolution currently React/react-dom 19.3.0, Base UI 1.9.0 and Phosphor React 2.1.10 |
| S1 application spike | Next 16.3.8; React/react-dom 19.2.8; AI SDK 7.0.130; @ai-sdk/gateway 4.0.106; Zod 4.6.5; Base UI 1.9.0; Phosphor React 2.1.10; pg 8.23.1; chrono-node 2.10.2; Luxon 3.7.2; undici 7.29.1; TypeScript 5.9.3; Biome 2.2.6 |
| S5 platform spike | graphile-worker 0.18.0; pg 8.23.1; @aws-sdk/client-s3 3.1147.0; Biome 2.2.6 |

The UI peer React resolution differs from S1. P1 explicitly resolves supported peer versions in the production lockfile; do not silently copy mixed installations. Existing configuration/commands remain untouched in this documentation task.

## 2. Client and UI composition

**Selected for prototype:** Next.js App Router, React, AI SDK UI streams and json-render. **Planned for MVP:** same-origin Hono API mounting, TanStack Query v5, PWA precache/update handling (Serwist candidate), accessible Nilumi React components. These are choices, not implemented production packages.

Nilumi owns the trusted registry and component behavior. json-render is a composition/validation adapter over those components, not a replacement design system. Catalogue schemas bound size, allowed nesting and data/action references; server-issued actions supply authority. AI SDK transports coordinated text and typed presentation parts. Avoid experimental AI SDK RSC generative UI as a production requirement. See [AI SDK UI guidance](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces) and [json-render integration](https://json-render.dev/docs/ai-sdk).

Extend existing packages/ui tokens/fonts/helpers with primitives and Home composites as needed. Current HTML specimens are design references; component export patterns do not mean corresponding React files exist. Base UI/maia and Phosphor remain selected; stable Home and contextual accents replace five-tab navigation.

## 3. Backend, contracts and voice boundary

TypeScript owns application turns, authorization, domain data, receipts, activity persistence, proposals and workers. Shared Zod definitions publish versioned JSON Schema; isolated Python validates the wire equivalent. Production packages/contracts paths remain planned.

**Selected for prototype:** Pipecat Python, Sarvam Saaras v4 realtime STT and Bulbul v3 Ritu streaming TTS. No Pipecat or json-render version is installed. Pipecat 1.11.0 is a release-specific verified support floor for Saaras v4, not a production pin; select and lock a compatible release with its client/transport dependencies in P0. [Release evidence](https://github.com/pipecat-ai/pipecat/releases/tag/v1.11.0).

Pipecat forwards final recognized text/context to the authoritative TypeScript service and consumes its validated text/speech stream. It manages media/VAD/interruption, not a competing household LLM/executor. Pin audio format/sample rate, endpointing and VAD settings against the chosen processor; partial text never commits effects. The current [Sarvam processor reference](https://reference-server.pipecat.ai/en/stable/api/pipecat.services.sarvam.stt.html) describes realtime support and VAD requirements. Older vendor guides require comparison with the selected released source.

Local transport is SmallWebRTC. Production transport and hosting are **unvalidated**: prove signaling/TLS, media reachability/TURN if necessary, connection recovery, worker lifetime, rate/concurrency and resource costs, or select an eligible managed transport in P1. Railway HTTP support is insufficient proof. [Transport choices](https://docs.pipecat.ai/client/concepts/choosing-a-transport), [deployment guidance](https://docs.pipecat.ai/pipecat/deployment/overview).

Existing S4 chose Ritu and tested synthetic PCM playback latency; it did not test Pipecat or production multilingual recognition. Evaluate English, Tamil and Tanglish from P0 independently of deferred full Tamil UI localization.

## 4. Planned data and application services

| Layer | Choice and scope |
|---|---|
| Database | PostgreSQL 18 with pgvector 0.8 candidate, FTS/trigrams; actual staging control deployment used 18.6. Pin supported image/extensions in P1; RLS/composite household references mandatory |
| Data access | Drizzle candidate and explicit member-scoped transactions; SQL owns policy and integrity |
| Jobs | graphile-worker; transactional occurrence scheduling, idempotent claims, content-free queued IDs |
| Identity | Better Auth email OTP/multi-session, optional WebAuthn step-up. Prior reviewed floor 1.7.7 is not installed or a current security guarantee; recheck supported patched release in P1 |
| Memory | Custom typed predicates, history/provenance, entity resolution and complete forget; no new memory framework |
| Model routing | AI SDK registry → one managed Vercel Gateway wrapper; approved OpenAI roles, no BYOK/fallbacks in restricted pilot; direct approved speech |
| Operations | Railway Singapore app/worker/Postgres selected; Python voice host gated; R2 encrypted backups; OneDrive human recovery material; Resend email; VAPID push |

Model names remain role-configured; preserve actual S3 selection/evaluation limits in [live acceptance](../validation/s3/13-s3-live-acceptance.md). No classifier runtime, autonomous run engine, extraction service or calendar-write integration is added initially.

## 5. Continuous-session cost model

Recalculate using billed media duration, not only utterance clip duration. Published Sarvam Model API rates checked 2026-10-10: STT₹30/hour billed per second; Bulbul v3₹30/10,000 characters. Whether realtime silent/connected frames are charged requires actual reconciliation. [Primary pricing](https://docs.sarvam.ai/api/getting-started/pricing).

These are explicit scenario assumptions for two adults over 30 days, not measurements: all connected STT minutes billed, TTS characters per connected minute include short responses, no free credit/cache discount, no diarization.

| Scenario | Connected minutes/day, household | Spoken characters/minute | Monthly STT | Monthly TTS | Speech subtotal |
|---|---:|---:|---:|---:|---:|
| Light | 10 | 200 | ₹150 | ₹180 | ₹330 |
| Working assumption | 20 | 300 | ₹300 | ₹540 | ₹840 |
| Heavy | 40 | 400 | ₹600 | ₹1,440 | ₹2,040 |

Formula: STT=minutes/day×30×₹0.50; TTS=minutes/day×30×characters/minute×₹0.003. The middle scenario already exceeds the₹800 AI default before LLM/embeddings. P0 measures actual speaking/connected time and response length; budgets require shorter/limited sessions or a reviewed change, not an automatic increase. For Tamil use actual provider character accounting rather than estimating from English words.

Full monthly projection = measured speech + model token usage/reserves + app/worker/database + Python idle/concurrent runtime + media service/TURN/egress if chosen + backup/storage/email + tax/card/forex. Hosting and media costs remain unquoted until P1 chooses verified limits; report them as unknown rather than reuse the old₹1,400–2,700 forecast. Review against total₹3,000 target/₹5,000 ceiling and₹800 AI default in P1/P8.

Team GatewayUS$10/month, runtime US$8/month while S3 key exists; no auto top-up. Preserve S3 cumulative owner US$2 and runner US$0.50 ledgers: counted US$0.277306460, remaining US$1.722693540/US$0.222693540 respectively, evaluator disabled. Closed S-VGW aggregate US$1.004284/US$1.05 includes activation; canary credential was revoked. Old experiment limits do not authorize another paid run. See [ADR-036](../adr/adr-036.md).

## 6. Tooling and operations

P1 pins @biomejs/biome and commits biome.json for supported production languages. Keep existing project-specific checks; no two formatters over the same files. Python uses an appropriate pinned tool such as Ruff because Biome does not format Python. CI checks contracts, types, policy/schema, meaningful domain/recovery tests, UI contrast/classes and production builds. This task does not install tools or create CI.

Production origin app.nilumi.in, isolated staging staging-app.nilumi.in, marketing nilumi.in. Existing staging.nilumi.in harness remains reference infrastructure. Backups include activities/presentations and forget references; recovery replays tombstones before traffic. Detailed runbook and phase evidence are required before pilot.

## 7. Provider eligibility and data policies

Processor inventory records exact model/voice, eligibility, training, retention, location, evidence date and approved scope. The existing [spike provider record](../../spikes/s1/config/providers.md) remains historical scope. New streaming processors/transport need their own review.

Restricted founding pilot uses managed OpenAI only, no-training/only controls, supported store:false and local guard/receipt checks. Four negative-policy HTTP500 probes remain failed; documentary forwarding is not downstream observation or ZDR. No active household acknowledgement means no AI provider calls including STT/TTS; production acknowledgement is not copied from staging. Wider use requires the [ADR-017](../adr/adr-017.md) production privacy/legal gate.
