# 03 — Tech Stack: Nilumi

> **Status:** Revision 2 final baseline · Owner decisions applied · **Date:** October 2026
> **Related:** [01 Product Plan](01-product-plan.md) · [02 Architecture](02-architecture.md) · [04 Research & Decisions](04-research-and-decisions.md)

**How to read this:** each choice lists *why it is optimal for Nilumi*, the alternatives we rejected, and what Phase 0 must verify. Versions are pinned by the lockfile at project start and updated through Renovate. **AI models are pinned to exact IDs in `config/models.ts`** and change only through the eval gate (ADR-013). **Vercel is used only for completely free, open-source libraries**; hosted or metered Vercel platform services are not part of the baseline. This document states the implementation decisions directly; **[04 Research & Decisions](04-research-and-decisions.md)** is evidence and comparison history, not the source of required behavior.

---

## Vercel usage rule

| Use | Do not use | Reason |
|---|---|---|
| **Next.js**, **Turbopack**, **AI SDK** (`ai`, provider packages, later MCP/agents), and optional **AI Elements** copied into the app | Vercel hosting, **AI Gateway**, **Vercel Workflow** / Workflow DevKit, Vercel Cron, Queues, Blob, Sandbox, Analytics / Speed Insights, v0, Vercel Agent | Owner rule: only completely free OSS libraries; avoid metered/free-tier cliffs and platform-bound services |

---

## 1. At a glance

| Layer | Choice |
|---|---|
| Client | **Next.js 16 (latest) App Router** + **Turbopack** PWA + **Serwist** (`@serwist/turbopack`), **React 19**, **TanStack Query v5** (persisted lists/tasks/inbox, offline-first mutations, SSE invalidation), Tailwind CSS v4 + shadcn/ui, Zod 4 |
| Client platform fallback | **Capacitor** (wraps the same app) if the iOS PWA spike fails |
| Server runtime | **Node.js 24 LTS** running a **Next.js standalone server on Railway** |
| HTTP framework | **Hono mounted in Next.js route handlers** (`app/api/[[...route]]/route.ts`) + `@hono/zod-validator` + typed `hc` client shared with the PWA |
| Auth | **Better Auth ≥ 1.7.7**, `emailOTP` + `multiSession`, Drizzle adapter, optional WebAuthn step-up for sensitive actions |
| Email | **Resend** free tier on `nilumi.in`; fallback SMTP through an existing mailbox with Nodemailer |
| Database | **PostgreSQL 18 + pgvector 0.8** (`halfvec`) + `pg_trgm` + `fuzzystrmatch` + built-in FTS + RLS on Railway's unmanaged Postgres template |
| Driver / ORM | **Drizzle ORM + drizzle-kit** with **node-postgres (`pg`) Pool** over Railway private networking |
| Jobs | **graphile-worker** for reminders, maintenance, forget journal, retention, embeddings backfill and backups |
| Realtime | PostgreSQL **LISTEN/NOTIFY → SSE** (`GET /v1/events`) with heartbeat, reconnect and query invalidation |
| Push | **Web Push (VAPID)** via the `web-push` library |
| AI SDK | **AI SDK free OSS** + in-process provider registry with role aliases; **no hosted gateway** |
| LLM (`nlu`, `answer`) | **OpenAI GPT-6 Luna** (default hypothesis) vs **Claude Haiku 4.5** in the bake-off. Gemini only if its terms permit this use (ADR-017) |
| Embeddings (`embed`) | **OpenAI `text-embedding-3-small` @ 768 dims** (native `dimensions` parameter), stored per `embedding_configs` row; Cohere embed-v4 (Tamil officially listed, native 1024) as the Tamil fallback config |
| STT (`stt`) | **Sarvam Saaras v4** default; **Deepgram Nova-3** fallback; bake-off also includes **ElevenLabs Scribe v2** and **Azure Fast Transcription / MAI-Transcribe-2** |
| TTS (`tts`) | **Sarvam Bulbul v3** (en-IN) vs Azure en-IN neural vs OpenAI TTS. **Your wife picks** |
| Dates | **chrono-node** (`en.GB`, day-first) + **date-fns v4 + @date-fns/tz** + **rrule** |
| Validation / contracts | **Zod 4** in `packages/contracts` |
| Logging | **pino** JSON logs (IDs only) |
| Testing | **Vitest**, **Testcontainers** (real Postgres), **Playwright** (PWA e2e, mobile emulation) |
| Evals | Vitest-based harness in `evals/` (JSONL datasets, custom scorers, markdown reports), classifier experiments and shadow-mode instrumentation |
| Lint / format / types | **Biome** + `tsc --strict` |
| Monorepo | **pnpm workspaces** |
| CI | **GitHub Actions** for CI and manual live evals |
| Deploy | **Railway GitHub integration** with pre-deploy migrations |
| Hosting | **Railway Southeast Asia (Singapore)**: `app`, `worker`, `postgres`; fallback **Dokploy VM** using the same image and `docker-compose.yml` |
| Backups | Worker cron: `pg_dump -Fc` → in-job restore test → `age` encryption (public key only on worker) → Cloudflare R2 + forget journal; Railway volume backups as the second layer |
| Monitoring | Turn traces in Postgres + admin viewer + Railway metrics + external uptime monitor |
| Domain | **`nilumi.in`**, bought and attached before installing the app on the phones; app served at `https://nilumi.in`, sign-in mail from `no-reply@nilumi.in` |
| Export format | **`nilumi-export`** versioned JSON |

