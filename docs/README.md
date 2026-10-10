# Nilumi documentation index

Nilumi is a private household assistant for remembering, reminding, and following through with clear evidence and member-level privacy.

## Start here

| Document | Use it for |
|---|---|
| [Product plan](core/01-product-plan.md) | Product goals, users, journeys, requirements, and acceptance criteria |
| [Architecture](core/02-architecture.md) | System design, data model, APIs, privacy boundaries, and operations |
| [Tech stack](core/03-tech-stack.md) | Technology choices, provider status, versions, and alternatives |
| [Research overview](research/04-research.md) | Dated comparisons, sources, findings, and historical review context |
| [Implementation roadmap](core/05-implementation-roadmap.md) | Delivery order, phases, prerequisites, outcomes, and pending validations |
| [ADR catalogue](adr/README.md) | Accepted decisions, rationale, consequences, and decision history |

Read the Product Plan for what Nilumi should do, then Architecture and Tech Stack for how it is designed. Use the Roadmap for delivery sequence. ADRs record accepted decisions; research and validation records preserve supporting evidence and outcomes.

## Research

- [Research overview](research/04-research.md) — product and platform comparisons, dated findings, sources, and decision links.
- [Product analysis summary](research/product-analysis-summary.md) — open-source assistant comparisons that informed the October review.
- [S4 Sarvam latency research](research/19-s4-sarvam-latency-research.md) — provider and playback findings with bounded experiment recommendations.

## Plans

- [S3 command understanding plan](plans/06-s3-command-understanding-plan.md) — command contracts, synthetic evaluation, privacy gates, and cost limits.
- [Phase 1 gateway and voice plan](plans/17-phase-1-gateway-and-voice-plan.md) — S-VGW and S4 evidence, completion gates, and app foundation handoff.
- [S4 low-level latency plan](plans/21-s4-low-level-latency-plan.md) — evidence-based latency experiments and implementation sequence.
- [S-VGW completion plan](plans/26-s-vgw-completion-plan.md) — restricted-pilot closure, quota and revocation evidence, and activation checklist.

## Validation and implementation records

### S3 command understanding

- [Expected-action review](validation/s3/07-s3-expected-actions.md)
- [Gateway verification](validation/s3/08-s3-gateway-verification.md)
- [Cloudflare gateway setup](validation/s3/09-s3-cloudflare-gateway.md)
- [Paid Vercel validation](validation/s3/10-s3-paid-vercel-validation.md)
- [V11 validation](validation/s3/11-s3-v11-validation.md)
- [Deadline reliability](validation/s3/12-s3-deadline-reliability.md)
- [Live acceptance](validation/s3/13-s3-live-acceptance.md)

### S4 voice and latency

- [Voice verification baseline](validation/s4/18-s4-voice-verification.md)
- [Streaming validation](validation/s4/20-s4-streaming-validation.md)
- [Application optimization validation](validation/s4/22-s4-application-optimization-validation.md)
- [V3 phone retest analysis](validation/s4/23-s4-v3-phone-retest-analysis.md)
- [V4 connection and ledger validation](validation/s4/24-s4-v4-connection-and-ledger-validation.md)
- [Phone analysis and optimization closure](validation/s4/25-s4-v4-both-phone-analysis.md)

### S5 platform and recovery

- [Platform validation](validation/s5/14-s5-platform-validation.md)
- [S5 acceptance](validation/s5/16-s5-acceptance.md)
- [Recovery runbook template](operations/s5/15-s5-recovery-runbook.md)

### S-VGW policy

- [Policy rejection reproduction](validation/s-vgw/27-s-vgw-policy-reproduction.md) — local reproduction notes; the report was not sent to the vendor.

## Document ownership

Product Plan owns requirements and acceptance criteria. Architecture owns technical design and contracts. Tech Stack owns technology and provider selections. The Roadmap owns delivery sequence and outcomes. ADRs own accepted decisions. Research owns dated comparison evidence. Validation records own experiment procedures, results, and acceptance status.
