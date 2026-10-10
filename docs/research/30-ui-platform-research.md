# Nilumi Design-System Research Report

**Compiled:** 10 October 2026. **Scope:** shadcn/ui + icon libraries, cross-platform PWA UI frameworks, motion/gesture/haptics, CSS platform capabilities, 2025–26 design trends, Tamil+Latin typography, and iOS 26/Android 2026 PWA specifics — for Nilumi, a voice-first Next.js 16 (App Router, Turbopack) + React 19.2 + Tailwind v4 + shadcn/ui + TanStack Query v5 + Serwist + Zod 4 PWA.

**Method:** Primary sources wherever possible — GitHub repos/releases/commit metadata (via the GitHub REST API, fetched live), npm registry JSON, official docs (ui.shadcn.com, base-ui.com, caniuse.com, MDN, webkit.org/blog, developer.chrome.com, developer.android.com, react.dev, Apple/Google developer blogs), WebKit Bugzilla and Chromium Issue Tracker entries. Every non-trivial claim below is cited inline as `[Source: URL]` with a date/version where available. Anything not confirmed against a primary source is explicitly flagged **UNVERIFIED**. This report synthesizes direct research plus seven parallel deep-research passes, cross-checked and corrected against primary sources during compilation (corrections from sub-agent drafts are noted where they occurred).

---

## Executive summary (decision-relevant facts)