---

## 2. Client

| Choice | Why it's optimal here | Rejected alternatives | Verify in Phase 0 |
|---|---|---|---|
| **Next.js 16 App Router + Turbopack PWA** | One deployable serves the app, API route handlers, auth cookies, headers, push endpoints and manifest. Turbopack is the required latest Next.js build path. Honest framing: iPhone PWA capability is decided by **WebKit**, not by the framework; Next.js gives us the clean same-origin app/API deployment and documented PWA hooks | **Vite SPA baseline** remains a good generic app shell but now loses the one-deployable route-handler/auth shape. **Static export** is rejected because it drops route handlers, cookies, dynamic headers and push endpoints. **SvelteKit** has no decisive advantage for this project | S1 install flow on both phones; standalone mic; Web Push after Add to Home Screen; email-code sign-in inside the installed iPhone app; cookie persistence; Next.js issue #95588 behavior |
| **Serwist** (`@serwist/turbopack`) | Current Next.js/Turbopack PWA path with a custom service worker for app-shell precache, runtime caching, push and `notificationclick` handlers | `next-pwa` is abandoned; a fully hand-written service worker is acceptable but easier to get wrong | S1 verifies offline shell, service-worker updates, push click routing and cache clearing on sign-out |
| **TanStack Query v5 + persisted cache + offline-first mutations** | All API communication goes through the typed Hono `hc` client. Persisted IndexedDB cache is limited to **lists, tasks and inbox** in a per-member namespace; memory data stays online-only. Paused mutations use `networkMode: 'offlineFirst'`, carry `client_mutation_id`, resume after rehydration and keep optimistic rollbacks local. SSE events call `invalidateQueries`; focus/reconnect also refetch | Local-first sync engines (Zero, ElectricSQL, PowerSync) add a sync server and model we do not need. **Server Actions are not used for domain writes**; Home Assistant, Vault uploads and future channels need the same `/v1` contract | Offline add/tick/edit → reconnect → server state correct; canonical-ID remap after merge; sign-out wipes the member namespace; memory data is never persisted; SSE invalidates active queries |
| **Tailwind v4 + shadcn/ui** | Accessible primitives and fast, consistent mobile screens without a heavyweight component runtime | MUI is heavier and less aligned with the app's simple mobile-first UI | S1 checks tap targets, contrast, focus states and installed-app viewport behavior |
| **Zod 4 contracts** | One schema source for Hono validation, typed `hc` clients, eval fixtures and Playwright helpers | Ad hoc TypeScript types drift from runtime validation | Contract tests for `/v1` request/response shapes |
| **MediaRecorder + recorder state machine + one primed `<audio>` element** | Records browser-native formats directly: Android `audio/webm;codecs=opus`, iPhone `audio/mp4` (AAC). No server transcoding. The state machine handles interruptions and iOS autoplay rules with a visible Play fallback | Web Speech API is inconsistent, lacks name biasing and is broken in iOS standalone. Server-side transcoding and `ffmpeg` are removed; JS remux is only a fallback if a chosen vendor rejects iOS fragmented MP4 | Mic permission persistence, interruption recovery, playback after a spoken reply, shortlisted STT vendors accepting native files |
| **Capacitor fallback** | Wraps the same app if the iPhone PWA spike fails, giving native mic permission and APNs push without a second UI codebase | React Native / Expo would be a second product surface | Decision at the end of S1, with signing and distribution plan (TestFlight or ad-hoc for two devices, plus an Apple Developer account) |

---

## 3. Server and data

