# Implementation Roadmap

Current sequence2026-10-10. The application remains **unimplemented**; existing spikes and visual foundation are scoped evidence. This concise index and [the detailed implementation plan](../plans/implementation-plan.md) prescribe the same P0–P8 order. There is one active detailed plan.

## Phase and dependency index

| Phase | Ordered deliverables | Exit gate |
|---|---|---|
| [P0 — Voice and Home prototype](../plans/implementation-plan.md#p0) | Synthetic contracts/scenarios → Home trusted renderer and Recent → continuing Pipecat/Sarvam speech → corrections/interruption → both-phone multilingual/cost evidence | Connected household journey works on both installed phones; English/Tamil/Tanglish quality, complete-turn latency, interruption and cost recorded. |
| [P1 — Production foundations](../plans/implementation-plan.md#p1) | Workspace/Biome/CI → TS/Python contracts → database/auth/isolation → provider/budget/origin controls → media hosting proof → worker/recovery | Clean builds/CI and isolation/session checks pass; production voice transport/hosting verified before family traffic. |
| [P2 — Home and persistent activities](../plans/implementation-plan.md#p2) | Accessible shell/registry → durable activities/Recent/revisions → response stream → production voice lifecycle → theme/text/PWA recovery | Voice/text/touch share context; restoration, focus, interruption, PWA updates and stale-output handling work. |
| [P3 — Shopping and routine checklists](../plans/implementation-plan.md#p3) | List actions/dedup/quantities → explicit check/uncheck/Undo → offline queue/conflicts → cross-phone sync → routine drafts | Both adults create/use a list; offline checking/unchecking synchronizes without duplicates or silent loss. |
| [P4 — Household memory and evidence](../plans/implementation-plan.md#p4) | Capture/entities → retrieval/evidence → correction/share/forget → derivative scrubbing → seeding/evaluation | Correctness/privacy/forget requirements pass through Home, speech and presentations. |
| [P5 — Tasks and reminders](../plans/implementation-plan.md#p5) | Scheduling → worker/recurrence → recipient actions/quiet hours → push/Inbox → Home deep links/reliability | Reliability suite and installed-phone push tests pass; requested changes have accurate receipts. |
| [P6 — Briefs and approved suggestions](../plans/implementation-plan.md#p6) | Authorized deterministic brief → optional spoken summary → internal proposals → approval/edit/reject → stale-source/dedup evaluation | Briefs/suggestions respect visibility, exact approval, deduplication and source changes. |
| [P7 — Optional calendar and lifecycle tools](../plans/implementation-plan.md#p7) | Calendar prerequisites/connect → disconnect scrubbing → export/import/history → account/data lifecycle | Optional connection and lifecycle scenarios pass; integration failures leave Home useful. |
| [P8 — Family pilot readiness](../plans/implementation-plan.md#p8) | Multilingual/device/accessibility regression → actual cost/recovery → degraded-mode/observability → instrumented family pilot | Scoped release evidence complete; measured family use determines subsequent iteration. |

Each phase depends on the prior exit gate; work package order is explicit in the detailed plan. Research/evidence collection can proceed without enabling unapproved traffic, but failed release gates cannot be bypassed. P7 calendar is optional: complete its safe unavailable-state evidence even if connection is deferred. P8 core pilot need not wait for optional OAuth once that scope is recorded.

## Current evidence and first work

S1 PWA, S3 synthetic NLU, S4 synthetic speech and S5 platform/recovery experiments retain their original acceptance limits. None completes P0 or P1. New voice/rendering dependencies are selected for prototype, production suitability pending. Start **P0.1: synthetic connected scenarios and contract fixtures**; no domain migration, family-data transfer or new provider setting is needed for that first package.

Shared displays/room input, Vault, helpers, child access, bounded runs/delegation, external integrations and additional channels are [deferred capabilities](../plans/implementation-plan.md#deferred-capabilities) with prerequisites, not a competing horizon schedule.

[Coverage map](../plans/implementation-plan.md#coverage-map) · [Validation register](../plans/implementation-plan.md#validation-register) · [Evidence disposition](../validation/documentation-baseline.md)
