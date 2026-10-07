# 04 — Research (October 2026 review)

> **Status:** Research snapshot supporting the accepted revision-2 baseline (6 Oct 2026)
> **Related:** [ADR catalogue](adr/README.md) · [01 Product Plan](01-product-plan.md) · [02 Architecture](02-architecture.md) · [03 Tech Stack](03-tech-stack.md) · [05 Implementation Roadmap](05-implementation-roadmap.md)

This document owns dated findings, comparisons, sources and historical review context. Accepted decisions and their rationale live in the [ADR catalogue](adr/README.md). Product owns requirements; Architecture owns technical design; Tech Stack owns technology selections, dependency versions and provider status; the [Implementation Roadmap](05-implementation-roadmap.md) owns delivery sequence. Findings below describe the October 2026 research snapshot, not newly verified provider facts. Accepted choices are distinct from completed approval, benchmarking or implementation; see the [pending-validation register](05-implementation-roadmap.md#5-pending-validations-and-decisions).

**Revision history**

Revision-1 findings below are **superseded historical evidence**, not implementation instructions or passed gates.

| Revision | Date | Decision record |
|---|---|---|
| Rev 1 | 6 Oct 2026, morning | Review decisions including Vercel Hobby + Neon + Vercel Workflow + AI Gateway, all conditional on Phase 0 gates |
| Rev 2 | 6 Oct 2026 | Owner chose Railway Singapore using the existing paid Railway account, Vercel only for completely free OSS libraries, product name **Nilumi** and domain **`nilumi.in`**. Consequences: graphile-worker, LISTEN/NOTIFY SSE, worker-based backups and in-process LLM routing are restored/adopted |

**Guiding principle (owner):** simplicity, low operational overhead and minimal recurring cost, using free/OSS options unless there's no reasonable alternative, while keeping room to grow into a full household memory platform.

---

## 1. Decision history navigation

The review identifiers D1–D19 are preserved in the [D → ADR map](adr/README.md#d-decision-map). D1 remains the umbrella for the resolved-question map. Individual ADRs contain accepted choices, rejected alternatives, consequences and applied-document links; this evidence log does not repeat their resolutions.

## 2. Resolved-question navigation

Q1–Q12 are preserved in the [Q → ADR map](adr/README.md#resolved-question-map). The unnumbered additions for sharing and the Vault map to [ADR-024](adr/adr-024.md) and [ADR-026](adr/adr-026.md). Pending validation work remains in the roadmap.

---

## 3. Memory sharing

**Owner's requirement:** private memories stay private by default, but if a user explicitly says something should be shared, the other adult must be able to see it.

### 3.1 Model

**Finding:** flipping a private memory to household visibility would clear its owner under the existing model and lose owner-only un-share/forget rights. A separate shared value preserves ownership while granting adult read access; the accepted model and alternatives are in [ADR-024](adr/adr-024.md).

The visibility model is defined in [Product §10](01-product-plan.md#10-memory-categories-and-default-visibility) and [Architecture §8.2](02-architecture.md#82-who-its-about-who-said-it-who-can-see-it).

### 3.2 Rules

The review identified three important consequences: sharing must not silently replace a household cardinality-one value; sharing a private entity needs an explicit safe projection; and un-share must remove derived content as well as the memory's read grant. Those rules, visibility-aware history, owner authorization and privacy cases are defined in [Architecture §8.8](02-architecture.md#88-sharing-explicit-owner-only) and [§15.2](02-architecture.md#152-row-level-security).

The earlier polling-interval wording is superseded by the revision-2 sync choice in [ADR-033](adr/adr-033.md); [Architecture §13.1](02-architecture.md#131-client-sync-offline-data-and-lists) owns revocation behavior.

---

## 4. Response modality

The review found that matching reply modality preserves voice convenience while avoiding unexpected audio when typing in a meeting or at night. [ADR-027](adr/adr-027.md) records the accepted defaults and settings; [Product §7](01-product-plan.md#7-experience-overview-pwa) owns the experience and [Architecture §14.4](02-architecture.md#144-tts-and-speech-lifecycle) owns playback.

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

The shortlist favored Nilumi's clear `n-l-m` consonants and calm sound. Naming and future wake-engine considerations are recorded in [ADR-028](adr/adr-028.md); the domain/origin prerequisite is in [ADR-016](adr/adr-016.md).

**Dated findings (6 Oct 2026):** `.in` was indicatively ₹575–899/year at Indian registrars (+GST where not included). The `.app` analysis remains research evidence only. Porcupine's free tier reportedly ended in mid-2026, so it was treated as a licensed option. No domain or trademark was registered during research; availability/conflict screening is not a formal trademark clearance.

---

## 6. Hosting topology and frontend

**Finding:** the existing paid Railway account and resident Node processes fit the worker/SSE topology with fewer deployment boundaries. Unmanaged Postgres still requires owner operations. The accepted hosting choice and revision-1 history are in [ADR-012](adr/adr-012.md).

The deployable topology, private networking, stream limits and runtime contracts are defined in [Architecture §4](02-architecture.md#4-containers-and-deployment); technology/tooling choices are in [Tech §6](03-tech-stack.md#6-hosting-operations-and-tooling). Platform verification and measured cost are assigned to [roadmap S5](05-implementation-roadmap.md#phase-0--spikes-and-decisions).

**Pricing basis (Oct 2026):** Hobby $5/month including $5 usage; $10/GB-RAM-month; $20/vCPU-month; $0.15/GB-month volume; $0.05/GB egress, billed per second. Estimate for app + worker + Postgres (~0.8–1 GB RAM total, low CPU, ~2 GB volume) is **≈ ₹850–1,700/month**, pending measurement.

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

Revision 2 returned from the serverless assumptions above to resident worker jobs ([ADR-011](adr/adr-011.md)), LISTEN/NOTIFY invalidation ([ADR-033](adr/adr-033.md)), worker backups ([ADR-032](adr/adr-032.md)) and direct pooled database access ([ADR-004](adr/adr-004.md)). Native recorder formats removed the transcoding requirement ([ADR-009](adr/adr-009.md)). Runtime, connection and recovery contracts remain in Architecture/Tech Stack.

### 6.4 Next.js as the PWA framework

The framework review found that Next.js provides a typed manifest, documented Web Push example and one app/API deployment; static export drops route handlers, cookies and headers required by that shape. Serwist was the documented Turbopack PWA path, `next-pwa` was abandoned, and a hand-written service worker remained a low-dependency alternative. Connectivity-aware UI alone does not provide offline content.

**Platform evidence (October 2026):** WebKit determines Home Screen mic, push and storage capabilities for both Next.js and Vite. iOS 26 / Safari 26 allows any site to open as a Home Screen web app; push still requires installation. The reviewed Next.js issue #95588 concerns Suspense-streamed content in backgrounded iOS standalone launches and remains covered by S1.

[ADR-020](adr/adr-020.md) records the app/API framework choice; [ADR-015](adr/adr-015.md) records the Capacitor contingency. Dependency details remain in [Tech §2](03-tech-stack.md#2-client), and phone proof remains [roadmap S1](05-implementation-roadmap.md#phase-0--spikes-and-decisions).

### 6.5 TanStack Query patterns

TanStack Query's persistence, optimistic updates and paused-mutation resume fit shopping on poor connectivity without adding a local-first sync server. The library primitives remain in [Tech §2](03-tech-stack.md#2-client).

[ADR-020](adr/adr-020.md) records the client data-layer selection and [ADR-033](adr/adr-033.md) records sync/cache boundaries. Per-member cache hygiene, durable receipts and canonical-ID remapping are specified in [Architecture §13.1](02-architecture.md#131-client-sync-offline-data-and-lists). The Hono/TanStack client choice and common API boundary are specified in [Tech §2](03-tech-stack.md#2-client).

---

## 7. Workflows, jobs and agent frameworks (Vercel ecosystem vs alternatives)

The inventory distinguishes free libraries from metered/platform-bound services; [ADR-021](adr/adr-021.md) records the owner's revision-2 usage rule.

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

The comparison found no benefit in a workflow engine adding 5–8 events to turns that finish in seconds. A fixed call sequence and ledger are recorded in [ADR-003](adr/adr-003.md) and [ADR-018](adr/adr-018.md). Postgres-native scheduling fits resident Railway processes ([ADR-011](adr/adr-011.md)); worker recovery follows [ADR-032](adr/adr-032.md).

DBOS remains a possible later alternative if durable TypeScript transaction needs outgrow graphile-worker. Visual routine builders add a separate UI/auth/service and warrant reconsideration only if non-developer routine building becomes a requirement; see [ADR-003](adr/adr-003.md). Maintenance privileges and migrations remain technical design in Architecture.

### 7.4 Reminder scheduling (graphile-worker)

Transactional occurrence creation and enqueue prevent a reminder from being saved without a job. Revision-stamped claims prevent old jobs from sending after an edit; stable notification tags address at-least-once delivery. These properties explain the graphile-worker choice.

The occurrence states, privileged wrapper, scheduling/edit/cancel behavior and reconciliation are defined in [Architecture §13.2](02-architecture.md#132-tasks-and-reminders); reliability scenarios are defined in [§16.2](02-architecture.md#162-evaluation-harness-and-gates). The Workflow state-machine design (`pending_start`, `workflow_run_id`, Workflow/Cron/QStash) was revision-1 only and is retained as history in §6.2.

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

### 8.2 Findings

**Finding:** an in-process registry meets the config-driven switching/fallback goal without another processor, service or fee. The accepted choice and revision-1 history are in [ADR-022](adr/adr-022.md). AI Gateway violates the free-OSS-only rule; OpenRouter adds a processor and fees; self-hosted gateways remain options only if routing complexity later warrants another service.

Role aliases, model pinning, middleware and fallback behavior are defined in [Tech §4.3](03-tech-stack.md#43-llm-routing-layer). STT/TTS remain separate direct adapters in [Architecture §14](02-architecture.md#14-voice-subsystem). Offline evaluation followed by shadow comparison protects family traffic; [Architecture §16.2](02-architecture.md#162-evaluation-harness-and-gates) owns promotion gates.

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

[ADR-025](adr/adr-025.md) records the production stance and revisit triggers. Two comparisons remain planned: embedding-kNN intent routing against NLU, and PII-Tracer / Qwen3Guard against deterministic secret detectors. No experimental results are claimed here. Their fixtures, success criteria and revisit thresholds are specified in [Architecture §16.2](02-architecture.md#162-evaluation-harness-and-gates); the technology stance is in [Tech §4.4](03-tech-stack.md#44-classifier-models) and initial execution is assigned to [roadmap S3](05-implementation-roadmap.md#phase-0--spikes-and-decisions).

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

### 10.2 Findings and limits

**Finding:** typed email codes can cover first sign-in, new-device sign-in and recovery without leaving the installed iPhone app. [ADR-023](adr/adr-023.md) records the accepted flow and rejected alternatives. The required account/session behavior is defined in [Architecture §15.5](02-architecture.md#155-authentication-sessions-and-recovery); Better Auth's version floor/plugins and Resend/SMTP choices are in [Tech §3](03-tech-stack.md#3-server-and-data).

**Evidence and limits:** WebKit exempts server-set cookies in Home Screen apps from the 7-day script-storage cap, but an open WebKit bug can still reset sessions. This is why the design includes email-code re-sign-in with queued offline changes preserved. The Better Auth version floor reflects the reviewed 2026 magic-link, passkey, device-authorization and Drizzle rate-limit advisories. Whoever controls a member's mailbox can sign in as that member; both email accounts need two-factor sign-in.

The review's removal of primary passkeys and additional recovery/enrolment mechanisms is recorded in [ADR-023](adr/adr-023.md). The domain prerequisite remains [ADR-016](adr/adr-016.md); mandatory biometric access to Vault originals remains an H1 decision.

---

## 11. Speech-to-text

The baseline was reviewed against cost, accuracy, latency, availability, **browser compatibility** and terms; this comparison is not a completed household bake-off. Clips are 3–8 s push-to-talk recordings (≤ 30 s), Indian-accented English full of local names and brands, with Tamil/Tanglish later. About 1.4 audio-hours a month. Monthly cost below uses ₹87 ≈ $1.

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

### 11.2 Findings and validation limits

The comparison supports Saaras as a baseline hypothesis through native format acceptance, India hosting, keyterms and codemix; Deepgram offers a documented fallback path. At roughly ₹12–50/month for viable options, cost is not decisive. Native recording avoids a transcoding binary, while short clips and Sarvam's PCM-only WebSocket path favor batch transport.

The accepted STT/default/fallback choice, exclusions and streaming caveat are in [ADR-009](adr/adr-009.md). Provider approval, effective retention/training settings and household-clip accuracy/latency are **pending**, not established here. [Tech §4.1](03-tech-stack.md#41-model-roles-and-bake-off-candidates) owns the shortlist and [roadmap S0/S2](05-implementation-roadmap.md#phase-0--spikes-and-decisions) owns approval and measurement. Library/adapter details remain in Tech Stack and Architecture.

---

## 12. Family Records Vault (first post-MVP horizon, H1)

**Owner's goal:** the assistant becomes the family's knowledge repository: scan documents in the app, extract their content automatically, store content separately from metadata, index both, keep documents as historical records, and answer questions from them (medical, insurance, school, household and personal records).

### 12.1 Capture

The iOS review found recurring Home Screen camera-freeze reports and no Web Share Target support. Native file/camera capture and file import therefore offer a practical path. Direct-to-R2 upload avoids large originals passing through the app process. Capture contracts remain in [Architecture §20.1](02-architecture.md#201-family-records-vault-horizon-h1); candidate edge-correction/PDF libraries and size tradeoffs are in [Tech §3](03-tech-stack.md#3-server-and-data).

### 12.2 Extraction options
| Option | Price | Tamil / handwriting | Runs on our topology? |
|---|---|---|---|
| Vision LLM (OpenAI GPT-6 family, Claude) | Per-token, cents per document | Decent; no Indic benchmark | Yes (same providers as NLU) |
| **Mistral OCR 4** | $4 / 1,000 pages | 170 languages claimed (Tamil not named) | Yes (hosted) |
| Azure Document Intelligence | **Free F0: 500 pages/month (2 pages/doc)** | Tamil printed yes, handwriting no | Yes (hosted) |
| PaddleOCR / PaddleOCR-VL | Free | **Strongest verified Tamil** | Viable as an extra Railway service; adds RAM/ops cost |
| Docling, Marker, MinerU, Tesseract | Free | No Tamil benchmarks | Python/CPU service |
| olmOCR, DeepSeek-OCR, dots.ocr | Free | — | GPU; dots.ocr's licence restricts PII extraction |

**Finding:** hosted vision/OCR and PaddleOCR as an extra Railway service remain viable under the topology, with differing Tamil evidence and operating costs. [ADR-026](adr/adr-026.md) keeps extractor selection pending the H1 spike; every hosted extractor must pass the provider gate.

### 12.3 Storage and indexing (content separate from metadata)

**Finding:** immutable originals and append-only extraction preserve historical medical/insurance trails across re-extraction. [ADR-026](adr/adr-026.md) records the accepted Vault boundaries. The proposed table fields, R2 keys, encryption hooks, inherited RLS and forget behavior are consolidated in [Architecture §20.1](02-architecture.md#201-family-records-vault-horizon-h1).

### 12.4 Sensitive identifiers

The review identified that an extractor must see the original page to read it, even if retrieval uses masked content. Local/on-device OCR remains an alternative if no hosted processor passes eligibility and retention checks. The masking decision is in [ADR-026](adr/adr-026.md), and implementation boundaries remain in [Architecture §20.1](02-architecture.md#201-family-records-vault-horizon-h1). The authentication policy for viewing unmasked originals remains an H1 spike decision.

**Legal research snapshot (October 2026):** India's DPDP Act 2023 substantive provisions start on 13 May 2027, and §3(c)(i) exempts processing “for any personal or domestic purpose”, which covers a single-household vault. DPDP has no separate health-data category. The reviewed source references are retained in §16.

### 12.5 Answering from documents

Document/page/region evidence extends the existing fact-first answer pipeline ([ADR-019](adr/adr-019.md), [ADR-026](adr/adr-026.md)) rather than introducing a separate document assistant. Citation and answer contracts are defined in [Architecture §20.1](02-architecture.md#201-family-records-vault-horizon-h1).

### 12.6 MVP extension hooks

Source-agnostic provenance and a shared sensitive-input module allow the Vault to reuse memory, visibility and citations. The reserved interfaces and enum names are consolidated in [Architecture §20.1](02-architecture.md#201-family-records-vault-horizon-h1); foundation delivery belongs to [roadmap Phase 1](05-implementation-roadmap.md#phase-1--walking-skeleton-with-safety-rails). Reserving hooks does not implement document tables or extraction in the MVP.

---

## 13. Backups, master key and runbook

The review found that a plaintext scratch restore can test a dump without putting the private decrypt key on Railway; a manual master-key restore separately tests the human recovery path. Railway volume backups add an operational layer, with optional PITR dependent on template support.

It also identified a forget/backup race: a backup must not get ahead of durable forget-journal entries, and restoration must replay later tombstones. [ADR-032](adr/adr-032.md) records the accepted backup and shared recovery-material choices. Watermark ordering, retention, roles, runbook contents, RPO/RTO and rehearsals remain in [Architecture §17.2](02-architecture.md#172-backups-and-restore-drill); tools remain in [Tech §6](03-tech-stack.md#6-hosting-operations-and-tooling), and recovery proofs remain in the [roadmap](05-implementation-roadmap.md#2-mvp-phases).

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

These are dated estimates, pending measured Railway usage in S5. [ADR-036](adr/adr-036.md) records the operating target and AI caps; [Tech §5](03-tech-stack.md#5-cost-model-monthly) owns assumptions, token math, contingency and current cost model. Hosting dominates the estimate, while heavier Vault OCR or a Capacitor fallback can change it.

---

## 15. New Phase 0 verifications

The revision-2 additions are incorporated into the single [Roadmap Phase 0](05-implementation-roadmap.md#phase-0--spikes-and-decisions) definition of S0–S6. This evidence log does not maintain a second delivery checklist. Current provider status remains in [Tech §7](03-tech-stack.md#7-provider-eligibility-and-data-policies-release-gate).

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


## October 7 S3 Gateway update and subscription-free alternatives

The authenticated Hobby dashboard evidence supersedes earlier assumptions of
Gateway family-data ZDR readiness. The owner approved a fixture-only exception,
reviewed all 60 expected actions and confirmed Railway uses the inspected key.
[The S3 verification record](08-s3-gateway-verification.md) contains the dated
inspection, request-level controls and sourced comparison of OpenCode Zen,
OpenRouter Standard, Cloudflare Unified Billing and a self-hosted LiteLLM proxy.
OpenRouter is a research candidate for future ZDR without a monthly gateway
subscription. Current synthetic testing retains Vercel's existing free credit;
no production processor selection or accepted ZDR requirement has changed.