| Choice | Why it's optimal here | Rejected alternatives | Verify |
|---|---|---|---|
| **Node.js 24 LTS on Railway** | Active LTS; stable `fetch`/streams/WebCrypto; first-class SDK support; one Next.js standalone Node server in Railway Southeast Asia (Singapore). `app` and `worker` are always-on; App Sleeping stays off | Bun and Deno are viable but add compatibility uncertainty for SDKs, Drizzle tooling, graphile-worker and Next.js standalone | S5 streamed POSTs from real phones, first request after deploy, memory/CPU envelope, App Sleeping off, measured RTT from home |
| **Hono mounted in Next.js route handlers** | Tiny Web-standard handlers, streaming responses, Zod validation and typed `hc` client, while keeping API and PWA on the same origin. Mounted at `app/api/[[...route]]/route.ts`; Better Auth owns `/api/auth/*` | NestJS is too much ceremony; Fastify/Express lack the same typed-client fit in this topology | S5 streams turn responses through Next.js on Railway; build verifies the adapter and route-handler shape |
| **PostgreSQL 18 on Railway's pgvector template** | One stateful service again: facts, vectors, search, jobs, pub/sub and access policy in the same RLS-protected database. The template is **unmanaged**: we operate minor updates, `ALTER EXTENSION vector UPDATE`, config, disk monitoring and recovery. Private networking only; no public TCP proxy | **Neon** and Supabase remain managed Postgres exit paths if operating Postgres becomes a burden. MySQL is rejected because RLS, extensions, vectors, FTS and Postgres-native jobs/pub-sub are central to the design | S5 verifies Postgres 18, pgvector, `pg_trgm`, FTS on Tamil strings, RLS, private networking, disk alerts, restore procedure and Railway volume backups |
| **Generic Postgres features only** | Keeps the Dokploy VM and managed-Postgres exit paths open: RLS, transactions, FTS, `pg_trgm`, `fuzzystrmatch`, pgvector, ordinary indexes, `LISTEN/NOTIFY` and narrow `SECURITY DEFINER` functions | Provider-only APIs are not used; MySQL-specific or external-search designs are rejected | Schema review confirms no provider-only features; local Testcontainers and Railway smoke tests both pass |
| **pgvector 0.8 with `halfvec`** | Embeddings live next to facts and under the same RLS/transactional model. Exact scan is enough at MVP scale; halfvec halves storage; per-config HNSW can come later | Qdrant/Pinecone/Weaviate add a service and cannot enforce the app's RLS model | Retrieval evals on `retrieval.jsonl`, including Tamil/Tanglish slice and negative examples |
| **Drizzle ORM + drizzle-kit + node-postgres Pool** | SQL-first TypeScript schema, migrations and raw-SQL escape hatches for RLS/hybrid search. `withMemberTx` leases one `pg` client, `BEGIN`s, sets `app.household_id` and `app.member_id` with `set_config(..., true)`, runs every scoped query through the tx handle and releases in `finally`; the global pool is not exported | Prisma is heavier and treats pgvector awkwardly; Kysely is a strong query builder but not the migration/schema story we need | Pool reuse, rollback, missing-context, connection-drop and exhaustion tests; RLS suite runs against Testcontainers and Railway Postgres |
| **DB roles and access boundaries** | `fa_owner` runs migrations only; `fa_app` serves API traffic with no `BYPASSRLS`, no table ownership and no queue privileges; `fa_worker` runs jobs and sets member context per job; `fa_maint` has `BYPASSRLS` only for maintenance tasks in the worker | A broad app superuser or a shared owner credential would bypass the privacy model. A separate backup role is removed; maintenance owns backup/restore/forget audit duties | S5 verifies each role can do only its intended work; maintenance credentials are unavailable to app request handlers |
| **graphile-worker for reminders and jobs** | Occurrence creation and graphile-worker `add_job` are committed atomically through a narrow `SECURITY DEFINER` wrapper (`schedule_occurrence`); app role has no queue privileges. `run_at`, `job_key` per occurrence, revision-stamped claim (`UPDATE ... WHERE status='scheduled' AND schedule_revision=...`) and at-least-once delivery with stable notification tags cover edits, retries and duplicates. Crontab handles maintenance, and the design stays Postgres-only | Vercel Workflow is rejected as platform-bound and metered. pg-boss is good but less aligned with the existing ADR. BullMQ requires Redis. Inngest/Trigger.dev add another vendor. DBOS is a fine alternative to revisit later | S5 hard gate: ≥ 200 automated occurrences including edits mid-flight, worker restarts and a redeploy → 100% dispatched within 60 s, no stale sends |
| **Better Auth ≥ 1.7.7 with `emailOTP` + `multiSession`** | One simple mechanism for first sign-in, new device and recovery: enter email in the app, type the code in the app, get a 90-day sliding Secure HttpOnly cookie. Profiles are invite-only and admin-allowlisted; members can view/revoke sessions; optional WebAuthn step-up protects export/private views/forget-all once `nilumi.in` is stable | Passkeys-primary, magic links, Google OAuth popups, invite links/QRs and SMS OTP are rejected: too much ceremony, broken iOS standalone flows, popup issues or DLT/business requirements. Recovery codes, second authenticator, break-glass and enrollment-token flows are removed | S1 confirms email-code flow in installed iPhone app, cookie persistence/loss recovery, session revoke and optional Face ID/fingerprint step-up |
| **Resend free tier on `nilumi.in`** | Simple domain email for sign-in codes; 3,000 emails/month is ample for two adults. If the owner wants zero metered dependencies for email too, SMTP through an existing mailbox via Nodemailer is the fallback | SMS/WhatsApp require regulatory/business setup; self-hosted email is not worth the ops | S0 confirms data policy; S6 verifies sender domain before installing phones |
| **Postgres LISTEN/NOTIFY → SSE** | One dedicated LISTEN connection per app instance emits IDs and event kinds only after an RLS-scoped visibility check for that member. Railway's proxy allows up to 15 minutes while data flows and closes after 5 minutes idle, so the server sends heartbeat comments about every 25 s; the client reconnects with `Last-Event-ID` and invalidates active queries | WebSockets are unnecessary for one-way invalidation and harder through proxies. Polling-only feels stale and wastes requests. Ably is a later upgrade only if SSE is insufficient | S5 verifies streamed events, heartbeat, idle behavior, reconnect, resume after app backgrounding and no private-data leakage in payloads |
| **web-push (VAPID)** | Standards-based Web Push including iOS Home Screen apps; encrypted payloads; no third-party notification SDK | OneSignal/FCM SDKs add vendor lock-in for little benefit | S1 delivery with app closed on both phones, household vs private lock-screen text |
| **chrono-node `en.GB` + date-fns + @date-fns/tz + rrule** | Deterministic cross-check of LLM date resolution with day-first parsing, timezone-safe math and RFC 5545 recurrence | Trusting LLM dates alone; Moment (legacy); native Temporal before universal runtime support | 100% on `dates.jsonl` |
| **Forget journal and restore discipline** | DB redaction commits first, then a transactional `journal_tombstone` job appends a content-free tombstone to R2 and sets `forget_tombstones.journaled_at`. The backup job drains unjournaled tombstones and refuses to upload a dump unless every tombstone up to the dump snapshot is journaled. Every restore replays the journal before traffic | A backup process that can race forget would make "forgotten" unverifiable | S5 restore test includes forgotten canary absent after journal replay |
| **Turn ledger, receipts and budget accounting** | Command receipts, `content_refs`, budget reservations and circuit-breaker state commit before success is returned; traces are written at the end of the turn. Circuit breakers stay in-process while the app is a single instance; reservations are Postgres-backed | Silent best-effort accounting would make undo/forget/audit unreliable. A distributed breaker is overkill before multi-instance scaling | Unit/integration tests verify receipt-first behavior and AI cap enforcement |
| **Family Records Vault (H1) hooks** | Vault uploads go directly to Cloudflare R2 with presigned URLs so app memory and request sizes stay small. Extraction options include hosted extractors (vision LLM, Mistral OCR, Azure F0) and **PaddleOCR as an extra Railway service** if the Vault spike proves it best for Tamil and worth the RAM | Running OCR in the core app would increase memory and blast radius; picking a hosted extractor before the Vault spike is premature | H1 spike verifies ID masking, extraction quality, retention, provider eligibility and added Railway cost if PaddleOCR wins |

