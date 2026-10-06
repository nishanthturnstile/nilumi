# 04 — Research and Decisions (October 2026 review)

> **Status:** Accepted · revision 2 (6 Oct 2026)
> **Related:** [01 Product Plan](01-product-plan.md) · [02 Architecture](02-architecture.md) · [03 Tech Stack](03-tech-stack.md)

This document records the owner's review of the baseline plan, the research done in response, and the decisions that came out of it. **01–03 contain every final decision; this document keeps the evidence.** Comparison tables, verdicts, rejected options and sources remain here. Where a fact was gathered from vendor pages in October 2026 and gates a decision, it's marked **(verify in Phase 0)**.

**Revision history**

| Revision | Date | Decision record |
|---|---|---|
| Rev 1 | 6 Oct 2026, morning | Review decisions including Vercel Hobby + Neon + Vercel Workflow + AI Gateway, all conditional on Phase 0 gates |
| Rev 2 | 6 Oct 2026 | Owner chose Railway Singapore using the existing paid Railway account, Vercel only for completely free OSS libraries, product name **Nilumi** and domain **`nilumi.in`**. Consequences: graphile-worker, LISTEN/NOTIFY SSE, worker-based backups and in-process LLM routing are restored/adopted |

**Guiding principle (owner):** simplicity, low operational overhead and minimal recurring cost, using free/OSS options unless there's no reasonable alternative, while keeping room to grow into a full household memory platform.

---

## 1. Decisions at a glance

| # | Topic | Decision | Basis | Applied in |
|---|---|---|---|---|
| D1 | Section 14 open questions | Proposed defaults accepted, except where noted in §2 | Owner | Product §14 |
| D2 | **Memory sharing** | Owner-only, explicit **share**: at capture time or later. A shared memory is visible to both adults (new `shared` visibility) and keeps its owner. Only the owner can edit, forget or un-share it | Owner + critique (§3) | Product §6, §8 (J17), §10 · Arch §7.1, §8.2–8.3, §9, §15.2 · ADR-024 |
| D3 | Response modality | Voice-first. **Voice in → spoken reply + screen; text in → text-only reply** (`auto` stays the default) | Owner | Product §7 · Arch §14.4 |
| D4 | Assistant name / wake word / domain | **Nilumi**, wake phrase **"Hey Nilumi"**, domain **`nilumi.in`**; buy before installing on the phones | Owner + research (§5) | Product §1, §11, §14 · Arch §16 · ADR-016 |
| D5 | **Hosting** | **Railway Singapore**: `app` Next.js 16 standalone Node server + `worker` graphile-worker + Railway Postgres 18 with pgvector, private networking and Railway volume backups | Owner + research (§6) | Arch §1–§5, §17 · Tech §1, §3, §6 · ADR-012, ADR-020 |
| D6 | Frontend | **Next.js 16 App Router with Turbopack** as a PWA; standalone Node server, not static export | Owner + research (§6.4) | Tech §2 · ADR-020 |
| D7 | Client data layer | **TanStack Query v5**: persisted cache for lists/tasks/inbox only, offline-first paused mutations, optimistic updates, **SSE invalidations** and refetch on focus/reconnect. All domain operations go through the Hono `/v1` API | Owner + research (§6.5) | Tech §2 · Arch §13.1 · ADR-020 |
| D8 | **Reminders and jobs** | **graphile-worker** for reminders and jobs: transactional `add_job`, `run_at`, `job_key`, revision-stamped claim and crontab maintenance. Spike S5 is a hard gate | Owner + research (§7) | Arch §13.2, §17 · Tech §3 · ADR-011 |
| D9 | Realtime sync | **Postgres LISTEN/NOTIFY → SSE** (`GET /v1/events`) with heartbeat comments, `Last-Event-ID` reconnect and TanStack Query invalidations; refetch on focus/reconnect | Owner + research (§6.3) | Arch §13.1 · Tech §2 |
| D10 | **LLM routing layer** | **In-process AI SDK provider registry** with model-role aliases, direct provider SDKs using our own keys, fallback wrapper and shadow-mode A/B. **No hosted gateway** | Owner + research (§8) | Arch §6, §17.3 · Tech §4 · ADR-022 |
| D11 | Agent / workflow frameworks | **No agent framework** in the core pipeline; plain AI SDK calls. No visual workflow builder for now. Conversation mode later = constrained AI SDK agent + MCP over the **same executors** | Research (§7) | Tech §4.2 · ADR-003 |
| D12 | **Classifier model** | **Not in the MVP.** Two offline experiments in the eval harness and explicit revisit triggers. Adopt a document-type classifier with the Vault and a safety classifier with kid mode | Research (§9) | Arch §16.2 · Tech §4.3 · ADR-025 |
| D13 | **Authentication** | Better Auth (≥ 1.7.7) with **email code typed inside the app** for first sign-in, new devices and recovery; 90-day sliding HttpOnly session; **optional Face ID/fingerprint step-up**. Passkey-as-primary, recovery codes, second authenticator and break-glass removed | Owner + research (§10) | Product §8 (J15) · Arch §15.5 · ADR-023 |
| D14 | **Speech-to-text** | **Sarvam Saaras v4 confirmed as the default**, **Deepgram Nova-3 as the fallback**. Bake-off adds ElevenLabs Scribe v2 and Azure Fast Transcription. Native browser formats, **no ffmpeg**, no streaming in the MVP | Research (§11) | Product §11 (S2) · Arch §14.2 · Tech §4.1 |
| D15 | **Family Records Vault** | **First post-MVP horizon (H1)**, ahead of the room speaker. Phase-1 schema and interface hooks reserved now. ID numbers inside documents are **masked** in the index and all downstream AI calls | Owner + research (§12) | Product §9 · Arch §9, §20.1 · ADR-026 |
| D16 | Master key and runbook | **Worker-based nightly backups**: worker cron drains the forget journal, dumps, plaintext restore-tests into scratch DB, encrypts with an age public key and uploads to R2. The worker holds only the public key; the master private key and runbook live in one OneDrive document shared with your wife. Railway volume backups are the second layer | Owner + critique (§13) | Arch §17.2 · Tech §6 |
| D17 | Shopping-list sharing | Household only; external sharing (cook, household help) stays a later horizon (H6) | Owner | Product §9 |
| D18 | Cost | ≈ **₹1,400–2,700/month**: Railway ≈ ₹850–1,700, domain ≈ ₹75, AI ≈ ₹280 (≤ ₹600 with headroom), taxes/FX contingency ≈ ₹180–350 | Research (§14) | Tech §5 |
| D19 | Vercel usage rule | Use **only completely free OSS libraries** from Vercel's ecosystem (Next.js, Turbopack, AI SDK; optional copy-in AI Elements). Do not use metered or platform-bound Vercel services | Owner + research (§7) | Tech §1–§4 · ADR-021 |

---

## 2. Section 14 open questions: resolutions

