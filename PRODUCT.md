# Nilumi

Nilumi is a voice-first household assistant delivered as an installed PWA on iPhone and Android, with responsive desktop support. While cooking, preparing children for school or shopping, an adult can speak once to start a continuing foreground conversation. Nilumi responds aloud and leaves a useful, interactive result on Home.

Home is the main canvas: a brief when resting, conversation controls throughout, and one focused activity when doing something. A shopping checklist, school routine, schedule, comparison table, explanation or simple diagram can appear there. Switching topics focuses another activity; Recent preserves previous activities and their state. Speech can finish, be muted or interrupted without losing the visible result.

Voice, text and touch operate on the same activity. Users can check and uncheck items, correct a quantity, ask a follow-up, change a presentation or reopen a saved activity. The model composes trusted Nilumi components; backend services authorize actions and return receipts before the interface or speech reports success. A generated draft is not automatically a household fact or an approved change.

The planned MVP retains household memory, evidence, correction, forgetting, sharing, shopping lists, tasks, reminders, privacy and recovery. Briefs and approved suggestions follow those capabilities. Read-only Google Calendar is optional. English, Tamil and Tanglish speech are evaluated from the first prototype; full Tamil UI localization is deferred.

## Current status

The application is **unimplemented**. Existing work consists of spike code, scoped validation records, design tokens, fonts, helpers and static design references. The existing UI package has no reusable React component library yet. Earlier phone and provider tests establish only the behavior recorded in their evidence; they do not validate the new continuous voice or Home renderer.

Next.js/React, AI SDK and json-render are **selected for prototype**. Pipecat with Sarvam streaming, Saaras v4 realtime and Bulbul v3 Ritu are **selected for prototype**, subject to integration, multilingual, phone, hosting and cost gates. Production suitability is unvalidated.

## Delivery

[Product Plan](docs/core/01-product-plan.md) owns requirements and journeys. [Decisions](docs/adr/README.md) state the current baseline. The [Roadmap](docs/core/05-implementation-roadmap.md) and the single [detailed implementation plan](docs/plans/implementation-plan.md) prescribe P0–P8. Start with P0.1: define synthetic household scenarios and the activity/response contracts before building the Home prototype.

Target total operating cost remains at most ₹3,000/month, with a ₹5,000 ceiling and review above the target. Continuous conversation requires new measured cost projections; short-clip spike costs are not a monthly forecast. Existing provider and spending restrictions remain in force.

[Documentation reading order](docs/README.md) · [Design foundation](DESIGN.md) · [Evidence and disposition audit](docs/validation/documentation-baseline.md)
