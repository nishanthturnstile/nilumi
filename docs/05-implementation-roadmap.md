# 05 — High-Level Implementation Roadmap: Nilumi

> **Status:** Planned sequence · Based on the accepted revision-2 baseline · **Date:** October 2026
> **Related:** [ADR catalogue](adr/README.md) · [01 Product Plan](01-product-plan.md) · [02 Architecture](02-architecture.md) · [03 Tech Stack](03-tech-stack.md) · [04 Research](04-research.md)

## 1. How to use this roadmap

This document owns **what we build in what order**: Phase 0–8 for the MVP, followed by expansion horizons. Feature-level design and task breakdowns come later. No durations are assigned, and no phase is marked complete by this document.

[Product §9](01-product-plan.md#9-scope) owns Must/Should/Could priorities. Items marked **Should** below are intended opportunities within a phase, not new MVP requirements; deferrals are recorded before moving on. Could items remain optional backlog. Architecture owns technical contracts and validation mechanics; Tech Stack owns technology choices and provider status; the ADR catalogue owns accepted decisions and rationale; Research owns dated evidence and comparison history.

Each phase ends with a demo to your wife and a go/no-go against its completion outcome. Privacy and secret handling remain hard gates throughout. Model or prompt changes use the [evaluation promotion gate](02-architecture.md#162-evaluation-harness-and-gates).

### Prerequisites and dependencies

- Review the [accepted decisions and question resolutions](adr/README.md) together before Phase 1.
- **S0 precedes every upload of family voice or data**, including bake-off clips. Synthetic inputs can be used while approval is pending.
- **S6 precedes S1 phone installation**: the installed origin, sign-in sender and push subscriptions must use the final domain. S0–S6 are stable identifiers, not the order in which spikes must run.
- Create the shared OneDrive recovery document before the S5 manual restore; its contents and key handling follow [Architecture §17.2](02-architecture.md#172-backups-and-restore-drill).
- Complete the Phase 0 platform gates before Phase 1. S5 is a feasibility proof; Phase 1 establishes production safety and recovery, and Phase 5 repeats reminder validation against the implemented feature.
- Follow Phase 1–8 in order. Foundation privacy, receipts and provenance precede real-memory writes; memory precedes retrieval; reliable scheduling precedes the pilot.

## 2. MVP phases

### Phase 0 — Spikes and decisions

**Purpose:** validate the highest-risk assumptions before committing to implementation.

| Spike | Capability to validate | Completion outcome / supporting reference |
|---|---|---|
| **S0 — Provider eligibility and data terms** | Household/minor-adjacent eligibility, training opt-outs, retention and deletion settings for every processor, including all bake-off candidates | Each provider receiving family data has a green, recorded status; Sarvam confirmation is obtained in writing. [Tech §7](03-tech-stack.md#7-provider-eligibility-and-data-policies-release-gate) — **DONE Oct 2026: Sarvam written confirmation received + training opt-out off; Deepgram/Azure dropped; ElevenLabs retained for later use cases; Railway/R2/Resend/GitHub green; LLM/embeddings via Vercel AI Gateway ([ADR-038](adr/adr-038.md))** |
| **S1 — PWA on both phones** | Install/offline shell and updates; in-app email-code sign-in, session persistence and step-up; native recording, permissions and interruptions; closed-app push; SSE and reply playback across resume; accessibility and Next.js issue #95588 | Both phones work with friction your wife accepts. Otherwise resolve the Capacitor signing/distribution path. [Tech §2](03-tech-stack.md#2-client), [Architecture §14.1](02-architecture.md#141-capture-pwa) and [§15.5](02-architecture.md#155-authentication-sessions-and-recovery) |
| **S2 — STT bake-off** | About 40 clips per adult with names, brands, dates/numbers and a few Tanglish cases in kitchen/fan/TV noise; native browser formats and measured p50/p95 | Select from the [STT shortlist](03-tech-stack.md#41-model-roles-and-bake-off-candidates) by entity-name accuracy, then WER, then p95 latency. |
| **S3 — NLU bake-off** | Initial 60-case golden set with the real schema; model-role routing/fallback and shadow-mode instrumentation; prompt size/cache behavior; two offline classifier experiments | Select by structural accuracy, p95 latency and schema-valid rate; classifier experiments add no production dependency. [Tech §4](03-tech-stack.md#4-ai-and-voice), [Architecture §16.2](02-architecture.md#162-evaluation-harness-and-gates) |
| **S4 — Voice selection** | Three or four en-IN voices, sentence playback on the installed iPhone and first-audio latency | Your wife chooses the voice; first-audio p95 ≤ 700 ms. [Tech §4.1](03-tech-stack.md#41-model-roles-and-bake-off-candidates) |
| **S5 — Railway platform smoke** | Database/extensions and Tamil locale behavior; pooled RLS/role boundaries; worker scheduling; streamed POST/SSE and reconnect; home RTT; encrypted backup, restore test, forget replay and manual master-key restore; volume backups/PITR support; always-on settings and measured cost | All platform checks pass, including the [≥ 200-occurrence reminder gate](02-architecture.md#162-evaluation-harness-and-gates). [Tech §3](03-tech-stack.md#3-server-and-data), [§6](03-tech-stack.md#6-hosting-operations-and-tooling), [Architecture §17.2](02-architecture.md#172-backups-and-restore-drill) |
| **S6 — Final domain** | Purchase/attach `nilumi.in`, enable TLS and verify the Resend sender | Domain and sender work before either phone installs the app. [ADR-016](adr/adr-016.md) — **In progress Oct 2026: `nilumi.in` purchased; Cloudflare nameservers being added next; Resend sender verification and TLS still pending** |

**Output:** selected exact model IDs, measured prices and effective provider settings recorded in `config/models.ts`, `config/providers.md` and the ADR log when the project is initialized. Record spike results and any resulting baseline revisions; choosing a default alone does not pass a gate.

### Phase 1 — Walking skeleton with safety rails

**Purpose:** establish a thin, safe end-to-end system on both phones.

**Features:** pnpm monorepo, CI and Railway deployment/migrations; invite-only adult sign-in, household/member relations, session revoke and optional step-up; PWA Talk shell with recording and text input; STT-to-transcript/echo cards; sensitive-input boundary on every available ingress; member-scoped transactions, sharing-ready RLS and privacy harness; resumable turn ledger; provenance, traces/admin viewer; worker backups, forget-journal support and recovery/rollback rehearsal. Reserve Vault provenance/masking interfaces without creating the document feature.

**Complete when:** both adults can sign in and submit voice/text turns; crash/retry resumes correctly; secret and privacy tests pass; stage timings are visible; restore and compatible deployment rollback are rehearsed. [Architecture §5–§6](02-architecture.md#5-code-structure), [§15](02-architecture.md#15-privacy-and-security), [§17](02-architecture.md#17-reliability-and-operations)

### Phase 2 — First real-memory release and shopping list

**Purpose:** begin a useful daily habit with trustworthy capture and correction.

**Features:** predicate registry, entities/aliases and speaker-relative references; remember, correct, supersede, safe Undo/Edit, confirmed forget/redaction, owner-only share/un-share and clarifications; health/allergy confirmation; provenance cards; shopping-list add/read/tick/remove with dedupe, offline receipts, realtime sync and visible conflicts; cold-start seeding form. **Should:** per-member STT keyterm loop.

**Complete when:** the NLU and privacy/secret gates pass; remember → correct → undo → forget leaves no forgotten residue; sharing permissions and revocation pass; shopping works offline on both phones and your wife uses the list unprompted. Retrieval-based journey checks finish in Phase 3. [Product §12](01-product-plan.md#12-evaluation-product-view), [Architecture §8](02-architecture.md#8-memory-model) and [§13.1](02-architecture.md#131-client-sync-offline-data-and-lists)

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

**Complete when:** [product latency targets](01-product-plan.md#53-success-metrics) hold over 100 real turns, bucketed by clip length and including the first request after deployment; simulated LLM outage and budget exhaustion keep list/reminder commands and non-AI surfaces usable. [Architecture §17.3–§17.5](02-architecture.md#173-degraded-modes), [§18](02-architecture.md#18-latency-budget-push-to-talk-india--railway-singapore)

### Phase 7 — Family pilot

**Purpose:** learn whether both adults naturally find the MVP useful.

**Work:** use the app without new feature work; **Should:** answer feedback buttons. Review failures weekly by STT, NLU, entity resolution, retrieval, hallucination, privacy/policy and UX friction. Collect patterns over several days before fixing; consented failures extend the eval sets.

**Outcome:** a pilot report covering usage, memories/corrections, retrieval/abstention/hallucinations, latency, cost, delivery stages, the top three valued features/frustrations and your wife's unprompted weekly uses, assessed against [Product §5.3](01-product-plan.md#53-success-metrics).

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
| H5 | Kid mode, audience restrictions and child-safety moderation; renewed provider eligibility checks |
| H6 | Shopping-list-only access for household help |
| H7 | Conversation mode using the same deterministic executors and privacy controls |

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

**Epics:** E0 Spikes & decisions · E1 Platform & delivery · E2 Identity & household · E3 Conversation & NLU · E4 Memory write · E5 Entity resolution · E6 Retrieval & answers · E7 Correct/forget/history · E8 Lists · E9 Tasks/reminders/notifications · E10 Voice · E11 Privacy & security · E12 Observability & evaluation · E13 Family pilot · E14 Family Records Vault (H1, later).

**Board states:** Backlog → In progress → Family testing → Done. Epics can span phases; privacy, voice and evaluation evolve with each feature rather than waiting for their own late milestone.

## 5. Pending validations and decisions

The accepted Q1–Q12 resolutions are recorded in [ADR resolved-question map](adr/README.md#resolved-question-map). They are not reopened by this roadmap. Accepted baseline choices still require evidence before use:

| Pending item | Where it is resolved |
|---|---|
| Provider eligibility, effective retention/training settings and Sarvam written confirmation | **Resolved in S0 (Oct 2026)**; status stays in [Tech §7](03-tech-stack.md#7-provider-eligibility-and-data-policies-release-gate) |
| Phone acceptability or Capacitor signing/distribution contingency | S1 after S6 |
| Exact model IDs, STT winner/fallback performance and chosen TTS voice | S2–S4 |
| Railway cost, database/stream/worker feasibility, restore proof and optional PITR support | S5 |
| Whether measured batch STT latency warrants streaming | Phase 6; REST remains the accepted MVP default |
| Vault extractor, original-view authentication and added infrastructure | H1 spike |

This document records planned work, not completed provider approvals, purchases, benchmarks or deployments.
