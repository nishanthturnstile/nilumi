# Device QA

 New Home/runtime installed-phone results are **unverified**. Existing S1/S4 acceptance covers only the builds and harness paths in those records. Static design-check room screens remain references; they cannot prove continuous conversation or generated Home.

 Owner: builder records build/version/device/network/language/date, exact steps, expected/actual outcome and failures; both adults assess usefulness/correction effort. Record iPhone and Android separately. Each pending row below is phase-owned and blocks the applicable release gate, not this documentation revision.

| Check| Phase| Installed iPhone| Installed Android|
|---|---|---|---|
| Foreground tap/session and permission| P0/P2| Pending| Pending|
| English/Tamil/Tanglish names, quantities and noise| P0/P8| Pending| Pending|
| Complete-turn visible/audio p50/p95 and failures| P0/P8| Pending| Pending|
| Barge-in, stop/mute/replay and late audio fencing| P0/P2| Pending| Pending|
| Topic switch/Recent and app reopen restoration| P0/P2| Pending| Pending|
| Check/uncheck and renderer view changes| P0/P3| Pending| Pending|
| Keyboard/composer/safe areas at 200%| P2/P8| Pending| Pending|
| Dark mode/contrast/Tamil/reduced motion| P2/P8| Pending| Pending|
| Screen reader/keyboard focus stable on patches| P2/P8| Pending| Pending|
| Tables/timelines/diagram text alternative| P0/P2| Pending| Pending|
| Background/lock/call media release/resume| P0/P2| Pending| Pending|
| Autoplay block and gesture replay| P0/P2| Pending| Pending|
| Session loss/device revoke/account switch| P1/P2| Pending| Pending|
| Offline Home approved projection/privacy| P3/P4| Pending| Pending|
| Queued opposing edits/conflicts across phones| P3| Pending| Pending|
| Fonts/shell precache and offline launch| P2| Pending| Pending|
| PWA update while pending operations| P2/P3| Pending| Pending|
| Web Push receipt/deep link/quiet hours| P5/P8| Pending| Pending|
| AI paused and provider outage| P1/P8| Pending| Pending|
| Forget/unshare invalidates visuals/audio/cache| P4/P8| Pending| Pending|

 Desktop responsive/keyboard preview is supplementary. Each failing row records scope and follow-up in its phase evidence; never fill a phone cell from desktop/mobile-width simulation. Gates and acceptance floors are in the [implementation plan](../plans/implementation-plan.md#validation-register).

## Reconciled completed observations from former document 32

Dated historical evidence reconciled on 2026-10-10. These observations describe the existing spike or design reference only. Future work is owned by the [implementation plan](../plans/implementation-plan.md).



| Area| Evidence and limit|
|---|---|
| Tokens and styling| `pnpm ui:check` passes: all 1,656 contrast checks, existing class lint and TypeScript. This is not an accessibility audit of the finished application.|
| Reference build| `pnpm ui:specimen` passes. The catalogue loads in the desktop preview with six room frames, typography, components and compact Admin.|
| Reusable components| Theme/font helpers exist. There are no reusable React primitives or Nilumi composites in `packages/ui` yet. The HTML/JS specimens are reference examples, not the production component library.|
| shadcn setup| **Resolved.** The pinned `4.21.4` CLI rejected the separate `base` key. Configuration now uses `style: "base-maia"`; `shadcn info --json` confirms Base UI and the package aliases, and the Button dry run/view resolves to `src/components/ui/button.tsx` using `@base-ui/react/button`. No component or dependency was installed and the token stylesheet was not changed.|
| Phone validation| The results in [31 Device QA](../design/31-device-qa.md) are blank. Keyboard, safe areas, Android Back, sheet gestures and installed-app rendering remain unverified for this design. Font-offline QA explicitly depends on Phase 1 precaching.|
| Application| `apps/web`, `apps/worker`, production contracts and CI do not exist yet. Root scripts currently validate/build the UI package only.|

The review-access change also passes the S1 lint/gateway guard, TypeScript,
all 372 existing tests and production build. Lint reports five existing warnings
in ignored local validation files. TypeScript initially encountered stale
`.next/dev/types` from before the design-check layout existed; removing that
generated cache allowed the unchanged type-check command to pass. The production
homepage → catalogue → full-screen path was verified in the shared browser;
mobile-width catalogue and a dark/200% Today spot check had no page overflow.
These checks do not replace owner review or the installed-phone matrix.
