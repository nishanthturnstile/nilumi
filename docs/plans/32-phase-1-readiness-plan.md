# 32 — Phase 1 readiness and UI review plan

> **Status:** Setup gaps resolved; remaining review and validation happen during the build; Phase 1 has not started · **Date:** October 10, 2026
> **Baseline reviewed:** `f279e2f` (application flows) and `be90fc5` (Pastel Rooms)

The owner has read and checked in the changes, but has not reviewed the screens
or components. Screen layouts, navigation arrangements, workflow steps and copy
remain open for that review. The existing Pastel Rooms design system is the fixed
foundation: room palettes, semantic tokens, typography, shape, elevation, motion,
visibility encoding and accessibility rules remain the basis for implementation.

This plan records readiness findings and recommended sequencing. It does not
approve the reference screens or supersede the product, architecture or ADRs.

## Current validation

| Area | Evidence and limit |
|---|---|
| Tokens and styling | `pnpm ui:check` passes: all 1,656 contrast checks, existing class lint and TypeScript. This is not an accessibility audit of the finished application. |
| Reference build | `pnpm ui:specimen` passes. The catalogue loads in the desktop preview with six room frames, typography, components and compact Admin. |
| Reusable components | Theme/font helpers exist. There are no reusable React primitives or Nilumi composites in `packages/ui` yet. The HTML/JS specimens are reference examples, not the production component library. |
| shadcn setup | **Resolved.** The pinned `4.21.4` CLI rejected the separate `base` key. Configuration now uses `style: "base-maia"`; `shadcn info --json` confirms Base UI and the package aliases, and the Button dry run/view resolves to `src/components/ui/button.tsx` using `@base-ui/react/button`. No component or dependency was installed and the token stylesheet was not changed. |
| Phone validation | The results in [31 Device QA](../design/31-device-qa.md) are blank. Keyboard, safe areas, Android Back, sheet gestures and installed-app rendering remain unverified for this design. Font-offline QA explicitly depends on Phase 1 precaching. |
| Application | `apps/web`, `apps/worker`, production contracts and CI do not exist yet. Root scripts currently validate/build the UI package only. |

The review-access change also passes the S1 lint/gateway guard, TypeScript,
all 372 existing tests and production build. Lint reports five existing warnings
in ignored local validation files. TypeScript initially encountered stale
`.next/dev/types` from before the design-check layout existed; removing that
generated cache allowed the unchanged type-check command to pass. The production
homepage → catalogue → full-screen path was verified in the shared browser;
mobile-width catalogue and a dark/200% Today spot check had no page overflow.
These checks do not replace owner review or the installed-phone matrix.

## Setup closure and work during the build

Owner direction: resolve the shadcn configuration and monorepo documentation now.
Screen/component review, missing references, phone QA and the remaining documentation
cleanup happen during the build; they are not additional prerequisites to starting
Phase 1. Keep their phase completion and privacy gates intact.

| Work | Concrete outcome |
|---|---|
| Review references — during build | Use Home → Design system for the catalogue and each room's full-screen link on desktop/mobile. Record Keep / Change / Missing for each screen and component, with the state and reason. “Checked in” must not imply “owner reviewed.” |
| Complete the P1 review inventory — during build | Review sign-in/code entry, basic onboarding, Today placeholder, Talk echo, profile navigation, Appearance, Devices/email change, Privacy acknowledgement and Admin members/traces/backups/evals as those screens are built. The current six room examples do not independently cover all these screens; add references where useful. |
| Reconcile repository placement — resolved | Architecture, Roadmap, Application Flows, ADRs and package guidance now agree: add `apps/web` and `apps/worker` to this existing monorepo; extend `packages/ui` in place, retaining specimens as references and spikes as reference projects. No new repository or replacement UI package is planned. |
| Repair component generation — resolved | The existing pinned CLI validates `style: "base-maia"`, selects Base UI and resolves the expected package paths. Button dry run/view confirms the target and primitive import without applying anything. Generated components still need the documented Nilumi customizations when added during the build, including the existing `cn` helper and token/focus/target rules. |
| Align remaining records — during build | Keep owner screen/component review pending and flow OQ-1/OQ-2 open for review. Update stale “voice undecided” copy in PRODUCT.md to the recorded Ritu selection, keeping latency acceptance deferred. Mark doc 17 as historical gateway/voice preparation and link its current closure evidence rather than treating it as the complete Phase 1 implementation plan. |
| Run phone shell QA — during build | Record results for both installed phones using Design check. Carry platform fixes into the shell; rerun against the Phase 1 app at the final origin. Keep row 15 (font precache) for Phase 1. |