Occurrence statuses are `scheduled`, `dispatching`, `sent`, `acknowledged`, `skipped` and `cancelled`. Per-sentence TTS audio is synthesized on demand by `GET /v1/turns/:id/speech/:seq` from stored sentence text; templated confirmation phrases can still be cached in R2.

---

## 4. AI and voice

### 4.1 Model roles and bake-off candidates

| Role | Candidates (Oct 2026) | Selection criteria (in order) | Notes |
|---|---|---|---|
| `nlu` | **OpenAI GPT-6 Luna** · **Claude Haiku 4.5** · *(Gemini Flash-Lite / Flash only if S0 confirms eligibility; see ADR-017)* | 0) provider eligibility and data terms (S0) 1) structural accuracy on `nlu.jsonl` 2) p95 latency with minimal reasoning 3) schema-valid rate 4) cost | All support structured output/tool calling through direct provider SDKs behind the registry. No vendor publishes the exact Tamil/Tanglish benchmark we need, so include household-style Tanglish cases. Measure serialized prompt size against each provider's caching minimum |
| `answer` | Same as `nlu`, or one tier up if synthesis is weak | Answer correctness, citation compliance, first *validated sentence* latency | Most single-fact answers remain deterministic templates (Arch §10.1 E) |
| `embed` | **OpenAI `text-embedding-3-small`** (`dimensions=768`, native) · **Cohere embed-v4** (Tamil officially listed; native dims 256/512/**1024**/1536, so not a 768 drop-in) · *(`gemini-embedding-001` if eligible)* | recall@5 on `retrieval.jsonl` including a Tamil/Tanglish slice and negative examples | Chosen independently of the NLU provider. Each option is an `embedding_configs` row (model, dims, task type, preprocessing version); switching = new config + backfill (cents) |
| `stt` | **Sarvam Saaras v4** (REST/Batch, 50 keyterms, `codemix`) · **Deepgram Nova-3** (India endpoint, keyterms, official AI SDK provider) · **ElevenLabs Scribe v2** · **Azure Fast Transcription / MAI-Transcribe-2** | 1) entity-name accuracy on your clips 2) WER 3) p95 latency 4) native browser format acceptance 5) terms for household data | Saaras is the default hypothesis and only option purpose-built for Tanglish; Deepgram is the fallback/circuit-breaker target. The bake-off uses raw multipart requests where needed so keyterms are proved end to end |
| `tts` | **Sarvam Bulbul v3** (en-IN, ta-IN, code-mixed text) · **Azure neural** (`en-IN-NeerjaNeural`, `en-IN-AaravNeural`, `ta-IN-PallaviNeural`...) · **OpenAI TTS** | 1) your wife's preference 2) first-audio latency 3) Tamil availability 4) retention terms | Sentences are synthesized on demand from stored text; template phrase cache lives in R2 |

