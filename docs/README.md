# Nilumi: Planning Docs

> **Nilumi** (NI-lu-mi, from the Tamil *nila*, "moon") is a private household assistant on both our phones. Say or type what matters, see exactly what it understood, and trust that it will remember, remind, and admit when it doesn't know.
>
> **Domain:** [nilumi.in](https://nilumi.in) · **Hosting:** Railway (Singapore)

| # | Document | What's inside |
|---|---|---|
| 01 | [Product Plan](01-product-plan.md) | Problem, users and roles, goals and success metrics, trust-UX principles, journeys with acceptance criteria, scope and horizons, memory categories and sharing, evaluation sets, risks, links to resolved decisions |
| 02 | [Architecture](02-architecture.md) | Topology, turn pipeline and execution ledger, NLU contract, memory model (incl. sharing), data model (DDL), retrieval and answerability, identity, dates, reminders (occurrence model), voice, privacy (RLS matrix, forget), observability and evals, operations and backups, latency budget, API, evolution (Family Records Vault first), link to decision catalogue |
| 03 | [Tech Stack](03-tech-stack.md) | Every layer's choice with rationale and rejected alternatives, the Vercel usage rule, AI model roles and bake-off candidates, LLM routing layer, classifier stance, cost model, provider eligibility and data policies, sources |
| 04 | [Research](04-research.md) | The October 2026 evidence snapshot: comparisons, sources, dated findings and revision history, including clearly superseded revision-1 platform analysis; links to accepted ADRs |
| 05 | [Implementation Roadmap](05-implementation-roadmap.md) | Phase 0–8 features and outcomes, spike prerequisites, journey coverage, project board, post-MVP horizons and pending validations |
| ADR | [Decision catalogue](adr/README.md) | ADR-001–037 with context, decisions, alternatives, consequences and applied links; D1–D19 and Q1–Q12 mappings; [future-record template](adr/template.md) |

Start with Product for *what* and *why*, then Architecture for *how* and Tech Stack for *with what*. Use the [ADR catalogue](adr/README.md) to understand accepted choices, rationale and the legacy D/Q map; follow its links to Research for detailed evidence. Read the Roadmap for build order and validation ownership.

Product owns requirements; Architecture owns technical design, schemas, contracts and operational procedures; Tech Stack owns technology selections, dependency versions and provider status; ADRs own accepted choices and rationale; Research owns dated findings, comparison evidence, sources and historical review context; Roadmap owns delivery order and completion outcomes. Acceptance is distinct from approval, benchmarking and implementation. New decisions append ADR IDs; superseding records link to predecessors, preserving history.

## The decisions in one screen

- **Shape:** a channel-agnostic "brain" with the **installable PWA first** (Android + iPhone). The **Family Records Vault** (scanned medical, insurance and school records you can ask questions about) is the first horizon after the MVP; a room speaker via Home Assistant ("Hey Nilumi") comes after that.
- **Core pattern:** **LLM as parser, code as executor.** One structured NLU call, then deterministic validation, entity resolution, policy and writes, recorded in a crash-safe execution ledger. Templated confirmations. **Deterministic answers** for single-fact questions; LLM synthesis only when needed, validated sentence by sentence against cited evidence. A deterministic answerability gate produces "I don't know". No agent framework, and no classifier model in the MVP (instrumented experiments instead).
- **Trust UX:** every turn shows *what I heard* and *what I did*, with **Undo/Edit** cards instead of confidence thresholds. Forget means **redact everywhere**. Voice-first: speak and Nilumi answers aloud; type and it answers in text only.
- **Memory:** subject → predicate (from a **registry** with type and cardinality) → value/object. Separate who it's about, who said it and who can see it. Provenance to the exact transcript span (and, later, the document page).
- **Privacy:** Postgres **row-level security** between members, covering *existence* as well as content. Three visibilities: **household**, **shared** (an owner explicitly shares a private memory with the other adult and stays its only editor) and **private**. One sensitive-input boundary on every ingress; no admin takeover of another adult's account.
- **Stack:** TypeScript end-to-end. **Next.js 16 PWA (Turbopack)** with **Hono mounted inside Next.js** and **TanStack Query**; **PostgreSQL 18** (pgvector, pg_trgm, FTS, RLS) as the **only stateful service**, including jobs and realtime events; **graphile-worker** for reminders, backups and maintenance; server-sent events for instant list sync. Better Auth with **email codes** and optional Face ID step-up. **From Vercel we use only free open-source libraries** (Next.js, Turbopack, AI SDK); model choice sits behind an in-process **model-role registry**, so switching providers is a config change.
- **Hosting:** **Railway, Singapore** (existing account): `app`, `worker` and `postgres` (we operate the Postgres). Nightly encrypted, restore-tested backups to Cloudflare R2 with a forget journal; the master key and runbook live in a shared OneDrive document.
- **AI defaults (to be confirmed by Phase 0 bake-offs, after the provider eligibility and data-terms gate):** OpenAI **GPT-6 Luna** (NLU and synthesis; Claude Haiku 4.5 as challenger) · `text-embedding-3-small` @ 768 · **Sarvam Saaras v4** STT · **Sarvam Bulbul v3** en-IN voice (your wife picks). **Gemini is excluded** because its API terms restrict consumer use and apps likely used by under-18s. LLM/embeddings route through Vercel AI Gateway.
- **Cost:** about **₹1,400–2,700/month** (Railway is the main cost; AI ≈ ₹300–600).
- **Delivery:** [Implementation Roadmap](05-implementation-roadmap.md) — the single home for build sequence, phase features, completion outcomes and later horizons.

## Delivery prerequisites

See the [roadmap prerequisites](05-implementation-roadmap.md#prerequisites-and-dependencies) and [Phase 0 spikes](05-implementation-roadmap.md#phase-0--spikes-and-decisions). Accepted choices still need their validation gates; current unresolved items are in the [pending-validation register](05-implementation-roadmap.md#5-pending-validations-and-decisions).