| # | Question | Resolution |
|---|---|---|
| Q1 | Are your own preferences household-visible or private? | **Household** (default kept). Notes, "for me" and "remind me" stay private |
| Q2 | Should a spouse see that a private item *exists*? | **No** (default kept) |
| Q3 | Voice reply default | **Voice-first.** Speak when spoken to; text input gets a text-only reply (D3) |
| Q4 | "Morning / evening / tonight" | 09:00 / 18:30 / 20:30 IST, editable (default kept) |
| Q5 | Retention of turns that produced no memory | 30 days, then purge (default kept) |
| Q6 | Keep audio clips for 7 days to improve STT? | Off by default; on during Phase 0 and the pilot only (default kept) |
| Q7 | Assistant name / wake word | **Nilumi / "Hey Nilumi"** decided (§5). Pronunciation `NI-lu-mi` (நிலுமி), from Tamil *nila* ("moon") + light |
| Q8 | Which custom domain? | **`nilumi.in`** decided. Buy **before installing the app on the phones** because the installed PWA, push subscriptions, cookies, email sender and optional WebAuthn step-up bind to the origin |
| Q9 | Shopping-list access for household help | Later (H6) (default kept) |
| Q10 | Kids' health facts in MVP memory | Yes, with explicit confirmation; never advice (default kept) |
| Q11 | Where does the recovery material live? | **A dedicated OneDrive document** (master backup key + runbook) in a folder shared with your wife; walk through it once together (D16, §13) |
| Q12 | Household reminder text on the lock screen | Yes for household, generic for private (default kept) |
| New | Memory sharing | D2 and §3 |
| New | Family records / documents | D15 and §12 |

---

## 3. Memory sharing

**Owner's requirement:** private memories stay private by default, but if a user explicitly says something should be shared, the other adult must be able to see it.

### 3.1 Model
| Visibility | Who can read | Who can edit, forget, change visibility | Owner column |
|---|---|---|---|
| `household` | All adults (children later per `audience`) | Any adult | `NULL` |
| **`shared`** (new) | All adults (**never** children) | **Only the owner** | Owner (immutable) |
| `private` | Owner only | Owner only | Owner |

Why a new value instead of flipping `private → household`: the baseline requires `owner_member_id = NULL` on household rows, which would erase who may un-share or forget the memory (independent critique). `shared` keeps ownership and grants read access.

### 3.2 Rules
1. **Who:** only the owner can share or un-share. The other adult can't see a private item, so can't request it.
2. **When:** at capture time, when the evidence span contains an explicit share cue ("share it with my wife", "tell my husband", "for both of us", "let my wife know"), checked deterministically like the polarity cues; or later via the card's **Share** button or by voice ("share my gift-ideas note with my wife"). Without such a cue, the LLM still can only make things **more** private.
3. **Sharing never implies correction.** A `shared` fact doesn't occupy the household cardinality-one slot. If a household value already exists, answers show both with attribution ("Household record: …; Nishanth's shared note: …"), and the share card offers an explicit "Make this the household value", which goes through normal supersession.
4. **Referenced private entities:** when the memory points at an owner-private entity, the card asks to confirm that the entity's **name and type** become visible. The entity becomes `shared` as a safe projection; its aliases and other memories stay private.
5. **History:** history rows snapshot visibility; the other adult sees history from the moment of sharing, never pre-share private values.
6. **Un-share:** visibility returns to `private`; the card warns that it may already have been seen. Derived content in the other adult's surfaces (turn cards, inbox items) is scrubbed through `content_refs`, as forget does. **Memory data is never stored in offline caches** (only lists, tasks and the inbox are), so revocation reaches the other phone within one polling interval or at the next app open.
7. **Forget** of a shared memory: owner only. **Undo** of a share is an un-share.
8. **Kids later:** `shared` items are adults-only by definition; household items follow the planned `audience` flag.
9. **Privacy eval** gains cases for share, un-share (including cached and derived content), forget by a non-owner (must be refused), cardinality-one collisions and existence leaks of shared entities.

---

## 4. Response modality

Voice remains the primary interaction, including spoken replies. The Talk screen leads with the hold-to-talk button; the text box is always available.

| Input | Reply (default `auto`) |
|---|---|
| Voice | Spoken reply (per-sentence TTS) **and** the on-screen cards and text |
| Text | **Text only** — no audio, so typing in a meeting or at night never makes the phone talk |

Settings keeps `always` and `never` for people who want a fixed behaviour. The screen is always updated.

---

## 5. Assistant name, wake word and domain

Criteria: warm, trustworthy and calm; easy for Indian-English and Tamil speakers *and* young kids; 2–3 syllables; distinctive as a wake word (uncommon phoneme sequence, not an everyday English/Tamil word or common given name, not confusable with Alexa/Siri/Google/Gemini); low trademark conflict; available domains. Twenty-five names were screened.

### 5.1 Shortlist
| Rank | Name | Meaning / sound | Wake-word fit | Conflict notes |
|---:|---|---|---|---|
| **1** | **Nilumi** | Coined from Tamil *nila* ("moon") + light; `NI-lu-mi` / நிலுமி | Excellent: "Hey Nilumi" = 4 syllables, clear `n-l-m` consonants, calm | No AI/app conflict found; `.com` registered |
| 2 | **Aayuli** | Sanskrit/Tamil *ayu/aayul* ("life, longevity"); `AA-yu-li` | Good; vowel-heavy, could blur with "Hey Julie" if rushed | Only a minor seller match; **all domains free** |
| 3 | Kuralo | Tamil *kural* ("voice"); `ku-RA-lo` | Strong `k-r-l` consonants | `.com` registered |
| 4 | Kivani | Hints at *vani* ("speech"); `ki-VA-ni` | Good | A hotel-software company uses the name |
| 5 | Nenavo | Echoes Tamil *ninaivu* ("memory"); `ne-NA-vo` | Good | `.com` registered |

Avoid: Soliya and Meyva (existing apps), Kanivo (`.app` taken), Aarilo (close to Airalo/Arlo).

### 5.2 Domain availability (RDAP + DNS, 6 Oct 2026)
`404/NX` = registry RDAP 404 + DNS NXDOMAIN (likely unregistered; a registrar may still price it as premium). `200/NS` = registered.

| Name | `.com` | `.in` | `.app` | `.family` | `get…com` / `hey…com` / `…home.com` |
|---|---|---|---|---|---|
| **Nilumi** | 200/NS | **404/NX** | **404/NX** | 404/NX | all 404/NX |
| **Aayuli** | **404/NX** | 404/NX | 404/NX | 404/NX | all 404/NX |
| Kuralo, Kivani, Nenavo, Ninavo, Niveli, Kivilo, Aarilo | 200/NS | 404/NX | 404/NX | 404/NX | all 404/NX |
| Kanivo | 200/NS | 404/NX | 200/NS | 404/NX | all 404/NX |

### 5.3 Final choice
- **Name:** **Nilumi**. **Wake phrase:** "Hey Nilumi" (the MVP is hold-to-talk; the wake phrase matters for the future room speaker, H2).
- **Domain:** **`nilumi.in` only**, bought before installing on the phones. App origin: `https://nilumi.in`; sign-in email sender: `no-reply@nilumi.in`.
- **Indicative price:** `.in` ≈ ₹575–899/year at Indian registrars (+GST where not included). The `.app` analysis above is kept only as research evidence; it is not part of the current decision.
- **Wake-word engines (H2):** train a custom openWakeWord/microWakeWord model with synthetic Indian-English TTS plus household negative samples. Picovoice Porcupine's free tier reportedly ended in mid-2026, so treat it as a licensed option.
- **Before any public use:** a formal trademark search (Indian Trademark Registry, WIPO). Nothing was registered during research.

---

## 6. Hosting topology and frontend

**Decision (revision 2): Railway Singapore.** Use the owner's existing paid Railway account and deploy the whole production runtime in Railway's Southeast Asia (Singapore) region.

| Railway service | What | Notes |
|---|---|---|
| `app` | Next.js 16 **standalone** Node server (`output: 'standalone'`): PWA, Hono API mounted at `app/api/[[...route]]/route.ts`, Better Auth at `/api/auth/*`, streamed turn responses and SSE `GET /v1/events` | Node 24 LTS; 1 stateless instance, scalable to 2 |
| `worker` | Same Docker image, different start command, running **graphile-worker** | Reminder delivery, forget-journal append, embeddings backfill, retention purges, forget audit, next-due computation, nightly backup + restore test |
| `postgres` | Railway Postgres 18 + pgvector template on a volume | Private networking only; no public TCP proxy; unmanaged, so we own minor updates, extension updates, config, disk monitoring and recovery |

