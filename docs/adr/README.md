# Decision catalogue

Current baseline: 2026-10-10. The catalogue contains 45 current decisions with preserved identifiers; gaps reflect consolidation/removal. Each Decision section states the complete choice. Accepted means the documented choice is agreed; delivery is separately labelled implemented, validated within a stated scope, selected for prototype, planned for MVP or deferred.

Read product-facing decisions first: ADR-001 (PWA), ADR-057 (Home/activities), ADR-008/009/027 (speech), ADR-003/018/019/042/044 (authority and presentation), ADR-017/022/036 (provider policy/cost). Then follow the architecture and phase dependencies.

## Current records

| Record | Decision | Delivery owner |
|---|---|---|
| [ADR-001](adr-001.md) | Channels and PWA platform | P0–P2 |
| [ADR-002](adr-002.md) | TypeScript application and isolated Python voice service | P0–P1 |
| [ADR-003](adr-003.md) | Continuing conversation with deterministic execution authority | P0–P4 |
| [ADR-004](adr-004.md) | PostgreSQL as the state authority | P1 |
| [ADR-005](adr-005.md) | Custom household memory layer | P4 |
| [ADR-006](adr-006.md) | Typed predicate registry and cardinality | P4 |
| [ADR-007](adr-007.md) | RLS privacy and household isolation | P1–P8 |
| [ADR-008](adr-008.md) | Streaming conversational speech with auditable text | P0 |
| [ADR-009](adr-009.md) | Pipecat and Sarvam prototype integration | P0–P1 |
| [ADR-010](adr-010.md) | Undo for requested reversible changes | P3–P6 |
| [ADR-011](adr-011.md) | graphile-worker and transactional scheduling | P1/P5 |
| [ADR-012](adr-012.md) | Application hosting and voice runtime gate | P1 |
| [ADR-013](adr-013.md) | Pinned model roles and evaluation changes | P0–P8 |
| [ADR-014](adr-014.md) | Forget scrubs source and derived content | P4 |
| [ADR-016](adr-016.md) | Production, staging and marketing origins | P1 |
| [ADR-017](adr-017.md) | Provider eligibility and household acknowledgement | P1/P8 |
| [ADR-018](adr-018.md) | Atomic action receipts and coordinated responses | P1–P4 |
| [ADR-019](adr-019.md) | Grounded text, presentation and speech | P4–P6 |
| [ADR-020](adr-020.md) | Next.js React application and trusted renderer | P0–P2 |
| [ADR-021](adr-021.md) | Library use and scoped metered-vendor exception | P0–P8 |
| [ADR-022](adr-022.md) | Gateway model routing and restricted-pilot controls | P1 |
| [ADR-023](adr-023.md) | Email-code identity and optional step-up | P1 |
| [ADR-024](adr-024.md) | Owner-only explicit memory sharing | P4 |
| [ADR-025](adr-025.md) | No classifier runtime in the MVP | P4 |
| [ADR-026](adr-026.md) | Deferred Family Records Vault | Deferred |
| [ADR-027](adr-027.md) | Foreground speech controls and output defaults | P0/P2 |
| [ADR-028](adr-028.md) | Nilumi name and Home conversation entry | P0/P2 |
| [ADR-029](adr-029.md) | Household date and time defaults | P5 |
| [ADR-030](adr-030.md) | Retention of domain, activity and conversational data | P2/P4/P7 |
| [ADR-031](adr-031.md) | Visibility defaults and derivative existence privacy | P2–P8 |
| [ADR-032](adr-032.md) | Encrypted backup and forget-safe restoration | P1/P4/P8 |
| [ADR-033](adr-033.md) | Offline Home projections and desired-state sync | P2/P3 |
| [ADR-034](adr-034.md) | Deferred household-helper access | Deferred |
| [ADR-035](adr-035.md) | Web Push and delivery-stage evidence | P5 |
| [ADR-036](adr-036.md) | Budgets and continuous-speech cost accounting | P0–P8 |
| [ADR-037](adr-037.md) | Confirmed health facts and recorded information | P4 |
| [ADR-042](adr-042.md) | Action broker and immutable proposal approval | P3/P6 |
| [ADR-043](adr-043.md) | Deferred durable runs, leases and fencing | Deferred |
| [ADR-044](adr-044.md) | Trusted model composition with json-render | P0/P2 |
| [ADR-045](adr-045.md) | Optional read-only calendar through Home | P7 |
| [ADR-048](adr-048.md) | Family-first contracts with future household isolation | P1 |
| [ADR-049](adr-049.md) | PWA channel; no WhatsApp integration | P5/Deferred |
| [ADR-053](adr-053.md) | Owner bootstrap and invitation emails | P1 |
| [ADR-056](adr-056.md) | Pastel foundation for stable Home | P0/P2 |
| [ADR-057](adr-057.md) | Home canvas and persistent activities | P0/P2 |

## Consolidation

ADR-001 incorporates former 015/039; ADR-003 incorporates 041; ADR-016 incorporates 055; ADR-017 incorporates acknowledgement/eligibility policy from 046/052/054; ADR-022 incorporates 038 and routing controls/exception from 046/052; ADR-036 incorporates047. Their predecessor files are removed. Historical 040/050/051 experiment permissions are preserved as dated limits/results in evidence, not active funding authorization. Git retains prior decisions.

## Resolved defaults

Visibility and existence privacy:031/024/007. Dates:029. Voice output/session:027/009. Identity/bootstrap:023/053. Retention/forget/recovery:030/014/032. Push:035. Budget:036. Health confirmation:037. Origin:016. All AI withdrawal:017. Stable Home/design:057/056. These choices are settled; empirical validation belongs to the [gate register](../plans/implementation-plan.md#validation-register).

[Documentation index](../README.md) · [Record template](template.md)
