# @nilumi/ui — Pastel Rooms design system

Tokens, theme and components for Nilumi. The spec is [docs/design/29-design-system.md](../../docs/design/29-design-system.md), and the decision is [ADR-056](../../docs/adr/adr-056.md).

This is the production UI package for the existing Nilumi monorepo. Phase 1
extends it in place and adds `apps/web` and `apps/worker` alongside it; it does not
create another repository or a replacement UI package. `src/` holds the shared
tokens, helpers and reusable components. `specimen/` holds the review references;
its sample screens are not application routes. Feature screens and data wiring
belong in `apps/web`.

## What's here

| Path | Purpose |
|---|---|
| `src/styles/globals.css` | **Single source of truth**: OKLCH tokens, room scopes, dusky dark mode, shadcn mapping, Tailwind `@theme`, base, utilities, motion |
| `src/fonts.ts` | Font contract (Nunito + Noto Sans Tamil), Tamil-run splitter, text-scale steps |
| `src/lib/utils.ts` | `cn()` |
| `src/lib/theme.ts` | `themeBootScript`, `setRoom`, `setTheme`, `setTextScale`, `syncThemeColor` |
| `src/components/ui/` | shadcn/ui primitives (Base UI), added with `shadcn add` as features need them |
| `src/components/nilumi/` | Nilumi composites (tab tray, result card, evidence chip…) from Phase 1 |
| `scripts/check-contrast.mjs` | Contrast gate: 69 pairs × 6 rooms × light/dark × phone/desktop |
| `scripts/check-classes.mjs` | Class lint: default palette, translucent focus rings, raw radius vars |
| `specimen/` | Static visual specimen built from the real `globals.css` |
| `components.json` | shadcn config: `style: base-maia` (Base UI + Maia fork), `iconLibrary: phosphor` |

## Commands (from the repo root)

```sh
npx pnpm@12.9.1 install
npx pnpm@12.9.1 ui:check        # contrast gate + class lint + typecheck — must pass before any token change
npx pnpm@12.9.1 ui:contrast     # contrast gate only (1,656 checks)
npx pnpm@12.9.1 ui:specimen     # builds specimen/dist/specimen.css; open specimen/index.html
pnpm --dir packages/ui exec shadcn info --json  # validates config and shows Base UI + resolved paths
pnpm --dir packages/ui exec shadcn add @shadcn/button --dry-run # previews generation only
```