- **One image:** multi-stage Node 24 slim with `postgresql-client-18` for `pg_dump`/`pg_restore`; **no ffmpeg**. Start commands are `node apps/web/server.js` and `node apps/worker/dist/worker.js`. `docker-compose.yml` mirrors production for local dev and the Dokploy-VM exit path.
- **Deploy:** Railway GitHub integration deploys `main` with a pre-deploy `drizzle-kit migrate` command as `fa_owner`, then health check and switch. GitHub Actions remains CI only (typecheck, lint, unit, integration with Testcontainers, recorded-LLM tests) plus manual live evals.
- **Proxy limits:** Railway permits an HTTP request for up to **15 minutes** while data flows and closes after **5 minutes idle**, so SSE sends a heartbeat comment about every 25 s and clients reconnect with `Last-Event-ID`. Turn streams last seconds.
- **Always-on:** Railway App Sleeping / serverless stay **off** for `app` and `worker`; reminders and SSE need resident processes.
- **Backups:** Railway volume backups (daily schedule, available on Hobby) are a second layer. PITR depends on template support and is verified in S5.
- **Pricing basis (Oct 2026):** Hobby $5/month including $5 usage; $10/GB-RAM-month; $20/vCPU-month; $0.15/GB-month volume; $0.05/GB egress, billed per second. Estimate for app + worker + Postgres (~0.8–1 GB RAM total, low CPU, ~2 GB volume) is **≈ ₹850–1,700/month**, measured in S5.
- **Exit paths:** the same image + `docker-compose.yml` on the Dokploy VM, or move only the database to managed Postgres (Neon/Supabase) if operating Postgres becomes a burden. RTO target remains ≤ 2 h via the runbook.

### 6.1 Options compared (for ~1,200 turns and a few hundred reminders a month, DB < 1 GB)
| Option | Monthly cost | Near India | Always-on worker / LISTEN | Verdict |
|---|---|---|---|---|
| **A. Vercel Hobby + Neon free** | **≈ ₹0** | Vercel `sin1`/`bom1`; Neon Singapore only | No (serverless) → reminders via Workflow-style durable sleep, realtime via polling | **Chosen in rev 1, dropped in rev 2**: owner preferred existing Railway account and no metered Vercel services |
| **B. Railway (baseline)** | ≈ ₹850–1,700 measured in S5 | Singapore | Yes | **Chosen (rev 2)** |
| C. Everything on the existing Dokploy VM | ≈ ₹0 marginal | Wherever the VM is | Yes | Rejected: shared workload, all ops on the owner, no managed volume backup layer |
| D. App on Vercel + DB/worker on Dokploy or Railway | ₹0–1,900 | Pin to DB region | Yes | No longer needed; retained as historical evidence only |
| E. Cloudflare (OpenNext + Hyperdrive) | ≈ ₹0–500 | Global edge | No | Rejected: free Worker size tight for Next.js, platform lock-in |
| F. Oracle free VM / Render / Fly | ₹0 / n.a. | Varies | — | Rejected: idle reclaim (Oracle), Render free Postgres expires in 30 days, Fly free tier ended |

### 6.2 Revision-1 analysis (Vercel Hobby + Neon), kept for reference
Rev 1 chose a Vercel Hobby app plus Neon Postgres to minimize recurring cost and avoid an always-on worker. It assumed one Next.js deployment, Hono mounted in route handlers, serverless Postgres access and durable jobs through Vercel Workflow/Cron with GitHub Actions backups. That analysis remains useful evidence for a future cost-minimizing exit path, but it is **not** the current decision because rev 2 rejects metered Vercel platform services and returns to Railway.

| Rev-1 idea | Why it was considered | Rev-2 status |
|---|---|---|
| Vercel Hobby app + Neon Singapore | Lowest recurring cost and a single serverless app | Dropped; Railway is the host and database |
| Vercel Workflow for reminders | Durable sleep without a worker | Dropped; graphile-worker is restored |
| Vercel Cron + GitHub Actions backups | Avoided resident maintenance processes | Dropped; worker cron owns maintenance and backups |
| Polling + focus/reconnect refetch | Serverless-compatible realtime substitute | Dropped as primary sync; SSE is restored |
| AI Gateway as transport | Provider abstraction without self-hosting a gateway | Dropped; in-process registry uses direct provider SDKs |

### 6.3 What revision 2 changes back
| Area | Revision-2 design |
|---|---|
| Reminders and maintenance | **graphile-worker** with transactional enqueue, `run_at`, `job_key`, revision-stamped claim and crontab |
| Realtime | **LISTEN/NOTIFY → SSE** with heartbeats, replay/reconnect and RLS visibility checks |
| Backups | Worker cron runs `pg_dump`, plaintext restore test, `age` encryption and R2 upload |
| Runtime image | Docker image without ffmpeg; recorder uses native browser formats |
| Database access | `pg` Pool over Railway private networking with `withMemberTx`; no serverless Neon driver |

