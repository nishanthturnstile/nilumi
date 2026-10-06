# Accepted decision records

This catalogue owns accepted choices and their rationale. Product owns requirements; Architecture owns implementation design, schemas, contracts and operational procedures; Tech Stack owns technology selections, dependency versions and provider status; Research owns dated evidence, comparisons, sources and review history; Roadmap owns sequencing and pending validations.

All 38 records describe the accepted baseline. ADR-001–026 retain their original IDs and meanings; ADR-027–037 consolidate choices already accepted through the D/Q review and applied documents; ADR-038 adds the Vercel AI Gateway decision from S0 and partly supersedes ADR-022. **Accepted does not mean implemented, approved or benchmarked.** Provider eligibility, model/voice bake-offs, phone/platform proofs and future Vault choices remain in the [pending-validation register](../05-implementation-roadmap.md#5-pending-validations-and-decisions).

Revision 1 briefly considered Vercel Hobby + Neon, Workflow/Cron, polling, GitHub Actions backups and AI Gateway. Revision 2 restored/adopted Railway, graphile-worker, SSE, worker backups and direct in-process routing. The [dated review history](../04-research.md) and [superseded platform analysis](../04-research.md#62-revision-1-analysis-vercel-hobby--neon-kept-for-reference) remain explicit. They are not allocated retrospective IDs. [ADR-020](adr-020.md) refines [ADR-001](adr-001.md) and [ADR-015](adr-015.md); these records remain accepted together, as do [ADR-007](adr-007.md) with [ADR-031](adr-031.md), and [ADR-014](adr-014.md) with [ADR-032](adr-032.md).

## Catalogue

| ID | Decision |
|---|---|
| [ADR-001](adr-001.md) | Channel-agnostic brain; Next.js PWA first; Home Assistant later |
| [ADR-002](adr-002.md) | TypeScript end-to-end (pnpm monorepo, shared Zod contracts) |
| [ADR-003](adr-003.md) | "LLM as parser, code as executor"; no agent framework |
| [ADR-004](adr-004.md) | PostgreSQL is the only stateful service |
| [ADR-005](adr-005.md) | Custom memory layer instead of a memory framework |
| [ADR-006](adr-006.md) | Predicate registry with typed values and cardinality |
| [ADR-007](adr-007.md) | Visibility enforced by Postgres row-level security |
| [ADR-008](adr-008.md) | Cascaded STT → LLM → TTS (not realtime speech-to-speech) for the MVP |
| [ADR-009](adr-009.md) | Push-to-talk with REST STT + keyterms for the MVP; streaming is re-evaluated in S2 |
| [ADR-010](adr-010.md) | Undo-first confirmation instead of confidence thresholds |
| [ADR-011](adr-011.md) | graphile-worker for jobs and reminders |
| [ADR-012](adr-012.md) | Railway (Singapore) hosting: Next.js app, worker and Postgres; Dokploy VM as exit path |
| [ADR-013](adr-013.md) | Model roles pinned in config, changed only through the eval gate |
| [ADR-014](adr-014.md) | Forget = redact everywhere (with a documented backup window); undo = retract |
| [ADR-015](adr-015.md) | Next.js PWA with a Capacitor escape hatch |
| [ADR-016](adr-016.md) | Same-origin deployment on `nilumi.in`, bought before installing on the phones |
| [ADR-017](adr-017.md) | AI provider eligibility is a release gate; default LLM roles start with OpenAI unless terms force a change |
| [ADR-018](adr-018.md) | Turn execution ledger with per-command receipts |
| [ADR-019](adr-019.md) | Deterministic answers first; sentence-gated LLM synthesis |
| [ADR-020](adr-020.md) | Next.js (latest, Turbopack) PWA with Hono mounted in route handlers and TanStack Query |
| [ADR-021](adr-021.md) | Vercel: free open-source libraries only (Next.js, Turbopack, AI SDK); no metered Vercel platform services |
| [ADR-022](adr-022.md) | LLM routing through the in-process AI SDK provider registry with model-role aliases; no hosted gateway |
| [ADR-023](adr-023.md) | Email-code sign-in with optional WebAuthn step-up |
| [ADR-024](adr-024.md) | Explicit, owner-only memory sharing (`shared` visibility) |
| [ADR-025](adr-025.md) | No classifier model in the MVP; instrumented experiments and revisit triggers |
| [ADR-026](adr-026.md) | Family Records Vault (H1) with ID masking and MVP extension hooks |
| [ADR-027](adr-027.md) | Voice reply defaults and modality matching |
| [ADR-028](adr-028.md) | Nilumi product name and future wake phrase |
| [ADR-029](adr-029.md) | Household timezone and reminder time defaults |
| [ADR-030](adr-030.md) | Data retention and optional debug-audio capture |
| [ADR-031](adr-031.md) | Default memory visibility and private-item existence protection |
| [ADR-032](adr-032.md) | Encrypted backups, forget-journal recovery and shared recovery material |
| [ADR-033](adr-033.md) | Realtime invalidation and offline client-data boundaries |
| [ADR-034](adr-034.md) | Defer household-help access to H6 |
| [ADR-035](adr-035.md) | Web Push, notification previews and delivery-stage measurement |
| [ADR-036](adr-036.md) | Operating-cost target and AI budget guardrails |
| [ADR-037](adr-037.md) | Confirmed health facts and information-only responses |
| [ADR-038](adr-038.md) | LLM/embeddings via Vercel AI Gateway with ZDR + no-training enforcement; supersedes ADR-022's no-hosted-gateway part |

## D decision map

Every D1–D19 identifier is preserved here. D1 is an umbrella reference to the resolved-question map, not a separate decision. Multiple references in a row cover distinct parts of the original entry.

| ID | Review topic | Record |
|---|---|---|
| D1 | Resolved product questions (umbrella) | [Q1–Q12 map](#resolved-question-map) |
| D2 | Memory sharing | [ADR-024](adr-024.md) |
| D3 | Response modality | [ADR-027](adr-027.md) |
| D4 | Name, wake phrase and domain | [ADR-028](adr-028.md) · [ADR-016](adr-016.md) |
| D5 | Hosting | [ADR-012](adr-012.md) · [ADR-020](adr-020.md) |
| D6 | Frontend | [ADR-020](adr-020.md) |
| D7 | Client data layer | [ADR-020](adr-020.md) · [ADR-033](adr-033.md) |
| D8 | Reminders and jobs | [ADR-011](adr-011.md) |
| D9 | Realtime sync | [ADR-033](adr-033.md) |
| D10 | LLM routing | [ADR-022](adr-022.md) |
| D11 | Agent/workflow frameworks | [ADR-003](adr-003.md) |
| D12 | Classifier model | [ADR-025](adr-025.md) |
| D13 | Authentication | [ADR-023](adr-023.md) |
| D14 | Speech-to-text | [ADR-009](adr-009.md) |
| D15 | Family Records Vault | [ADR-026](adr-026.md) |
| D16 | Master key and runbook | [ADR-032](adr-032.md) |
| D17 | Shopping-list sharing | [ADR-034](adr-034.md) |
| D18 | Cost | [ADR-036](adr-036.md) |
| D19 | Vercel usage rule | [ADR-021](adr-021.md) |

## Resolved-question map

Every Q1–Q12 identifier is preserved here; the individual records contain the resolutions and applied references. Overlapping D/Q entries point to the same record. The later review's unnumbered “New” rows are covered by D2/ADR-024 (sharing) and D15/ADR-026 (Vault).

| ID | Review question | Record |
|---|---|---|
| Q1 | Preference visibility | [ADR-031](adr-031.md) |
| Q2 | Private-item existence | [ADR-031](adr-031.md) |
| Q3 | Voice reply default | [ADR-027](adr-027.md) |
| Q4 | Morning/evening/tonight defaults | [ADR-029](adr-029.md) |
| Q5 | No-memory turn retention | [ADR-030](adr-030.md) |
| Q6 | Optional debug audio | [ADR-030](adr-030.md) |
| Q7 | Name and wake phrase | [ADR-028](adr-028.md) |
| Q8 | Custom domain | [ADR-016](adr-016.md) |
| Q9 | Household-help list access | [ADR-034](adr-034.md) |
| Q10 | Kids' health facts | [ADR-037](adr-037.md) |
| Q11 | Recovery material location | [ADR-032](adr-032.md) |
| Q12 | Lock-screen previews | [ADR-035](adr-035.md) |

## Adding and superseding records

Use the [short template](template.md). Append the next unused ID; do not renumber existing records. Record an actual decision date only when known. A new decision that supersedes an accepted choice links to its predecessor, and the predecessor links back and changes status to Superseded. Keep earlier rationale and review history explicit. Acceptance records a choice; evidence for release/implementation gates belongs in the owning documents and must be linked separately.