Phase 1 can start with workspace/tooling and the application foundation. Review
and adjust each screen during the build rather than freezing the whole MVP
reference first. This setup fix does not itself scaffold the application.

## Changes to make explicit in Phase 1

| Order | Work package | Completion evidence |
|---|---|---|
| 1 | Workspace and tooling: `apps/web`, `apps/worker` and required packages; Node 24 LTS and pnpm 12.9.1; pin Biome, commit root config, add CI lint/typecheck/test/build commands. Retain the UI contrast/class gates. | Clean install and production builds from the lockfile; required checks run in CI. Keep spikes as reference projects. |
| 2 | Minimal shared React primitives, added as needed: buttons, fields/inputs, cards, feedback/empty/loading states, menus and accessible overlays. Record Maia customizations. | Live examples render the actual exported components, with keyboard/focus, disabled/loading/error, dark mode, Tamil, reduced motion and 200% text checks. |
| 3 | Reusable shell: header/navigation, room/theme/text-scale bootstrap, keyboard positioning, safe areas, toast host, history-aware overlays and responsive layout. | No initial theme flash; correct portal room and Android theme-color; mobile keyboard/Back behavior passes. Choose tab state/scroll restoration during implementation and document it. |
| 4 | Identity and privacy screens: bootstrap/invitations, sign-in, onboarding, own Devices and email change, Appearance, household acknowledgement and minimal Admin. | Existing AUTH/BOOT/SEC/ACK scenario IDs pass, including admin boundaries and revocation. Re-record the acknowledgement in the new app; the spike's record is not copied. |
| 5 | Today placeholder and Talk echo with production turn ledger, STT boundary, secret handling, retry/resume and stage timings. | Voice/text yield honest transcript/echo outcomes. Today shows real available state. No memory/list writes, answers or invented brief items. |
| 6 | Worker/deployment safety: isolated production/staging databases and origins, member-scoped access, gateway controls, speech adapter gates, backups/forget journal and recovery/rollback rehearsal. | Both-phone P1 demo, privacy/secret/second-household isolation tests, retry proof, restore and compatible rollback evidence. |

Package boundaries should make screen revisions cheap:

- `packages/ui` owns reusable visual and interaction components and the existing tokens.
- `apps/web` owns routing, screen composition and feature data wiring. UI components should receive data and callbacks rather than import auth, database or provider clients.
- `packages/contracts` owns versioned card/event contracts such as `nilumi-ui/1`; the trusted app renderer maps those contracts to UI components. Model text remains text, never HTML.

Extend validation deliberately: the current class lint scans TS/JS/HTML, but does
not scan CSS or reject arbitrary raw color values. Pinning Biome and closing those
token-policy gaps belong in the tooling work, without introducing duplicate
formatters. Add targeted behavior tests for complex shared interactions and privacy
boundaries; static examples alone cannot verify focus management or history.

Appearance controls belong in P1 because theme and 100–200% text scale are already
part of the accepted foundation. Establish service-worker/update behavior and
precache Latin/Tamil fonts with the P1 shell. Member data caches and mutation queues
arrive with the capabilities that use them; preserve the session-loss/sign-out
boundary in the foundation.

## Scope and decisions to keep open

The proposed current P1 navigation is Today + Talk, with a profile menu. Its layout
is awaiting owner review. Do not expose disabled future tabs or let the full-MVP
specimen imply that Lists, Memory, Tasks, Inbox or Calendar already work.

All-AI withdrawal is a P1 hard requirement, including STT and TTS, with queued
dispatch checks. The complete deterministic fallback command set and saved-to-Inbox
behavior are P6 work, after those domain features exist. P1 must show an honest
paused/error state and keep supported non-AI surfaces usable.

OQ-21 (desktop use) is the existing P1 product question: the recommended baseline
is the same sign-in and features at desktop widths, without desktop push. Confirm
that in the review; the desktop Admin specimen already assumes it. OQ-6 (unsynced
account switching), conversation reset/clarification/health confirmation and
visibility changes remain P2 decisions; reminder actions remain P5; Today sections,
brief timing, calendar and suggestions remain P6A decisions.

Full memory/history/evidence flows, list/task actions, calendar connections,
approval execution and a final brand mark remain in their existing phases or
separate design tasks. Adapt their reviewed screens to this same design system
when they ship. S3 application latency, S4 full phone latency acceptance and the
broader production privacy gate retain their recorded deferred status.