Use the locally pinned shadcn CLI (`pnpm exec shadcn`) for reproducible generation.
Its config encodes the primitive library in `style: "base-maia"`; there is no
separate `base` field. Plain `"maia"` selects Radix in this CLI, so it is not an
equivalent replacement. This matches the [official schema](https://ui.shadcn.com/schema.json).

## Using it in apps/web (Phase 1)

1. **Fonts** — in `app/fonts.ts`:

   ```ts
   import { Nunito, Noto_Sans_Tamil } from "next/font/google";
   export const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
   export const notoTamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-noto-tamil", display: "swap" });
   ```

2. **Styles** — in `app/globals.css`:

   ```css
   @import "@nilumi/ui/globals.css";
   @source "../../../packages/ui/src";
   ```

   Tailwind v4 skips symlinked `node_modules`, so the package's classes need an explicit `@source`.

3. **`next.config.ts`** — set `transpilePackages: ["@nilumi/ui"]` and `outputFileTracingRoot` at the repo root (standalone output).

4. **`<html>` before paint** — inline `themeBootScript` from `@nilumi/ui/lib/theme` in `<head>`, put the `next/font` variable classes on `<html>`, and give `<html>` `suppressHydrationWarning` (the script changes its class, style and data attributes). The root layout can't see the pathname, so the script derives `data-room` from `location.pathname` (`roomForPath`: `/` is Today, `/lists`… are rooms, everything else is linen).
   - Server-render `themeColor` as a light/dark media pair of the first room's floors, so Android's first frame matches in either system theme.
   - After hydration call `initTheme()` once: it syncs `theme-color` and, while the preference is "system", follows OS theme changes live.
   - Then use `setRoom(roomForPath(pathname))` on navigation, `setTheme("system" | "light" | "dark")` and `setTextScale(100…200)`.
   - `setRoom` keeps `<meta name="theme-color">` in sync for Android: it reads the room's **target** floor and converts it to hex.
   - `setTheme` stops the floor gliding between themes.
   - Do **not** set `apple-mobile-web-app-status-bar-style`. Next's `appleWebApp` metadata always emits it (as `default`), so leave `appleWebApp` unset (or `null` in a nested layout) and add the title via `other: { "apple-mobile-web-app-title": "Nilumi" }`; standalone display comes from the manifest.
   - Keep the keyboard contract: a `visualViewport` hook writes `--keyboard-inset` on `<html>` (see `spikes/s1/app/design-check/page.tsx`).
   - Server-render `data-tray="flat"` on `<html>` while the tray has fewer than 3 tabs (no raised Talk tab), which zeroes `--tray-overhang`.

5. **Shell** — paint the page with `bg-room-floor` (already on `html` and `body`), and keep components on `bg-background` / `bg-card` (white).

6. **`components.json`** in apps/web — use the same `style: "base-maia"` and Phosphor configuration. Point the shared UI/utils aliases at `@nilumi/ui/...`, while screen/component aliases remain local to the app. Preview each addition to verify reusable primitives land here and feature compositions land in the app ([monorepo guidance](https://ui.shadcn.com/docs/monorepo)).

## Reviewing the references

The S1 homepage's **Design system** link opens the full catalogue at
`/design-system/index.html`; **Design check** opens the separate real-device shell
harness. Each room has an **Open full screen** link for reviewing at the actual
desktop or mobile browser width, retaining theme, text size and tray phase.
Screens and component examples await owner review. The six room examples are not
the complete application screen inventory.

The spike's dev/build commands compile and copy the catalogue from this package
into ignored public assets. Install the root workspace and spike dependencies
before starting it; see [the spike README](../../spikes/s1/README.md).

## Rules for components

- **Never accept the CSS patch** that `shadcn init` or `shadcn add` proposes for `globals.css`. It adds a white `body` and a translucent outline; `shadcn/tailwind.css` is already imported.
- Inspect generated imports and dependencies before applying them. Registry previews may import `cn` from the `cn` package; use the existing `@nilumi/ui/lib/utils` helper instead of adding a duplicate utility dependency.
- Tokens only. Tailwind's default palette is removed (`--color-*: initial`) and `pnpm ui:lint-classes` rejects default-palette classes. Need a colour? Add a token to `globals.css` and run the contrast gate.
- Focus is the global opaque outline. Remove Maia's `focus-visible:ring-*`, `outline-ring/50` and focus border-colour changes. Wrapped fields: mark the inner control `data-focus-delegate` and the wrapper `data-focus-ring-within` (shadcn's `data-slot="input-group"`/`"input-group-control"` are already recognised). Inside navy surfaces (toasts), the inverse ink applies automatically (`.bg-primary`, `[data-surface="inverse"]`, or the `focus-inverse` utility).
- Replace Maia's `bg-black/*` overlays with `bg-scrim`, white/black text with semantic foregrounds, and delete any `backdrop-blur` (the class lint flags all three). Stock `shadow-*` steps and `sm:`/`md:`/`lg:` breakpoints are already aliased to the system, but prefer `shadow-card|float|overlay` and `medium:`/`expanded:`/`wide:` in edited files.
- 48px targets (`min-h-(--control-height)` instead of Maia's `h-9`); `touch-target` for small visuals.
- Every state: hover (desktop), focus-visible, pressed, disabled, loading, error, empty.
- Check each component in dark mode, under reduced motion, with Tamil text and at 200% text (`data-text-scale="200"`).
- Portalled content (Drawer, Toast, Dialog, Popover, Select) inherits the room from `<html>`.
- Use `rounded-*` utilities, never `var(--radius-*)`. Use window classes `medium:`, `expanded:` and `wide:`.
- Source-room colour on cards: `bg-lists-tint text-lists-ink` for a Lists item on any screen.
- Visibility badges are shape-coded: Household = `bg-household`; Shared = solid `border-visibility-outline`; Private = dashed `border-visibility-outline`.

## Customised-files register

The Maia style is a **starting fork**: shadcn components are edited in place. Every edited file is listed here and re-diffed (`npx shadcn diff <component>`) whenever shadcn updates it.

| File | Customisation | Base version |
|---|---|---|
| _(none yet — components arrive with Phase 1 features)_ | | |

Planned first edits:
- **Button:** `tonal` and `voice` variants, `min-h-(--control-height)`, pill shape, destructive-soft default, `hover:bg-primary-hover`, `disabled:opacity-40`, no translucent ring.
- **Badge:** `household`, `shared` and `private` variants.
- **Input, Textarea, Select, Combobox, outline Button:** `bg-background` instead of `bg-input/30`, 52px pill, `text-base` at every size.
- **Drawer:** `bg-scrim` (not `bg-black/80` with `backdrop-blur-xs`), `z-(--z-overlay)`, snap points, history-back wrapper.
- **Toast:** `bg-primary text-primary-foreground`, `z-(--z-toast)`, above `--tray-height`, 8–10s duration, pause on interaction, `voice-on-action` action colour.