**Default hypothesis** (until S0 and the bake-offs say otherwise): `nlu`/`answer` = **GPT-6 Luna**, `embed` = **`text-embedding-3-small`@768**, `stt` = **Sarvam Saaras v4**, `tts` = **Bulbul v3**. **Deepgram Nova-3** is the first STT fallback. One OpenAI key covers language and embeddings, but application code sees only registry role aliases. **Sarvam's training opt-out, retention and written confirmation for a household account in a home with minors must be green before any family clip is uploaded.**

### 4.2 Rejected alternatives

| Option | Reason |
|---|---|
| Realtime speech-to-speech (Gemini Live `gemini-3.8-live`, OpenAI `gpt-realtime-2.1`) | Weaker control of the deterministic write path, harder to test and evaluate, higher cost, and no keyterm biasing. Planned only as a later conversation-mode horizon (Arch §20.6) |
| Local Whisper / Piper | No GPU host; `large-v3-turbo` is not practical on CPU and struggles with Indian proper nouns; Piper has no en-IN or Tamil voices |
| Agent frameworks for the core pipeline (LangChain, LangGraph, CrewAI, Mastra, OpenAI Agents SDK, AI SDK agents) | Free-form loops add latency and nondeterminism to a system whose MVP promise is correctness. The core remains a fixed, testable sequence of AI SDK calls. Later conversation mode can use a constrained AI SDK agent + MCP over the same executors |
| Memory frameworks (Mem0, Graphiti, Letta, Cognee, LangMem) | None fits the RLS privacy, controlled vocabulary, span-level provenance, undo/forget and bi-temporal requirements. Borrow ideas, not the dependency (ADR-005) |
| Vercel components not used under the free-libraries rule (hosting, AI Gateway, Workflow, Cron, Queues, Blob, Sandbox, Chat SDK, v0, Vercel Agent) | They are either metered/free-tier-cliff services or platform-bound components. Nilumi uses only the open-source libraries listed in the Vercel usage rule; jobs, realtime, blobs/backups and routing stay on Railway/Postgres/R2/in-process code |
| n8n / visual workflow builders | Another service with its own auth, UI and operational surface. Household routines start as recurring tasks/reminders; revisit only if non-developer routine building is explicitly wanted and another service becomes acceptable |
| STT exclusions (Groq, Voxtral, Speechmatics, AWS Transcribe, Web Speech API, Google Chirp 3) | Groq terms forbid consumer use; Voxtral lacks Tamil; Speechmatics lacks webm/opus despite an interesting Tanglish pack; AWS trains by default unless opted out; Web Speech API lacks biasing and breaks in iOS standalone; Chirp 3 has Tamil preview/cost concerns |

### 4.3 LLM routing layer

**Decision:** route LLM and embedding calls through an **in-process AI SDK provider registry** (`createProviderRegistry` + `customProvider`) with role aliases (`nlu`, `answer`, `embed`) pinned to exact model IDs in `config/models.ts`. Direct provider SDKs use our own keys. `wrapLanguageModel` middleware applies per-call defaults such as `store: false`. A small fallback wrapper retries the primary once, then calls the approved challenger for that role if it has passed the provider gate. A/B testing is **offline evals first**, then **shadow mode** on minimized production inputs for a few hundred turns; the served answer still comes from the pinned model. No live traffic split on family data.

| Layer / option | Verdict | Reason |
|---|---|---|
| **AI SDK provider registry + role aliases** | **Adopt** | Free in-process abstraction; no extra processor; keeps config-driven model swaps, fallback and shadow calls |
| **Direct provider SDKs** | **Adopt** | OpenAI default and Anthropic challenger use our keys directly behind the registry; fewer processors and fewer billing surprises |
| **AI Gateway** | **Rejected** | Metered/credit-backed platform service, which violates the owner's Vercel free-libraries-only rule |
| **OpenRouter** | **Rejected for family data** | Adds another processor and fees; acceptable only for offline synthetic experiments |
| **Cloudflare AI Gateway** | **Rejected** | No decisive advantage and another processor for family data |
| **LiteLLM / Bifrost** | **Revisit only if routing needs grow** | Useful self-hosted gateways, but each is another Railway service to operate before the need exists |
| **Portkey / Helicone / TensorZero** | **Avoid** | Continuity concerns from acquisitions, pivots or archived status |

