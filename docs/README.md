# Nilumi: Planning Docs

> **Nilumi** (NI-lu-mi, from the Tamil *nila*, "moon") is a private household assistant on both our phones. Say or type what matters, see exactly what it understood, and trust that it will remember, remind, and admit when it doesn't know.
>
> **Domain:** [nilumi.in](https://nilumi.in) · **Hosting:** Railway (Singapore)

| # | Document | What's inside |
|---|---|---|
| 01 | [Product Plan](01-product-plan.md) | Problem, users and roles, goals and success metrics, trust-UX principles, journeys with acceptance criteria, scope and horizons, memory categories and sharing, risk-first phases (incl. Phase 0 spikes) with exit criteria, evaluation sets, risks, decisions on the open questions |
| 02 | [Architecture](02-architecture.md) | Topology, turn pipeline and execution ledger, NLU contract, memory model (incl. sharing), data model (DDL), retrieval and answerability, identity, dates, reminders (occurrence model), voice, privacy (RLS matrix, forget), observability and evals, operations and backups, latency budget, API, evolution (Family Records Vault first), ADRs |
| 03 | [Tech Stack](03-tech-stack.md) | Every layer's choice with rationale and rejected alternatives, the Vercel usage rule, AI model roles and bake-off candidates, LLM routing layer, classifier stance, cost model, provider eligibility and data policies, sources |
| 04 | [Research & Decisions](04-research-and-decisions.md) | The October 2026 review: decision record and revision history, resolutions of the open questions, and the research behind them (name and domain, hosting, Vercel ecosystem vs alternatives, LLM routing, classifiers, authentication, speech-to-text, Family Records Vault, backups), with comparison tables and sources |

Read them in order: the product plan says *what* and *why*, the architecture says *how*, and the tech stack says *with what*. **01–03 hold every final decision**; 04 keeps the evidence and the options we rejected.

## The decisions in one screen

- **Shape:** a channel-agnostic "brain" with the **installable PWA first** (Android + iPhone). The **Family Records Vault** (scanned medical, insurance and school records you can ask questions about) is the first horizon after the MVP; a room speaker via Home Assistant ("Hey Nilumi") comes after that.
- **Core pattern:** **LLM as parser, code as executor.** One structured NLU call, then deterministic validation, entity resolution, policy and writes, recorded in a crash-safe execution ledger. Templated confirmations. **Deterministic answers** for single-fact questions; LLM synthesis only when needed, validated sentence by sentence against cited evidence. A deterministic answerability gate produces "I don't know". No agent framework, and no classifier model in the MVP (instrumented experiments instead).
- **Trust UX:** every turn shows *what I heard* and *what I did*, with **Undo/Edit** cards instead of confidence thresholds. Forget means **redact everywhere**. Voice-first: speak and Nilumi answers aloud; type and it answers in text only.
- **Memory:** subject → predicate (from a **registry** with type and cardinality) → value/object. Separate who it's about, who said it and who can see it. Provenance to the exact transcript span (and, later, the document page).
- **Privacy:** Postgres **row-level security** between members, covering *existence* as well as content. Three visibilities: **household**, **shared** (an owner explicitly shares a private memory with the other adult and stays its only editor) and **private**. One sensitive-input boundary on every ingress; no admin takeover of another adult's account.
- **Stack:** TypeScript end-to-end. **Next.js 16 PWA (Turbopack)** with **Hono mounted inside Next.js** and **TanStack Query**; **PostgreSQL 18** (pgvector, pg_trgm, FTS, RLS) as the **only stateful service**, including jobs and realtime events; **graphile-worker** for reminders, backups and maintenance; server-sent events for instant list sync. Better Auth with **email codes** and optional Face ID step-up. **From Vercel we use only free open-source libraries** (Next.js, Turbopack, AI SDK); model choice sits behind an in-process **model-role registry**, so switching providers is a config change.
- **Hosting:** **Railway, Singapore** (existing account): `app`, `worker` and `postgres` (we operate the Postgres). Nightly encrypted, restore-tested backups to Cloudflare R2 with a forget journal; the master key and runbook live in a shared OneDrive document.
- **AI defaults (to be confirmed by Phase 0 bake-offs, after the provider eligibility and data-terms gate):** OpenAI **GPT-6 Luna** (NLU and synthesis; Claude Haiku 4.5 as challenger) · `text-embedding-3-small` @ 768 · **Sarvam Saaras v4** STT (Deepgram Nova-3 fallback) · **Sarvam Bulbul v3** en-IN voice (your wife picks). **Gemini is excluded** because its API terms restrict consumer use and apps likely used by under-18s.
- **Cost:** about **₹1,400–2,700/month** (Railway is the main cost; AI ≈ ₹300–600).
- **Delivery:** risk-first phases. Phase 0 spikes (provider gate, iPhone PWA, STT, NLU, voice, Railway platform incl. the reminder gate, domain) → walking skeleton with the safety rails → first real-memory release (remember/correct/undo/forget/share) + shopping list → retrieval → history polish → reminders → voice polish → family pilot → stabilize.

## Before Phase 1
1. Read the decisions together with your wife ([01 §14](01-product-plan.md#14-decisions-on-the-open-questions)).
2. Buy **nilumi.in** **before installing the app on your phones** (the installed app, push subscriptions and sign-in emails are tied to it).
3. Clear the provider eligibility and data-terms gate (Tech §7) **before uploading any family voice**.
4. Create the OneDrive recovery document (backup key + runbook) in a folder you both can open.
5. Run the Phase 0 spikes (Product §11) and record decisions in the ADR log.
