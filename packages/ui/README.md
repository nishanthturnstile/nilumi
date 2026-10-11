# @nilumi/ui — Nilumi visual foundation

Existing tokens/fonts/helpers and static specimens are **implemented**. Reusable React primitives/composites and the dynamic Home renderer are **planned for MVP**; they do not exist yet. Extend this package in the existing workspace. [Design guidance](../../docs/design/29-design-system.md), [ADR-056](../../docs/adr/adr-056.md) and [P0/P2 implementation](../../docs/plans/implementation-plan.md) own upcoming work.

## Existing files and commands

| File | Responsibility |
|---|---|
| [globals.css](src/styles/globals.css) | Normative unchanged OKLCH tokens, legacy room scopes, dark mode, mappings/utilities/motion |
| [fonts.ts](src/fonts.ts) | Nunito/Noto Sans Tamil contract, splitTamilRuns, scale 100/115/130/150/175/200 |
| [utils.ts](src/lib/utils.ts) | cn helper |
| [theme.ts](src/lib/theme.ts) | themeBootScript, roomForPath, initTheme, setRoom/setTheme/setTextScale/syncThemeColor |
| [components.json](components.json) | Pinned shadcn 4.21.4 style:base-maia, Base UI and Phosphor configuration |
| specimen/ | Existing static reference screens built from the real stylesheet; not application routes |

Planned src/components/ui and src/components/nilumi exports are patterns, not files currently present. Planned apps/web will consume them; no replacement UI package or new repository.

From repository root:

```sh
npx pnpm@12.9.1 install
npx pnpm@12.9.1 ui:check
npx pnpm@12.9.1 ui:contrast
npx pnpm@12.9.1 ui:specimen
pnpm --dir packages/ui exec shadcn info --json
pnpm --dir packages/ui exec shadcn add @shadcn/button --dry-run
```

ui:check runs contrast, class lint and TypeScript. Contrast currently checks 1,656 combinations. ui:specimen builds the existing reference stylesheet. Dry-run does not install a component. Preserve current commands/tooling; production P1 pins Biome for supported files and avoids multiple formatters.

## Future application integration

P1 creates apps/web and contracts; P2 adds real components and Home. Import @nilumi/ui/globals.css, configure Tailwind source scanning for the workspace, load Nunito/Noto Sans Tamil via Next font, transpile the package and include it in standalone file tracing. Initialize theme/text scale before paint and inherit html tokens into portals.

Existing roomForPath maps old specimen routes. The Home adapter in future implementation must set the contextual activity accent deliberately using the existing token scopes; this helper is not evidence of required five-tab navigation. Keep today/lists/talk/tasks/memory names as compatibility tokens until a separately reviewed source change. No helper/token/specimen code changed in this revision.

## Component ownership and renderer

Nilumi owns customized Base UI/maia primitives, composer, status, Recent, activity frame, receipts/evidence/approval and catalogue React components. Use the pinned CLI and re-diff customizations on update. json-render/AI SDK composition remains planned; it uses bounded schemas and server-issued action refs, never arbitrary model HTML or permission.

Checklists use stable domain IDs and explicit desired checked state; tables reflow without page overflow; timelines/diagrams have accessible linear alternatives. Preserve focus during streamed layout updates. Visible text remains after speech. Listening, processing, speaking, interrupted/disconnected and AIpaused include accessible status; Mute/Stop/Replay/End are distinct.

## Validation

Keep token/font/contrast/accessibility foundation, scale type only 100–200%, large targets, visible focus, reduced motion and mixed Tamil text. Existing desktop/static checks do not establish installed Home behavior. [Device QA](../../docs/design/31-device-qa.md) owns phone observations; P0/P2/P8 own renderer, keyboard/Back/safe areas/focus/media/update and offline-font evidence. Source/specimen changes belong to those phases.
