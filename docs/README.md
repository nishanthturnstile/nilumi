# Nilumi documentation

 Current baseline 2026-10-10: a voice-first installed PWA with one dynamic Home canvas and persistent activities. The application is **unimplemented**. Existing spikes, measured acceptance and visual foundation retain their stated scope; Next.js/React, AI SDK/json-render and Pipecat/Sarvam are selected for the new prototype, not validated production.

## Read in dependency order

 1. [Product summary](../PRODUCT.md) and [Product Plan](core/01-product-plan.md): household purpose, Home/Recent, voice/text/touch, J1–J26 and acceptance.
 2. [Decision catalogue](adr/README.md):45 current ADRs, complete decisions and explicit delivery status, including [Home/activities](adr/adr-057.md).
 3. [Tech Stack](core/03-tech-stack.md): installed lockfile versions versus planned libraries, TS/Python boundary, media hosting gate, provider policy and continuous-session costs.
 4. [Architecture](core/02-architecture.md): topology, contracts, authority, schemas, streaming/focus, privacy and recovery.
 5. [Application Flows](core/28-application-flows.md): Home states, scenario catalogue, supporting destinations, failure/recovery and settled defaults.
 6. [Design summary](../DESIGN.md), [Design System](design/29-design-system.md) and [Device QA](design/31-device-qa.md): unchanged visual foundation, Home composer/Recent/renderer behavior and pending phone checks.
 7. [Roadmap](core/05-implementation-roadmap.md): concise P0–P8 dependency index.
 8. [Detailed implementation plan](plans/implementation-plan.md): the sole active plan, ordered packages, interfaces, recovery, evidence/exit gates and deferred prerequisites.
 9. [Disposition/evidence audit](validation/documentation-baseline.md), evidence below and [recovery runbook](operations/s5/15-s5-recovery-runbook.md): dated proof and operational limits.

## Research and existing harnesses

 [Research Overview](research/04-research.md) compares streaming voice/generative UI with primary integration sources. [Latency findings](research/19-s4-sarvam-latency-research.md), [UI/platform findings](research/30-ui-platform-research.md) and [reference-project findings](research/product-analysis-summary.md) are dated supporting research, not alternate roadmaps.

 [S1/S2/S3/S4/Gateway harness](../spikes/s1/README.md), [provider evidence](../spikes/s1/config/providers.md), [S5 platform harness](../spikes/s5/README.md) and [UI package](../packages/ui/README.md) preserve valid commands. Static specimens are reference artifacts. Planned apps/web, apps/worker, services/voice and shared production packages do not exist yet; do not infer implementation from their designs.

## Dated validation records

| Record | Scope |
|---|---|
| [27-s-vgw-policy-reproduction](validation/s-vgw/27-s-vgw-policy-reproduction.md) | Historical s-vgw experiment; original dates, failures, measurements and acceptance limits |
| [07-s3-expected-actions](validation/s3/07-s3-expected-actions.md) | Historical s3 experiment; original dates, failures, measurements and acceptance limits |
| [08-s3-gateway-verification](validation/s3/08-s3-gateway-verification.md) | Historical s3 experiment; original dates, failures, measurements and acceptance limits |
| [09-s3-cloudflare-gateway](validation/s3/09-s3-cloudflare-gateway.md) | Historical s3 experiment; original dates, failures, measurements and acceptance limits |
| [10-s3-paid-vercel-validation](validation/s3/10-s3-paid-vercel-validation.md) | Historical s3 experiment; original dates, failures, measurements and acceptance limits |
| [11-s3-v11-validation](validation/s3/11-s3-v11-validation.md) | Historical s3 experiment; original dates, failures, measurements and acceptance limits |
| [12-s3-deadline-reliability](validation/s3/12-s3-deadline-reliability.md) | Historical s3 experiment; original dates, failures, measurements and acceptance limits |
| [13-s3-live-acceptance](validation/s3/13-s3-live-acceptance.md) | Historical s3 experiment; original dates, failures, measurements and acceptance limits |
| [18-s4-voice-verification](validation/s4/18-s4-voice-verification.md) | Historical s4 experiment; original dates, failures, measurements and acceptance limits |
| [20-s4-streaming-validation](validation/s4/20-s4-streaming-validation.md) | Historical s4 experiment; original dates, failures, measurements and acceptance limits |
| [22-s4-application-optimization-validation](validation/s4/22-s4-application-optimization-validation.md) | Historical s4 experiment; original dates, failures, measurements and acceptance limits |
| [23-s4-v3-phone-retest-analysis](validation/s4/23-s4-v3-phone-retest-analysis.md) | Historical s4 experiment; original dates, failures, measurements and acceptance limits |
| [24-s4-v4-connection-and-ledger-validation](validation/s4/24-s4-v4-connection-and-ledger-validation.md) | Historical s4 experiment; original dates, failures, measurements and acceptance limits |
| [25-s4-v4-both-phone-analysis](validation/s4/25-s4-v4-both-phone-analysis.md) | Historical s4 experiment; original dates, failures, measurements and acceptance limits |
| [14-s5-platform-validation](validation/s5/14-s5-platform-validation.md) | Historical s5 experiment; original dates, failures, measurements and acceptance limits |
| [16-s5-acceptance](validation/s5/16-s5-acceptance.md) | Historical s5 experiment; original dates, failures, measurements and acceptance limits |

 Latest restricted Gateway closure is [recorded here](validation/s3/08-s3-gateway-verification.md#vgw-closure); failed negative-policy probes remain failed. S4 owner closure preserves its [phone testing limits](validation/s4/25-s4-v4-both-phone-analysis.md). [S5 acceptance](validation/s5/16-s5-acceptance.md) preserves operator exceptions. None closes a new Home/voice production gate.

 [Final readiness review](validation/documentation-baseline.md#final-readiness-review--2026-10-11): documentation ready to begin P0.1; new runtime gates remain pending.

 Current validation owners and blocking scope: [gate register](plans/implementation-plan.md#validation-register). First implementation: **P0.1 — synthetic connected scenarios and contract fixtures**.
