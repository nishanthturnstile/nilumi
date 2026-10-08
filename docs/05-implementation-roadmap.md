# 05 — High-Level Implementation Roadmap: Nilumi

> **Status:** Planned sequence · Based on the accepted revision-2 baseline, revised for the October 8, 2026 review ([ADR-041](adr/adr-041.md)–[ADR-049](adr/adr-049.md)) · **Date:** October 2026
> **Related:** [ADR catalogue](adr/README.md) · [01 Product Plan](01-product-plan.md) · [02 Architecture](02-architecture.md) · [03 Tech Stack](03-tech-stack.md) · [04 Research](04-research.md)

## 1. How to use this roadmap

This document owns **what we build in what order**: Phase 0–8 for the MVP (including Phase 6A, the Today brief), followed by expansion horizons. Feature-level design and task breakdowns come later. No durations are assigned, and no phase is marked complete by this document.

[Product §9](01-product-plan.md#9-scope) owns Must/Should/Could priorities. Items marked **Should** below are intended opportunities within a phase, not new MVP requirements; deferrals are recorded before moving on. Could items remain optional backlog. Architecture owns technical contracts and validation mechanics; Tech Stack owns technology choices and provider status; the ADR catalogue owns accepted decisions and rationale; Research owns dated evidence and comparison history.

Each phase ends with a demo to your wife and a go/no-go against its completion outcome. Privacy and secret handling remain hard gates throughout. Model or prompt changes use the [evaluation promotion gate](02-architecture.md#162-evaluation-harness-and-gates).

### Prerequisites and dependencies

- Review the [accepted decisions and question resolutions](adr/README.md) together before Phase 1.
- **S0 precedes every upload of family voice or data**, including bake-off clips. Synthetic inputs can be used while approval is pending.
- **S-VGW and the household acknowledgement, recorded by the owner for both adults, precede the first family LLM or embedding call** ([ADR-046](adr/adr-046.md)). Until then, NLU and embeddings run on synthetic or seeded data only.
- **S-GCAL precedes any calendar link** on a family account ([ADR-045](adr/adr-045.md)).
- **The pilot stays inside the founding household.** Anyone outside it, helper access (H6), kid mode (H5), a second household or commercial use first needs the production privacy gate in §5.
- **S6 precedes S1 phone installation**: the installed origin, sign-in sender and push subscriptions must use the final domain. S0–S6 are stable identifiers, not the order in which spikes must run.
- Create the shared OneDrive recovery document before the S5 manual restore; its contents and key handling follow [Architecture §17.2](02-architecture.md#172-backups-and-restore-drill).
- Complete the Phase 0 platform gates before Phase 1. S5 is a feasibility proof; Phase 1 establishes production safety and recovery, and Phase 5 repeats reminder validation against the implemented feature.
- Follow Phase 1–8 in order, with Phase 6A between Phase 6 and the Phase 7 pilot. Foundation privacy, receipts and provenance precede real-memory writes; memory precedes retrieval; reliable scheduling precedes the brief; the brief precedes the pilot.

## 2. MVP phases

### Phase 0 — Spikes and decisions

**Purpose:** validate the highest-risk assumptions before committing to implementation.

| Spike | Capability to validate | Completion outcome / supporting reference |
|---|---|---|
| **S0 — Provider eligibility and data terms** | Household/minor-adjacent eligibility, training opt-outs, retention and deletion settings for every processor, including all bake-off candidates | Each provider receiving family data has a green, recorded status; Sarvam confirmation is obtained in writing. [Tech §7](03-tech-stack.md#7-provider-eligibility-and-data-policies-release-gate) — **Sarvam and infrastructure verified Oct 2026. Gateway re-verification failed Oct 7 (Hobby cannot enforce ZDR). Oct 8 ([ADR-046](adr/adr-046.md)): founding-household LLM/embedding data is allowed on Vercel AI Gateway with purchased credits after S-VGW and the household acknowledgement, with no-training and `only` routing; ZDR moves to the production privacy gate.** |
| **S1 — PWA on both phones** | Install/offline shell and updates; in-app email-code sign-in, session persistence and step-up; native recording, permissions and interruptions; closed-app push; SSE and reply playback across resume; accessibility and Next.js issue #95588 | **DONE Oct 2026 — accepted on both phones with wife-observable friction; Capacitor fallback not triggered ([ADR-039](adr/adr-039.md)). Spike code in `spikes/s1/`** [Tech §2](03-tech-stack.md#2-client), [Architecture §14.1](02-architecture.md#141-capture-pwa) and [§15.5](02-architecture.md#155-authentication-sessions-and-recovery) |
| **S2 — STT bake-off** | About 40 clips per adult with names, brands, dates/numbers and a few Tanglish cases in kitchen/fan/TV noise; native browser formats and measured p50/p95 | **APPROVED Oct 7, 2026 — owner reports successful manual validation and approves proceeding with Sarvam Saaras v4.** [S2 approval and evidence](../spikes/s1/README.md#s2-owner-approval-october-7-2026). Approval is based on owner review; a complete per-adult benchmark was not supplied to the repository. ElevenLabs remains gated by its S0 verification. Selection criteria remain entity-name accuracy, then WER, then p95 latency. |
| **S3 — NLU bake-off** | Initial 60-case golden set with the real schema; model-role routing/fallback and shadow-mode instrumentation; prompt size/cache behavior; two offline classifier experiments | **CORE SYNTHETIC INCREMENT COMPLETE Oct 8, 2026 — [live correctness acceptance](13-s3-live-acceptance.md) selects Luna low for the synthetic spike: 58/60, held-out 11/12, dates 12/12, privacy 8/8, schemas 58/58 and managed OpenAI routes verified.** The owner approved a 30-second deadline for this fixed synthetic correctness mode; the application deadline remains five seconds. Conservative cumulative charges are US$0.277306460: US$0.222693540 remains under the runner's effective US$0.50 hard cap, and US$1.722693540 remains under the owner-approved US$2.00 cumulative cap. The runner and ledger must be migrated before spending above US$0.50. The evaluator is disabled; two semantic errors remain. Earlier hosted failures are preserved ([10](10-s3-paid-vercel-validation.md), [11](11-s3-v11-validation.md), [12](12-s3-deadline-reliability.md)). Production deadline reliability, founding-household runtime validation, production ZDR, independent acceptance data, fallback/shadow validation and offline classifier experiments remain deferred; the entire roadmap S3 is not complete. [ADR-040](adr/adr-040.md), [ADR-046](adr/adr-046.md), [Tech §4](03-tech-stack.md#4-ai-and-voice), [Architecture §16.2](02-architecture.md#162-evaluation-harness-and-gates) |
| **S4 — Voice selection** | Three or four en-IN voices, sentence playback on the installed iPhone and first-audio latency | Your wife chooses the voice; first-audio p95 ≤ 700 ms. [Tech §4.1](03-tech-stack.md#41-model-roles-and-bake-off-candidates) |
| **S5 — Railway platform smoke** | Database/extensions and Tamil locale behavior; pooled RLS/role boundaries; worker scheduling; streamed POST/SSE and reconnect; home RTT; encrypted backup, restore test, forget replay and manual master-key restore; volume backups/PITR support; always-on settings and measured cost | All platform checks pass, including the [≥ 200-occurrence reminder gate](02-architecture.md#162-evaluation-harness-and-gates). [Tech §3](03-tech-stack.md#3-server-and-data), [§6](03-tech-stack.md#6-hosting-operations-and-tooling), [Architecture §17.2](02-architecture.md#172-backups-and-restore-drill) |
| **S6 — Final domain** | Purchase/attach `nilumi.in`, enable TLS and verify the Resend sender | Domain and sender work before either phone installs the app. [ADR-016](adr/adr-016.md) — **In progress Oct 2026: `nilumi.in` purchased; Cloudflare nameservers being added next; Resend sender verification and TLS still pending** |

**Spikes added October 8.** S-VGW and S-GCAL are pre-pilot. S-AGENT and S-DBOS belong to the agentic horizon (§3) and are not Phase 1 prerequisites.

| Spike | Capability to validate | Completion outcome / supporting reference |
|---|---|---|
| **S-VGW — Vercel AI Gateway credits and controls** | Synthetic canary prompts only, under their own small cap; not an S3 smoke. Credits purchased (US$20, owner-reported Oct 8) with auto top-up off and no BYOK credentials. Team budget US$10 monthly; runtime, S3 evaluation and canary API keys belong to the team, with the budgets in [ADR-046](adr/adr-046.md). `disallowPromptTraining` and `only` hold on chat, embedding and fallback paths. A request restricted to a non-compliant provider fails. `store: false` reaches the provider where supported. Budget exhaustion maps to degraded mode. Routing receipts are recorded | All checks pass with evidence in [doc 08](08-s3-gateway-verification.md). Together with the household acknowledgement, the gateway rows in [Tech §7](03-tech-stack.md#7-provider-eligibility-and-data-policies-release-gate) become green for the founding-household pilot only. Must pass before Phase 2's first family LLM call. [ADR-046](adr/adr-046.md) |
| **S-GCAL — Read-only Google Calendar** | Better Auth `linkSocial` from both installed PWAs, with no sign-up path; exact `calendar.events.readonly` scope check; published (unverified) OAuth app; encrypted tokens and serialized refresh; bounded today-and-tomorrow sync with recurring, all-day and time-zone events; stale and Reconnect states; disconnect revokes at Google, fences sync and scrubs | Linking, refresh, sync and disconnect work for both adults; Google row in Tech §7 green. Must pass before Phase 6A's calendar work. [ADR-045](adr/adr-045.md), [Architecture §13.5](02-architecture.md#135-read-only-google-calendar-connection) |
| **S-AGENT — First bounded run (post-pilot)** | One registered run type with an explicit step limit, an `activeTools` allow-list and one approval-gated tool; approval replay, stale-target and expiry cases; `outcome_unknown` handling; lease and fencing; prompt-injection and approval-bypass red-team cases | Trajectory and approval-bypass evals pass before any run type ships. [ADR-041](adr/adr-041.md)–[ADR-043](adr/adr-043.md), [Architecture §6.5–§6.7](02-architecture.md#65-execution-paths) |
| **S-DBOS — DBOS Transact comparison (optional)** | The S-AGENT run type on DBOS Transact against Nilumi's own run tables on graphile-worker | Keep graphile-worker unless DBOS is clearly simpler for the same guarantees. [ADR-043](adr/adr-043.md) |

**Output:** selected exact model IDs, measured prices and effective provider settings recorded in `config/models.ts`, `config/providers.md` and the ADR log when the project is initialized. Record spike results and any resulting baseline revisions; choosing a default alone does not pass a gate.

### Phase 1 — Walking skeleton with safety rails

**Purpose:** establish a thin, safe end-to-end system on both phones.

**Features:** pnpm monorepo, CI and Railway deployment/migrations; invite-only adult sign-in, household/member relations, session revoke and optional step-up; PWA Talk shell with recording and text input; STT-to-transcript/echo cards; sensitive-input boundary on every available ingress; member-scoped transactions, sharing-ready RLS and privacy harness; resumable turn ledger; provenance, traces/admin viewer; worker backups, forget-journal support and recovery/rollback rehearsal. Reserve Vault provenance/masking interfaces without creating the document feature.

**October 8 additions:**
- `household_id not null` on every household-owned table, taken from the session or job, never the client, with composite household foreign keys, trigger checks for ID arrays and polymorphic references, and a CI schema test ([ADR-048](adr/adr-048.md), [Architecture §9](02-architecture.md#9-data-model)).
- Admin as a capability (`members.is_admin`) on adult members, granted only by an existing admin and re-checked inside each admin action.
- The single AI Gateway wrapper with its CI guard and routing-receipt checks ([ADR-046](adr/adr-046.md)).
- The household acknowledgement: the owner records it for both adults before the first real turn or calendar link; the wrapper fails closed without it; withdrawal by either adult is a veto ([Architecture §15.4](02-architecture.md#154-data-minimization-and-provider-retention)).
- Stored-content injection fixtures and the rule that every write cites the member's own words in the current turn ([Architecture §7.2](02-architecture.md#72-validation-after-the-llm-deterministic), [§16.2](02-architecture.md#162-evaluation-harness-and-gates)).
- Run, artifact, delegation and consent contracts reserved as schemas in `packages/contracts` and in Architecture only; their tables are created later ([ADR-041](adr/adr-041.md)–[ADR-044](adr/adr-044.md)).

**Complete when:** both adults can sign in and submit voice/text turns after the owner records the household acknowledgement; withdrawing it stops every AI call; crash/retry resumes correctly; secret, privacy and second-household isolation tests pass; stage timings are visible; restore and compatible deployment rollback are rehearsed. [Architecture §5–§6](02-architecture.md#5-code-structure), [§15](02-architecture.md#15-privacy-and-security), [§17](02-architecture.md#17-reliability-and-operations)

### Phase 2 — First real-memory release and shopping list

**Purpose:** begin a useful daily habit with trustworthy capture and correction.

**Features:** predicate registry, entities/aliases and speaker-relative references; remember, correct, supersede, safe Undo/Edit, confirmed forget/redaction, owner-only share/un-share and clarifications; health/allergy confirmation; provenance cards; shopping-list add/read/tick/remove with dedupe, offline receipts, realtime sync and visible conflicts; cold-start seeding form. **Should:** per-member STT keyterm loop.

**Complete when:** the NLU and privacy/secret gates pass; remember → correct → undo → forget leaves no forgotten residue; sharing permissions and revocation pass; shopping works offline on both phones and your wife uses the list unprompted. Retrieval-based journey checks finish in Phase 3. The first family NLU or embedding call waits for S-VGW. [Product §12](01-product-plan.md#12-evaluation-product-view), [Architecture §8](02-architecture.md#8-memory-model) and [§13.1](02-architecture.md#131-client-sync-offline-data-and-lists)

### Phase 3 — Retrieval and grounded answers

**Purpose:** complete the remember → retrieve loop with evidence and honest unknowns.

**Features:** ask/inspect, entity lookup including semantic resolution, structured/hybrid retrieval, deterministic single-fact answers, answerability gate, sentence-validated synthesis/citations, Memory entity pages/search, and per-sentence spoken replies.

**Complete when:** the initial 60-question set meets top-5 retrieval ≥ 90%, answer correctness ≥ 85%, abstention ≥ 95% and privacy 100%; capture/correct/forget journeys also pass their answer-side checks. [Product §12](01-product-plan.md#12-evaluation-product-view), [Architecture §10](02-architecture.md#10-retrieval-and-grounded-answers) and [§14.4](02-architecture.md#144-tts-and-speech-lifecycle)

### Phase 4 — History and memory management

**Purpose:** make accumulated memory understandable and maintainable.

**Features:** valid-time historical answers, history views, entity merge tooling and concurrent-edit conflict UX. **Should:** duplicate detection prompts and versioned JSON export/import with step-up authentication.

**Complete when:** historical questions and concurrent-edit scenarios pass; if export/import is delivered, its round trip preserves provenance and passes retrieval evaluation. Any Should deferral is recorded. [Architecture §8](02-architecture.md#8-memory-model), [§19](02-architecture.md#19-api-surface-v1)

### Phase 5 — Tasks, reminders and notifications

**Purpose:** add reliable household action and follow-through.

**Features:** tasks and mine/ours views; date resolution, reminder schedules/occurrences, targeting, done/snooze/reschedule and late handling; push, inbox, private previews, delivery telemetry and device notification health; combined list/reminder turns. **Should:** recurring schedules, maintenance “next due,” snooze-one/edit-series behavior and per-recipient quiet hours.

**Complete when:** rerun the ≥ 200-occurrence reliability gate with edits, restarts and redeploy; all dispatch within 60 s with no stale sends; real-device reminders arrive on both phones and failures surface in inbox/admin. Recurrence and quiet-hour cases remain part of the platform gate even if their product UI is deferred. [Architecture §12–§13](02-architecture.md#12-dates-times-and-recurrence), [§16.2](02-architecture.md#162-evaluation-harness-and-gates)

### Phase 6 — Voice polish, latency and degraded modes

**Purpose:** make everyday use fast and usable through provider failures and budget limits.

**Features:** voice-reply modes and playback queue tuning; measured latency/cache/speculative-retrieval tuning; REST-versus-streaming STT reassessment only if latency warrants it; deterministic outage grammar; AI budget reservations, soft/hard caps and alerts. **Should:** cost dashboard.

**Complete when:** [product latency targets](01-product-plan.md#53-success-metrics) hold over 100 real turns, bucketed by clip length and including the first request after deployment; simulated LLM outage and budget exhaustion keep list/reminder commands and non-AI surfaces usable. Gateway budget, credit-exhaustion and `no_providers_available` errors enter hard-cap degraded mode without retry or fallback. [Architecture §17.3–§17.5](02-architecture.md#173-degraded-modes), [§18](02-architecture.md#18-latency-budget-push-to-talk-india--railway-singapore)

### Phase 6A — Today brief and read-only calendar

**Purpose:** give each adult a daily reason to open Nilumi, built on memory, lists and reminders, with evidence on every item ([ADR-045](adr/adr-045.md), [Architecture §13.4–§13.5](02-architecture.md#134-today-brief)).

**Prerequisites:** Phases 2, 3, 5 and 6 (memory, retrieval, reminders, budget reservations and degraded modes). S-GCAL passes before any calendar link; the brief itself does not wait for S-GCAL or the S3 NLU gate.

**Features:**
- **Brief tables and job.** `daily_briefs` and `brief_items`; a per-member graphile-worker job in Asia/Kolkata, run under the member's own RLS context and idempotent per member and date.
- **Today screen.** Today becomes the landing screen with attention, today, tomorrow and ahead sections. Each item renders as a server-built `nilumi-ui/1` card with an evidence chip ([ADR-044](adr/adr-044.md)).
- **One push a day.** At most one brief push per member per day, through `notification_deliveries`, at the chosen time and outside quiet hours, with a generic lock-screen preview.
- **Optional summary.** At most one LLM call per brief, under a budget reservation. The brief is complete without it.
- **Approvals.** The `approvals` table and approval cards for internal actions only (J20), with an immutable, single-use approval and a recheck before execution. The approved effect, its `tool_invocations` row and `content_refs` commit in one transaction ([ADR-042](adr/adr-042.md), [Architecture §6.6](02-architecture.md#66-tool-broker-policy-and-approvals)).
- **Calendar (after S-GCAL).** `connections` and `calendar_events_cache`; Settings → Connections; connect and disconnect (J19); the Reconnect chip and stale marker.
- **Scrubbing.** Forget, un-share, visibility revocation and disconnect clear affected brief items and summaries through `content_refs`.

**Complete when:**
- The Today brief eval slice passes with **100%** privacy and exactly-once on seeded and form-entered households ([Product §12](01-product-plan.md#12-evaluation-product-view)).
- J18–J20 pass on both phones.
- Disconnect leaves no cached events or calendar-derived items.
- The brief builds with the calendar disconnected, expired or stale, and with zero LLM calls at the soft cap or during an outage.

### Phase 7 — Family pilot

**Purpose:** learn whether both adults naturally find the MVP useful.

**Work:** use the app without new feature work; **Should:** answer feedback buttons. Review failures weekly by STT, NLU, entity resolution, retrieval, hallucination, privacy/policy and UX friction. Collect patterns over several days before fixing; consented failures extend the eval sets. The pilot stays inside the founding household; widening it needs the production privacy gate (§5).

**Outcome:** a pilot report covering usage, memories/corrections, retrieval/abstention/hallucinations, latency, cost (including AI Gateway credit purchases and card/forex charges), delivery stages, Today brief opens, evidence taps and approval outcomes, the top three valued features/frustrations and your wife's unprompted weekly uses, assessed against [Product §5.3](01-product-plan.md#53-success-metrics).

### Phase 8 — Stabilize and freeze

**Purpose:** close the pilot's leading gaps and establish the MVP baseline.

**Work:** address the top five failures in each category through the eval gate, tune defaults, complete the recovery/troubleshooting runbook and freeze MVP scope. Record delivered/deferred Should items and use pilot evidence to confirm readiness for the first expansion.

**Complete when:** regression and hard privacy gates pass, operational guidance reflects the implemented system, and the MVP baseline and remaining backlog are recorded. [Architecture §16.2](02-architecture.md#162-evaluation-harness-and-gates), [§17](02-architecture.md#17-reliability-and-operations)

## 3. Post-MVP horizons and optional backlog

**H1 — Family Records Vault is the first expansion, ahead of the room speaker.** Capability areas: camera/file capture and PDF/photo import; approved extraction and document-type classification; historical originals/versions with metadata separate from extracted content; masked indexing and document-derived memories; document/page/region citations; owner-controlled visibility, original viewing and forget. The extractor, original-view step-up policy and added hosting cost are resolved in the H1 spike. Technical extension points remain in [Architecture §20.1](02-architecture.md#201-family-records-vault-horizon-h1); comparisons remain in [Research §12](04-research.md#12-family-records-vault-first-post-mvp-horizon-h1).

H2–H7 retain their identifiers as later horizons; feature planning and commitments depend on pilot evidence.

| Horizon | Capability area |
|---|---|
| H2 | Home Assistant room speaker, “Hey Nilumi” wake phrase and channel integration |
| H3 | Tamil/Tanglish speech, retrieval and UI localization |
| H4 | Opt-in proactive maintenance suggestions |
| H5 | Kid mode, audience restrictions and child-safety moderation; renewed provider eligibility checks and the production privacy gate |
| H6 | Shopping-list-only access for household help, after the production privacy gate |
| H7 | Conversation mode using the same deterministic executors and privacy controls |

**Agentic horizon (post-pilot).** Each item needs its own ADR or gate and reuses the broker, approvals, durable runs and UI catalog ([Architecture §20.9](02-architecture.md#209-agentic-horizon)):
- the first bounded run type after S-AGENT (optional S-DBOS), with the Activity view (pause and stop) and a separate Approvals view
- artifacts rendered through the `nilumi-ui/1` catalog
- an MCP client with every tool disabled until Nilumi assigns its effect class
- delegation with narrowed tools and depth caps
- calendar write with approval cards, under a new ADR
- a Telegram adapter; SMS only for critical items; no WhatsApp channel ([ADR-049](adr/adr-049.md))
- forwarded-text capture through `POST /v1/capture`: an Android Web Share Target, and on iPhone a paste box or an Apple Shortcut with a revocable write-only device token, under its own decision and injection fixtures ([Architecture §19](02-architecture.md#19-api-surface-v1))

**More households.** Contracts are ready ([Architecture §20.8](02-architecture.md#208-multi-household-readiness)). Onboarding anyone outside the founding household needs the legal gate ([ADR-048](adr/adr-048.md)) and the production privacy gate ([ADR-046](adr/adr-046.md)).

**Could backlog:** custom lists, notification Done/Snooze actions, weekly household digest and Tamil UI strings. These do not become phase completion requirements. Existing [non-goals](01-product-plan.md#52-non-goals-mvp) and [scope exclusions](01-product-plan.md#9-scope) continue to apply.

## 4. Journey coverage and project board

The acceptance criteria remain in [Product §8](01-product-plan.md#8-core-journeys-and-acceptance-criteria). This map identifies delivery ownership rather than duplicating those criteria.

| Journeys | Delivery phase / dependency |
|---|---|
| J1 Store, J3 Correct, J4 Forget | Phase 2 writes and lifecycle; Phase 3 retrieval checks; Phase 4 history browsing |
| J2 Retrieve, J5 Inspect, J6 Unknown | Phase 3 |
| J7 Shopping list | Phase 2 |
| J8 Reminder | Phase 5; S1/S5 prove phone and worker feasibility first |
| J9 Multi-command | Phase 1 ledger; Phase 2 memory/list commands; full list/reminder example in Phase 5 |
| J10 Secret refused | Phase 1 boundary; every later ingress inherits it |
| J11 Private memory | Phase 1 privacy foundation; Phase 2 capture; Phase 3 retrieval/existence checks |
| J12 Cold-start seeding | Phase 2 form; CSV remains an alternative capture path for later feature planning |
| J13 Speaker-relative references and health facts | Phase 2 resolution/confirmation; Phase 3 evidence-qualified answers |
| J14 Maintenance due (**Should**) | Phase 2 interval/event capture; Phase 3 retrieval foundation; Phase 5 next-due completion |
| J15 Lost phone | Phase 1 sign-in, session revoke and account recovery |
| J16 Export (**Should**) | Phase 4 |
| J17 Share/un-share | Phase 2 lifecycle and permissions; Phase 3 answer attribution |
| J18 Today brief | Phase 6A; calendar items only after S-GCAL. The brief eval slice can run before the S3 NLU gate |
| J19 Connect/disconnect calendar | Phase 6A, after S-GCAL |
| J20 Approve, edit or reject a suggestion | Phase 6A, internal actions only; external actions belong to the agentic horizon |

**Epics:** E0 Spikes & decisions · E1 Platform & delivery · E2 Identity & household · E3 Conversation & NLU · E4 Memory write · E5 Entity resolution · E6 Retrieval & answers · E7 Correct/forget/history · E8 Lists · E9 Tasks/reminders/notifications · E10 Voice · E11 Privacy & security · E12 Observability & evaluation · E13 Family pilot · E14 Family Records Vault (H1, later) · E15 Today brief · E16 Calendar connection · E17 Approvals (Activity later) · E18 Agent runtime (post-pilot) · E19 Multi-household readiness and production privacy gate (later).

**Board states:** Backlog → In progress → Family testing → Done. Epics can span phases; privacy, voice and evaluation evolve with each feature rather than waiting for their own late milestone.

## 5. Pending validations and decisions

The accepted Q1–Q12 resolutions are recorded in [ADR resolved-question map](adr/README.md#resolved-question-map). They are not reopened by this roadmap. Accepted baseline choices still require evidence before use:

| Pending item | Where it is resolved |
|---|---|
| Provider eligibility, effective retention/training settings and Sarvam written confirmation | **Gateway re-verification failed Oct 7, 2026** (Hobby cannot enforce provider ZDR). **Oct 8:** [ADR-046](adr/adr-046.md) allows founding-household LLM/embedding data after S-VGW and the household acknowledgement; ZDR moves to the production privacy gate. Other S0 approvals remain recorded in [Tech §7](03-tech-stack.md#7-provider-eligibility-and-data-policies-release-gate) |
| AI Gateway credits and controls | S-VGW, with evidence in [doc 08](08-s3-gateway-verification.md) |
| Household acknowledgement, recorded by the owner for both adults | Phase 1, before the first real turn or calendar link; withdrawal by either adult pauses AI calls ([ADR-046](adr/adr-046.md)) |
| S3 NLU correctness and latency | Synthetic correctness acceptance selects Luna low for the spike: 58/60, dates 12/12, held-out 11/12 and privacy 8/8 ([13](13-s3-live-acceptance.md)). The 30-second allowance applies only to fixed synthetic correctness; the application deadline remains five seconds. Production deadline reliability is pending: the final Singapore correctness run had p95 5,195 ms and four completions over five seconds against the unchanged 1,400 ms target. The owner accepts current latency for spike work and defers optimization; network distance remains unmeasured. Founding-household runtime calls still require S-VGW and the household acknowledgement, while ZDR remains a production gate. Current conservative spend is US$0.277306460: US$0.222693540 remains under the runner's effective US$0.50 cap and US$1.722693540 under the US$2.00 owner cap; the runner and ledger need a reviewed migration before exceeding US$0.50 ([06](06-s3-command-understanding-plan.md), [ADR-040](adr/adr-040.md), [ADR-046](adr/adr-046.md)) |
| Cloudflare spike credential | The S3 Cloudflare adapter is unfunded and not selected for household traffic. Its account-scoped token sits in Railway staging and an ignored local file and expires November 7. **Owner decision (Oct 8):** let it expire; no action needed ([09](09-s3-cloudflare-gateway.md)) |
| Google OAuth app published (unverified) and calendar linking | S-GCAL ([ADR-045](adr/adr-045.md)) |
| Production privacy gate: Vercel Pro/Enterprise or another ZDR route, ZDR on every call, `only` routing with negative tests, minimisation review and dated evidence | Before anyone outside the founding household, H5, H6, a second household or commercial use ([ADR-046](adr/adr-046.md)) |
| DPDP applicability and obligations | Primary legal verification before any external household, whatever the date ([ADR-048](adr/adr-048.md)) |
| Whether Vault document text needs ZDR inside the founding household | H1 processor gate ([ADR-026](adr/adr-026.md)) |
| First bounded run type | S-AGENT, post-pilot; optional S-DBOS ([ADR-041](adr/adr-041.md), [ADR-043](adr/adr-043.md)) |
| Phone acceptability or Capacitor signing/distribution contingency | Resolved in S1 — PWA accepted on both phones; contingency not triggered ([ADR-039](adr/adr-039.md)) |
| ElevenLabs S0 verification (household terms, training opt-out, retention/region) before it processes family audio | Owner: you · Gate: Tech §7 row flips green before `ELEVENLABS_API_KEY` ships in production |
| Exact model IDs, NLU selection, fallback performance and chosen TTS voice | Sarvam Saaras v4 approved in S2 by owner manual review; Luna low selected for synthetic NLU correctness in S3. Production NLU timing/privacy, fallback performance and S4 voice validation remain pending. ElevenLabs performance remains untested and S0-gated. |
| Railway cost, database/stream/worker feasibility, restore proof and optional PITR support | S5 |
| Whether measured batch STT latency warrants streaming | Phase 6; REST remains the accepted MVP default |
| Vault extractor, original-view authentication and added infrastructure | H1 spike |

This document records planned work, not completed provider approvals, purchases, benchmarks or deployments.