### 6.4 Next.js as the PWA framework
- **Next.js 16 latest** with App Router and **Turbopack** for dev and build, running as a standalone Node server on Railway. The official PWA guide recommends **Serwist** (`@serwist/turbopack`); `next-pwa` is abandoned. A hand-written service worker remains a valid low-dependency option.
- Use the standard App Router build, **not** `output: 'export'` (static export drops route handlers, cookies and headers that auth, push and the API need).
- Next.js 16's `useOffline` hook is connectivity-aware UI only; offline content still needs the service worker and the persisted query cache.
- **Honest framing of the owner's rationale:** what an iPhone PWA can do (Web Push only after Add to Home Screen, mic in standalone mode, storage rules) is decided by **WebKit, not by the framework**; a Vite app hits the same ceiling. Next.js brings convenience (typed manifest, documented Web Push example, one app + API process) and a strong deployment story. Capacitor stays the escape hatch if the iPhone spike fails (ADR-015).
- iOS 26 / Safari 26 lets any site be opened as a Home Screen web app; Web Push still requires it to be added to the Home Screen.
- Watch item: an open Next.js issue (#95588) about Suspense-streamed content in backgrounded iOS standalone launches; covered by spike S1.

### 6.5 TanStack Query patterns
- `PersistQueryClientProvider` + IndexedDB persister (`idb-keyval`), namespaced per member and wiped on sign-out. **Only lists, tasks and the inbox are persisted**; memory data is fetched online.
- Offline mutations: `networkMode: 'offlineFirst'`, `setMutationDefaults` and `resumePausedMutations()` after rehydration, each carrying the existing `client_mutation_id` (server-side mutation receipts unchanged).
- Optimistic updates with rollback in `onMutate`/`onError`.
- Realtime invalidation comes from SSE events (`GET /v1/events`) carrying IDs and kinds only; active queries are invalidated on event, reconnect and focus. Polling remains a fallback/reconciliation tool, not the primary sync mechanism.
- **One API surface:** domain reads and writes use the Hono `/v1` API through TanStack Query, so future channels (Home Assistant, a vault uploader) use the same contract. Server Actions aren't used for domain operations.

---

## 7. Workflows, jobs and agent frameworks (Vercel ecosystem vs alternatives)

**Revision-2 rule:** use only completely free, open-source libraries from the Vercel ecosystem. Do not use metered or platform-bound Vercel services.

### 7.1 Vercel ecosystem inventory
| Component | Status (Oct 2026) | Hobby / cost | Off-Vercel? | Verdict for us |
|---|---|---|---|---|
| **AI SDK** (v7, Apache-2.0) | GA | Free library | Yes | **Adopt.** `generateText` + `Output.object()` for NLU (`generateObject` deprecated), embeddings, `transcribe()`/`generateSpeech()` where official providers exist, middleware, provider registry, OpenTelemetry |
| AI SDK agents (`ToolLoopAgent`) | GA | — | Yes | **Not for the core pipeline**; later for conversation mode, constrained, calling our executors |
| AI SDK MCP client | GA | — | Yes | Later: expose executors as tools for conversation mode / Home Assistant |
| AI Elements | Early, shadcn-style copy-in | Free OSS/copy-in components | React-coupled | **Optional** UI scaffolding |
| **AI Gateway** | GA | Credit / usage based; BYOK; ZDR per request | Usable from anywhere | **Not used**: metered/credit-based hosted gateway |
| **Vercel Workflow** (Workflow DevKit) | Durable `'use workflow'`/`'use step'`, `sleep(date)`, hooks, cancellation. Reported GA in Apr 2026 by one source and SDK still `beta` by another | Metered platform service; Postgres World exists but README says not production-hardened | Code portable in part; runtime platform-bound | **Not used**: graphile-worker handles jobs on Railway |
| Vercel Queues | Beta | Metered platform service | No | **Not used** |
| **Vercel Cron** | GA | Metered/platform-bound schedule | No | **Not used**: graphile-worker crontab handles maintenance |
| Fluid compute / Vercel hosting | GA | Vercel platform compute | No | **Not used**: Railway hosts the app |
| Vercel Sandbox | GA | Metered CPU | No | **Not used** |
| Vercel Blob | GA | Metered storage | No | **Not used**: R2 stores backups and later Vault originals |
| Chat SDK | OSS | Free | Yes | Not relevant (Slack/Teams/WhatsApp bot adapters) |
| Vercel Agent | Beta, Pro/Enterprise | Platform-bound | — | **Not used** |
| v0 | GA | Metered | — | **Not used** |

### 7.2 Alternatives for durable jobs and agents
| Technology | License / cost | Postgres-native | Durable "sleep until" | Ops | Verdict |
|---|---|---|---|---|---|
| **graphile-worker** | MIT | Yes | `run_at` | Needs an always-on process | **Chosen** on Railway; aligns jobs, data, pub/sub and policy in Postgres |
| pg-boss | MIT | Yes | `startAfter` | Always-on process | Plausible but less already designed into the baseline |
| DBOS Transact (TS) | MIT | Yes (shares our DB) | Yes | Library, but its Vercel integration relied on polling constraints in rev 1 | Later alternative if graphile-worker becomes limiting |
| Upstash QStash | Free tier: 1,000 msgs/day, delay ≤ 7 days | n/a (HTTP) | Delayed messages | Another vendor | Not used; rejected with rev 1's serverless reminder design |
| Inngest / Trigger.dev cloud | Free tiers | No | Yes | Another vendor + dashboard | Not needed |
| Temporal, Hatchet, Restate | OSS | Varies | Yes | Several services | Overkill |
| Cloudflare Workflows / Durable Objects | Proprietary platform | No | Excellent | Platform lock-in | Rejected |
| Mastra | Apache-2.0 core | `@mastra/pg` | Partial | Library | Rejected for the core pipeline (adds an agent/graph runtime to a fixed sequence) |
| LangGraph.js, OpenAI Agents SDK | MIT | Checkpointers | No | Library | Rejected: built for open-ended agent graphs we deliberately avoid |
| n8n (visual workflow builder) | Sustainable Use licence | External Postgres | Wait node | A separate app with its own UI and auth | Not now. Household routines start as recurring tasks/reminders; revisit only if non-developer routine building is wanted and another service becomes acceptable |

### 7.3 Verdicts
1. **Turn pipeline:** plain AI SDK calls in our own fixed sequence with the Postgres turn ledger. No workflow engine per turn (it would add 5–8 events per turn for no benefit; turns finish in seconds).
2. **Reminders and jobs:** graphile-worker, because it is Postgres-native, transactional, and fits the Railway always-on topology. Use `add_job`, `run_at`, `job_key`, revision-stamped claims and crontab. S5 must prove ≥ 200 automated occurrences including worker restarts and a redeploy.
3. **Daily maintenance** (retention purge, forget audit, next-due computation, reminder reconciliation): graphile-worker crontab jobs calling narrow `SECURITY DEFINER` functions or worker-owned task handlers.
4. **Backups and restore tests:** worker cron (§13); migrations run as Railway pre-deploy commands.
5. **Agent frameworks:** keep the no-agent-framework verdict. Mastra, LangGraph and OpenAI Agents SDK remain rejected for the core pipeline because the MVP is a fixed sequence, not an open-ended agent graph.
6. **Visual workflow builders:** keep the no-n8n verdict. Household routines start as recurring tasks/reminders; revisit only if non-developer routine building becomes a product requirement and another service is acceptable.
7. **DBOS:** noted as a later alternative if we need durable TypeScript transactions beyond graphile-worker; not part of the MVP.

### 7.4 Reminder scheduling (graphile-worker)
- **States:** `scheduled → dispatching → sent | acknowledged | skipped | cancelled`.
- **Create:** the app calls a narrow `SECURITY DEFINER` wrapper (`schedule_occurrence`) that inserts the occurrence and its graphile-worker job **atomically** in the same transaction. The app role has no direct queue privileges.
- **Queue identity:** each occurrence gets a `run_at` and stable `job_key`; retries are at-least-once, with stable notification tags so duplicates collapse at the notification layer.
- **Wake/claim:** the worker performs a revision-stamped claim (`UPDATE … WHERE status='scheduled' AND schedule_revision = $rev`). Stale, duplicate or post-edit jobs no-op.
- **Edit/cancel:** bump the schedule revision in the database first. Jobs that wake after the edit see the stale revision and no-op; a notification already past the successful claim is a documented race.
- **Reconciliation:** crontab jobs repair overdue or inconsistent occurrences and recompute next-due rows.
- **S5 gate:** ≥ 200 automated occurrences including edits mid-flight, worker restarts and a redeploy → **100% dispatched within 60 s and no stale sends**.
- The Workflow state-machine design (`pending_start`, `workflow_run_id`, Workflow/Cron/QStash) was revision-1 only and is retained only as history in §6.2.

---

## 8. LLM routing layer

**Owner's requirement:** even with one provider at first, don't couple the architecture to a vendor. Keep the freedom to try models, switch providers, A/B test, optimize cost and add fallbacks.

### 8.1 Options
| Option | Cost at ~$1–5/month | Our own keys / data terms | Sarvam audio | Ops | Privacy / continuity | Verdict |
|---|---|---|---|---|---|---|
| **AI SDK registry + role aliases** (in-process) | $0 | Direct | Called directly | None | No new processor | **Chosen** |
| **Vercel AI Gateway** | Credit / usage based; BYOK | BYOK; per-request ZDR. Failed BYOK calls may be retried on Vercel's own provider credentials unless restricted | No | None | Adds a hosted gateway and metered Vercel dependency | **Not used** under the free-OSS-only rule |
| OpenRouter | 5.5–8% on credits; BYOK free up to a cap | Proxies through OpenRouter | Text only | None | Own retention not clearly documented; another processor | Rejected for family data (fine for offline experiments with synthetic data) |
| Cloudflare AI Gateway | No markup | BYOK | No | None | No ZDR toggle; another processor | Rejected |
| LiteLLM proxy | Free (MIT) | Direct | Chat only | Its own DB service | Self-controlled | Rejected: another service to run |
| Bifrost (OSS) | Free | Direct | **Chat + STT + TTS for Sarvam** | Single binary | Self-controlled | Later option if a self-hosted gateway becomes worth running on Railway |
| Portkey / Helicone / TensorZero | — | — | — | — | Reported acquired/pivoting (Portkey), maintenance mode (Helicone), archived (TensorZero) | Avoid |

### 8.2 Decision
1. **Code depends on roles, not vendors** (unchanged principle): `nlu`, `answer`, `embed` resolve through an AI SDK `customProvider`/`createProviderRegistry` in `packages/ai`, pinned to exact model IDs in config.
2. **Transport:** direct provider SDKs with our own keys (OpenAI default, Anthropic challenger) through the in-process registry. `wrapLanguageModel` middleware applies per-call defaults such as `store: false`.
3. **AI Gateway not used:** it is metered/credit-based and violates the owner's Vercel rule. OpenRouter is also rejected for family data because it adds a processor and fees. LiteLLM/Bifrost/self-hosted gateways can be revisited later only if routing complexity justifies another Railway service.
4. **Fallback:** `nlu` → the approved challenger after one retry on the primary; every challenger passes the provider gate before it's enabled. The AI SDK has no built-in cross-provider failover, so this is a small wrapper.
5. **STT/TTS** stay behind our `SttAdapter`/`TtsAdapter` and call providers directly.
6. **A/B testing without risking family traffic:** offline evals on the golden sets first; then **shadow mode** (serve the pinned model, call the challenger asynchronously on the same minimized input and log the comparison) for a few hundred turns; promote by config through the eval gate. **No live traffic split.**

---

## 9. Classifier models

**Question:** would a dedicated lightweight classifier (several were recently released by organizations founded by former OpenAI people) improve intent routing, workflow selection, cost, speed or accuracy?

### 9.1 What was actually released
| Organization | Model | Size / licence | Task | Fit |
|---|---|---|---|---|
| OpenAI | `gpt-oss-safeguard-20b` / `-120b` | 21B (3.6B active) / 117B MoE; Apache 2.0 | Policy-defined **safety** classification | GPU or hosted; no Tamil claim |
| Perplexity (co-founder ex-OpenAI) | `PII-Tracer` | 0.6B; MIT | Token-level **PII** detection + sensitivity score | Self-hostable; 13 languages; most relevant to our secret boundary |
| Anthropic | Constitutional Classifiers | Not released | Jailbreak defence | Not available |
| Thinking Machines, SSI, Periodic Labs, Applied Compute, Eureka Labs | — | — | No lightweight classifier released (Tinker is fine-tuning infrastructure) | — |

So the recent releases are **safety/PII classifiers, not intent routers.** Wider toolbox: fine-tuned encoders (ModernBERT, mmBERT with Tamil in pretraining), SetFit, GLiNER2, embedding-kNN routers, Qwen3Guard-0.6B (explicit PII category, broad language claims). **None has evidence for Tanglish.**

### 9.2 Verdict by insertion point
| Where | Verdict | Why |
|---|---|---|
| Pre-NLU intent routing (skip the LLM for simple commands) | **Reject** | Saves ~$0.0004/turn; duplicates NLU; a misroute corrupts the one call we trust; the fallback grammar already covers LLM outages |
| Smaller per-intent prompt | **Reject / instrument** | Trim the static prompt first; no classifier needed |
| Sensitive-input detection on top of regex/checksums | **Instrument and revisit** | Highest value (privacy is a 100% gate), but must run locally because possible secrets can't go to a third party, and a local model is another runtime to host |
| Health/allergy detection, visibility suggestion, answerability | **Reject** | Already deterministic or inside the NLU schema; no training data at household scale |
| Document-type classification | **Adopt with the Vault (H1)** | Async, bounded taxonomy, no latency budget |
| Child-safety moderation | **Adopt with kid mode (H5)** | Defence in depth once kids are users |

### 9.3 Experiments (offline, no production dependency) and triggers
1. **Embedding-kNN intent router vs the LLM's intent** on the NLU golden set (OpenAI embeddings + a free local encoder). Pursue only if agreement ≥ 95% on simple intents with near-zero false routing on multi-command utterances.
2. **PII recall:** 20–30 red-team utterances that dodge the regex boundary ("the wifi password is bluebird2024", spelled-out OTPs) through PII-Tracer / Qwen3Guard-0.6B. Adopt only if recall is clearly higher.

**Revisit triggers:** NLU p95 > 2 s caused by prompt size · LLM spend > $5/month · intent accuracy < 90% concentrated in simple commands · secret-detector recall < 100% on the red-team set.

---

## 10. Authentication

**Owner's challenge:** are passkeys necessary, do they help a household app, and is there something simpler with the same goals?

### 10.1 Options
| Option | First sign-in on the iPhone home-screen app | New device / lost phone | Recovery without the other adult | Verdict |
|---|---|---|---|---|
| Passkeys + recovery codes (baseline) | Needs the custom domain first; standalone Face ID reports are mixed | Re-enrol via token or printed code | Printed codes in a shared home | Overkill |
| **Email code typed in the app** | Never leaves the app, so iOS link problems don't apply | Same flow | **Yes, self-service** | **Chosen** |
| Google sign-in | Redirect works; **popup flows (One Tap) fail** in iOS standalone | Works | Google's process | More moving parts than email codes |
| Magic links | **Broken on iPhone:** the link opens Safari, not the installed app | — | — | Rejected (also recent critical advisories in that plugin) |
| Invite link / QR | **On iPhone, scanning opens Safari**, so the session lands outside the installed app | — | — | Rejected as the sign-in path |
| Password | Works | Needs reset by email anyway | Via reset | No benefit over email codes |
| SMS / WhatsApp OTP | Works | Same | Yes | SMS needs TRAI DLT registration; WhatsApp needs Meta business verification |

### 10.2 Design
1. **Profiles are invite-only:** the admin creates a member profile and allowlists that member's email; open sign-up is disabled.
2. **First sign-in, new device and recovery:** enter the email inside the installed app → 6-digit code (10-minute expiry, rate-limited, generic responses so nobody can probe which emails exist) → typed in the app.
3. **Session:** server-set Secure, HttpOnly cookie, 90-day sliding expiry. WebKit exempts server-set cookies in Home Screen apps from the 7-day script-storage cap, but an open WebKit bug can still reset sessions, so a lost cookie leads to a gentle re-sign-in by email code with queued offline changes preserved.
4. **Devices:** each member sees their sessions with device names and can revoke them; email changes need codes to the old and new address and notify both.
5. **Optional step-up:** Face ID / fingerprint (WebAuthn platform authenticator) before export, viewing private items after inactivity and forget-all, enabled once the domain is stable (it binds to the domain); fallback is a fresh email code.
6. **No admin takeover:** the admin can create profiles but can't change another adult's email after their first sign-in or add credentials to their account; Better Auth's `admin` **impersonation is disabled**; RLS stays the privacy boundary.
7. **Library:** Better Auth **≥ 1.7.7** (several 2026 security advisories fixed in recent releases: magic link, passkey, device authorization, Drizzle rate limit), `emailOTP` + `multiSession`; magic link and device authorization not enabled.
8. **Email sender:** Resend free tier (3,000 emails/month) on `nilumi.in`; it receives only the address and the code. This is acceptable because the owner's "fully free" rule applies to Vercel services. If the owner wants zero metered dependencies here too, the fallback is SMTP through an existing mailbox (Nodemailer).
9. **Honest limits:** whoever controls a member's mailbox can sign in as that member, so protect both email accounts with two-factor sign-in. The Vault (H1) re-decides whether viewing unmasked originals needs a mandatory biometric step-up.

**Removed:** passkey as the primary login, printed recovery codes, the second-authenticator requirement, the break-glass procedure, single-use enrolment tokens and "buy the domain before enrolment".

---

## 11. Speech-to-text

The baseline choice was confirmed against cost, accuracy, latency, availability, **browser compatibility** and terms. Clips are 3–8 s push-to-talk recordings (≤ 30 s), Indian-accented English full of local names and brands, with Tamil/Tanglish later. About 1.4 audio-hours a month. Monthly cost below uses ₹87 ≈ $1.

### 11.1 Comparison
| Provider | $/hour (batch) | ≈ ₹/month | Name biasing | Tamil / Tanglish | webm/opus + mp4/aac accepted directly | India / Singapore region | Terms note | AI SDK |
|---|---|---|---|---|---|---|---|---|
| **Sarvam Saaras v4** | ₹30/h | **₹42** | **50 keyterms** (≤ 64 chars) | Tamil; **`codemix` mode** | **Yes (REST/Batch)**; WebSocket needs PCM | India | No minors clause found → confirm in writing (S0) | Community provider |
| **Deepgram Nova-3** | $0.26 | ₹31 | ~500 tokens of keyterms | Tamil monolingual; no Tanglish | Yes | **India endpoint** | 18+ account holder | **Official** |
| **ElevenLabs Scribe v2** | $0.22 | ₹27 | Up to 1,000 (batch) | Tamil "high accuracy" tier | Yes | **India + Singapore** | Age terms to confirm | Official |
| **Azure Fast Transcription / MAI-Transcribe-2** | ~$0.36 (unverified) | ₹44 | Phrase lists ≤ 2,000; Custom Speech for en-IN | Tamil GA; **explicit code-switching** | Yes | **Central India + SE Asia** | MAI-Transcribe-2 in preview | Official |
| AssemblyAI | $0.15–0.21 | ₹18–26 | 200–1,000 terms | Weak Tamil tier | Yes | US/EU only | — | Official |
| OpenAI `gpt-transcribe` | $0.27 | ₹33 | Keywords + prompt | No claim | iOS fragmented-MP4 parsing reports | US default | Under-18 guidance | Official |
| Google Chirp 3 | $0.96 | ₹117 | Phrase sets | Tamil in preview | Partly | Unclear | Cloud terms differ from Gemini API terms | No |
| Soniox | $0.10 | ₹12 | — | Tamil | Yes | India (unverified) | 18+ | Vendor provider |
| Gladia | $0.61 | ₹74 | — | Tamil + code-switch | webm not listed | — | 18+ | Official |
| Groq (Whisper v3 turbo) | $0.04 | ₹5 | 224-token prompt | Whisper-level | Yes | None | **"Not for consumer use"** | Via OpenAI-compatible |
| Mistral Voxtral | $0.18 | ₹22 | 100 terms | **No Tamil** | — | EU | — | No |
| Speechmatics | $0.12–0.38 | ₹15–46 | 20,000-word dictionary | **Dedicated `en_ta` Tanglish pack** | **No webm/opus** | EU/US/AU | B2B | None |
| AWS Transcribe | ~$1.44 | ≈ ₹0 (12-month free tier) | Custom vocabulary | Tamil GA | Batch only | Mumbai batch | **Trains on data by default** (opt-out needed) | No |
| AI4Bharat models (self-host) | ≈ ₹0 + engineering | — | Manual boosting | Best open Tamil WER | Self-managed | Self | MIT | — |
| Web Speech API | Free | ₹0 | **None on mobile** | No | n/a | Google servers | No SLA; **broken in iOS standalone** | — |
| On-device Whisper/Moonshine | Free | ₹0 | None | No | n/a | Device | — | — |

Accuracy evidence is thin: vendors publish their own benchmarks on datasets they chose, and an independent benchmark suggests Saaras v3 can beat v4 on fresh audio. **Our own clips decide** (S2).

### 11.2 Decisions
1. **Default: Sarvam Saaras v4 (confirmed).** Cheapest, exactly fits our 50-keyterm design, accepts both browser formats on REST, India-hosted, and the only option with a Tanglish (`codemix`) mode. Actions: written confirmation that a household account in a home with minors is permitted, plus our own p50/p95 measurement (none published).
2. **Fallback / circuit-breaker target: Deepgram Nova-3** (India endpoint, documented keyterms, official AI SDK provider, free credit for the bake-off).
3. **S2 bake-off (max 4):** Sarvam Saaras v4 · Deepgram Nova-3 · ElevenLabs Scribe v2 · Azure Fast Transcription / MAI-Transcribe-2 (the clearest Tanglish path). OpenAI `gpt-transcribe` drops out of the shortlist.
4. **Excluded:** Groq (terms forbid consumer use), Voxtral (no Tamil), Speechmatics (no webm/opus; watch its Tanglish pack), AWS (trains by default), Web Speech API (no name biasing, broken in iOS standalone), Google Chirp 3 (Tamil preview, cost).
5. **Browser formats:** record natively, Android `audio/webm;codecs=opus` and iPhone `audio/mp4` (AAC); every shortlisted vendor accepts both, so **no server-side transcoding and no ffmpeg**. If a vendor rejects iOS's fragmented MP4, remux in JavaScript (e.g. `mp4box.js`) or drop that vendor.
6. **Streaming:** not for push-to-talk in the MVP (short clips; Sarvam's WebSocket needs PCM). Revisit if batch p95 breaks the budget or hands-free mode arrives.
7. **Cost** is ₹12–50/month for any viable option, so it isn't a deciding factor.

---

## 12. Family Records Vault (first post-MVP horizon, H1)

**Owner's goal:** the assistant becomes the family's knowledge repository: scan documents in the app, extract their content automatically, store content separately from metadata, index both, keep documents as historical records, and answer questions from them (medical, insurance, school, household and personal records).

### 12.1 Capture
- Use `<input type="file" accept="image/*" capture="environment">` (the native camera) rather than `getUserMedia`, which has recurring camera-freeze bugs in iOS Home Screen apps. Edge detection and perspective correction after capture with **Scanic** (Rust/WASM, < 100 KB) or jscanify (OpenCV.js, ~30 MB). Multi-page PDFs with `@cantoo/pdf-lib` (maintained fork).
- Import existing PDFs and photos from the file picker. **iOS has no Web Share Target**, so "share into the app" isn't available on the iPhone.
- **Upload directly to R2 with presigned URLs** so large originals bypass the app process and keep memory/request sizes small.

### 12.2 Extraction options
| Option | Price | Tamil / handwriting | Runs on our topology? |
|---|---|---|---|
| Vision LLM (OpenAI GPT-6 family, Claude) | Per-token, cents per document | Decent; no Indic benchmark | Yes (same providers as NLU) |
| **Mistral OCR 4** | $4 / 1,000 pages | 170 languages claimed (Tamil not named) | Yes (hosted) |
| Azure Document Intelligence | **Free F0: 500 pages/month (2 pages/doc)** | Tamil printed yes, handwriting no | Yes (hosted) |
| PaddleOCR / PaddleOCR-VL | Free | **Strongest verified Tamil** | Viable as an extra Railway service; adds RAM/ops cost |
| Docling, Marker, MinerU, Tesseract | Free | No Tamil benchmarks | Python/CPU service |
| olmOCR, DeepSeek-OCR, dots.ocr | Free | — | GPU; dots.ocr's licence restricts PII extraction |

**Decision:** pick the extractor in the Vault spike. Hosted options (vision LLM, Mistral OCR, Azure F0) stay viable, and **PaddleOCR is now viable as an extra Railway service** because the final topology can host it. Every extractor is a processor in the provider gate.

### 12.3 Storage and indexing (content separate from metadata)
| Table | Holds |
|---|---|
| `documents` | Metadata: type (`medical`, `insurance`, `school`, `identity`, `household`, `personal`, `other`), title, subject entity, dates, visibility, owner, status, R2 key, SHA-256, page count, `supersedes_document_id`, `retention_class`, `encryption_scheme`/`key_id` |
| `document_pages` | One row per page: R2 key, dimensions |
| `document_extractions` | **Append-only**, one row per extraction run (extractor, version, raw text/JSON, confidence, `is_current`), so changing OCR engines never destroys history |
| `document_chunks` | The retrieval unit: masked text, page number, bounding box, FTS vector, embedding |

- Originals are immutable in R2 under `households/{household_id}/documents/{document_id}/…`, with R2's default server-side encryption (app-level envelope encryption later; the columns are reserved now).
- Rescans create a new version (`supersedes_document_id`); old versions are archived, never overwritten, for historical medical/insurance trails.
- Facts extracted from a document become ordinary memories whose provenance points at the document, page and region.
- RLS: pages, extractions and chunks inherit from the parent `documents` row (like `list_items`).
- Forget: the index and embeddings are scrubbed immediately; R2 originals are purged after a short grace window and recorded in the forget journal.

### 12.4 Sensitive identifiers
- Documents are stored whole. The **shared sensitive-input module** (the same detectors as the voice boundary, in `mask` mode instead of `refuse`) masks Aadhaar, PAN, policy, account and card numbers (e.g. `XXXX-XXXX-1234`) **before indexing, embeddings, Q&A LLM calls and display**.
- **Honest limit:** the extractor itself must see the original page to read it, so the original goes to one approved extraction processor under verified retention terms. Local or on-device OCR is the alternative if no hosted extractor passes the gate.
- Unmasked values are shown only via "View original" with step-up authentication.
- **Law:** India's DPDP Act 2023 substantive provisions start on 13 May 2027, and §3(c)(i) exempts processing "for any personal or domestic purpose", which covers a single-household vault. DPDP has no separate health-data category.

### 12.5 Answering from documents
The same evidence pipeline: deterministic answers from facts extracted from documents (citation = document + page), otherwise sentence-gated synthesis over `document_chunks`, where every sentence must cite a chunk. Tapping a citation opens the scan at the bounding box.

### 12.6 Hooks reserved in Phase 1
1. Source-agnostic provenance: `source_events.modality` includes `document`, and evidence references carry `source_type` plus nullable `document_id` / `chunk_id` / `page`.
2. A `Provenance` TypeScript type used by every citation and evidence chip.
3. The sensitive-input detectors live in one shared module with `refuse` and `mask` modes.
4. The R2 key convention `households/{household_id}/…` for all blobs.
5. Enum names (`document_type`, `retention_class`) and the visibility values reused.

---

## 13. Backups, master key and runbook

**Owner's direction:** keep it simple; the master recovery key and runbook can live in a dedicated OneDrive document.

| Item | Decision |
|---|---|
| Nightly worker cron | Runs at 02:30 IST in the Railway `worker` as `fa_maint`: (1) drain unjournaled forget tombstones; (2) `pg_dump -Fc`; (3) **restore-test the plaintext dump into a scratch database on the same Postgres server**: migration version, roles, RLS policies, row counts vs manifest, canary rows in every visibility class, forget-journal replay and forgotten canary absent; (4) drop scratch; (5) `age`-encrypt to the public recipient; (6) upload to R2, verify hash, record result and alert on failure |
| Keys | **One age key pair.** The worker holds **only the public key**. The master private key lives only in the OneDrive recovery document, in a folder shared with your wife. Both Microsoft accounts use two-factor sign-in |
| Quarterly rehearsal | A manual restore from R2 with the master key, following the runbook, rehearses the human recovery path and proves the private key is usable |
| Maintenance role | `fa_maint` has `BYPASSRLS` and is loaded only by maintenance tasks in the worker: backups, restore test, retention, forget audit and restore-time tombstone replay. The app role never has `BYPASSRLS` |
| Forget journal | Forget commits DB redaction, tombstone insert and a `journal_tombstone` job in the same transaction (transactional outbox). The worker appends the content-free tombstone to R2 and sets the `forget_tombstones.journaled_at` watermark. The card can say "Forgotten" when DB redaction commits; the backup job refuses to upload a dump unless every tombstone up to the dump snapshot is journaled |
| Restore invariant | Every restore replays the forget journal before accepting traffic; old backups keep content forgotten later until they expire (30 daily / 6 monthly), as before |
| Second layer | Railway volume backups on the Postgres volume are configured as a second layer; PITR is verified in S5 if the template supports it |
| The OneDrive document | Contents: age private key; what each service is (Railway, R2, GitHub, Resend, domain registrar) and how to sign in; where secrets live (Railway variables, GitHub secrets for CI only); step-by-step restore to Railway or another Postgres; how to revoke a lost phone's session; who to call |
| Threat note | Decrypting backups needs both the OneDrive document and the R2 bucket, so a single compromise isn't enough |
| RPO / RTO | RPO ≤ 24 h; RTO ≤ 2 h via the runbook |

---

## 14. Cost after the review (monthly)

| Item | Estimate |
|---|---|
| Railway (app + worker + Postgres, Singapore) | ₹850–1,700 (measured in S5; part of the owner's existing account) |
| Domain `nilumi.in` | ≈ ₹75 (≈ ₹600–900/year) |
| AI: LLM ≈ ₹45, STT ≈ ₹42, TTS ≤ ₹180, embeddings < ₹10 | ≈ ₹280 (≤ ₹600 with headroom) |
| Cloudflare R2 (backups; later Vault originals) | ₹0 within the free tier |
| Resend (sign-in codes) | ₹0 (free tier) |
| Taxes / FX contingency (~15%) | ≈ ₹180–350 |
| **Total** | **≈ ₹1,400–2,700/month** (target ≤ ₹3,000) |

The AI budget guardrails (₹800/month with soft and hard caps) stay. Capacitor contingency (Apple Developer ≈ ₹8,700/year) is unchanged. **Upgrade triggers:** Railway memory/CPU/volume cost exceeds the target, Postgres operations become too much for the owner, Vault OCR needs a heavier service, or AI usage approaches the cap.

---

## 15. New Phase 0 verifications

| Spike | Added checks |
|---|---|
| S0 Provider gate | OpenAI, Anthropic, Sarvam (**written confirmation** for a household account in a home with minors), Deepgram fallback, ElevenLabs/Azure if shortlisted, Railway (hosting and data at rest in Singapore), Cloudflare R2, Resend and GitHub; Google Gemini excluded |
| S1 PWA on both phones | Next.js 16 + Turbopack + Serwist install flow; **email-code sign-in inside the installed iPhone app**; cookie persistence and the re-sign-in fallback; optional Face ID step-up in standalone mode; mic native formats; recorder interruptions; web push with the app closed; reply playback after resume; **SSE in the installed app across background/resume**; Next.js issue #95588 |
| S2 STT bake-off | Sarvam · Deepgram · ElevenLabs · Azure on our clips; Sarvam p50/p95 |
| S3 NLU bake-off | Shadow-mode logging path; the two classifier experiments (§9.3) |
| S4 Voice pick | Your wife chooses the TTS voice |
| **S5 Platform smoke (Railway Singapore)** | Postgres 18 + pgvector + pg_trgm/FTS on Tamil strings (`show_trgm`, `ts_debug`); RLS with pooled `withMemberTx` (pool reuse, missing context, rollback); graphile-worker wrapper timing; **reminder gate: ≥ 200 automated occurrences incl. edits mid-flight, worker restarts and a redeploy → 100% dispatched within 60 s, no stale sends**; streamed POST and SSE through the Railway proxy (heartbeat, 15-min cap, reconnect); RTT from home; backup to R2 with in-job restore test, forget-journal replay and one manual restore with the master key; Railway volume backups configured; App Sleeping off; measured monthly cost |
| S6 Domain | Buy `nilumi.in`, attach to Railway with TLS and verify the Resend sender **before installing the app on the phones** |

---

## 16. Sources (checked October 2026)

**Railway:** railway.com/pricing · docs.railway.com/pricing · docs.railway.com/networking/public-networking/specs-and-limits · docs.railway.com/guides/postgres-backups-restores · railway.com/deploy/pgvector--pgvector-railway

**Hosting and Next.js:** nextjs.org/docs/app/guides/progressive-web-apps · serwist.pages.dev/docs/next/turbo · github.com/shadowwalker/next-pwa/issues/508 · nextjs.org/docs/app/guides/static-exports · github.com/vercel/next.js/issues/95588 · webkit.org/blog/17333/webkit-features-in-safari-26-0 · webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados · github.com/vercel/hono-nextjs · hono.dev/docs/guides/rpc · vercel.com/docs/frameworks/backend/hono · vercel.com/docs/fluid-compute · vercel.com/docs/functions/limitations · vercel.com/docs/functions/usage-and-pricing · vercel.com/docs/regions · vercel.com/docs/limits/fair-use-guidelines · vercel.com/kb/guide/publish-and-subscribe-to-realtime-data-on-vercel · neon.com/pricing · neon.com/docs/introduction/regions · neon.com/docs/serverless/serverless-driver · neon.com/docs/connect/connection-pooling · neon.com/docs/extensions/pg-extensions · neon.com/docs/extensions/pg_cron · neon.com/docs/postgres/backup-restore/backups · supabase.com/pricing · railway.com/pricing · docs.dokploy.com · opennext.js.org/cloudflare · render.com/docs/free · docs.fly.io/about/pricing · tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient · tanstack.com/query/latest/docs/framework/react/guides/network-mode · tanstack.com/query/latest/docs/framework/react/guides/polling · developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers · webkit.org/blog/12945/meet-web-push · ably.com/docs/platform/pricing/free · upstash.com/docs/redis/commands/pub-sub/subscribe

**Vercel ecosystem and orchestration:** ai-sdk.dev/docs (structured data, tools, embeddings, transcription, speech, middleware, provider management, telemetry, MCP, agents) · github.com/vercel/ai · vercel.com/docs/workflows · vercel.com/docs/workflows/pricing · workflow-sdk.dev/docs/api-reference/workflow/sleep · workflow-sdk.dev/docs/configuration/worlds · vercel.com/changelog/workflow-sdk-now-supports-inflight-cancellation · vercel.com/blog/a-new-programming-model-for-durable-execution · vercel.com/docs/queues/pricing · vercel.com/docs/cron-jobs/usage-and-pricing · vercel.com/docs/sandbox/pricing · chat-sdk.dev · upstash.com/pricing/qstash · docs.dbos.dev/integrations/vercel · github.com/dbos-inc/dbos-vercel-integration · mastra.ai/docs · docs.langchain.com/oss/javascript/langgraph · github.com/openai/openai-agents-js · developers.cloudflare.com/workflows · inngest.com/docs · trigger.dev/docs · worker.graphile.org

**LLM routing:** vercel.com/docs/ai-gateway (pricing, BYOK, ZDR) · openrouter.ai/pricing · openrouter.ai/docs/guides/privacy/provider-logging · developers.cloudflare.com/ai-gateway/reference/pricing · docs.litellm.ai/docs/providers/sarvam · docs.getbifrost.ai/providers/supported-providers/overview · portkey.ai/pricing · helicone.ai/blog/joining-mintlify · github.com/tensorzero/tensorzero · ai-sdk.dev/docs/ai-sdk-core/provider-management · ai-sdk.dev/docs/ai-sdk-core/middleware

**Classifiers:** openai.com/index/introducing-gpt-oss-safeguard · huggingface.co/openai/gpt-oss-safeguard-20b · huggingface.co/perplexity-ai/PII-Tracer · anthropic.com/research/next-generation-constitutional-classifiers · thinkingmachines.ai/news/announcing-tinker · huggingface.co/blog/modernbert · huggingface.co/blog/mmbert · github.com/huggingface/setfit · github.com/fastino-ai/GLiNER2 · github.com/aurelio-labs/semantic-router · github.com/QwenLM/Qwen3Guard · huggingface.co/meta-llama/Llama-Guard-4-12B · ai.google.dev/gemma/docs/shieldgemma

**Authentication:** better-auth.com/docs (plugins, 1.7 upgrade guide, Next.js integration, Drizzle adapter, cookies) · github.com/better-auth/better-auth/security/advisories (GHSA-965c-763c-88jm, GHSA-44jh-23m7-hpcf) · github.com/advisories (GHSA-qq9h-g4jm-xgf3, GHSA-4vcf-q4xf-f48m, GHSA-cq3f-vc6p-68fh) · webkit.org/blog/8613 · webkit.org/blog/11338 · bugs.webkit.org/show_bug.cgi?id=272325 · passkeys.dev/docs/reference/ios · web.dev/learn/pwa/windows · resend.com/pricing · trai.gov.in (TCCCPR) · developers.facebook.com (WhatsApp pricing)

**Speech-to-text:** docs.sarvam.ai (pricing, models, keyterms, retention) · sarvam.ai/terms-of-service · github.com/Nemukai/koe-benchmark · developers.deepgram.com/docs (models, keyterm, audio formats, regional endpoints, data) · elevenlabs.io/docs/overview/capabilities/speech-to-text · learn.microsoft.com/azure/ai-services/speech-service (fast transcription, MAI-Transcribe, regions, language support) · assemblyai.com/docs · developers.openai.com/api/docs/guides/speech-to-text · console.groq.com/docs/legal/services-agreement · docs.mistral.ai/studio/audio · docs.speechmatics.com · docs.gladia.io · soniox.com/docs · docs.cloud.google.com/speech-to-text/docs/models/chirp-3 · aws.amazon.com/service-terms · github.com/AI4Bharat/vistaar · bugs.webkit.org/show_bug.cgi?id=317741 · ai-sdk.dev/providers

**Vault:** bugs.webkit.org/show_bug.cgi?id=273046 · bugs.webkit.org/show_bug.cgi?id=275527 · developer.mozilla.org (HTML `capture`, `navigator.share`) · github.com/marquaye/scanic · github.com/puffinsoft/jscanify · github.com/Hopding/pdf-lib · github.com/WebKit/standards-positions/issues/11 · vercel.com/docs/errors/function_payload_too_large · developers.cloudflare.com/r2/platform/limits · mistral.ai/news/ocr-4 · learn.microsoft.com/azure/ai-services/document-intelligence · github.com/PaddlePaddle/PaddleOCR · github.com/docling-project/docling · dpdprules.org/act/3 · dpdpa.com/dpdpa2023/chapter-1/section3.html · uidai.gov.in (circulars)

**Name and domain:** rdap.verisign.com · pubapi.registry.google/rdap · data.iana.org/rdap/dns.json · cloudflare.com/products/registrar · github.com/dscripka/openWakeWord · esphome.io/components/micro_wake_word · home-assistant.io/voice-pe