STT and TTS remain behind separate adapters because no routing gateway handles the Sarvam-first audio path well enough for this use.

### 4.4 Classifier models

Decision source: [04 §9](04-research-and-decisions.md#9-classifier-models). No classifier is in the MVP runtime.

| Insertion point | Verdict | Reason |
|---|---|---|
| Pre-NLU intent routing | **Reject** | Saves too little, duplicates NLU and risks corrupting the one call we trust |
| Smaller per-intent prompts | **Reject / instrument** | Trim static prompts first; no classifier needed until prompt size is the measured bottleneck |
| Sensitive-input detection on top of regex/checksums | **Instrument and revisit** | Highest value, but possible secrets cannot go to a third party; a local model is another runtime to host |
| Health/allergy detection, visibility suggestion, answerability | **Reject** | Already deterministic or inside the NLU schema |
| Document-type classification | **Adopt with Family Records Vault (H1)** | Async, bounded taxonomy and directly useful for scans |
| Child-safety moderation | **Adopt with kid mode (H5)** | Defence in depth once kids are users |

Offline experiments in `evals/`: (1) embedding-kNN intent router vs the LLM's intent on the NLU golden set; (2) PII recall on red-team secrets through PII-Tracer / Qwen3Guard-0.6B vs the deterministic detectors. Revisit only if NLU p95 > 2 s because of prompt size, LLM spend > $5/month, intent accuracy < 90% concentrated in simple commands, or secret-detector recall < 100% on the red-team set.

---

## 5. Cost model (monthly)

**Assumptions (generous):** 2 adults · 40 turns/day = 1,200 turns/month · 70% voice, average 6 s → 1.4 audio-hours · NLU 2,500 input + 200 output tokens per turn · 30% of turns are synthesis-eligible questions (1,500 input + 120 output) · 50% of turns spoken × 100 characters = 60k TTS characters · ₹87 ≈ $1. **No cache hits are assumed** (sparse household traffic and provider caching minimums make hits unreliable).

**Token math:** NLU 1,200 × 2,500 = 3.0M input + 1,200 × 200 = 0.24M output · answers 360 × 1,500 = 0.54M input + 360 × 120 = 0.04M output → **3.54M input + 0.28M output per month**.

Railway pricing basis checked October 2026: Hobby $5/month includes $5 usage; usage is $10/GB-RAM-month, $20/vCPU-month, $0.15/GB-month volume and $0.05/GB egress, billed per second.

| Item | Estimate |
|---|---|
| Railway (app + worker + Postgres, Singapore) | **₹850–1,700** for roughly 0.8–1 GB RAM total, low CPU and ~2 GB volume; measured in S5 on the owner's existing paid account |
| Domain `nilumi.in` | **≈ ₹75** (≈ ₹600–900/year) |
| AI: LLM ≈ ₹45 · STT ≈ ₹42 · TTS ≤ ₹180 · embeddings < ₹10 | **≈ ₹280** (≤ ₹600 with headroom) |
| Cloudflare R2, Resend | **₹0** initially within free tiers |
| Taxes / FX contingency (~15%) | **≈ ₹180–350** |
| **Total** | **≈ ₹1,400–2,700/month**; target ≤ ₹3,000 |
| Contingency: Capacitor / Apple Developer account | ≈ ₹8,700/year only if the native fallback is triggered |

**Guardrails:** the AI budget cap stays at ₹800/month with existing soft/hard caps; lists, tasks, reminders and the inbox keep working at any cap (mechanics in Arch §17.4). The dominant recurring cost is now **hosting**, not AI. Upgrade/exit triggers: Railway measured usage above target, Postgres ops burden, Vault storage growth, or a PWA failure that triggers Capacitor.

---

## 6. Hosting, operations and tooling

| Concern | Choice | Notes |
|---|---|---|
| Railway services | **`app`**, **`worker`**, **`postgres`** in Railway Southeast Asia (Singapore) | `app` = Next.js 16 standalone server (`node apps/web/server.js`) with PWA, Hono API, Better Auth, streamed turn responses and SSE. `worker` = graphile-worker (`node apps/worker/dist/worker.js`) for reminders, forget journal, embeddings backfill, retention, audit and backups. `postgres` = Railway Postgres 18 + pgvector template on a volume |
| Always-on behavior | App Sleeping / serverless mode stays **off** for `app` and `worker` | Reminders and SSE require always-on processes |
| Proxy limits | SSE and streamed POSTs are designed for Railway's public proxy | Requests may last up to 15 minutes while data flows and close after 5 minutes idle; SSE sends heartbeat comments about every 25 s and reconnects with `Last-Event-ID` |
| Build image | **One multi-stage Dockerfile** based on Node 24 slim | Install `postgresql-client-18` for `pg_dump`/`pg_restore`; do **not** install `ffmpeg`; produce Next.js `output: 'standalone'`; use one image with two start commands |
| Deploy | Railway GitHub integration deploys `main` | Pre-deploy command runs `drizzle-kit migrate` as `fa_owner`; health check gates traffic. Expand → migrate → contract and N-1 compatibility stay mandatory for jobs, cached PWA builds and queued offline mutations |
| Database ops | Railway Postgres is unmanaged | Checklist: minor updates, extension updates, config review, disk monitoring, restore rehearsal, private networking, volume backups, no public TCP proxy |
| Fallback / exit | Same Docker image + `docker-compose.yml` on the **Dokploy VM** | Or move only the DB to managed Postgres (Neon/Supabase) if operating Postgres becomes the burden. RTO target ≤ 2 h via runbook |
| Secrets | Railway variables for runtime app/worker secrets | `fa_owner` credentials only for migrations; `fa_maint` credentials loaded only by maintenance tasks in the worker; provider keys server-side only; age public recipient only on worker; master private key only in the OneDrive recovery document shared with your wife, both Microsoft accounts protected with 2FA |
| Backups | Worker cron nightly 02:30 IST as `fa_maint` | 1) drain forget journal; 2) `pg_dump -Fc`; 3) restore-test plaintext dump into a scratch database on the same server; 4) verify migration version, roles, RLS policies, row counts, visibility canaries, forget replay and forgotten canary absence; 5) drop scratch; 6) `age` encrypt to the public recipient; 7) upload to R2 and verify hash; 8) record result and alert on failure |
| Backup retention | R2 lifecycle 30 daily / 6 monthly; Railway volume backups as the second layer | Quarterly manual restore from R2 with the master key follows the runbook and rehearses your wife's recovery path. RPO ≤ 24 h, RTO ≤ 2 h |
| Observability | Turn traces in Postgres + admin viewer; pino JSON logs; Railway metrics; external uptime monitor | No raw family text in logs. AI SDK OpenTelemetry is optional later, not a third-party tracing dependency now |
| CI | GitHub Actions PR CI and manual live evals | Typecheck, lint, unit tests, integration tests with Testcontainers, recorded-LLM tests and manually triggered live evals. Production backup jobs are owned by the Railway worker |
| Dependency hygiene | Renovate grouped weekly; `pnpm audit` in CI; lockfile pins exact versions | AI model IDs are config, not transitive dependency drift |
| Local dev | `docker compose up` for Postgres + extensions, then `pnpm dev` | Local mirrors production enough for schema/extensions and the Dokploy exit path; Testcontainers covers isolated integration tests |