- **shadcn/ui now ships three interchangeable primitive "bases" — Radix UI, Base UI, and React Aria Components** — selectable via `npx shadcn create` (a real, officially-announced CLI feature, Dec 2025) or `npx shadcn init --base <radix|base|aria>`. **Base UI became the default for new projects in July 2026**; Radix remains fully supported. [Source: ui.shadcn.com/docs/changelog/2026-07-base-ui-default; github.com/shadcn-ui/ui changelog `2025-12-shadcn-create.mdx`, `2026-01-base-ui.mdx`, `2026-07-react-aria.mdx`]
- shadcn/ui also ships **8 named visual style presets** (Vega, Nova, Maia, Lyra, Mira, Luma, Sera, Rhea) that are **orthogonal to the primitive choice** — any style can pair with any base. [Source: github.com/shadcn-ui/ui `apps/v4/registry/styles.tsx`, `apps/v4/app/globals.css`, commit `c2a67849`]
- **Vaul (the Drawer dependency) is functionally in maintenance mode**: latest npm release `v1.1.2` is from **14 Dec 2024** (~22 months old) and the GitHub repo's last code push was **3 Oct 2025** (~1 year stale), with 164 open issues. [Source: registry.npmjs.org/vaul; api.github.com/repos/emilkowalski/vaul] shadcn/ui has since **shipped Base UI's own native Drawer/Sheet** (`ui.shadcn.com/docs/components/drawer` now serves the Base UI version), which has snap points, velocity-aware swipe-to-dismiss release (tuned for 120 Hz/ProMotion displays), edge-swipe `SwipeArea`, and virtual-keyboard awareness — a materially more capable, actively-developed alternative to Vaul for Nilumi's bottom sheets. [Source: base-ui.com/react/components/drawer; api.github.com/repos/mui/base-ui/releases/latest]
- **Sonner is actively maintained** (v2.0.8, 9 Aug 2026) **and shadcn/ui shipped a second, Base-UI-native Toast component in July 2026** with swipe-dismiss support. [Source: api.github.com/repos/emilkowalski/sonner/releases; ui.shadcn.com/docs/changelog/2026-07-toast]
- **No single existing React library perfectly replicates native iOS/Android bottom-sheet gestures while staying Tailwind/RSC-friendly** — but Base UI's Drawer (reachable through shadcn/ui, zero new dependency) and Ark UI's Drawer are the two best-fitted, most actively maintained options for Nilumi; full mobile frameworks (Ionic, Framework7) bring router/Shadow-DOM conflicts with Next.js App Router.
- **React's `<ViewTransition>` is stable only as of React 19.3 (9 Sept 2026)**, not 19.2 as the brief assumed — Next.js 16 shipped it earlier only via an internally-pinned React Canary. [Source: react.dev/blog/2026/09/09/react-19-3; react.dev/blog/2025/10/01/react-19-2]
- **iOS Safari still has zero Vibration API support** and **no edge-swipe-back gesture in standalone PWAs** (by design — there's no browser chrome to swipe from). The `<input type="checkbox" switch>` haptic trick was further locked down in **iOS 26.5** to require a genuine direct tap on a real (even if visually hidden) switch element — it cannot drive arbitrary custom-interaction haptics. [Source: caniuse.com/mdn-api_navigator_vibrate; firt.dev/pwa-design-tips; github.com/lochie/web-haptics issue #41]
- **iOS 26 made every Home-Screen-added site open as a standalone web app by default** (a 17-year-old behavior change), but this triggered a cluster of entangled, still-open WebKit bugs around the status-bar meta tag, `100vh`/`100lvh`, and overscroll in standalone mode that need direct device QA. [Source: webkit.org/blog/17333; bugs.webkit.org 301994, 316008, 317153]
- **Android Chrome's edge-to-edge support for *installed* PWAs/TWAs is still broken** as of late 2026 (tracked, in-progress, not yet shipped to Stable), even though the same feature has worked for browser tabs since Chrome 135. [Source: Chromium Issue 407420295; developer.chrome.com/docs/css-ui/edge-to-edge]
- For Tamil-readiness: **Noto Sans / Noto Sans Tamil is the lowest-risk pairing** (identical variable-font axes, Android's own system Tamil fallback *is* this exact family), while **Anek Latin / Anek Tamil** is a stronger-personality alternative also designed Tamil-first-in-parallel rather than Latin-first. Both are OFL, variable, and available via `next/font/google` with a `tamil` subset. [Source: fonts.google.com METADATA.pb for `notosans`/`notosanstamil`/`anektamil`; AOSP `fonts.xml`]

---

## 1. shadcn/ui current state (October 2026)

### 1.1 Multi-primitive support, `shadcn create`, and style presets

**Correction to a common misconception:** shadcn/ui supports **three** interchangeable primitive/"base" libraries, not two — confirmed directly from the registry source:

```ts
// apps/v4/registry/bases.ts (shadcn-ui/ui, commit c2a67849be260701852b0977ba15eb5f3a0ce2a4)
export const BASES = [
  { name: "base",  title: "Base UI",    dependencies: ["@base-ui/react"] },
  { name: "aria",  title: "React Aria", dependencies: ["react-aria-components"] },
  { name: "radix", title: "Radix UI",   dependencies: ["radix-ui"] },
]
```
[Source: github.com/shadcn-ui/ui/blob/c2a67849/apps/v4/registry/bases.ts]

Timeline, from the project's own changelog (fetched directly from the MDX source files in the repo):

| Date | Change | Source |
|---|---|---|
| 2024-11-06 | New-York style switches its default icon set to **Lucide** | `changelog/2024-11-icons.mdx` |
| 2025-02-06 | Registry schema updated: flat JSON registry items, custom styles/tokens/themes/CSS-vars/hooks/animations distributable via the CLI | `changelog/2025-02-registry-schema.mdx` |
| 2025-10-03 | **7 new components**: Spinner, Kbd, Button Group, Input Group, Field, Item, Empty | `changelog/2025-10-new-components.mdx` |
| **2025-12-12** | **`npx shadcn create` launches.** Pick component library (Radix or Base UI at launsh), icons, base color, theme, fonts. 5 new visual styles introduced (Vega, Nova, Maia, Lyra, Mira). Every component rebuilt for Base UI. Available for Next.js, Vite, TanStack Start, v0 | `changelog/2025-12-shadcn-create.mdx` |
| 2026-01-20 | Full dedicated documentation for Base UI shipped for every component (side-by-side with Radix) | `changelog/2026-01-base-ui.mdx` |
| 2026-03 / 2026-04 / 2026-05 | **Luma**, **Sera**, **Rhea** styles added (bringing the total to 8) | `changelog/2026-03-luma.mdx`, `2026-04-sera.mdx`, `2026-05-rhea.mdx` |
| **2026-07-17** | **React Aria Components** becomes a first-class third base (`--base aria`), available across all 8 styles | `changelog/2026-07-react-aria.mdx` |
| **2026-07-23** | **Base UI's `<default>` becomes the default base for new projects** ("New projects now use Base UI by default. Radix is still fully supported.") | `changelog/2026-07-base-ui-default.mdx` |
| 2026-07-23 | New **Toast** component built on Base UI primitives (actions, status types, promises, stacking, **swipe dismissal**) | `changelog/2026-07-toast.mdx` |

[All rows: github.com/shadcn-ui/ui, path `apps/v4/content/docs/changelog/*.mdx`, commit `c2a67849`, fetched 10 Oct 2026]

**`npx shadcn create` is real** — this corrects an initial research pass that (incorrectly, based on only reading the CLI's command list) concluded no such command exists. The announcement post is unambiguous: *"Today, we're changing that: **npx shadcn create**. Customize Everything. Pick your component library, icons, base color, theme, fonts and create your own version of shadcn/ui."* [Source: ui.shadcn.com/docs/changelog/2025-12-shadcn-create, dated 2025-12-12] In practice this resolves to the hosted picker at `ui.shadcn.com/create`, which hands back a generated `npx shadcn init <url>` invocation — so both framings ("there's a `create` verb" and "`init` is the real CLI entry point") are true depending on which layer you look at; the CLI's registered subcommands are `init, apply, add, diff, docs, view, search, migrate, eject, info, build, mcp, preset, registry` [Source: `packages/shadcn/src/index.ts`], and `create`/`shadcn create` is the documented, user-facing name for the whole flow.

**Style presets are independent of primitive choice.** The 8 named styles — **Vega** (classic look), **Nova** (compact/reduced padding, Lucide+Geist, current CLI default style), **Maia** (soft/rounded/generous spacing, Hugeicons+Figtree), **Lyra** (boxy/sharp, pairs with mono fonts, Phosphor+JetBrains Mono), **Mira** (compact/dense, Hugeicons+Inter), **Luma**, **Sera** (editorial, Noto Sans+Playfair Display), **Rhea** — each bundle a default icon library + font, but can be combined with **any** of the three bases. The monorepo literally builds every `{base}-{style}` combination (`base-vega`, `radix-nova`, `aria-sera`, …) as separate `@source` globs in `globals.css`. [Source: `apps/v4/registry/styles.tsx`, `apps/v4/packages/shadcn/src/preset/defaults.ts`, `apps/v4/app/globals.css`]

### 1.2 Tailwind v4 theming conventions — exact CSS variables (verbatim from the live source)

Fetched directly: `apps/v4/app/globals.css` (ui.shadcn.com's own stylesheet, commit `c2a67849`). Confirms `@import "tailwindcss"`, `@import "tw-animate-css"` (still the current animation-utilities import — **not** the older `tailwindcss-animate` plugin), `@custom-variant dark (&:is(.dark *))`, plus one `@custom-variant style-<name>` per style preset, and a `@theme inline { ... }` block. [Source: github.com/shadcn-ui/ui/blob/c2a67849/apps/v4/app/globals.css]

**Full `@theme inline` → CSS variable mapping (verbatim):**

```css
@theme inline {
  --breakpoint-3xl: 1600px;
  --breakpoint-4xl: 2000px;
  --font-sans: var(--font-sans);
  --font-heading: var(--font-heading);
  --font-mono: var(--font-mono);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
  --color-background / --color-foreground
  --color-card / --color-card-foreground
  --color-popover / --color-popover-foreground
  --color-primary / --color-primary-foreground
  --color-secondary / --color-secondary-foreground
  --color-muted / --color-muted-foreground
  --color-accent / --color-accent-foreground
  --color-destructive / --color-destructive-foreground
  --color-border / --color-input / --color-ring
  --color-chart-1 … --color-chart-5
  --color-sidebar / --color-sidebar-foreground / --color-sidebar-primary /
    --color-sidebar-primary-foreground / --color-sidebar-accent /
    --color-sidebar-accent-foreground / --color-sidebar-border / --color-sidebar-ring
  --color-surface / --color-surface-foreground        /* NEW vs. older docs */
  --color-code / --color-code-foreground / --color-code-highlight / --color-code-number  /* NEW, docs-site specific */
  --color-selection / --color-selection-foreground    /* NEW vs. older docs */
}
```

**Two newer variable groups not in the commonly-cited older variable list:** `--surface`/`--surface-foreground` (a tertiary neutral surface distinct from `--card`/`--popover` — useful for Nilumi's layered card-on-card patterns) and `--selection`/`--selection-foreground` (drives `::selection` styling). `--code-*` variables are docs-site-specific (syntax highlighting) and not relevant to a product app. [Source: same file]

**`:root` values confirm OKLCH usage throughout, in the `oklch(L C H)` / `oklch(L C H / A%)` syntax**, e.g. `--background: oklch(1 0 0); --destructive: oklch(0.577 0.245 27.325); --border: oklch(1 0 0 / 10%)` (dark mode). `--radius: 0.625rem` is the single base token all `--radius-*` scale steps derive from via `calc()`. Chart colors (`--chart-1..5`) resolve to Tailwind's own blue palette steps (`var(--color-blue-300)` through `var(--color-blue-800)`) rather than hand-picked hex/OKLCH values — i.e., they're generated from the Tailwind v4 default color scale, not bespoke. [Source: same file, `:root` and `.dark` blocks]

Notable **non-color** utility/base-layer conventions also present in the live stylesheet, useful as patterns for Nilumi: a `@supports (font: -apple-system-body) and (-webkit-appearance: none)` feature-detect block (iOS/WebKit-only CSS branching), `@utility extend-touch-target` (expands touch hit-area via `::after` without visually resizing the element — directly useful for Nilumi's tab bar/swipe-row hit targets), and `html { @apply overscroll-y-none; }` globally with `[data-slot="layout"] { @apply overscroll-none; }` on specific regions. [Source: same file, `@layer base` / `@utility` blocks]

### 1.3 Newer components (Field, InputGroup, ButtonGroup, Empty, Spinner, Kbd, Item) + Toast

Shipped **3 October 2025** as a batch of 7, explicitly designed to be **primitive-agnostic** ("These components work with every component library, Radix, Base UI, React Aria, you name it"). Verbatim from the changelog source: [Source: github.com/shadcn-ui/ui `apps/v4/content/docs/changelog/2025-10-new-components.mdx`]

| Component | Purpose | Key sub-parts |
|---|---|---|
| **Spinner** | Loading indicator | — |
| **Kbd** / **KbdGroup** | Renders a keyboard key / group of keys (e.g. shortcut hints) | `Kbd`, `KbdGroup` |
| **Button Group** | Groups related buttons with consistent styling; supports nesting, split buttons via `ButtonGroupSeparator`, and prefix/suffix text/buttons around inputs | `ButtonGroup`, `ButtonGroupSeparator`, `ButtonGroupText` |
| **Input Group** | Adds icons, buttons, labels, tooltips around inputs/textareas; composes with Spinner | `InputGroup`, `InputGroupAddon`, `InputGroupInput` |
| **Field** | "One component, all your forms" — unifies labels/descriptions/errors across Server Actions, React Hook Form, TanStack Form, or bare HTML; supports `orientation="responsive"` (container-width-based vertical/horizontal switching) and a selectable "choice card" pattern via `FieldLabel` wrapping | `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldSet`, `FieldLegend` |
| **Item** | Generic flex container for list rows / cards (icon or avatar media + title + description), supports `asChild` for link rendering and `ItemGroup` for lists | `Item`, `ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemGroup` |
| **Empty** | Empty-state pattern (icon/avatar + title + description + CTA), composes with Input Group for e.g. empty search results | `Empty`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent` |

**Directly relevant to Nilumi:** `Item`/`ItemGroup` is a strong fit for shopping-list rows and Lists/Tasks cards; `Empty` is a ready-made pattern for "no items yet" / "inbox zero" states; `Field` with `orientation="responsive"` suits approval-card and settings forms that need to adapt between mobile (stacked) and desktop (two-column) layouts without separate markup.

**Toast** (not part of the Oct 2025 batch) shipped **23 July 2026** as a *second*, Base-UI-native toast implementation living alongside Sonner: *"A new Toast component is now available for Base UI projects. It supports actions, status types, promises, stacking, and swipe dismissal."* Installed via `npx shadcn@latest add toast`. [Source: `apps/v4/content/docs/changelog/2026-07-toast.mdx`, dated 2026-07-23] This gives Nilumi a choice for its Undo/Edit card toasts: Sonner (standalone library, framework-agnostic, very mature) or the new Base UI-native Toast (tighter integration with the Base UI primitive set, native swipe-dismiss).

### 1.4 Drawer / Vaul status — maintenance mode, superseded by Base UI's native Drawer

| Fact | Value | Source |
|---|---|---|
| Vaul latest npm version | `1.1.2` | published **2024-12-14** [Source: registry.npmjs.org/vaul/latest] |
| Vaul peer deps | `react`/`react-dom` `^16.8 \|\| ^17.0 \|\| ^18.0 \|\| ^19.0.0 \|\| ^19.0.0-rc` | registry.npmjs.org/vaul/latest (React 19 support was added in `v1.1.1`, via a PR authored by `@shadcn` himself) |
| Vaul GitHub repo | 8,638 stars, 375 forks, **164 open issues** | api.github.com/repos/emilkowalski/vaul |
| Vaul last code push (`pushed_at`) | **2025-10-03** — ~1 year stale as of this report | api.github.com/repos/emilkowalski/vaul |
| Vaul license | MIT | same |
| Vaul dependency | `@radix-ui/react-dialog ^1.1.1` | registry.npmjs.org/vaul/latest |

**Conclusion: Vaul is not abandoned but is in slow/bare maintenance** — no release in ~22 months, no repo push in ~1 year, 164 issues outstanding. This is corroborated by shadcn/ui's own trajectory: **Base UI now ships its own native `Drawer` primitive**, and `ui.shadcn.com/docs/components/drawer` / `.../sheet` now serve the Base UI implementation by default for new (Base UI-based) projects — confirmed by the redirect behavior of those docs URLs. [Source: ui.shadcn.com/docs/components/drawer; base-ui.com/react/components/drawer]

**Base UI's Drawer is materially more capable than Vaul** per its own docs and the `v1.9.0` release notes (released **2026-10-09**, i.e. the day before this report): `snapPoints` (fractional-viewport-height or px/rem), `swipeDirection` (defaults to `"down"` for bottom sheets), velocity-aware release physics explicitly tuned for 120 Hz/ProMotion displays ("Preserve swipe release velocity after a trailing stationary pointer event"; "Fix swipe release velocity on 120Hz [iPhone ProMotion]"), a `SwipeArea` for edge-swipe-to-open, a `VirtualKeyboardProvider` for keyboard-aware sheets containing form fields, and nested-drawer stacking. [Source: base-ui.com/react/components/drawer; api.github.com/repos/mui/base-ui/releases/latest] Base UI's own quick-start docs state plainly: *"shadcn/ui is a great place to start if you need pre-styled components... It uses Base UI as its unstyled foundation."* [Source: base-ui.com/react/overview/quick-start]

**Recommendation for Nilumi:** use Base UI's Drawer (reachable through the shadcn/ui `base` preset, which is now the CLI default) for all bottom-sheet needs — item detail sheets, add-to-list sheets, approval-card detail — rather than adding Vaul as a separate dependency. This requires no new package if Nilumi initializes (or migrates) onto the `base` primitive.

### 1.5 Sonner status

Sonner remains **actively maintained**: latest release `v2.0.8`, published **2026-08-09**, with substantive fixes merged from external contributors as recently as that release (ARIA label support, hotkey-array handling, Safari-prefix CSS fix, event-listener cleanup, custom-toast dismiss fix). [Source: api.github.com/repos/emilkowalski/sonner/releases, release `v2.0.8`] It is still the same author (Emil Kowalski) who wrote Vaul, and remains shadcn/ui's default/recommended toast solution for Radix-based projects — the new July-2026 Base UI-native Toast component (§1.3) is additive, not a replacement; existing Sonner-based projects are unaffected.

### 1.6 Registries for a project-wide custom design language

shadcn/ui's registry system, formalized in the **Feb 2025 "Updated Registry Schema"** release [Source: `changelog/2025-02-registry-schema.mdx`], lets a team ship and consume a fully custom design system as flat JSON. The schema (`registry-item.json`, JSON Schema published at `ui.shadcn.com/schema/registry-item.json`) supports, verbatim from the current docs source: [Source: github.com/shadcn-ui/ui `apps/v4/content/docs/registry/registry-item-json.mdx`, commit `c2a67849`]

- **`type`** — one of `registry:base` (entire design systems), `registry:block`, `registry:component`, `registry:font`, `registry:lib`, `registry:hook`, `registry:ui`, `registry:page`, `registry:file`, `registry:style` (e.g. a whole `new-york`-equivalent style), `registry:theme`, `registry:item`.
- **`cssVars`** — the key mechanism for a project-wide design language: a `{ theme, light, dark }` object defining arbitrary custom CSS variables (and overriding core ones) per color scheme, e.g.:
  ```json
  "cssVars": {
    "theme": { "font-heading": "Poppins, sans-serif" },
    "light": { "brand": "oklch(0.205 0.015 18)" },
    "dark":  { "brand": "oklch(0.205 0.015 18)" }
  }
  ```
  The older `tailwind.config`-based `"tailwind"` property is now **explicitly deprecated** in favor of `cssVars.theme` for Tailwind v4 projects.
- **`css`** — inject arbitrary new rules into the project's global stylesheet: `@layer base`, `@layer components`, `@utility`, `@keyframes`, `@plugin`, etc. — e.g. a registry item can ship its own `@utility text-magic { ... }` or `@plugin @tailwindcss/typography`.
- **`font`** — a dedicated `registry:font` item type with `family`, `provider` (currently only `"google"`), `import` (the `next/font/google` export name), `variable` (the CSS var it's bound to, e.g. `--font-sans`), optional `weight[]`/`subsets[]`/`selector`, and a `dependency` fallback package for non-Next.js consumers (e.g. `@fontsource-variable/inter`) — directly relevant if Nilumi wants to distribute its Tamil-ready font choice (§6) as a reusable registry item across its own internal tooling.
- **`registryDependencies`** — composable references to other registry items: bare names for shadcn's own items (`button`), `@namespace/item-name` for third-party namespaced registries, `owner/repo/item-name[#tag-or-sha]` for GitHub-hosted registries, or a bare URL/local path for fully custom registries.
- **`files[].target`** with placeholder tokens `@components/`, `@ui/`, `@lib/`, `@hooks/` — lets a registry item install into *whatever* directory structure a consuming project's own `components.json` defines, rather than hardcoding paths.
- `components.json`'s `"style"` field: the monorepo's own internal config still shows the legacy single-value form `"style": "new-york"` [Source: `apps/v4/components.json`]; whether a freshly-`init`'d post-July-2026 project emits a compound `"<base>-<style>"` string was **not independently re-verified against a live CLI run in this research pass — flag as UNVERIFIED**, though the CLI's `init` endpoint unambiguously accepts `base` and `style` as separate parameters.

**Practical implication for Nilumi:** the team can define its own `registry:theme`/`registry:style` item encoding the household-assistant palette, visibility-badge colors, and card tokens as `cssVars`, publish it to a private or public JSON endpoint (or a GitHub repo path), and have any project member (or future apps) run one `shadcn add` command to apply the whole design language — including fonts and custom CSS utilities — rather than hand-copying globals.css.

---

## 2. Alternatives / complements for a native-feeling cross-platform PWA

**Framing:** none of these replace shadcn/ui wholesale; the live question is which (if any) should sit *alongside* shadcn + chosen primitive (Radix/Base UI/React Aria) to deliver genuinely native-feeling gestures (snap-point sheets, swipeable rows, pull-to-refresh, edge-swipe). All figures below are from GitHub's REST API, the npm registry, and Bundlephobia, fetched live on 10 Oct 2026.

### 2.1 Recommendation matrix

| Library | Native feel | Gesture support (sheet/swipe/PTR) | Accessibility | Tailwind v4 | Next.js 16 App Router/RSC | Maintenance (Oct 2026) | Bundle (gzip) | License |
|---|---|---|---|---|---|---|---|---|
| **Konsta UI** | ★★★★★ iOS+Material themes, Tailwind-native | ★★☆☆☆ Sheet = open/close only, no documented snap points | ★★☆☆☆ no WAI-ARIA statement | ★★★★★ purpose-built for Tailwind | ⚠️ needs `"use client"`, no RSC-specific docs | ✅ v5.5.0 (2025-09-28), pushed 2026-10-06, 10 open issues | UNVERIFIED (Bundlephobia 503'd) | MIT |
| **Ionic React** | ★★★★★ true native widget set | ★★★★☆ `ion-refresher` native PTR; `ion-modal` breakpoints+swipe | ★★★★☆ mature | ★★☆☆☆ Shadow DOM blocks Tailwind; needs a bridge plugin | ❌ `IonReactRouter` conflicts with App Router's file routing | ✅ v9.0.7, pushed **today**, 550 open issues | 242.7 KB (+~2.2 MB `@ionic/core`) | MIT |
| **Framework7 React** | ★★★★★ best-in-class fidelity | ★★★★★ `Sheet Modal` (step/breakpoints), `Swipeout` (swipe-to-delete, near 1:1 match for Nilumi's list rows), native PTR | ★★☆☆☆ not ARIA-focused | ★★☆☆☆ own CSS framework | ❌ own Router, SPA-oriented, conflicts with App Router | ✅ v9.2.0, pushed 2026-10-06, 237 open issues | 34 KB wrapper (+ unmeasured core) | MIT |
| **React Aria Components** | ★★★☆☆ behavior-correct, zero visual opinion | ★★★☆☆ `usePress`/`useMove`/`useLongPress`; **no built-in bottom sheet** | ★★★★★ gold-standard WAI-ARIA | ★★★★★ official Tailwind starter | ✅ `'use client'` documented, SSR-safe | ✅ Adobe-backed, pushed 2026-10-09, 622 open issues | 279 KB (tree-shakable) | Apache-2.0 |
| **Base UI** | ★★★☆☆ unstyled; native feel from Drawer physics | ★★★★★ **Drawer**: snapPoints, swipeDirection, velocity-aware release, edge SwipeArea, nested drawers, keyboard-aware | ★★★★★ ARIA-first | ★★★★★ first-class docs | ✅ `'use client'`, tree-shakable | ✅ v1.9.0 released **2026-10-09**, pushed today, 477 open issues | 166 KB | MIT |
| **Ark UI** | ★★★☆☆ unstyled | ★★★★★ **Drawer**: snapPoints, swipeDirection, Grabber handle, `@zag-js/drawer` state machine | ★★★★☆ state-machine-driven ARIA patterns | ★★★★☆ BYO-CSS, Tailwind-friendly | ✅ framework-agnostic | ✅ pushed 2026-10-09, only 6 open issues | 290 KB (per-component tree-shakable) | MIT |
| Park UI (Ark+Panda preset) | ★★★★☆ pre-styled | (inherits Ark) | ★★★★☆ | ◐ Panda CSS, not Tailwind | ✅ | ⚠️ **stale — pushed 2026-04-10**, 24 open issues on 2,372 stars | — | MIT |
| **HeroUI v3** | ★★★★☆ polished | ★★★☆☆ Drawer = side-sliding nav panel, not a snap-point bottom sheet | ★★★★☆ built on React Aria | ★★★★★ "built with Tailwind CSS 4.0" | ✅ `'use client'`, React-Aria-based | ✅ pushed **today**, only 27 open issues | 62 KB (root import) | Apache-2.0 |
| **Mantine** | ★★☆☆☆ desktop/admin-dashboard oriented | ★★☆☆☆ Drawer = side panel, no snap/PTR primitives | ★★★★☆ good reputation | ★★★☆☆ needs explicit `@layer` ordering vs. its own reset | ✅ `'use client'` | ✅ v9.7.1, pushed 2026-10-08, 31 open issues | 174 KB | MIT |
| **Radix Themes** | ★★☆☆☆ web-app styled, no mobile-gesture layer | ★☆☆☆☆ no Drawer/Sheet at all | ★★★★★ inherits Radix Primitives | ★★★☆☆ own CSS-var system | ✅ | ⚠️ **stale — pushed 2026-04-11**, 165 open issues | 63 KB | MIT |
| **Tamagui** | ★★★★☆ if adopting full compiler | ★★★★☆ dedicated `@tamagui/sheet` package | ★★★☆☆ RN-parity focused | ★★☆☆☆ own atomic-CSS/compiler, not Tailwind | ⚠️ documented App Router support but needs CLI compiler step + custom providers | ✅ pushed **today**, 93 open issues | 183 KB core (+67 KB Sheet) | MIT core |

[Sources for the whole table: api.github.com/repos/{konstaui/konsta, ionic-team/ionic-framework, framework7io/framework7, adobe/react-spectrum, mui/base-ui, chakra-ui/ark, chakra-ui/park-ui, heroui-inc/heroui, mantinedev/mantine, radix-ui/themes, tamagui/tamagui}; registry.npmjs.org for each package; Bundlephobia API; konstaui.com/release-notes; ionicframework.com/docs/api/{refresher,modal}; framework7.io/docs/{sheet-modal,swipeout,pull-to-refresh}.html; react-aria.adobe.com/{usePress,useMove,useLongPress,Modal}; base-ui.com/react/components/drawer; ark-ui.com/docs/components/drawer; tamagui.dev/docs/guides/next-js — all fetched 10 Oct 2026]

### 2.2 Bottom-sheet/drawer head-to-head (the core gesture ask)

Ranked by genuine native-sheet fidelity (snap points + rubber-band/velocity-aware drag-to-dismiss):

1. **Base UI `Drawer`** — most complete: snapPoints, swipeDirection, 120Hz-tuned velocity release, edge SwipeArea, nested stacking, virtual-keyboard awareness — **and reachable today through shadcn/ui** with zero new dependency (§1.4).
2. **Ark UI `Drawer`** — comparably complete (snapPoints, swipeDirection, Grabber handle, `@zag-js/drawer` state machine), unstyled/Tailwind-native, exceptionally low issue count (6).
3. **Vaul** — still the most battle-tested standalone drawer (velocity-based drag-to-dismiss + snap points on `@radix-ui/react-dialog`), but in slow maintenance (§1.4) — a yellow flag for a multi-year product bet.
4. **Tamagui `Sheet`** — genuine native-style bottom sheet, but only sensible if adopting the whole compiler/provider stack.
5. **Framework7 `Sheet Modal`** / **Ionic `ion-modal` breakpoints** / **Konsta `Sheet`** — native-feeling *within* their own full frameworks; Framework7's `stepOpen`/`stepClose`/`setBreakpoint` and Ionic's modal `breakpoints`+`canDismiss` are functionally comparable to iOS; Konsta's is simpler (open/close only).
6. **HeroUI Drawer** — side-sliding nav panel, not a bottom sheet.
7. **React Aria Components** / **Radix Themes** — no built-in sheet/drawer-with-gestures at all; would require hand-rolling on `useMove`+`Modal`, or adopting Base UI/Ark UI/Vaul alongside.

### 2.3 Ranked shortlist for Nilumi

**#1 — Base UI's `Drawer`/`Sheet` via shadcn/ui (no new dependency).** Highest leverage: already the unstyled foundation shadcn/ui itself now defaults to, ships the most complete gesture set of anything surveyed, MIT, Tailwind-v4-first, `'use client'`-compatible, release cadence measured in days not months. Use this for all of Nilumi's bottom-sheet needs (item detail, add-to-list, approval-card detail).

**#2 — Ark UI (`@ark-ui/react`), scoped to `Drawer` + any `Segmented`/`ToggleGroup`-style primitives Base UI doesn't yet cover.** Near-equal gesture depth, 6 open issues, pushed yesterday, fully unstyled so it layers cleanly with Tailwind and doesn't collide with existing Base UI/Radix component namespaces (`data-part` selectors).

**#3 — React Aria Components' gesture primitives (`usePress`/`useMove`/`useLongPress`) as the low-level layer underneath bespoke pieces** — Nilumi's hold-to-talk mic affordance, a custom swipeable list row if Framework7-style `Swipeout` behavior is wanted without the rest of Framework7. Most rigorously tested touch-normalization layer surveyed (Adobe-backed); validated as the right foundation by HeroUI v3's own adoption of React Aria as its interaction layer.

**Explicitly not recommended:** Ionic and Framework7 (full SPA frameworks whose own routers fight Next.js App Router, plus Shadow-DOM/non-Tailwind friction for Ionic); Tamagui (pays the React-Native/Web parity compiler tax for zero RN benefit on a web-only PWA); Radix Themes (stale, redundant with Nilumi's existing raw Radix/Base UI primitives); Mantine (desktop-oriented, no native mobile-gesture components); HeroUI specifically *as a gesture source* (good general component library, Apache-2.0, React-Aria-based — but its Drawer is a side panel, not a bottom sheet).

**Gaps/uncertainties:** Konsta UI's exact gzip bundle size (Bundlephobia 503'd on the multi-framework package) — **UNVERIFIED**. Ionic's Shadow-DOM/Tailwind bridging story (`@aparajita/tailwind-ionic`) is secondary-sourced, not independently re-fetched in full. Framework7's/Ionic's claimed incompatibility with Next.js App Router is a reasoned architectural inference (both ship their own router/stack-navigation model), not a line from an official "incompatible" statement — flag as **inferred, not primary-confirmed**. HeroUI Pro's and Tamagui Bento/Takeout's exact paid-tier gating mechanics were not independently verified (`heroui.com/pricing` and the Tamagui pricing page both failed to render) — irrelevant to the recommendations above, which rely only on each project's confirmed-free core license.

---

## 3. Motion, gestures, View Transitions, and haptics

### 3.1 Motion (motion.dev, formerly Framer Motion)

- Latest npm version: `motion@14.1.0`; its own `package.json` depends on `framer-motion@14.1.0` of the identical version, confirming the "Motion" rebrand still wraps the same codebase. [Source: registry.npmjs.org/motion] Changelog shows `14.0.0` and `13.5.1` both landing **2 Oct 2026** (very active). [Source: motion.dev/changelog]
- `peerDependencies`: `react`/`react-dom` `^18.0.0 || ^19.0.0` — covers React 19.2 fine. [Source: registry.npmjs.org/motion/14.1.0]
- **Bundle size, verbatim from motion.dev's own docs** (`motion.dev/docs/react-reduce-bundle-size`):

  | Import path | Size |
  |---|---|
  | Single tree-shaken hook (e.g. `useReducedMotion`) | ~1 KB |
  | `useAnimate` "mini" (WAAPI-only) | 2.3 KB |
  | `useAnimate` "hybrid" (full) | 17 KB |
  | Full `motion` component (not further tree-shakable) | **34 KB minimum** |
  | `m` component + `LazyMotion`, no features preloaded | **~4.6 KB** |
  | + `domAnimation` feature pack (variants, exit animations, tap/hover/focus) | **+15 KB** |
  | + `domMax` feature pack (adds **pan/drag gestures** + layout animations) | **+25 KB** |

  **Important for Nilumi:** bottom-sheet drag-to-dismiss and swipe-to-remove rows both need the drag/pan gesture, which only ships in the pricier `domMax` bundle (+25 KB), not the cheaper `domAnimation` (+15 KB). Recommended pattern: `import * as m from "motion/react-m"` + `<LazyMotion features={() => import('./features').then(r => r.default)}>` to defer the +25 KB gesture code until after first paint.
- **Gestures (official docs, `motion.dev/docs/react-gestures`):** built-in `hover`, `tap`, `pan`, `drag`, `focus`, `inView`, each with `while-` animation props (`whileHover`, `whileTap`, `whileDrag`, etc.). `drag="y"` + `dragConstraints` + `dragElastic` + `onDragEnd` velocity/offset checks is the standard composition recipe for a bottom-sheet drag-to-dismiss (no single named "bottom sheet" primitive exists). `useDragControls` with `snapToCursor` (bug-fixed in `v13.4.4`, 25 Sept 2026) supports a drag-handle affordance pattern. Tap gestures are keyboard-accessible (Enter triggers `whileTap`), relevant to Nilumi's accessibility goals.
- **A directly relevant recent feature: `v13.4.0` (14 Sept 2026) added `AnimateView` — "View transitions for React 19.3, built on React's `ViewTransition`"** — i.e. Motion now has its own integration layer on top of React's native `<ViewTransition>` (§3.3). [Source: motion.dev/changelog]
- **`"use client"` requirement:** any file importing `motion/react` must be a Client Component (DOM refs, RAF, pointer events are all browser-only). This is community-corroborated, not quoted from an explicit motion.dev statement — **flag as reasoned/community-consensus, not an official primary quote**. Practical pattern: keep `layout.tsx`/`page.tsx` as Server Components and isolate `motion.*` usage in small `"use client"` wrapper components.

### 3.2 @use-gesture (pmndrs) — effectively dormant

- `pmndrs/use-gesture` repo: `pushed_at: 2024-07-15` (~2.3 years stale), 58 open issues, 9,622 stars, **not archived**. [Source: api.github.com/repos/pmndrs/use-gesture]
- `@use-gesture/react` latest npm `10.3.1`, published **21 March 2024** (~2.5 years with no new release). [Source: registry.npmjs.org/@use-gesture/react]
- MIT license; `peerDependencies: { react: ">= 16.8.0" }` — an open-ended range that *permits* React 19 by semver but with **no explicit maintainer statement confirming active React 19 testing — UNVERIFIED**.
- Bundle size: commonly-cited "~10 KB gzip" figures could not be independently re-confirmed (Bundlephobia returned only a client-rendered shell) — **flag as UNVERIFIED estimate**.
- **Conclusion: bare-maintenance, not a safe long-term gesture-library bet for Nilumi** — prefer Motion's `drag`/`pan` gestures or React Aria's `useMove`/`usePress`, both of which are actively maintained.

### 3.3 React 19.2/19.3 `<ViewTransition>` and Next.js 16 — critical version correction

- **React 19.2 (1 Oct 2025)** does **not** ship `<ViewTransition>` as stable — it only prepares for it (e.g. `useId` prefix changed from `:r:`/`«r»` to `_r_` specifically "to support View Transitions" so IDs are valid `view-transition-name` values). The component itself is referenced only as "the upcoming `<ViewTransition>` Component." [Source: react.dev/blog/2025/10/01/react-19-2; raw CHANGELOG.md at tag `v19.2.0`]
- **`<ViewTransition>` and Fragment Refs actually stabilize in React 19.3 (9 September 2026)**: *"Last year, we shared View Transitions and Fragment Refs as new experimental APIs coming to React. We're excited to announce that both of these are now stable in React 19.3!"* [Source: react.dev/blog/2026/09/09/react-19-3]
- **API shape** (react.dev/reference/react/ViewTransition): `<ViewTransition>{isShowing && <Component />}</ViewTransition>` — only activates for updates wrapped in a Transition (`startTransition`/`useTransition`), a `<Suspense>` reveal, or `useDeferredValue`; plain synchronous `setState` does not trigger it (by design, to keep urgent updates instant). React calls `document.startViewTransition()` internally — you should never call it directly. DOM-only, no React Native support yet.
- **Next.js 16 (launched 21 Oct 2025)** shipped View Transitions support, but via an **internally-pinned React Canary build bundled with the App Router**, not the public stable `react@19.2.0` package: *"The App Router in Next.js 16 uses the latest React Canary release, which includes the newly released React 19.2 features and other features being incrementally stabilized. Highlights include: View Transitions."* [Source: nextjs.org/blog/next-16] `next@16.4.0`'s `peerDependencies` (`"react": "^18.2.0 || 19.0.0-rc-... || ^19.0.0"`) is broad enough to permit manually installing `react@19.3.0` yourself, but **whether Next's internally-vendored RSC/Turbopack runtime is officially validated against a manually-installed React 19.3 (vs. its own pinned Canary) was not confirmed by any explicit Next.js statement found — flag as UNVERIFIED; check Next's upgrade guide before relying on this in production.**
- **Recommendation for Nilumi:** to get `<ViewTransition>` as a genuinely *stable*, non-Canary API (not an internal Next.js implementation detail), plan around **React 19.3** rather than 19.2.

### 3.4 Browser support — View Transitions API

All figures fetched directly from caniuse.com's compat data (10 Oct 2026). Current stable versions as of this date: **Chrome ~154–155**, **Firefox ~157**, **Safari 26.x (iOS 26)** — note the brief's assumption of "Chrome ~141" is stale by roughly 13 releases; this doesn't change any support conclusion below since all thresholds are well below both figures.

| | Safari (macOS/iOS) | Chrome/Edge | Firefox |
|---|---|---|---|
| **Same-document (SPA)** `document.startViewTransition()` | ✅ since **18.0** | ✅ since **111** | ✅ since **144** (long-time non-supporter, only recently shipped) |
| **Cross-document (MPA)** `@view-transition` at-rule | ✅ since **18.2** | ✅ since **126** | ❌ **not supported** (through 157–160) |

[Source: caniuse.com/mdn-api_viewtransition; caniuse.com/mdn-css_at-rules_view-transition] WebKit's own confirmation: *"WebKit added support for the View Transitions API in Safari 18... Safari supports the CSS View Transitions Module Level 1 specification."* [Source: webkit.org/blog/15865/webkit-features-in-safari-18-0]

**Conclusion for Nilumi:** same-document transitions are safe across all three target engines today; cross-document transitions (relevant only if Nilumi ever uses full page navigations rather than client-side routing) have no Firefox support — irrelevant for iOS/Android PWA use but worth noting for the desktop-browser admin surface if it's non-SPA.

### 3.5 Edge swipe-back in iOS standalone PWAs

**There is no native OS/browser edge-swipe-back gesture in a true Home-Screen-installed (`display: standalone`) PWA on iOS, by design** — there is no browser chrome to swipe from and no exposed back-stack UI. Maximiliano Firtman's widely-cited PWA reference states this plainly: *"When a user accesses a PWA in standalone mode, there is no browser's user interface and some platforms, such as iOS, don't have back buttons or gestures to offer navigation. Therefore, it's essential to provide all the possible navigation of the app within the boundaries of the web content."* [Source: firt.dev/pwa-design-tips/, "Provide navigation within UI" section] This is unchanged by iOS 26's new native "swipe from anywhere" back-gesture improvement, which is a **native-UIKit-apps-only** API (`interactiveContentPopGestureRecognizer`) with no analog exposed to web content. [Source: developer.apple.com/forums/thread/791605]

(A separate, often-conflated complaint — an *uncontrollable* native edge-swipe inside **WKWebView-hosted native shells** like Capacitor/Cordova apps, e.g. `github.com/ionic-team/ionic-framework` issue #22299, open since 2020 — concerns `UIWebView`'s `allowsBackForwardNavigationGestures` property and is architecturally a different context from a plain Safari Home-Screen PWA; no WebKit Bugzilla/Open Radar ticket specifically requesting a standalone-PWA swipe-back API was located.)

**Practical implication:** Nilumi must implement 100% of its own in-app back navigation — a left-edge `pointerdown`/`pointermove`/`pointerup` custom gesture handler driving `history.back()` or a route transition, plus `history.pushState` per logical screen with a `popstate` listener (relevant on Android, which *does* have a system back gesture even in standalone/TWA mode — see §8). The modern **Navigation API** (`navigation.back()/forward()/traverseTo()`, a single `navigate` event) reached Baseline "Newly Available" in **January 2026** and is the recommended replacement for raw History API hacks, since both Chrome's and (now) Safari's native gesture-preview systems are wiring themselves to browser-level navigation entries rather than app-level JS state. Safari **26.2** ships Navigation API support, though missing the `precommitHandler` Chrome/Edge/Firefox 147 have. [Source: infoq.com/news/2026/05/navigation-api-browser, citing web.dev's Baseline 2026 announcement]

### 3.6 Pull-to-refresh and `overscroll-behavior`

Firtman's guide: *"You can manage the pull to refresh gesture with the `overscroll-behavior-y` style on the body element. Using 'contain', the reload gesture will be disabled and using 'none' will also disable the bounce effect."* [Source: firt.dev/pwa-design-tips/, "Control Reload Gesture"]

Caniuse support (fetched directly): Chrome full support since **144**; Firefox full since **150**; **Safari is only "partial," continuously, from 16.0 through the current 26.x/27.x** — community-reported edge cases (not an official caniuse footnote) describe nested scroll contexts (e.g. a scrollable list inside a bottom sheet) where `overscroll-behavior: contain` on the inner element doesn't fully stop momentum/rubber-band from leaking to the parent in WebKit — directly relevant to Nilumi's sheets with internal scroll regions. [Source: caniuse.com/mdn-css_properties_overscroll-behavior]

**Recommended pattern:** `overscroll-behavior-y: contain` on the root scrollable container to prevent whole-page rubber-band triggering native pull-to-refresh while still allowing a *custom* pull-to-refresh gesture layered on top; apply `overscroll-behavior: contain` separately on each nested scroller (sheet's internal list) given Safari's partial rating, and test on real iOS hardware. Android Chrome (tab and standalone/TWA) reaches full support and reliably suppresses native pull-to-refresh without the nested-scroll caveat.

### 3.7 Haptics on the web

**Vibration API (`navigator.vibrate()`):** Android Chrome ✅ (since Chrome 32); **iOS Safari ❌ never supported, at any version through the current 27.1–27.2 — no change in iOS 26 or since.** Desktop Firefox is a surprising side-finding: it *had* support and then **removed it starting v129**. Firefox for Android: partial. [Source: caniuse.com/mdn-api_navigator_vibrate]

**The `<input type="checkbox" switch>` haptic trick:**
- The control itself shipped in **Safari 17.4**: *"a switch... it mirrors [checkbox] markup and API... it uses the ARIA switch role."* [Source: webkit.org/blog/15054/an-html-switch-control] The haptic-feedback behavior specifically is reported (via secondary aggregation of Apple's Safari 18 release notes, which render as an empty JS shell when fetched directly — **flag as UNVERIFIED at the primary-Apple-text level**) as: *"Added haptic feedback for `<input type=checkbox switch>` on iOS."*
- **Real-world exploitation, confirmed via two independent GitHub artifacts:** the `ios-haptics` npm package (latest `3.2.0`) and a `lochie/web-haptics` issue (#41, opened 7 Jun 2026) both document hiding the control off-screen and firing it via programmatic `.click()` to get a native tick for arbitrary interactions. [Source: registry.npmjs.org/ios-haptics; api.github.com/repos/lochie/web-haptics/issues/41]
- **Apple closed this loophole in iOS 26.5**: only a genuine, physically-direct tap landing on the real switch element now fires the haptic; synthetic `.click()`/`dispatchEvent` calls no longer trigger it. Corroborated by two independent repos created within two days of each other in June 2026 (`lochie/web-haptics` #41; `m1ckc3s/project-fathom`, whose own description states it works "after the iOS 26.5 patch" using a technique of overlaying a real, `opacity:0` switch exactly on a custom control's hit area so the user's actual finger-down lands on it). [Source: api.github.com/repos/m1ckc3s/project-fathom]
- **Reliability assessment: not usable for Nilumi's actual needs.** It only fires for a literal direct tap/toggle of a real (even if disguised) switch element — it **cannot** be wired to a swipe-to-remove delete-threshold crossing, a sheet-snap event, or an Undo-toast tap. It remains legitimate only for genuine binary toggle controls (e.g. a real settings switch).
- **Bottom line: there is no general-purpose, production-safe way to trigger haptic feedback on iOS Safari/standalone PWA for arbitrary interactions as of Oct 2026.** Android (`navigator.vibrate()`) remains the only reliable, general-purpose web haptics channel; iOS has none beyond the narrow switch-control case.

---

## 4. Platform/CSS capabilities relevant to design tokens (Safari 26/iOS 26, Chrome ~155, Firefox ~157)

**Note on versions:** Apple renamed Safari's versioning to match the calendar year in 2025, so "Safari 26" = iOS/macOS 26 (released Sept 2025), with "Safari 27" rolling out through late 2026. Chrome/Firefox stable versions cited are current as of 10 Oct 2026 (Chrome ~154–155, Firefox ~157), corrected from the brief's "Chrome ~141" assumption (≈13 releases stale) — this does not change any support conclusion since thresholds below are well under both figures. All rows fetched directly from caniuse.com's compat data unless noted.

| Feature | Chrome | Firefox | Safari (26.x/iOS 26) | Baseline | Relevance |
|---|---|---|---|---|---|
| **OKLCH** `oklch()` | ✅ 111+ | ✅ 113+ | ✅ 15.4+ | Widely available (~Nov 2025) | Safe as primary token color space; perceptually-uniform lightness → trivial tonal ramps |
| **color-mix()** | ✅ 111+ | ✅ 113+ | ✅ 16.2+ | Widely available (~Nov 2025) | Safe for runtime tint/shade (hover/active states) without precomputed variants |
| **light-dark()** | ✅ 123+ | ✅ 120+ | ✅ 17.5+ | Just reached Widely available (~Oct–Nov 2026) | Safe today; cuts duplicate `@media (prefers-color-scheme)` blocks |
| **Relative color syntax** `oklch(from var(--x) l c h / .5)` | ✅ 122+ full | ✅ 128+ | ✅ 18.0+ full | Newly available (→widely ~Mar 2027) | Usable now (well under iOS 26); derive focus-rings/overlays from one token |
| **@property** (typed custom props) | ✅ 85+ | ✅ 128+ | ✅ 16.4+ | Newly available | Safe; enables animatable/typed design tokens |
| **@starting-style** | ✅ 117+ | ✅ 129+ | ✅ 17.5+ | Newly available | Safe; CSS-only entry/exit for sheets/toasts/popovers |
| **transition-behavior: allow-discrete** | ✅ 117+ | ✅ 129+ | ✅ 17.4+ | Newly available | Pairs with `@starting-style`; transition `display`/`content-visibility` |
| **interpolate-size / calc-size()** | ✅ 129+ | ❌ not supported | ❌ **not supported** (incl. 27.2, TP) | Limited — Chromium-only | ⚠️ Not safe to rely on; animate sheet height from `auto` via JS-measured fallback or `grid-template-rows: 0fr→1fr` |
| **Scroll-driven animations** `animation-timeline` | ✅ 115+ | ❌ not in stable 157 (Nightly only) | ✅ **26.0+** | Limited (Firefox is the gap) | Usable on iOS+Chrome paths; needs scroll-listener fallback for Firefox desktop |
| **CSS anchor positioning** | ◐ 125+ partial → better at 151+ | ◐ 147+ partial | ◐ **26.0+ partial** → **✅ full in Safari 27** | Limited | All engines ship a usable subset now; avoid `position-visibility`/animated `anchor()`; **Safari 27 is first to reach full spec compliance** |
| **Popover API** | ✅ 114+ | ✅ 125+ | ✅ 17.0+ desktop; **iOS 18.3+ full** (17.0–18.2 had a dismiss-on-outside-tap bug) | Newly available | Safe today (iOS 26 ships well past 18.3); native light-dismiss + top-layer stacking |
| **`<dialog>` element** | ✅ 37+ | ✅ 98+ | ✅ 15.4+ | Widely available (since 2024-09-14) | Safe everywhere |
| **`<dialog>` `closedby`** | ✅ 134+ | ✅ 141+ | ❌ **not supported** (TP only) | Limited | Not safe on iOS yet; keep custom light-dismiss/Esc handling as baseline |
| **text-wrap: balance** | ✅ 116+ | ✅ 121+ | ✅ 17.5+ | Newly available | Safe; card headlines/empty-state copy |
| **text-wrap: pretty** | ✅ 117+ | ❌ no plan | ✅ **26+** | Limited | Firefox absent but harmless (ignored, falls back) |
| **field-sizing: content** | ✅ 123+ | ✅ 152+ | ✅ **26.2+** | Newly available, very recent | Nice-to-have for auto-growing inputs; keep JS fallback pre-26.2 |
| **dvh/svh/lvh units** | ✅ 108+ | ✅ 101+ | ✅ 15.4+ | **Widely available** (since 2025-06-05) | **Use `dvh` everywhere instead of `vh`** — single highest-value fix for iOS toolbar collapse |
| **Container queries `@container`** | ✅ 106+ | ✅ 110+ | ✅ 16.0+ | **Widely available** (since 2025-08-14) | Recommended primary responsive mechanism for card/tile components |
| **Container style queries** `@container style(...)` | ◐ 111+ (custom-prop values only) | ✅ 151+ full | ◐ **26.0+ partial** (custom-prop values only) | Newly available, very fresh (low, 2026-05-19) | Usable today only for custom-property-value queries — exactly the token-driven pattern a design system wants |
| **:has()** | ✅ 105+ | ✅ 121+ | ✅ 15.4+ | **Widely available** (since 2026-06-19, only 4 months ago) | Fully safe; parent-aware styling without JS classlist hacks |
| **scrollbar-gutter** | ✅ 94+ | ✅ 97+ | ✅ 18.2+ | Newly available | Low priority for mobile PWA; harmless for desktop fallback |
| **prefers-reduced-motion** | ✅ 74+ | ✅ 63+ | ✅ 10.1+ | Widely available | Mandatory to honor for every sheet/transition |
| **prefers-contrast** | ✅ 96+ | ✅ 101+ | ✅ 14.1+ | Widely available | Safe for a high-contrast token variant |
| **prefers-reduced-transparency** | ✅ 118+ | ⚠️ disabled by default | ❌ **not supported** (even TP) | Limited | ⚠️ Not reliable on either target mobile browser — pair with an in-app transparency setting, don't gate a11y on this alone |
| **forced-colors** | ✅ 89+ | ✅ 89+ | ✅ 16.0+ | Widely available (~Mar 2025) | Mainly a desktop/Windows concern for the companion admin surface |
| **env(safe-area-inset-*)** | ✅ 69+ | ✅ 65+ | ✅ 11.1+ | **Widely available** (since 2022-07-15) | **Mandatory** for the bottom tab bar/sheets to clear notch/home-indicator; requires `viewport-fit=cover` or resolves to `0` |
| **touch-action** | ✅ 36+ | ✅ 52+ | ✅ 13.0+ full | **Widely available** (since 2022-03-19) | Essential for swipe-to-remove rows — `touch-action: pan-y` so vertical scroll isn't hijacked |
| **-webkit-tap-highlight-color** | ✅ Blink-based only | ❌ not supported | ✅ (WebKit origin) | non-standard | Harmless progressive enhancement to kill the gray tap flash |
| **-webkit-touch-callout** | n/a | ❌ | ✅ (iOS origin) | non-standard, WebKit-specific | Suppresses iOS long-press callout/copy menu on swipeable rows/long-press targets |

[Sources, row by row: caniuse.com/mdn-css_types_color_oklch; .../color-mix; .../light-dark; .../oklch_relative_syntax; .../mdn-css_at-rules_property; .../starting-style; .../transition-behavior_allow-discrete; .../css-anchor-positioning; .../mdn_api_htmlelement_popover; .../dialog; .../dialog_closedby; .../css-text-wrap-balance; .../text-wrap_pretty; .../field-sizing_content; .../viewport-unit-variants; .../css-container-queries; .../css-container-queries-style; .../css-has; .../scrollbar-gutter; .../media_prefers-reduced-motion; .../prefers-contrast; .../prefers-reduced-transparency; .../media_forced-colors; .../css-env-function; .../css-touch-action; MDN non-standard pages for `-webkit-tap-highlight-color`/`-webkit-touch-callout` — all fetched 10 Oct 2026]

### 4.1 `interactive-widget` viewport meta key — Chromium/Gecko-mobile-only, Safari unshipped

Confirmed directly from caniuse: Chrome for Android 154 ✅, Firefox for Android 157 ✅, Samsung Internet 21+ ✅ — but **desktop Chrome, desktop Firefox, desktop Edge, and Safari on every platform (incl. iOS 26/27 and Safari Technology Preview) are all "Not supported."** [Source: caniuse.com/mdn-html_elements_meta_name_viewport_interactive-widget] Background: Chrome changed its default on-screen-keyboard resize behavior in **Chrome 108** (Nov 2022) to only resize the Visual Viewport (matching Safari's long-standing behavior), creating the need for an opt-in override via `interactive-widget` (`resizes-content`/`overlays-content`/`resizes-visual`). [Source: developer.chrome.com/blog/viewport-resize-behavior] WebKit gained **experimental, unshipped** support only around **August 2026**, per a WebKit engineer's comment — not in any public Safari release as of this writing, "likely no earlier than Safari 27.1." [Source: bram.us/2026/09/11/webkit-supports-interactive-widget-and-hopefully-safari-will-too] **Practical implication:** since Safari always resizes only the Visual Viewport with no opt-out, Nilumi's bottom tab bar/voice-input composer needs a `window.visualViewport` resize-listener strategy that works identically whether or not `interactive-widget` is ever honored.

### 4.2 VirtualKeyboard API (`navigator.virtualKeyboard`) — confirmed Chromium-exclusive

Chrome/Edge/Opera/Samsung Internet 94+ (desktop and Android) support it; **Firefox (through 160) and Safari (through 27.2 and even Safari TP) report "Not supported."** [Source: caniuse.com/mdn-api_virtualkeyboard] Don't build a cross-browser dependency on `navigator.virtualKeyboard.overlaysContent`.

### 4.3 iOS Dynamic Type / Android font scaling in a PWA

- **`font: -apple-system-body`** (and sibling Dynamic-Type values like `-apple-system-headline`, `-apple-system-caption1`) is a genuine, long-standing WebKit mechanism tied to the same text styles native apps use. [Source: webkit.org/blog/3709/using-the-system-font-in-web-content] It's engine-level (not a browser-chrome feature), so there is no documented carve-out disabling it in `display: standalone` — but no WebKit blog post or Apple HIG page explicitly states *"this applies inside installed Home-Screen web apps"* as a distinct claim — **flag the standalone-specific framing as reasonably inferred, not directly sourced**.
- **A real, unshipped CSS Working Group proposal exists to generalize this: `<meta name="text-scale">` / `env(preferred-text-scale)`.** Explainer co-authored by a BBC engineer and two Google engineers; tracked at `github.com/w3c/csswg-drafts/issues/12380`; spec text landed in **CSS Fonts 5**. Status per the author (Jan 2026): implemented **experimentally in Chrome Canary only, behind the "Experimental Web Platform features" flag.** [Source: joshtumath.uk/posts/2026-01-27-try-text-scaling-support-in-chrome-canary] **Bottom line: today, OS-level text-scale settings do NOT automatically rescale `rem`/`em` web content in either Chrome or Safari** — this is the explicit unsolved problem the proposal addresses. The one documented exception: Firefox for Android does a full-page zoom (not true reflow) in response to the OS setting.
- **For Nilumi:** don't assume Android's/iOS's OS text-size slider does anything to your `rem`-based type scale today; if accessibility-driven font scaling matters, build your own in-app font-scale control (a settings toggle driving a root `font-size` CSS variable) rather than relying on OS passthrough.

### 4.4 `apple-mobile-web-app-status-bar-style` / `black-translucent` — genuine iOS 26.1+ regression

This is covered in depth in §8.3 (iOS-specific), since it is one of the most currency-sensitive, actively-tracked findings in this report (three live WebKit Bugzilla tickets).

### 4.5 `<meta name="theme-color">` — significant regression in Safari 26

**caniuse's own compat data shows an explicit regression**: desktop Safari goes from full support (v15–18.5) to **"partial — only supported for installed web apps"** starting **Safari 26.0**; iOS Safari is worse — **"Not supported" starting iOS Safari 26.0**, with caniuse's own footnote: *"Supported, but does not actually use the color anywhere."* Firefox has **never** supported this meta tag on any version. [Source: caniuse.com/meta-theme-color] A WebKit engineer (Wenson Hsieh) confirmed on WebKit Bugzilla (bug 301756) that Safari 26's "Liquid Glass" UI only tints the status/home-indicator bars by reading the `background-color`/`backdrop-filter` of a `position: fixed`/`sticky` element within ~4px of the top (3px bottom) edge covering ≥80% of viewport width (≥90% on macOS) — **it does not read `theme-color` for this purpose** in general browsing. [Source: bugs.webkit.org/show_bug.cgi?id=301756#c2, as quoted by arpit.blog/articles/2025/11/safari-drops-support-theme-color] **Design-system implication:** `theme-color` was never universally reliable (Firefox never honored it), and as of iOS 26 it is no longer sufficient even in Safari — Nilumi needs a real `position:fixed`/`sticky` element with an explicit `background-color` at the viewport edge (e.g. the bottom tab bar itself) to reliably tint iOS chrome, *in addition to* `theme-color` for Android/Chromium (which still honors it normally for installed PWAs). The `media="(prefers-color-scheme: dark)"` attribute on multiple `theme-color` tags is a plain HTML/media-query layer on top of whichever engines support the tag at all — moot on Firefox, unreliable on Safari 26+ for the reasons above.

### 4.6 Badging API — iOS *does* support it (correcting the "Android/Chromium-only" assumption)

- Desktop Chrome/Edge ✅ 81+; **Desktop Safari ✅ 17.0+; iOS Safari ✅ 16.4+ (well before iOS 26 — badging has worked on iOS for 3+ years)**. Firefox (desktop+Android): ❌ never. **Chrome for Android / Samsung Internet: ❌ not supported** — interestingly, Badging is an iOS+desktop-Chromium feature, not an Android one. [Source: caniuse.com/mdn-api_navigator_setappbadge]
- WebKit, directly: *"In iOS and iPadOS 16.4, the Badging API is available exclusively for web apps the user has added to their home screen... You won't find the API exposed to websites in Safari... or in any app that uses WKWebView."* Requires Notification permission granted first (though `setAppBadge()` can be called before; the badge just won't show until granted); works from both window and Service-Worker contexts. [Source: webkit.org/blog/14112/badging-for-home-screen-web-apps]
- **For Nilumi:** safe to build into the installed-PWA Inbox-bell notification affordance for iOS + desktop Chromium users; gate with `'setAppBadge' in navigator` since Android Chrome and Firefox users get nothing.

---

## 5. Design trends 2025–2026: platform languages and product precedents

### 5.1 Apple's "Liquid Glass" (iOS 26, WWDC 2025) — a cautionary tale, not a model

Unveiled at **WWDC 2025**, shipped across iOS/iPadOS/macOS Tahoe/watchOS/tvOS/visionOS 26. Apple's own framing (WWDC25 session 219, "Meet Liquid Glass"): *"a new digital meta-material that dynamically bends and shapes light,"* with a signature **"lensing"** mechanism (bends/refracts/concentrates light in real time rather than merely blurring) and gel-like, physically-responsive motion (morphing shape-for-shape on navigation, e.g. tab bars bubbling into menus). [Source: developer.apple.com/videos/play/wwdc2025/219] Announced via Apple's own press release, 9 June 2025. [Source: apple.com/newsroom/2025/06] Apple's HIG specifies two variants ("regular" for over-content legibility, "clear" for rich backgrounds) intended for the **navigation/control layer only** (tab bars, sidebars, toolbars, sheets, menus) — not content backgrounds — and states the material should adapt to Increased Contrast / Reduced Transparency accessibility settings.

**Accessibility criticism was immediate and specific:**
- **Nielsen Norman Group, "Liquid Glass Is Cracked, and Usability Suffers in iOS 26"** (6 Oct 2025): documents text-on-text overlap in Mail, icons blending into photo backgrounds in Maps despite blurring, **shrunken/crowded tap targets** that appear to abandon Apple's own 1cm×1cm touch-target guidance, and "motion without meaning" (controls that appear/vanish/collapse unpredictably). [Source: nngroup.com/articles/liquid-glass]
- **TechSpot** (days after Sept 2025 launch): readability complaints from weak text/background contrast, sluggish animation on older iPhones, no official rollback — only Reduce Transparency + increased contrast as partial mitigations; draws a direct parallel to the 2013 iOS 7 flat-design backlash. [Source: techspot.com/news/109517]
- **MacRumors** (17 Sept 2025): aggregates forum/Reddit/Apple-Support-Community complaints two days post-launch; confirms *"there is no opt out, but you can toggle on Reduce Transparency."* [Source: macrumors.com/2025/09/17/ios-26-liquid-glass-critiques]

**"Reduce Transparency"** is a pre-existing iOS/macOS accessibility toggle (Settings → Accessibility → Display & Text Size) that replaces translucent/blurred backgrounds with solid colors — a blunt, system-wide lever, not Liquid-Glass-specific. [Source: support.apple.com/en-us/111773]

**iOS 26.1 "Tinted" option (direct concession, ~early Nov 2025):** added a toggle at Settings → Display & Brightness → Liquid Glass with two options, **"Clear"** (original) and **"Tinted"** (increases opacity/contrast system-wide). MacRumors: *"Apple says that the new setting was added after user feedback during the beta testing period suggested that some people would prefer to have a more opaque option."* [Source: macrumors.com/how-to/ios-26-1-reduce-liquid-glass-effects] **UNVERIFIED:** Apple's own verbatim release-note text was not independently fetched (secondary tech-press sourcing only).

**Relevance to Nilumi:** a cautionary tale, not a model. Its failure mode — decorative transparency/motion competing with legibility, shrinking tap targets, unpredictable control positions — is the inverse of what a household assistant needs (a family member reading a grocery list in sunlight cannot tolerate text-on-text or vanishing buttons). The one transferable idea: a restrained, high-opacity (effectively "Tinted"-mode) elevated surface for navigation chrome is fine; "Clear"-style decorative transparency is not.

### 5.2 Material 3 Expressive (Google, announced 13 May 2025)

Announced via **The Android Show: I/O Edition** and Google's own blog ahead of the main I/O keynote. Google's words: *"Material 3 Expressive builds on Material You... introduces a system of more natural, springy animations meant to bring a moment of delight to everyday routines... when you snap [a notification] off the stack, you feel a satisfying haptic rumble."* [Source: blog.google/products-and-platforms/platforms/android/material-3-expressive-android-wearos-launch] Key ideas: **shape morphing** (components change shape on interaction, not just color/elevation; m3.material.io/styles/shape), **spring-based motion tokens** (physics parameters — stiffness/damping/velocity — replacing duration/easing curves as the default; m3.material.io/styles/motion), and an expanded, bolder **"emphasized" type scale** with new easing curves. Rolled out first to Pixel devices with Android 16 (~Sept 2025) and Wear OS 6 (Aug 2025); Google's own apps adopted progressively (e.g. Keep's redesign, 21 Aug 2025). [Source: 9to5google.com/2025/08/21]

**Relevance to Nilumi:** spring-based motion (natural deceleration, shape feedback-on-press) is genuinely good and broadly usable — reads as "alive but calm," directly applicable to Undo/Edit card feedback. The bold/saturated color and oversized type-scale side of M3 Expressive is **not** a fit for "calm, trustworthy" — it's explicitly a personalization/personality play, cutting against evidence-centric sobriety.

### 5.3 Product/design-system mini-analyses

| Product/System | Distinctive trait | Transferable to Nilumi | Source |
|---|---|---|---|
| **Things 3** | Minimalist near-white canvas, single signature blue accent reserved for interactive cues; advanced options stay hidden until invoked | "Surface simplicity, hidden depth" — cards default to a calm single-accent read; evidence chips/visibility badges as secondary, revealed detail | culturedcode.com/things/features |
| **Linear** (2025 refresh + mobile) | Explicit philosophy: *"Don't compete for attention you haven't earned"* — chrome deliberately dimmed/desaturated vs. content; Oct 2025 mobile redesign adds a custom frosted-glass nav material + single bottom toolbar | **Chrome recedes, content leads** — tab bar/headers stay visually quiet so evidence cards carry the weight | linear.app/now/behind-the-latest-design-refresh; linear.app/changelog/2025-10-16-mobile-app-redesign |
| **Todoist** | Flat/Elevated/Outlined card-density options; Wear OS refresh (3 Sept 2025) emphasizes glanceability/larger touch targets | User-selectable card density without changing information architecture | todoist.com/help — product update, dated 3 Sept 2025 |
| **Apple Reminders/Notes** (iOS 26) | Adopted Liquid Glass (frosted toolbars, pill quick-action menus); Apple-Intelligence auto-categorization (e.g. grocery sorting) | Auto-categorization-by-content is relevant to Lists/Tasks — but avoid the Liquid Glass *visual* chrome per §5.1 | apple.com/newsroom/2025/06 (Liquid Glass is system-wide); feature specifics via secondary press, **not independently verified against Apple's own release notes** |
| **Google Keep/Tasks** | M3 Expressive cards, FAB expanding into radial menu; Google merging Keep reminders into Tasks (Oct 2025) | Card-as-self-contained-unit metaphor maps directly onto Nilumi's card+Undo/Edit pattern | 9to5google.com/2025/08/21; 9to5google.com/2025/10/14 |
| **Notion Calendar** | Near-monochrome palette; color used only functionally (calendar-source tags), never decoratively | Reserve all saturated color strictly for semantic meaning (visibility badges) — color becomes signal, not decoration | notion.com/product/calendar; styling characterization via secondary design-history sources |
| **Arc Search/Dia** (Browser Company) | "Browse for Me" synthesizes an answer page with a citations footer + "Dive Deeper" source links, not a raw link list; Atlassian acquired The Browser Company for $610M, Sept 2025 | **The single most directly transferable pattern**: synthesized answer up front, sources always one tap away — near-identical in spirit to Nilumi's evidence chips | atlassian.com/blog/company-news/atlassian-acquires-the-browser-company; cnbc.com/2025/09/04; Arc's specific UI mechanics sourced secondarily, **not independently re-fetched from Arc's own product pages** |
| **Superhuman** (mobile) | Warm "parchment" (not stark white) canvas; tightly controlled near-black maroon/violet accent, "color as punctuation" (one deliberate pop per screen); depth via blur/photography layering, not drop shadows; custom variable font at light-medium weights | One of the closest existing analogues to "calm, trustworthy, evidence-centric" — premium and quiet simultaneously | Characterized via third-party reverse-engineered design-token sites — **specific token values UNVERIFIED/inferred**; general aesthetic consistent with public screenshots |
| **Structured** (day planner) | Vertical, time-proportional timeline (block height = duration), color-coded by category, drag-and-drop | Time-proportional vertical blocks for a "Today" view — a trust-building, evidence-like visualization (time *is* the evidence) | structured.app (official, fetched directly) |
| **Craft** (docs) | Block/card documents with distinct containers, "App Styles" inherits document accent, "Rounded" font option avoids feeling cold | Block-as-card with light, non-gamified decoration — a middle path between sterile and playful | craft.do/for/designers (official, fetched directly) |
| **Bear** (notes) | Custom in-house typeface "Bear Sans" (modified Clarika) introduced in Bear 2 specifically to fix legibility issues in the prior font (Avenir) | Legibility-first rationale for commissioning/choosing a custom typeface — directly analogous to Nilumi's Tamil-readiness font decision (§6) | secondary-sourced, directionally consistent with public knowledge |
| **Vercel Geist** | Near-black-on-white, developer-tool aesthetic; thin borders instead of shadows for separation | "Borders over shadows" elevation strategy good for *utility* surfaces (Lists/Tasks tables) but reads too cold/technical alone — needs warming | geist-ui.dev; specifics secondary-sourced, `vercel.com/geist` not independently fetched this pass |
| **GitHub Primer** | Code-first design system: tokens/components/Octicons consumed identically across CSS/React/Rails/Figma | Token-parity-across-platforms is a build-discipline lesson (one source of truth), not a visual-style one | primer.style (fetched directly) |
| **Shopify Polaris** | **Confirmed: moved to framework-agnostic web components in 2025** — Polaris React deprecated; new API versions (2026-01 mandatory from 1 Oct 2026) require `<s-button>`/`<s-text-field>` web components built on Preact+remote-dom; Shopify reports 40–85% bundle reductions, ~7–12% faster extension loads | Technical precedent (web components as a framework-agnostic delivery mechanism), not a visual lesson | shopify.dev/docs/api/polaris (fetched directly); shopify.engineering/upgrading-checkout-blocks-app-to-polaris-web-components (fetched directly, with before/after tables) |
| **Atlassian Design System** | Three core values: Foundational / Harmonious / Empowering; 2025 positioning as a "context engine for the AI era" | "Foundational over flexible" — solid opinionated defaults, not infinite configurability; pick one evidence-chip design, not a configurable system | atlassian.design/get-started/about-atlassian-design-system |
| **Microsoft Fluent 2** | Mica (tinted, mostly-opaque, for persistent surfaces) vs. Acrylic (blurred, for transient overlays only) — Microsoft's own glass-material family, predating Liquid Glass | A **more disciplined** precedent than Liquid Glass for *where* translucency is acceptable: transient overlays only, never primary nav/reading surfaces | fluent2.microsoft.design; material-naming via secondary summaries |
| **Adobe Spectrum 2** | Unveiled 12 Dec 2023; stated goals: more inclusive/accessible, dynamic-contrast adaptive palettes, "attention hierarchy" — *"we removed extraneous highlight color in common controls, reserving it for the most high-action moments."* React Spectrum reached stable v1.0.0 on **16 Dec 2025** | Near-verbatim the right philosophy for Nilumi: visibility badges/approval CTAs should be the *only* saturated-color moments | blog.adobe.com/en/publish/2023/12/12 (fetched directly); react-spectrum.adobe.com/releases/v1-0-0 (fetched directly) |
| **Radix Colors** | 12-step scale per color, each step a specific semantic job (1–2 subtle bg, 5–6 borders, 9 solid fill, 11–12 accessible text), contrast validated via the APCA algorithm, automatic light/dark pairing, P3 wide-gamut | **Single most directly implementable artifact in this report** — build visibility-badge/evidence-chip colors on a 12-step accessible scale, guaranteeing legible text-on-badge contrast by construction | radix-ui.com/colors (fetched directly) |
| **CRED — NeoPOP** | Bold geometric shapes, saturated "pop black/white," heavy uppercase type, deep tactile shadows simulating physical layers; open-sourced as `@cred/neopop-web` | **Contrast case, not a model** — maximalist game-like tactility is close to the opposite of calm/evidence-centric; avoid reading as a fintech-gamification clone | npmjs.com/package/@cred/neopop-web; neopop.cred.club unreachable this pass — **secondary-sourced** |
| **PhonePe** (2025 redesign) | Own design blog: *"preserving users' sense of agency was non-negotiable"* — kept highest-frequency actions (send money, balance check) in their exact prior screen position to protect muscle memory; moved QR-scanner to thumb-reachable footer | **"Familiarity over freshness" governance rule for a trust-critical app** — approval cards/Undo/Edit should be Nilumi's most boringly-consistent elements, since trust is built through predictability | design.phonepe.com/stories/behind-phonepe-redesign (official, fetched directly, 10 Sept 2025) |
| **Zepto** | Bold typography for fast discovery; documented interest in gamified engagement mechanics (badges, streaks, scratch-cards) | **Contrast case** — engagement-maximizing mechanics are the opposite goal of a household assistant that should get out of the way once a task is done | secondary design-portfolio sources only; **no official Zepto design blog found — lower-confidence** |
| **Swiggy** | Dominant saturated primary orange (#ff5200) driving nearly every CTA; large display type, Gilroy sans | **Contrast case** — a single extremely saturated brand color on every CTA would read as alarm/urgency in a household-trust context | third-party design-token extraction tool — **hex values UNVERIFIED/approximate** |

**Synthesis:** the strongest precedent for Nilumi is a **composite, not a single existing system** — Superhuman's warm-neutral canvas with one deliberate accent per screen; Linear's "chrome recedes, content leads" principle; PhonePe's "preserve muscle memory, never relocate high-frequency controls" trust discipline; Adobe Spectrum 2's rule of reserving saturated color for high-action moments only; Radix Colors' 12-step contrast-guaranteed scale as the technical backbone for visibility badges and evidence chips. Motion should borrow Material 3 Expressive's physics-based springs for reassuring feedback (card dismiss, Undo) — never its bold/expressive color or oversized type, and never Liquid Glass's decorative transparency (independently documented by NN/g, TechSpot, and MacRumors as actively harming legibility and predictability — Apple's own biggest recent design misstep). This composite sits warmer/more humane than Geist/Primer's developer-tool starkness or Atlassian/Fluent 2's enterprise tokenization, yet categorically calmer than CRED/Zepto/Swiggy's bold, engagement-optimized fintech/quick-commerce energy. Arc Search's citation-footer pattern is the one near-literal UI template worth adopting wholesale for evidence chips.

---

## 6. Fonts: free OFL variable fonts supporting Latin + Tamil

All metadata pulled from each font's `METADATA.pb` in the canonical `google/fonts` GitHub repo (the same source both Google Fonts and `next/font/google` build from), cross-checked against each font's own source repo; file sizes measured live against the Google Fonts CSS2 API.

| Font | Designer/Foundry | Axes | Latin UI quality | Tamil quality | Combined file size | `next/font/google` `tamil` subset | Tabular figures |
|---|---|---|---|---|---|---|---|
| **Anek Tamil** | Aadarsh Rajan (Tamil) + Yesha Goshar (Latin), both **Ek Type** (Mumbai collective) | `wght` 100–800, `wdth` 75–125 | Strong — designed "many-first," all 10 Anek scripts drawn from scratch in parallel, not Latin-first-then-adapted; won a TDC Certificate + D&AD Graphite Pencil 2022 | Dedicated Tamil designer, `primary_script: Taml` | ~93.3 KB | ✅ Yes | **Opt-in, not default** — confirmed `tnum`/`.tf` alternate-figure block in source `.fea` files; set `font-feature-settings: "tnum" 1` |
| **Catamaran** | Pria Ravichandran (lead) | `wght` 100–900, no width axis | Solid, co-designed alongside the Palanquin family in the same era | "Monolinear" Tamil designed in parallel with Latin | ~75.3 KB | ✅ Yes | **UNVERIFIED** — Tamil-only shaping `.fea` found; no Latin-side figure-feature file located |
| **Mukta Malar** | Ek Type | **None — static only**, 7 discrete weights, no `[wght]` variable file exists | Workmanlike, part of the Mukta/ITF-adjacent lineage | Dedicated Tamil cut | ~52.5 KB for ONE weight | Yes (static weights only) | UNVERIFIED |
| **Hind Madurai** | Indian Type Foundry | **None — static only**, 5 weights | Professional ITF design, part of the Hind superfamily | Dedicated Tamil cut | ~41.6 KB for ONE weight | Yes (static only) | UNVERIFIED |
| **Noto Sans Tamil** (+ Noto Sans Latin) | Google/Noto project; Noto Sans Latin by Steve Matteson | `wght` 100–900, `wdth` 62.5–100 — **identical axis ranges to Noto Sans Latin** | Canonical neutral UI sans, explicitly engineered for "short texts, product information, online reading" | 244 glyphs, dedicated "unmodulated sans serif" Tamil design, continuously QA'd via FontBakery/shaping-test CI | ~82–86 KB | ✅ Yes (the separate "Noto Sans Tamil UI" compact cut is **not** exposed via `next/font/google` — would need `next/font/local`) | **Default lining-tabular**, per the Noto CTAN package README |
| **Baloo Thambi 2** | Ek Type (Tamil); variable engineering by Yanone | `wght` 400–800 only, no weight below Regular | Google classifies as `category: DISPLAY` — rounded "bubble-letter" face, not a neutral UI text face | Tamil cut of the Baloo rounded-display family | ~69.1 KB | Yes | Not evaluated — wrong category regardless |
| **Arima** (formerly Arima Madurai) | Current: Natanael Gama, Joana Correia, Rosalie Wagner; original 2020 by NDISCOVER | `wght` 100–700 | `category: DISPLAY` — own README: *"a display font with soft edges and calligraphic feel... for headlines, brand names"* | Tamil+Malayalam+Latin, expanded via GSoC; old "Arima Madurai" path **404s / delisted**, migrated to "Arima" | ~60.9 KB | Yes | Not evaluated — confirmed decorative |
| Tiro Tamil / Pavanam / Meera Inimai / Kavivanar (other) | Various (Tiro Typeworks; Tharique Azeez; SMC; Tharique Azeez) | Static, mostly single-weight | Editorial serif / plain sans with no weight range / squarish geometric / **explicitly `HANDWRITING, DISPLAY`** | Dedicated Tamil cuts | Not measured | Yes | N/A — wrong category or no weight range for primary UI use |

[Sources: raw.githubusercontent.com/google/fonts/main/ofl/{anektamil,catamaran,muktamalar,hindmadurai,notosanstamil,balooThambi2,arima,tirotamil,pavanam,meerainimai,kavivanar}/METADATA.pb and DESCRIPTION files; fonts.gstatic.com CSS2 API live HEAD requests; raw.githubusercontent.com/vercel/next.js/canary/packages/font/src/google/font-data.json; design.google/library/anek-multiscript; CTAN `noto` package README — all fetched 10 Oct 2026]

**Correction to a common claim:** Anek was **not** "originally for the MIT type program" — Google's own design blog confirms it was designed entirely by Ek Type (a Mumbai-based collective of 12 designers across 8 Indian cities), with no MIT program involvement found in any source checked. [Source: design.google/library/anek-multiscript] Flag the MIT claim as **likely incorrect**.

### System-font fallback behavior (no custom Tamil webfont loaded)

- **`next/font/google` mechanics confirmed**: self-hosts at build time with zero runtime requests to Google; `subsets: string[]` is validated per-font against the same Google Fonts metadata, and `"tamil"` is valid for every font above. [Source: nextjs.org/docs/app/api-reference/components/font, v16.4.0]
- **iOS/macOS (WebKit):** Apple ships dedicated system Tamil fonts — **"Tamil Sangam MN," "Tamil MN," "InaiMathi"** (designed by Muthu Nedumaran at Murasu Systems specifically for Apple). [Source: fontsinuse.com/typefaces/38528/sangam-mn-latin] CoreText/WebKit's font-fallback cascade operates **per-Unicode-codepoint**, independent of the explicit `font-family` list — Tamil text renders via the OS's installed Tamil font even if your stylesheet only lists Latin system fonts. **UNVERIFIED:** the specific "first bundled in iOS 10 (2016)" version claim (secondary community sourcing only; Apple's own font-list page is a JS SPA that could not be fetched directly).
- **Android (AOSP), directly confirmed via the open-source font config:** `fonts.xml` explicitly maps Tamil script (`lang="und-Taml"`) to `NotoSansTamil-VF.ttf` (elegant variant) and `NotoSansTamilUI-VF.ttf` (compact variant), with Roboto as the Latin default. [Source: raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/main/data/fonts/fonts.xml] **This means Android's native system Tamil fallback literally *is* Noto Sans Tamil** — the exact same free OFL variable font available on Google Fonts.

### Recommended strategy

**Recommendation: a sequenced hybrid — ship the Latin half of a Tamil-ready pairing now, defer the Tamil bytes until the Tamil horizon ships.** Neither "ship nothing Tamil-aware now" nor "ship full bilingual weight now" is optimal.

**Primary pick: Noto Sans (Latin) now → Noto Sans Tamil later.** Both share **identical variable axes** (`wght` 100–900, `wdth` 62.5–100), so type-scale/line-height tokens built against Noto Sans today require **zero rework** when Tamil is switched on. Noto Sans alone is a tiny ~36 KB self-hosted variable file with zero runtime Google calls. Its Tamil sibling is the same typeface Android already bakes in as the native fallback — so any Tamil text that leaks into the UI pre-launch (plausible even now, since Chennai-family users will likely type Tamil words into free-text shopping-list items) already renders acceptably via system fallback on both platforms, with **zero visual regression** the day Noto Sans Tamil is deliberately enabled. Practically: import both loaders from `next/font/google` now, apply only the Latin one to `<html>` today, gate the Tamil `className`/CSS var behind the future locale flag.

**Secondary/plan-B (more brand personality): Anek Latin now → Anek Tamil later.** Same sequencing logic (matching axes, parallel-designed, not Latin-first-then-adapted, combined footprint <100 KB). Choose this over Noto if a more distinctive, less "default Google" typographic voice is wanted. Caveat: tabular figures are opt-in, not default — must explicitly set `font-feature-settings: "tnum" 1` for any price/date/count grid (shopping-list quantities, due dates).

**Explicitly ruled out as primary:** Mukta Malar/Hind Madurai (static-only — violates the "need variable fonts" requirement outright); Baloo Thambi 2/Arima (both `DISPLAY`-classified, wrong for body/list UI text); Tiro Tamil/Pavanam/Meera Inimai/Kavivanar (static, mostly single-weight, Kavivanar explicitly `HANDWRITING`). Pure **system-ui** (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`) is zero-cost and fine for Latin text today, and Tamil *will* render reasonably via per-codepoint OS fallback even with no Tamil font named — but Nilumi is a PWA that may also run in Windows/Linux/Chromebook browser shells with inconsistent Tamil system-font coverage (tofu-box risk), and gives up all cross-OS brand/typographic consistency. Given Noto Sans's near-zero marginal cost (~36 KB), the byte savings of system-ui don't outweigh the Tamil-rendering/consistency risk.

**Tabular figures — font-agnostic insurance:** regardless of font choice, do not rely on default figure behavior (it varies per family — Noto Sans is tabular-lining by default; Anek requires explicit opt-in; Catamaran/Mukta Malar/Hind Madurai are **UNVERIFIED** at the OpenType-feature level). Explicitly apply `font-variant-numeric: tabular-nums` (or the matching `font-feature-settings: "tnum" 1`) wherever Nilumi renders prices, quantities, dates, or times in a grid, rather than trusting a specific font's defaults.

---

## 7. Icon libraries

All repo/release data fetched live from the GitHub REST API and npm registry on 10 Oct 2026.

| Library | Package (current) | Icon count | Styles/weights | FILLED variant for active tab states? | License | GitHub stars/issues | Last push | Tree-shaking |
|---|---|---|---|---|---|---|---|---|
| **Lucide** | `lucide-react@1.55.0` | ~1,600+ (per lucide.dev; shadcn/ui's default icon set since Nov 2024) | Single consistent outline stroke style | ❌ No native fill variant — outline-only family | **ISC** (confirmed via npm `package.json`; GitHub API itself reports a generic "Other/NOASSERTION" license classification — trust the npm field) | 24,922 stars, 445 open issues | **Today** (2026-10-10) | ✅ Per-icon ESM exports |
| **Phosphor Icons** | `@phosphor-icons/react@2.1.10` | ~1,500+ unique glyphs × 6 weights = ~9,000 renderable icons | **6 weights**: thin, light, regular, bold, **fill**, **duotone** | ✅ Yes — dedicated `fill` weight prop, purpose-built for active/selected states | MIT | 7,623 stars, 517 open issues | 2026-08-26 (~6 weeks stale vs. others) | ✅ Per-icon subpath imports (`./IconName`) |
| **Tabler Icons** | `@tabler/icons-react@3.49.0` | **"over 6,200"** per the repo's own description | Outline (default) + **filled** variant set | ✅ Yes — separate filled icon set | MIT | 22,179 stars, only 82 open issues | **Today** (2026-10-10) | ✅ Per-icon imports |
| **Heroicons** | `@heroicons/react@2.2.0` | ~300 (small, curated set — by design, Tailwind Labs' own icon set) | **4 size/style combos**: 16px solid (micro), 20px solid (mini), 24px solid, 24px outline | ✅ Yes — solid variants exist specifically for this purpose (the classic solid-on-active/outline-on-inactive tab pattern originates from Heroicons' own design intent) | MIT | 23,866 stars, only **4 open issues** (very low — mature/stable, maintained by Tailwind Labs) | 2026-05-12 (~5 months stale — reads as "finished," not neglected) | ✅ Per-icon imports |
| **Hugeicons** | `@hugeicons/react@1.1.10` (wrapper) + `@hugeicons/core-free-icons@4.3.5` (icon data) | **"60,000+ icons (6,000+ free)"** per the org's own repo description — i.e. a large free tier within a much bigger paid catalogue | Stroke outline, with duotone/twotone variants in some sets | ◐ Partial — duotone/stroke variants exist in the free tier but a dedicated solid-fill-for-active-tab convention is less consistent than Phosphor/Tabler | **MIT** (confirmed for the free-icon React packages) | hugeicons/hugeicons: 1,207 stars, 4 open issues, pushed 2026-09-23 | 2026-09-23 | ✅ Per-icon subpath imports; ⚠️ the old unscoped `hugeicons-react` npm package is **explicitly deprecated** ("Use @hugeicons/react instead") — use the `@hugeicons/*` scoped packages only |
| **Iconoir** | `iconoir-react@7.12.1` | **"1600+ icons"** per the repo's own description | `/regular` and `/solid` subpath exports (two styles) | ✅ Yes — dedicated `/solid` import path | MIT | 4,575 stars, 158 open issues | 2026-10-06 | ✅ Per-style subpath imports |
| **Material Symbols** (Google) | Variable icon **font** (not a discrete React package) — via Google Fonts or self-hosted `.woff2`/`.ttf` | **~2,500+** glyphs in one variable font file | **3 styles** (Outlined, Rounded, Sharp) × 4 continuous axes: **FILL** (0–1, outline→filled), **wght** (100–700), **GRAD** (-50–200, fine grade), **opsz** (20–48dp, optical size) | ✅ Yes, natively and continuously — animate `FILL` 0→1 on tab selection rather than swapping icon components | **Apache License 2.0** | — (Google-maintained, part of `google/material-design-icons` repo) | — | N/A — it's a font, not tree-shaken SVG components; integration is via `font-variation-settings` (and typically a ligature or codepoint per icon name), a materially different integration model from the SVG-component libraries above |

[Sources: registry.npmjs.org/{lucide-react,@phosphor-icons/react,@tabler/icons-react,@heroicons/react,@hugeicons/react,@hugeicons/core-free-icons,iconoir-react}/latest; api.github.com/repos/{lucide-icons/lucide,phosphor-icons/homepage,tabler/tabler-icons,tailwindlabs/heroicons,hugeicons/hugeicons,iconoir-icons/iconoir}; fonts.google.com/icons and developers.google.com/fonts/docs/material_symbols — all fetched 10 Oct 2026]

**For Nilumi's bottom tab bar (Today/Lists/Talk/Tasks/Memory) specifically**, which needs a filled-on-active / outline-on-inactive pattern: **Phosphor** (dedicated `fill` + `duotone` weights, matched 1:1 stroke-weight-consistent outline/fill pairs) and **Tabler** (explicit separate outline+filled sets, largest free count at 6,200+, exceptionally low open-issue count) are the strongest matches; **Heroicons** is purpose-built for exactly this UI convention but with a much smaller, more curated 300-icon set — fine if Nilumi's icon vocabulary stays small. **Lucide** (shadcn's own default) has **no fill variant at all** — if Nilumi stays on Lucide for consistency with shadcn's defaults, the active-tab affordance will need a different technique (background pill, color, or stroke-weight change) rather than a fill swap. **Material Symbols** is the only option with a *continuous*, animatable FILL axis (useful for a spring-animated fill-on-select transition per §5.2's Material 3 Expressive motion idea) but requires a font-based integration model rather than tree-shaken SVG React components — a reasonable trade-off only if Nilumi is comfortable with variable-font-based icons rather than per-icon imports.

---

## 8. iOS 26 / Android 2026 installed-PWA specifics

### 8.1 iOS 26: Home Screen → standalone web app by default (genuine, major change)

For 17 years (since iPhone OS 2.1, 2008), whether "Add to Home Screen" produced a standalone web app or a plain bookmark depended entirely on the site's own code. **As of iOS 26/iPadOS 26, every site added to the Home Screen opens as a standalone web app by default, with zero manifest/meta-tag requirements**, mirroring the decision Apple made for Mac Dock web apps in Sept 2023. WebKit's own words: *"By default, every website added to the Home Screen opens as a web app... there are now zero requirements for 'installability' in Safari."* [Source: webkit.org/blog/17333/webkit-features-in-safari-26-0, "Every site can be a web app on iOS and iPadOS"] Independently confirmed by mjtsai.com (3 Oct 2025) and heise.de. **No global Settings-app toggle exists** — the control is a **per-item "Open as Web App" toggle inside the Share-sheet's "Add to Home Screen" dialog**, defaulting ON; turning it off forces a plain Safari bookmark. [Source: macrumors.com/how-to/save-safari-bookmark-web-app-iphone-home-screen; initialcharge.net/2025/10/open-as-web-app-option] **UNVERIFIED:** whether any hidden/MDM-only global override exists (none found across three independent sources, but absence-of-evidence is not proof).

### 8.2 Splash screens: `apple-touch-startup-image` still required, unchanged since iOS 8

Safari 26.0's full feature list (fetched in its entirety) documents **no change** to splash-screen behavior — the only icon-related addition is new SVG icon support for favicons/Home-Screen icons, not splash screens. [Source: webkit.org/blog/17333] iOS still does **not** synthesize a launch screen from the manifest's `icons`+`background_color` the way Chrome/Android does — developers must still hand-supply `apple-touch-startup-image` link tags per device-size/orientation/pixel-ratio, or users see a blank white flash. **For Nilumi:** keep shipping these tags (or a generator like `pwa-asset-generator`); do not rely on manifest-only splash on iOS even in 26.

### 8.3 Status bar / `black-translucent` — a genuinely new, actively-tracked iOS 26.1+ regression

This is the single most concrete, currency-sensitive finding verified directly against **WebKit's own Bugzilla**:

- `black-translucent` still renders content under the status bar (requiring `viewport-fit=cover` + `env(safe-area-inset-top)`) — the base mechanism is unchanged.
- **However, starting in iOS 26.1, WebKit introduced a regression**: instead of true transparency, `black-translucent` now paints an unremovable dark gradient scrim over the status bar in installed Home-Screen web apps. A developer's own bug report, citing Apple's WebKit bug-tracker reply directly: *"Since iOS 26.1, Apple no longer renders... a transparent status bar... The system draws a dark gradient (a scrim)... In iOS 27 the same scrim is present. It cannot be turned off from the page."* Apple's own guidance (per the bug) is to **remove the meta tag entirely** — the status bar then takes the page's background color and sits *above* content (not overlaying), so `env(safe-area-inset-top)` resolves to `0`. [Source: github.com/autobrr/qui/issues/2520, filed 1 Sept 2026]
- Three live WebKit Bugzilla tickets confirm this directly: **#317153** ("REGRESSION iOS 27.0: status bar remains visible in fullscreen mode in Home Screen Web apps") — **RESOLVED FIXED**, created 15 Jun 2026; **#301994** (same title, "REGRESSION iOS 26.1") — **REOPENED**, still open, created 5 Nov 2025; **#316008** ("Incorrect 100vh and -lvh in standalone web apps that have not set apple-mobile-web-app-status-bar-style") — **NEW/open**, created 1 Jun 2026. [Source: bugs.webkit.org/show_bug.cgi?id={317153,301994,316008}]
- **These three bugs are coupled, not independent**: removing the status-bar meta tag (Apple's own suggested fix for the scrim) triggers the *new* `100vh`/`100lvh` miscalculation bug (#316008) in standalone mode — a materially new interaction that didn't exist pre-iOS-26. A second, very recent (8–9 Oct 2026) real-world report shows switching the meta value from `black-translucent` to `black` removes the scrim but makes the **entire page rubber-band/drag** beyond the viewport, because document height stops matching viewport height. [Source: github.com/Suwayomi/Suwayomi-WebUI/issues/1173, filed 8 Oct 2026]
- **Recommendation: budget explicit QA time on a real iOS 26.1+/27-beta device for the status-bar-meta-tag × viewport-height × overscroll-behavior interaction as one combined test**, not three separate ones — current evidence shows they are entangled in iOS 26.

### 8.4 Standalone-mode limitations still present in iOS 26 (individually verified)

- **Edge-swipe-to-go-back: still absent, unchanged** (§3.5) — by design, no browser chrome exists to swipe from; iOS 26's native "swipe anywhere" back-gesture upgrade is a UIKit-native-apps-only API.
- **Keyboard/viewport resize: `interactive-widget` still NOT shipped in Safari.** Per Bramus Van Damme (Chrome DevRel, who personally tracks WebKit's implementation): *"Safari (WebKit): ⏳ In development. Implemented in the WebKit source, but not yet shipped in a public release of Safari or Safari Technology Preview."* [Source: bram.us/2026/09/11/webkit-supports-interactive-widget-and-hopefully-safari-will-too, dated 11 Sept 2026] Safari resizes only the Visual Viewport on focused-input keyboard appearance (unchanged since ~2022). A further quirk: `visualViewport` height/offset reportedly fails to fully reset after keyboard dismissal in standalone mode on iOS 26, leaving fixed-position bars misplaced until reload (reported on Apple Developer Forums thread 800154 — **title/existence confirmed, full content not retrievable — UNVERIFIED beyond that**). Bramus separately flags (same piece) that `viewport-fit` itself "ended up getting broken in Safari 26 (and still is to this day)" per his own testing — **specific nature UNVERIFIED**, full source thread unreachable.
- **100vh/dvh/svh/lvh: core bug fixed since iOS 17.4, but a genuinely new narrow iOS-26 edge case exists** (bug #316008 above) specifically when the status-bar meta tag is *absent* in standalone mode.
- **Rubber-band/overscroll: mostly suppressible via `overscroll-behavior`, but entangled with the status-bar-meta-tag bug** — a live Oct 2026 report shows the old "overscroll-behavior isn't fully respected in standalone mode" problem resurfacing as a side effect of the status-bar interaction above, not as an independent bug.

### 8.5 Other notable iOS 26 WebKit changes relevant to PWA chrome

From the complete Safari 26.0 release notes: SVG icon support everywhere icons appear (including Home Screen/Dock icons); **automatic Service Worker inspection via Web Inspector's "Inspect Apps and Devices,"** explicitly including Home Screen Web Apps (directly useful for debugging Nilumi's Serwist service worker); **user-agent string no longer includes the OS version** (frozen like macOS since 2017 — don't UA-sniff for iOS version); **Navigation API reached Baseline "Newly Available" in January 2026**, with **Safari 26.2** shipping support (missing only the `precommitHandler` Chrome/Edge/Firefox 147 have) — directly useful for Nilumi's in-app router participating correctly in gesture-preview systems. [Source: webkit.org/blog/17333; infoq.com/news/2026/05/navigation-api-browser]

### 8.6 Android Chrome: edge-to-edge for installed PWAs — actively broken, fix in-flight, not yet Stable

Chrome's edge-to-edge feature (content extends under the gesture nav bar with a dynamic "chin" overlay) shipped for **browser tabs** from **Chrome 135** (~April 2025) via `viewport-fit=cover`. [Source: developer.chrome.com/docs/css-ui/edge-to-edge, 28 Feb 2025] **Installed PWAs/WebAPKs/TWAs did not get the same treatment**, even using the documented recipe — tracked as **Chromium Issue 407420295** (opened March 2025). Bramus Van Damme publicly confirmed the gap (24 Mar 2026): *"This is a known shortcoming... The bug is currently assigned."* As of **15 July 2026**, Gerrit changes show Chrome wiring up a "short-edges cutout mode" for WebApps/TWAs/immersive Custom Tabs, but the issue **remains "In Progress," with no confirmed Stable-channel ship date.** [Source: tech-ish.com/2026/07/15/google-chrome-for-android-pwa-edge-to-edge, directly quoting Bramus and linking Chromium issue + Gerrit CL 7689791] Separately, Android 15 (API 35) made OS-level edge-to-edge the enforced default for native apps, with Android 16 (API 36) **removing the opt-out entirely** — this is a distinct native-Activity-level mandate, not the same code path as Chrome's own PWA edge-to-edge work, which is why the gap could exist despite the OS push. [Source: developer.android.com/develop/ui/views/layout/edge-to-edge; developer.android.com/about/versions/16/behavior-changes-16]

### 8.7 Android Chrome: navigation-bar color — status bar works, bottom nav bar does not (yet)

`theme_color` reliably colors the top status bar/omnibox area for installed Chrome PWAs (stable since Chrome 39). [Source: developer.chrome.com/docs/lighthouse/pwa/themed-omnibox] **The bottom Android gesture/navigation bar does NOT respect `theme_color`** — tracked as **Chromium Issue 40759522** ("Installed PWA doesn't respect theme color... for status-bar and nav-bar"), with Googler assignees and ongoing 2026 activity; a community test build (Pixel 6a, Android 16) shows a working fix, but it is **not confirmed shipped to Stable Chrome** as of this writing. [Source: issues.chromium.org/issues/40759522; static.januschka.com/i-40759522] There is no newer manifest field for nav-bar color specifically. **For Nilumi:** set `theme_color` for the status bar (works today); don't rely on it coloring the bottom nav bar yet.

### 8.8 Predictive back gesture and installed PWAs

Android's system-wide **predictive back** gesture (Android 13+, on by default for apps targeting Android 15+/API 35, opt-out **removed entirely** in Android 16/API 36) applies automatically to WebAPK Activities/TWAs that use default platform back handling. [Source: developer.android.com/guide/navigation/custom-back/predictive-back-gesture] Chrome's own **in-page** predictive back/forward preview (dimmed preview of the previous *web page* mid-swipe) was tested behind flags from ~Chrome 138 (mid-2025) as an A/B rollout — **general-availability Stable-channel status could not be confirmed via an official developer.chrome.com post — flag as UNVERIFIED, treat as "rolling out," not universally on.** The modern **Navigation API** (§3.5, §8.5) is the recommended way to make an SPA's internal routing correctly participate in both Android's predictive-back preview and iOS's page-swipe-preview, since both vendors wire their gesture-preview systems to browser-level navigation entries rather than raw JS state. **Whether a WebAPK/TWA's root-level "exit to Home Screen" gesture gets full native-app parity was not explicitly confirmed by any official Google statement found — flag as UNVERIFIED (plausible, not confirmed).**

### 8.9 Summary table

| Behavior | iOS 26 status | Android Chrome 2026 status |
|---|---|---|
| Home Screen → standalone by default | **NEW in iOS 26** — per-item toggle, no global setting | N/A (Chrome has long had explicit Install vs. Shortcut prompts) |
| Splash/startup screen | Unchanged — manual `apple-touch-startup-image` still required | Manifest auto-generates splash (unchanged) |
| Status bar / safe-area-inset-top | **Regressed in 26.1+** — unremovable scrim (bug #301994 open, #317153 fixed for iOS 27); Apple's fix (drop meta tag) triggers a new #316008 bug | N/A — status bar via `theme_color`, stable |
| Edge swipe-to-go-back | Still absent for standalone web apps (by design) | System predictive-back default-on (Android 15/16); Chrome in-page preview rolling out, GA status unconfirmed |
| Keyboard/viewport resize (`interactive-widget`) | **Not shipped** — WebKit source only, no public release | Supported since Chrome 108 (2022) |
| 100vh/dvh/svh/lvh | Core bug fixed since 17.4; **new narrow iOS-26 bug** (#316008) when status-bar meta tag absent | Stable; edge-to-edge changes affect sizing per Chrome 135 docs |
| Rubber-band/`overscroll-behavior` | Mostly suppressible, but entangled with the status-bar-meta-tag bug | N/A / not centrally reported for installed PWAs |
| Edge-to-edge content | N/A (handled via safe-area-inset + viewport-fit=cover) | **Broken for installed PWAs/TWAs** despite working for tabs since Chrome 135; fix in-flight, not yet Stable |
| Nav/system bar color | Status-bar meta tag (buggy, see above) | Status bar via `theme_color` works; **bottom nav bar fix built/tested, not confirmed Stable** |
| Predictive back (system) | N/A | Default-on Android 15/16 for platform-back-API apps; WebAPK/TWA root-exit parity with native apps unconfirmed |

[Sources for §8 throughout: webkit.org/blog/17333/webkit-features-in-safari-26-0; mjtsai.com/blog/2025/10/03/web-apps-in-ios-26; macrumors.com/how-to/save-safari-bookmark-web-app-iphone-home-screen; bugs.webkit.org/show_bug.cgi?id={317153,301994,316008}; github.com/autobrr/qui/issues/2520; github.com/Suwayomi/Suwayomi-WebUI/issues/1173; bram.us/2026/09/11/webkit-supports-interactive-widget-and-hopefully-safari-will-too; developer.android.com/guide/navigation/custom-back/predictive-back-gesture; developer.chrome.com/docs/css-ui/edge-to-edge; tech-ish.com/2026/07/15/google-chrome-for-android-pwa-edge-to-edge; issues.chromium.org/issues/{407420295,40759522}; infoq.com/news/2026/05/navigation-api-browser — all fetched 10 Oct 2026]

---

## Appendix: Consolidated gaps and UNVERIFIED items

- shadcn/ui: whether a freshly-`init`'d post-July-2026 project emits a compound `"<base>-<style>"` string in `components.json` was not independently re-run against a live CLI invocation.
- Icon libraries: Phosphor's and Tabler's exact per-weight icon counts (e.g. "6,200+" for Tabler) are the project's own marketing figures, not independently recounted glyph-by-glyph.
- Framework alternatives: Ionic's/Framework7's incompatibility with Next.js App Router is a reasoned architectural inference, not a quoted official "incompatible" statement; Konsta UI's bundle size could not be measured (Bundlephobia 503); HeroUI Pro's and Tamagui's paid-tier gating mechanics were not independently confirmed (pricing pages unreachable this pass) — immaterial since recommendations rely only on confirmed-free cores.
- Motion/gestures: `@use-gesture`'s exact gzip bundle size and explicit React-19-tested status are unconfirmed beyond a permissive peer-dependency range; whether Next.js 16's internally-pinned React Canary runtime is officially validated against a manually-installed React 19.3 was not confirmed by any explicit Next.js statement.
- CSS platform: exact Chrome version for `env(preferred-text-scale)` (reported as "Chromium 138" via secondary search) could not be confirmed directly against chromestatus.com (JS-rendered shell); the iOS-26 `backdrop-filter`-behind-status-bar workaround "no longer works" claim is sourced from 2–3 developer blogs, not an official WebKit post.
- Design trends: Apple's verbatim iOS 26.1 release-note text (for the "Tinted" Liquid Glass option) was not independently fetched (MacRumors reporting only); CRED NeoPOP's and Zepto's visual characterizations rely on third-party portfolio/token-extraction sites since their own official design pages were unreachable or non-existent.
- Fonts: tabular-figure default behavior for Catamaran, Mukta Malar, and Hind Madurai could not be confirmed at the OpenType-feature-table level (binary font inspection was not possible in this research pass); in-browser Tamil shaping/ligature rendering quality was not visually audited for any candidate font — recommend rendering actual Tamil sample strings in-browser before finalizing a choice.
- iOS/Android specifics: whether any hidden/global iOS Settings override for "Open as Web App" exists beyond the per-item toggle is unconfirmed (absence inferred from three consistent independent sources, not a direct Apple statement); the exact nature of a reported Safari-26 `viewport-fit` regression (via a Bluesky post that could not be fetched) and the full content of Apple Developer Forums thread 800154 remain unconfirmed; Chrome's in-page predictive-back-transition General Availability status on Stable is unconfirmed; WebAPK/TWA predictive-back parity with native apps on home-screen exit is unconfirmed by any explicit Google statement.