---

## 7. Provider eligibility and data policies (release gate)

**No family voice or data, including bake-off clips, goes to a provider until its row is green.** "Paid / no training" is not the same as zero retention, and local forget cannot erase provider-side copies.

| Provider | Eligibility for this use | Data policy to apply | Status |
|---|---|---|---|
| **OpenAI API** (default LLM + embeddings) | Confirm the API terms permit a personal household app whose household includes minors (adults are the users for the MVP) | API data not used for training; request zero-retention controls where available; India storage residency exists only with sales approval | Data controls verified; **eligibility to confirm in S0** |
| Anthropic API (challenger) | Confirm household use; minors need extra safeguards per its policies | No training on API data by default; no India residency for Haiku 4.5 | **To confirm in S0** |
| **Sarvam AI** (default STT + TTS) | Confirm API-account terms for a household account in a home with minors **in writing** | Obtain training opt-out, retention/deletion terms and enterprise/customer terms if needed | **Release gate: S0, before any family clip is uploaded** |
| Deepgram (STT fallback) | Confirm household use | Opt out of model-improvement programme where needed; use India endpoint | **To verify** |
| ElevenLabs / Azure Speech (if chosen in S2) | Confirm household use and any age/minor terms | ElevenLabs/Azure retention, training and region settings must be recorded before clips are uploaded | **To verify if shortlisted winner/fallback** |
| **Railway** | Hosting, worker and Postgres for household data in Singapore | Confirm region, data-at-rest terms, support model, volume backups, private networking and account access controls | **S0/S5 gate** |
| **Cloudflare R2** | Encrypted backups and later Vault originals | Backups are `age`-encrypted before upload; forget journal contains content-free tombstones; Vault originals use presigned URLs and app-managed access rules | Configure before backup drill |
| **Resend** | Transactional email for sign-in codes on `nilumi.in` | Receives email address and code only; no raw household content | **S0/S6 gate** |
| **GitHub** | Code, CI and manual live evals | No family data in the repository; eval datasets require consent and should prefer synthetic data; Actions logs must not print secrets or family content | **S0 gate** |
| Google Gemini API | Not eligible under current consumer/under-18 reading unless written eligibility or different contractual terms are obtained | Paid tier does not train on prompts but logs for abuse monitoring | Excluded unless S0 changes the status |

The effective settings (account, opt-outs, retention, date checked) are recorded in `config/providers.md` and re-checked yearly and before kid mode.

---

## 8. Phase 0 verification

The spikes (S0–S6), their scope and exit criteria are defined once in [Product §11](01-product-plan.md#11-delivery-phases-risk-first-with-exit-criteria-no-durations). The stack-specific summary is:

| Spike | Tech-stack focus |
|---|---|
| **S0 Provider gate** | Green rows for OpenAI, Anthropic, Sarvam, Deepgram fallback, any TTS/STT bake-off finalist, Railway, R2, Resend and GitHub before family data or clips are uploaded |
| **S1 PWA + phone behavior** | Next.js 16 + Turbopack + Serwist install on both phones; email-code sign-in inside installed iPhone app; cookie persistence and re-sign-in fallback; optional Face ID/fingerprint step-up in standalone mode; native mic formats; recorder interruptions; Web Push with app closed; reply playback after resume; SSE in the installed app across background/resume; Next.js #95588. Otherwise trigger the Capacitor decision (ADR-015) |
| **S2 STT bake-off** | Sarvam Saaras v4, Deepgram Nova-3, ElevenLabs Scribe v2 and Azure Fast Transcription on real native browser clips, with entity-name accuracy first |
| **S3 NLU and routing** | GPT-6 Luna vs Claude Haiku 4.5, role aliases, fallback wrapper, shadow-mode path and the two classifier experiments |
| **S4 Voice pick** | Your wife chooses the TTS voice after latency, terms and preference checks |
| **S5 Platform smoke on Railway Singapore** | Postgres 18 + pgvector + `pg_trgm`/FTS on Tamil strings (`show_trgm`, `ts_debug`); RLS with pooled `withMemberTx`; graphile-worker wrapper timing; reminder gate with ≥ 200 automated occurrences including edits mid-flight, worker restarts and a redeploy; streamed POST and SSE through Railway proxy; RTT from home; backup to R2 with in-job restore test, forget-journal replay and one manual restore with the master key; Railway volume backups configured; App Sleeping off; measured monthly cost |
| **S6 Domain** | Buy `nilumi.in`, attach it to Railway with TLS and verify the Resend sender **before installing the app on the phones** |

S0 gates every spike that uploads family data. S5 is the hard platform gate for the Railway/Postgres/worker topology.

---

## 9. Sources (checked October 2026)

Full source list and superseded platform evidence: [04 §16](04-research-and-decisions.md#16-sources-checked-october-2026). Key implementation sources:

- Railway pricing and service limits: https://railway.com/pricing · https://docs.railway.com/pricing · https://docs.railway.com/networking/public-networking/specs-and-limits
- Railway Postgres backups/restores and pgvector template: https://docs.railway.com/guides/postgres-backups-restores · https://railway.com/deploy/pgvector--pgvector-railway
- Next.js PWA/static export: https://nextjs.org/docs/app/guides/progressive-web-apps · https://nextjs.org/docs/app/guides/static-exports
- Serwist for Next/Turbopack: https://serwist.pages.dev/docs/next/turbo
- Hono route handlers and typed client: https://hono.dev/docs · https://hono.dev/docs/guides/rpc
- TanStack Query persistence/offline/reconnect behavior: https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient · https://tanstack.com/query/latest/docs/framework/react/guides/network-mode
- Better Auth and Resend: https://better-auth.com/docs · https://resend.com/pricing
- AI SDK provider registry, Output API, transcription and speech: https://ai-sdk.dev/docs
- graphile-worker: https://worker.graphile.org
- Drizzle and node-postgres: https://orm.drizzle.team/docs/overview · https://node-postgres.com
- STT/TTS vendors: https://docs.sarvam.ai · https://developers.deepgram.com/docs · https://elevenlabs.io/docs/overview/capabilities/speech-to-text · https://learn.microsoft.com/azure/ai-services/speech-service
- WebKit/iOS PWA and Web Push: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados · https://webkit.org/blog/17333/webkit-features-in-safari-26-0
- PostgreSQL, pgvector, pg_trgm, fuzzystrmatch and backups: https://www.postgresql.org/docs/18/release-18.html · https://github.com/pgvector/pgvector · https://www.postgresql.org/docs/current/pgtrgm.html · https://www.postgresql.org/docs/current/fuzzystrmatch.html · https://www.postgresql.org/docs/current/app-pgdump.html

Superseded Vercel-platform, Neon, Workflow and Gateway research links remain only as evidence in 04; they are not implementation sources for Revision 2.
