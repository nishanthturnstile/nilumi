# 29 — Design System: Nilumi "Pastel Rooms" (v1)

> **Status:** Proposed for approval · **Date:** 10 October 2026 · **Owner decision:** Pastel Rooms chosen from six rendered directions
> **Related:** [ADR-056](../adr/adr-056.md) · [Product plan](../core/01-product-plan.md) · [Application flows](../core/28-application-flows.md) · [Tech stack](../core/03-tech-stack.md) · [UI platform research](../research/30-ui-platform-research.md) · Tokens: [`packages/ui/src/styles/globals.css`](../../packages/ui/src/styles/globals.css) · Product record: [`PRODUCT.md`](../../PRODUCT.md)

This document owns Nilumi's visual language and component rules. Every screen and component inherits from it, whether it comes from shadcn/ui or is built for Nilumi. `globals.css` is the single source of truth for values; this spec explains them.

---

## 1. Summary

Nilumi is a calm home with five softly coloured rooms. **Each tab is a room** with its own pastel floor: Today peach, Lists mint, Talk lilac, Tasks butter, Memory sky, and a neutral linen room for Inbox, Settings, Admin and sign-in. White cards float on the floor, deep navy ink keeps everything crisp even in sunlight, and **coral is Nilumi's voice** (record controls, listening, speaking). It is spacious, colourful and a little playful in motion, and it stays plain and serious where trust matters: Forget, health facts and privacy.

| Decision | Choice |
|---|---|
| Identity | One Nilumi identity on every device, with native *behaviours* per OS (no iOS or Material skins) |
| Feel | Built for a mom and her children: spacious, colourful, a little playful, professional, never childish, never a SaaS dashboard |
| Colour | Room floors for wayfinding; navy ink and white cards for content; coral for voice; semantic and visibility colours independent of rooms |
| Type | Nunito for everything, Noto Sans Tamil for all Tamil; fixed steps × an in-app text scale up to 200% |
| Components | shadcn/ui on **Base UI** primitives (Maia preset as a starting fork), Phosphor icons, Motion only for gestures |
| Accessibility | WCAG 2.2 AA, enforced by an automated contrast gate across 6 rooms × light/dark × phone/desktop (1,656 checks) and a class lint |

---

## 2. Research and inspiration

The full cited research (10 Oct 2026) is in [30 UI platform research](../research/30-ui-platform-research.md). The six rendered directions that led to this choice are preserved in [`explorations/2026-10-10-directions`](explorations/2026-10-10-directions/index.html).

### 2.1 Mood board

| Reference | What we take | What we leave |
|---|---|---|
| **Tiimo, Structured** (day planners) | Soft colour per context, generous rounded cards, calm playful motion | Streaks and gamification |
| **Apple Journal, Reminders** | Large titles, grouped lists, native rhythm | Liquid Glass translucency |
| **Things 3** | Surface simplicity, one colour for action, depth revealed on demand | Near-monochrome restraint |
| **Linear (2025)** | Chrome recedes, content leads | Developer-tool density |
| **Arc Search** | Answer first, sources one tap away (our evidence chips) | — |
| **PhonePe 2025 redesign** | Never move high-frequency controls; trust through predictability | — |
| **Adobe Spectrum 2, Radix Colors** | Saturated colour only for high-action moments; every colour step has one job and a verified contrast | — |
| **Material 3 Expressive** | Gentle spring feedback on press and tick | Oversized type, loud colour |

### 2.2 What we deliberately avoid

- **Apple's Liquid Glass (iOS 26)** as a reading surface. Nielsen Norman Group documented legibility and tap-target problems, and Safari can't detect Reduce Transparency. Nilumi uses solid surfaces only.
- **Engagement-maximising consumer patterns** (CRED NeoPOP, Zepto, Swiggy): loud colour, scratch cards and streaks fight a household assistant that should get out of the way.
- **The corporate SaaS look** (owner anti-reference): grey canvases, dense tables and small type on everyday screens.

### 2.3 Platform facts that shape the system

| Fact (Oct 2026) | Consequence |
|---|---|
| shadcn/ui ships Radix, Base UI and React Aria bases; Base UI is the default since July 2026, with a native snap-point Drawer and a swipe-dismiss Toast. Vaul is near-dormant | shadcn/ui on Base UI; no separate drawer library |
| OS text-size settings don't rescale installed web apps (`text-scale` meta is Chrome Canary only) | An in-app Text size setting drives `--text-scale` |
| iOS 26: no edge back-swipe in standalone apps; the `black-translucent` status bar now paints a scrim; `theme-color` is ignored; the status bar takes the page background | Back buttons on every sub-screen; no status-bar meta tag; the room floor is the page background |
| Safari doesn't support `interactive-widget`, VirtualKeyboard, `dialog closedby`, `interpolate-size` or `prefers-reduced-transparency` | `visualViewport` keyboard handling; no reliance on these features |
| No general web haptics on iOS; `navigator.vibrate` on Android only | Haptics are a progressive enhancement on Android |
| Android installed-PWA edge-to-edge is still broken; `theme-color` colours the status bar only | Tray and header work with and without edge-to-edge |
| OKLCH, `color-mix()`, `@property`, `@starting-style`, container queries, `:has()`, `dvh` and same-document View Transitions are safe on all targets | The token system is built on them |

---

## 3. Design philosophy and principles

1. **A home, not a dashboard.** Rooms, not panels. One idea per card.
2. **Spacious by default.** At most three "needs attention" items before scrolling, one primary action per card, 32px between sections.
3. **Colour means something.** Room colour says where you are. Semantic colour says what's happening. A visibility badge says who can see it. Colour is never decoration.
4. **Playful in motion, serious in words.** Soft springs on small confirmations only. Copy stays plain and honest. Destructive and health flows have no playful motion.
5. **Show the receipt.** Every result shows what was heard, what was done, where it came from and who can see it.
6. **Thumb first, then pointer.** Bottom tray, sheets over modals; desktop re-lays out the same components.
7. **Native behaviours, Nilumi identity.** Feel at home on each phone without imitating either platform's skin.

**Mobile-first.** Every component is designed at 360px wide first, with 48px targets and thumb-reach placement. Larger windows add columns and panes; they never shrink touch targets or remove labels.

---

## 4. Foundations

### 4.1 Colour

**Rooms (wayfinding only).** Each room has five values: the **floor** (page background), **tint** (active pill, hover, chips), **strong** (decorative fills and selection), **ink** (tinted text and icons, ≥ 4.5:1 on white, floor and tint) and **card surface**.

| Room | Floor | Tint | Strong | Ink | Dark floor | Dark card | Dark tint | Dark ink |
|---|---|---|---|---|---|---|---|---|
| Today (peach) | `#FFE7D9` | `#FFD3BD` | `#FFB08A` | `#9A3B17` | `#2E211C` | `#3D2D27` | `#503931` | `#FFB896` |
| Lists (mint) | `#D9F2E6` | `#BEE7D3` | `#8CD4B1` | `#1A6A48` | `#1D2B25` | `#283A32` | `#335043` | `#8FDDB8` |
| Talk (lilac) | `#EAE4FF` | `#D8CEFF` | `#B8A7FF` | `#5240BF` | `#232035` | `#2F2B45` | `#3F3962` | `#C3B8FF` |
| Tasks (butter) | `#FFF1C4` | `#FFE391` | `#FFD059` | `#765300` | `#2A2619` | `#383223` | `#4D4429` | `#F4D36E` |
| Memory (sky) | `#DEECFF` | `#C5DCFF` | `#97C0FF` | `#26599F` | `#1C2533` | `#273244` | `#33445E` | `#A3C6FF` |
| Linen (neutral) | `#F5F1EE` | `#EAE3DE` | `#D6CBC3` | `#5C544D` | `#252220` | `#322E2B` | `#443E3A` | `#D9D0CA` |

Light cards are white in every room. Hex values are sRGB approximations of the OKLCH tokens in `globals.css`.

**How rooms are applied.** The boot script sets `data-room` on `<html>` before first paint (from the URL, `roomForPath`) and the app updates it on every tab change. All `--room-*` tokens then point at that room's palette, so portalled sheets, toasts, popovers and dialogs inherit the room. `html` and `body` paint `--room-floor`, which is also the colour iOS uses for the status bar. The floor glides between rooms (a registered `@property --room` transition), while the header and tray stay still. On screens 1024px and wider, the light floor is mixed 15% toward white so large areas feel calmer while cards still separate (≥ 1.10, checked by the gate). A theme switch sets `data-theme-switching` for one frame so the floor doesn't glide between light and dark.

**Source-room colour.** Icon badges on cards are tinted by the room the item **comes from**: a reminder shows butter, a list item mint, a memory sky. Today and Inbox therefore become multi-coloured, and the colour always means "where this lives", never status.

**Core palette**

| Role | Token | Light | Dark | Use |
|---|---|---|---|---|
| Ink | `--ink` | `#2D2940` | `#FFF4EE` | All primary text, focus ring |
| Secondary ink | `--ink-2` | `#5A546E` | `#D6CAD2` | Meta text, placeholders, helper text |
| Control border | `--control-border` | `#79738D` | `#A59AA7` | Inputs, checkboxes, switch tracks (≥ 3:1 on white, every floor and every tint) |
| Action | `--action` | `#2D2940` | `#FFF1E8` | Primary buttons, toasts |
| Voice | `--voice` | `#FF7657` | `#FF8E72` | Record controls, listening and speaking states |
| Voice glyph | `--voice-foreground` | `#2D2940` | `#2A1B20` | Mic glyph on coral (5.3:1) |
| Voice on action | `--voice-on-action` | `#FFB39E` | `#B23A23` | The Undo action inside a toast |

**Semantic triples.** Each status has a **fill** (icons and glyph backgrounds, ≥ 3:1), a **soft** background, and a separate **ink** for text (≥ 4.5:1 on white and on its soft). Soft fills sit **only on white surfaces**, never directly on a room floor (danger-soft on the peach floor is 1.02:1).

| Status | Fill | Soft | Ink | Dark fill | Dark soft | Dark ink |
|---|---|---|---|---|---|---|
| Success | `#24935F` | `#DDF3E7` | `#17734A` | `#4CC78A` | `#1C3A2B` | `#8BE0B4` |
| Warning | `#B57401` | `#FFF0CC` | `#835401` | `#F0B233` | `#3D3014` | `#FFD27A` |
| Danger | `#CF3B2C` | `#FFE5E1` | `#A62A1D` | `#FF7A6A` | `#46201C` | `#FFB5AB` |
| Info | `#2F6FD0` | `#E1ECFF` | `#23579F` | `#78A9FF` | `#1C2C4A` | `#A9C8FF` |

**Visibility is shape-coded, not hue-coded.** Visibility is privacy-critical, so it can't share colours with rooms or status:

| Visibility | Treatment | Icon | Meaning |
|---|---|---|---|
| Household | Soft neutral fill (`#F1EDF1` / dark `#4C4652`), ≥ 1.15 separation from the card | House | Both adults can see and edit |
| Shared | Solid 1.5px outline in secondary ink | People | Both can see; only the owner can change |
| Private | **Dashed** 1.5px outline in secondary ink | Lock | Only the owner can see it, and its existence is hidden |

Badges are small (24px), never navy-filled and never look tappable. Every badge carries icon + label + shape, so colour is never the only signal.

**Member hues** (for "who added" initials) sit outside the room palette: rose `#A3154F` on `#FCE1EC`, and teal `#0E6476` on `#D3F0F5`.

**Charts (Admin only)** use a mid-chroma series (`#D0552C`, `#2B8A5F`, `#6A54D6`, `#A87200`, `#2F6FD0`), each ≥ 3:1 on white, always with labels or patterns. Pastel floors are never chart colours.

**Format.** All values are OKLCH, chosen for perceptually even lightness. Instead of generic 10-step ramps, every step has one named job (floor, tint, strong, ink, surface; fill, soft, ink). Fewer values, each one verified.

### 4.2 Typography

**Families.** **Nunito** (variable, rounded terminals) for all Latin text: one family, as product UI should. **Noto Sans Tamil** (variable) for all Tamil, headings included; it is Android's own system Tamil font. The stack is `Nunito, "Noto Sans Tamil", system-ui`. apps/web loads both through `next/font` and exposes them as `--font-nunito` and `--font-noto-tamil` (see `packages/ui/src/fonts.ts`). Rounded "bubble" display fonts (Baloo Thambi 2, Fredoka) were rejected as childish.

**Scale.** Fixed steps (no fluid type), roughly a 1.2 ratio, every step at least 1.4 line-height so Tamil vowel signs never clip:

| Token (`text-*`) | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `display` | 32px | 1.4 | 800 | Today greeting, large titles |
| `title-1` | 26px | 1.4 | 800 | Screen titles |
| `title-2` | 20px | 1.4 | 750 | Section headings |
| `headline` | 17px | 1.41 | 700 | Card titles |
| `body` | 16px | 1.5 | 500 | Body text, inputs |
| `callout` | 15px | 1.53 | 500 | Secondary body |
| `subhead` | 14px | 1.5 | 600 | Meta rows, labels |
| `footnote` | 13px | 1.54 | 600 | Chips, badges, captions |
| `caption` | 12px | 1.5 | 700 | Small labels |
| `tab` | 12px (capped at 1.25× scale) | 1.25 | 700 | Tab labels (may wrap to two lines). The one exception to the 1.4 rule: short labels in a fixed-height tray; Tamil labels get 1.6 through `:lang(ta)`, and the tray height reserves two lines |

Tailwind's own `text-xs` to `text-4xl` are re-based on the same scale, so stock shadcn components grow with the setting too.

**Text scaling to 200%.** The root stays 16px. `html[data-text-scale="100|115|130|150|175|200"]` sets `--text-scale`, which multiplies **only the type tokens**; spacing, radius and targets stay fixed, so layouts don't balloon. Controls use `min-height` and grow with their text; rows and cards wrap; tab labels cap at 1.25× and wrap. Size-sensitive components use container queries rather than `rem` media queries. The in-app setting is the only scaling mechanism. `-apple-system-body` is not used, because it would scale twice.

**Mixed-script text.** Transcripts, names and list items mix Tamil into English without a `lang` attribute, so renderers wrap Tamil runs (U+0B80–U+0BFF; `tamilRuns()`/`splitTamilRuns()` in `fonts.ts`) in `<span lang="ta">`. `:lang(ta)` sets a 1.6 line-height and forbids letter-spacing and all-caps. The body sets `overflow-wrap: anywhere`, so a long Tamil word (Tamil breaks only at spaces) wraps instead of overflowing at 200%. Tamil stays at 1em rather than being shrunk to match Nunito's x-height; legibility of the script wins over typographic evenness. Clamped text keeps vertical slack.

**Numbers.** Nunito's digits are already tabular (every digit advances 600/1000), so quantities, times and money align by default. `tabular` (a utility) is available for other fonts.

### 4.3 Spacing and layout

- **Base unit** 4px; steps 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 (Tailwind's `--spacing` scale).
- **Gutters** (`--gutter`): 20px compact, 24px medium, 32px expanded; `px-gutter` also clears landscape notches.
- **Rhythm:** 12px between cards in a group, 32px between sections, more space above a heading than below it.
- **Targets:** 48px for primary, list and tray controls (`--control-height`), 44px absolute floor (`--target-min`, `touch-target` utility). Compact controls (36px) exist on desktop only.
- **Content widths:** `--content-max` 720px for Today and Talk columns; sheets up to 640px; side sheets 420px.
- **Text-aware grids:** auto-fill grids size their minimum column by the text scale (`minmax(min(100%, calc(9.5rem * var(--text-scale))), 1fr)`), so tiles drop to one column at large text instead of overflowing.

### 4.4 Shape

`--radius: 1.25rem` drives shadcn's scale. Radii are concentric: inner radius = outer radius − padding.

| Token | px | Used for |
|---|---|---|
| `rounded-sm` | 12 | Inputs inside cards, small chips |
| `rounded-md` | 16 | Inner containers |
| `rounded-lg` | 20 | Rows, small cards, textarea |
| `rounded-xl` | 28 | Cards |
| `rounded-2xl` | 36 | Sheet top corners |
| `rounded-full` | — | Buttons, chips, badges, avatars, capture bar |

In Admin (`data-density="compact"`) the base radius drops to 10px, so the same classes read as 6 to 14px.

### 4.5 Elevation and surfaces

| Level | Token | Used for |
|---|---|---|
| 0 | — | Rows inside cards, tinted chips |
| 1 | `shadow-card` | Cards on the floor |
| 2 | `shadow-float` | Capture bar, tab tray, floating buttons |
| 3 | `shadow-overlay` + `bg-scrim` | Sheets, dialogs |

Shadows are **tinted from the room's ink**, never grey, so they read as soft coloured light on a pastel floor. In dark mode elevation comes from lighter surfaces (each dark card is a measured step above its floor), not shadows. **Surfaces are solid.** No glass or backdrop blur on anything people read.

### 4.6 Iconography

**Phosphor Icons**, configured as shadcn's icon library:

- **Regular** weight for UI.
- **Fill** for the active tab and selected states.
- **Duotone** for room, category and empty-state icons, with the second tone set to the room's strong colour through the `icon-duotone-tint` utility (`--duotone` overrides it). Phosphor's second tone is a 20% `currentColor` path by default. The strong colour stays visible on a tint badge, which the tint itself would not.
- Sizes are 16, 20, 24, 32 and 48px. Icons on cards sit in round 40px badges tinted by their source room.
- **Inline icons** (inside chips, badges, buttons and messages) are sized in `em` (`size-[1.1em]`) so they grow with the text scale, as SF Symbols do with Dynamic Type. Use the **bold** weight at these small sizes for legibility. Standalone icons (tray, header, badges) stay at fixed sizes.
- **The microphone glyph appears only on real record controls**, one per screen. The Talk tab uses a conversation glyph.

### 4.7 Motion

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | 100ms | Press feedback |
| `--duration-quick` | 160ms | Hover, fades, toggles |
| `--duration-base` | 240ms | Segmented control, small layout changes |
| `--duration-gentle` | 320ms | Room floor change, card entrance |
| `--duration-slow` | 480ms | Sheets |
| `ease-standard` | `cubic-bezier(.2,0,0,1)` | Default |
| `ease-decelerate` | `cubic-bezier(.16,1,.3,1)` | Things arriving (exponential ease-out) |
| `ease-accelerate` | `cubic-bezier(.3,0,1,1)` | Things leaving |
| `ease-spring-soft` | `cubic-bezier(.34,1.35,.64,1)` | **Only** tick, toggle and press-release (the "little bit playful") |

**Signature moments** (one authored moment per interaction):

| Moment | Motion |
|---|---|
| Press | Scale to 0.97 |
| Tick | The check draws (`animate-check-draw`) with a soft success ripple (`animate-tick-ripple`) |
| Room change | The floor colour glides |
| Listening | Breathing coral ring (`animate-listen-ring`) with level bars (`animate-level-bar`) |
| Thinking | Three soft dots (`animate-thinking`) |
| Toast | Rises from the tray |
| New realtime row | Slides in (`animate-rise`) with a fading tint highlight (`animate-highlight`) |
| List → detail | View Transitions with an instant-swap fallback |

**Rules.** No page-load choreography. CSS first: transitions, `@starting-style` and the keyframes above. Motion (`motion/react-m` with LazyMotion) only for gesture-driven pieces such as swipe rows. Under `prefers-reduced-motion`, movement becomes near-instant, but functional states stay visible:
- a static coral ring and the "Listening…" label;
- mid-height level bars;
- checked states;
- spinners, which pulse their opacity instead of freezing.

Elements with the `motion-fade` utility keep a short opacity fade.

### 4.8 Dark mode strategy

- **Default follows the system**, live (an installed app can stay open across a scheduled switch), with an in-app System / Light / Dark override.
- One mechanism: the `.dark` class plus `color-scheme` on `<html>`, set by an inline script before first paint, so there is no flash. The first `theme-color` is a server-rendered light/dark media pair; `initTheme()` takes over after hydration.
- **Dusky rooms.** Every room keeps its hue at low lightness, each card is a measured step lighter than its floor, ink becomes warm white, coral brightens and keeps a dark glyph, and semantic fills brighten while their soft backgrounds darken.
- **Use scene:** light for the 7:30 am Today brief in daylight and at the shop; dark for reminders checked in bed.

### 4.9 Accessibility standards (WCAG 2.2 AA)

| Requirement | How Nilumi meets it |
|---|---|
| 1.4.3 / 1.4.11 contrast | Text ≥ 4.5:1; icons, borders and focus ≥ 3:1. Enforced by `pnpm ui:contrast`: 69 pairs × 6 rooms × 2 themes × phone and desktop, with alpha compositing. It covers every source-room badge, hover, the destructive and input washes stock shadcn uses, and badge separation. Coral's boundary is exempt because the glyph (≥ 3:1) and label identify the record control. Semantic `*-foreground` colours are for **glyphs only**, never text |
| 1.4.1 use of colour | Visibility = icon + label + shape; done = check + strikethrough; active tab = filled icon + bolder label + `aria-current` (the tint pill is decoration) |
| 1.4.4 / 1.4.10 resize and reflow | In-app text size to 200%; `min-height` controls; wrapping rows. Header, tray and composer heights are functions of the text scale, so reserved space grows with the text. The viewport meta never sets `maximum-scale` or `user-scalable=no` |
| 2.4.7 / 2.4.11 / 2.4.13 focus | An opaque 2px outline with 2px offset, **unlayered**, so it wins over any component's `outline-none`. Navy on light; warm white on dark and inside navy surfaces (toasts, `data-surface="inverse"`); `Highlight` in forced-colors mode. Translucent rings are banned by the class lint. `scroll-padding` keeps focus clear of the header, tray and any bottom dock |
| 2.5.7 dragging | Every swipe or drag has a tap alternative; hold-to-talk also has tap-to-start and keyboard |
| 2.5.8 target size | 48px controls; 44px floor via `touch-target` |
| 2.2.1 timing | Undo toasts last 8–10s, pause on focus, hover or touch, and the result card keeps its own Undo |
| 3.3.8 authentication | The sign-in code is one `autocomplete="one-time-code"` field that accepts paste |
| 4.1.3 status | Toasts and result cards announce through polite live regions |
| Motion | `prefers-reduced-motion` respected without hiding state |
| Inputs | Never below 16px on touch-capable devices (`any-pointer: coarse`), so iOS never auto-zooms; placeholders use secondary ink (≥ 4.5:1), not preflight's 50% `currentColor` |

---

## 5. Native-app feel (installed PWA)

| Area | Rule |
|---|---|
| **Shell** | Room-coloured page, sticky header and tab tray, client-side transitions. The **document is the scroller** (best for status-bar tap-to-top, the keyboard and pull-to-refresh); sheets own their nested scrollers. Each tab keeps its scroll position and state (React `<Activity>` or Next component caching; Phase 1 decides) |
| **Status bar** | No `apple-mobile-web-app-status-bar-style` meta tag; iOS 26 colours the bar from the page background, which is the room floor. `<meta name="theme-color">` is updated per room and theme for Android, read from the room's target `--{room}-floor` (a light/dark media pair covers the first frame). `color-scheme` is set per theme |
| **Edges** | `viewport-fit=cover`; safe-area padding on the tray, sheets and side insets (`pb-safe`, `px-gutter`); `dvh` units only, never `vh` |
| **Scrolling** | `overscroll-behavior-y: none` on the root; `scroll-contain` on every nested scroller; optional custom pull-to-refresh on Lists and Inbox only |
| **Touch** | No tap highlight; `touch-action: manipulation` on controls; instant pressed states; hover only enhances (Tailwind's `hover:` is already `(hover: hover)`-gated) |
| **Hold-to-talk** | The mic gets `no-callout`, `touch-action: none`, `contextmenu` suppression, `pointercancel` and lost-capture handling, a 400ms tap/hold split (S1), and stays clear of the home indicator |
| **Keyboard** | A `visualViewport` hook writes `--keyboard-inset` on `<html>` so the Talk composer and sheet actions stay above the keyboard, and resets it after dismissal, rotation and visibility changes (Safari has no `interactive-widget`) |
| **Back** | Sub-screens always show a back button (iOS standalone has no back-swipe). Sheets push a history entry when they open, so Android's system back closes the sheet before leaving the screen |
| **Sheets over modals** | Detail, edit and pickers are bottom sheets; destructive confirmation is an action sheet on phones and a small dialog on desktop |
| **Dates and times** | Always shown as resolved text: en-IN, Asia/Kolkata, day-first ("Thu 3 Apr, 6:30 pm"). Native pickers are only the picking control |
| **Launch** | Manifest `background_color` and Apple startup images (light and dark, full device-size matrix) in the Today peach with a Nunito wordmark until a brand mark exists |
| **Offline** | Nunito and the Tamil subset are precached by the service worker; offline and "Reconnecting…" states are calm pill banners under the header |
| **Haptics** | Android: a 10ms `navigator.vibrate` on tick and hold-to-talk start. iOS: none, except real `switch` inputs |
| **Badging** | `navigator.setAppBadge(unreadInboxCount)` where supported (iOS and desktop Chromium) |

---

## 6. Responsive behaviour and desktop adaptation

Window classes are Tailwind breakpoints `medium:` (≥ 600px), `expanded:` (≥ 1024px) and `wide:` (≥ 1440px). Stock `sm:`/`md:` alias to medium, `lg:` to expanded and `xl:`/`2xl:` to wide, so installed shadcn components switch at the same widths; new code uses the window-class names. Components adapt with container queries (`@container`).

| Window | Navigation | Layout |
|---|---|---|
| **Compact** (< 600) | Bottom tray with 2–5 tabs as phases ship (P1 Today + Talk; P2 + Lists; P3 + Memory; P5 + Tasks), never placeholders or disabled tabs. Talk is raised in the centre once there are 3 or more tabs | Single column on the full room floor |
| **Medium** (600–1023) | Navigation rail on the left with a room-tinted active pill | Single column, max 640px; detail in bottom sheets |
| **Expanded** (≥ 1024) | Labelled sidebar: rooms, then Inbox and profile | List and detail panes for Lists, Tasks and Memory. Today gets a side column (Later this week, Inbox). Talk gets a docked context panel (the entity or list being discussed). Side sheets replace bottom sheets |
| **Wide** (≥ 1440) | Same | Extra space becomes margin, never more columns of cards |

**Desktop rules.** Lighter floors (§4.1); hover states; visible focus; keyboard shortcuts (`/` focuses the capture bar, `Esc` closes sheets); pointer-sized compact controls are allowed only in Admin.

**Tablet.** iPad portrait uses the rail. Landscape uses the expanded layout. Touch targets stay 48px on every tablet.

**Admin** (`data-density="compact"`, linen room) is the one dense surface:

- 10px base radius, 36–40px table rows, 13–14px type, sticky headers and keyboard row navigation.
- It adds a JSON/trace viewer, a diff view, a log view and accessible charts.
- Another adult's trace rows are shown redacted: timings and costs only, never text.
- On touch screens, compact targets still never drop below 44px.

---

## 7. Interaction patterns

| Pattern | Behaviour |
|---|---|
| Tap | Instant pressed state (scale 0.97), action on release |
| Hold-to-talk | Press ≥ 400ms on a record control records until release; a shorter tap toggles start/stop; sliding off cancels; recording under 300ms is ignored with a hint |
| Swipe to remove | List rows swipe left to reveal a danger-soft area with a trash icon; past the threshold the row is removed and an Undo toast appears. Long-press and the row's menu offer the same action |
| Long-press | Opens an action sheet of the item's actions |
| Sheets | Drag between snap points (50%, 92%); flick down to dismiss; tap the scrim or press back to close |
| Inline edit | Tap a slot on a result card (date, quantity, name) to edit it in place, then Save or Cancel |
| Suggestions | Approve / Edit / Not now; Approve runs exactly what's shown, once |
| Clarify | Choice chips ("The Bosch" / "The LG") under Nilumi's question |
| Undo | On every result card for 24h (per product rules), and in the toast for 8–10s |
| Offline | Optimistic updates with a "waiting" marker; a pill banner counts queued changes |
| Pull to refresh | Lists and Inbox only, custom indicator in the room tint |

---

## 8. Component strategy

Every component inherits these rules. "Tokens" means utilities built from `globals.css` (for example `bg-card`, `text-room-ink`, `rounded-xl`, `shadow-card`, `min-h-(--control-height)`).

### 8.1 Buttons
- **Shape and size:** pills (`rounded-full`) with `min-h-(--control-height)` (48px), growing with the text. The main action in a sheet is 52px (`--control-height-lg`); compact 36px is desktop only. Horizontal padding is 20px. Icon buttons are 48px circles.
- **Variants:**
  - **primary:** `bg-primary text-primary-foreground`.
  - **secondary:** white with a `border-input` 1.5px border.
  - **tonal:** `bg-room-tint text-room-ink`, for in-room actions.
  - **ghost:** text only.
  - **destructive:** `bg-danger-soft text-danger-ink`, and only on white surfaces. Solid `bg-destructive` appears only inside a confirmation.
  - **voice:** a coral circle with a navy glyph.
- **One primary per section.**
- **States:**
  - hover (desktop only): primary uses `bg-primary-hover`, and other variants use the room tint;
  - pressed: scales to 0.97, with spring-soft on release;
  - focus: the opaque outline;
  - disabled: 40% opacity with no shadow;
  - loading: a spinner that keeps the button's width;
  - the destructive confirmation names its action ("Forget warranty date").

### 8.2 Inputs
- **Shape:** a **white** pill (`bg-background`) with `min-h-(--control-height-lg)` (52px) and a 1.5px `border-input` border, which is ≥ 3:1 on white, on every floor and on every tint. Stock Maia inputs use a `bg-input/30` wash, so Input, Textarea, Select, Combobox and the outline Button are forked to `bg-background`; the wash is still gated in case one slips through.
- **Focus:** the same opaque 2px navy outline as every control, drawn around the pill. In wrapped fields (shadcn `InputGroup`, the capture bar) the inner input carries `data-focus-delegate` (shadcn's `data-slot="input-group-control"` is recognised automatically) and the wrapper draws the outline (`data-focus-ring-within`, or shadcn's `data-slot="input-group"`). The fork removes stock border-colour and ring-halo focus styles, so there is one focus language and no double outline.
- **Labels and messages:** the label sits above the field; helper or error text sits below with an icon.
- **Text:** 16px or larger on touch screens. The placeholder uses `ink-2`.
- **Textarea:** 20px radius; grows with its content (`field-sizing: content`, with a JS fallback before Safari 26.2).
- **Capture bar:** "Say or type something" is a special input — a white pill with the only mic on its screen.
- **Selects:** open as sheet pickers on phones and popovers on desktop.
- **Dates and times:** a native picker inside a sheet, with the resolved value shown as text.

### 8.3 Forms
- Built on shadcn's `Field` (label, description, error), single column.
- Groups (`FieldSet`) sit in white cards on the room floor.
- The main action is sticky at the bottom of a sheet, above the keyboard.
- Validate on blur, then live. An error says what's wrong and how to fix it.
- The secret-refusal message ("That sounds sensitive, so I won't store it.") is an info-soft callout, not an error.
- The sign-in code is one paste-friendly `one-time-code` field.

### 8.4 Cards
- White (`bg-card`), `rounded-xl` (28px), `shadow-card`, 16–20px padding; height follows the content. One idea per card. **No nested cards.**
- **Anatomy:**
  - an icon badge (40px, tinted by its source room);
  - a title (`headline`);
  - a meta row: an evidence chip, the time and a visibility badge;
  - one trailing action (tick, chevron or menu).
- **Result cards** (Saved / Updated / Forgotten / Failed / Incomplete):
  - a status line with an icon and a semantic ink word ("Saved" in `success-ink`), plus the visibility badge;
  - the content, with resolved values in bold;
  - "Heard: …" in `ink-2`;
  - Undo / Edit.
  - Failed and Incomplete name what wasn't saved and are never described as done.
- **Approval cards:** a suggestion badge, the exact action ("Move 'Call plumber Ravi' to tomorrow, 10:00 am?"), an evidence chip, then Approve / Edit / Not now. Stale, expired and failed states replace the actions with a plain explanation.
- **Health facts:** a Confirm card with no playful motion.

### 8.5 Sheets
- **Bottom sheet:** a Base UI Drawer from the bottom.
  - Top corners `rounded-2xl` (36px), a 36×5px grabber, `shadow-overlay` over `bg-scrim`.
  - Snap points at 50% and 92%; `pb-safe`; keyboard-aware (Base UI `VirtualKeyboardProvider` plus the `visualViewport` hook).
  - Sheets are modal, so the scrim stays at full strength at every snap point. Don't bind its opacity to the backdrop's `--drawer-swipe-progress`, which Base UI ramps between the first two snap points (an iOS "undimmed lower detent", meant for non-modal sheets).
  - It pushes a history entry so Android back closes it; content scrolls inside with `scroll-contain`.
  - Max width 640px, centred on larger screens.
- **Side sheet** (expanded windows): a 420px panel from the right in the same tokens.
- **Action sheets** (phones) list actions as full-width 52px rows, with the destructive one last and in danger ink, followed by a separate Cancel.

### 8.6 Drawers
On phones every "drawer" is a bottom sheet (§8.5). There is no hamburger navigation drawer: navigation is always visible (tray, rail or sidebar). On desktop the sidebar can collapse to the rail.

### 8.7 Navigation
- **Tab tray** (compact):
  - A white tray with a 30px top radius and `shadow-float`, `pb-safe`.
  - 2–5 items, labels always shown (`text-tab`).
  - **Active** = Phosphor fill icon + bolder label + `text-room-ink` + `aria-current="page"`; the `bg-room-tint` pill behind the icon is decoration only.
  - The Talk item is a raised coral circle with a conversation glyph that **navigates** to Talk. It is not a record button.
  - The raised circle protrudes `--tray-overhang` (28px) above the tray. With fewer than 3 tabs the shell sets `<html data-tray="flat">`, which zeroes it. `pb-tray`, scroll padding, docks and toasts all clear `max(--bottom-dock, --tray-overhang)`.
- **Header:**
  - A large title (`display`/`title-1`) on top-level screens that collapses to a compact 17px title on scroll (a scroll-driven animation where supported, an instant swap otherwise).
  - Inbox bell with an unread count and the avatar on the right.
  - Sub-screens show a back chevron and a compact title.
- **Rail and sidebar** (larger windows): the same items and states; the sidebar also lists Inbox, Settings and Admin.

### 8.8 Tabs (in-page)
A segmented control for Mine / Ours and Upcoming / Overdue: a `bg-room-tint` track, a white thumb with `shadow-card` that slides in 240ms, labels in `text-subhead`, 44px tall. For more than three options, use horizontally scrolling chips instead.

### 8.9 Tables
- Desktop and Admin only, inside `data-density="compact"`: a white container (`rounded-xl`), 36–40px rows, hairline separators, `text-subhead`, tabular numbers, a sticky header, keyboard row navigation, and a hover row in `bg-room-tint`.
- On phones, tables become grouped row lists.
- Charts use the chart series, with labels or patterns.

### 8.10 Dialogs
- Only for irreversible or protected moments: Forget, forget-all, step-up.
- **On phones:** an action sheet.
- **On desktop:** a centred 440px dialog with `rounded-xl` over the scrim.
- The title states the consequence ("Forget the warranty date? This can't be undone.").
- The destructive button names the action, and **Cancel gets initial focus**.
- No dialogs for routine choices; use inline or sheet patterns.

### 8.11 Toasts
- A navy pill (`bg-primary text-primary-foreground`, warm white in dark) above the tray and the raised Talk tab, 52px, `shadow-float`.
- An optional action ("Undo") in `text-voice-on-action`.
- 8–10s; pauses on focus, hover or touch; at most two stacked; swipe to dismiss.
- A polite live region (Base UI Toast).
- One toast per user action, never for passive events.

### 8.12 Lists
- Rows are grouped in white cards with hairline separators and `min-h-(--row-height)` (64px); they wrap and never truncate names. A row has:
  - a leading 48px-target round checkbox (`border-input`; checked = `bg-success` with a drawn check, a ripple and a strikethrough);
  - the title, then quantity in `tabular` `ink-2`;
  - "who added" initials in a member hue.
- **Swipe left to remove**, with a tap alternative (§7).
- New realtime rows slide in with a fading highlight.
- Conflicts show inline with both values and a choice.
- Rows that have offline changes waiting show a small "waiting" marker.

### 8.13 Empty states
- A 96px circle in `bg-room-tint` holding a duotone room icon (48px).
- A `title-2` heading, one sentence on why it's empty and what will appear, and one action (usually tonal).
- Never sample or fake data (Product principle).
- Example: Lists — "Your list is empty." / "Say 'add milk' or type it below; both phones see it straight away." / [Add an item].

### 8.14 Loading states
- **Skeletons:** use the `skeleton` utility (a room-tint shimmer) shaped like the real cards and rows. The shimmer stops under reduced motion.
- **Talk thinking:** three soft coral dots (`animate-thinking`) inside a Nilumi bubble.
- **Buttons:** a spinner in place of the label.
- **Lists:** optimistic updates rather than spinners.
- **Never:** full-screen spinners, or spinners in the middle of content.
- **Slow states** (over 6s for speech) switch to the honest fallback copy from the flows ("I couldn't hear that, please type it.").

### 8.15 Smaller components
| Component | Rules |
|---|---|
| Evidence chip | `bg-room-tint text-ink-2` pill with a link icon ("From memory · 2 Sep"); 32px tall with a 44px hit area; opens the source; "No longer available" when stale |
| Visibility badge | §4.1: shape-coded, 24px, icon + label, never interactive-looking |
| Status chip | Semantic soft + ink, on white only ("Late", "Expired") |
| Avatar | Initials in a member hue; 40px in the header, 20px in rows |
| Switch | Real `<input type="checkbox" switch>` where supported (iOS haptic); 52×32px; `bg-success` when on; the track border is ≥ 3:1 when off |
| Checkbox and radio | 26px visual inside a 48px target; radio groups as selectable cards |
| Banner | A pill under the header for offline, reconnecting and AI status: icon + one sentence + optional link; info or warning soft on a white pill |
| Progress | A thin pill in the room tint with a room-ink fill; never decorative |

**nilumi-ui/1 catalog mapping** ([ADR-044](../adr/adr-044.md)):

| Catalog component | Rendered as |
|---|---|
| `card` | Result card (§8.4) |
| `list` | Grouped rows (§8.12) |
| `evidence-chip` | Evidence chip (§8.15) |
| `approval` | Approval card (§8.4) |
| `form` | Forms (§8.3) |
| `table` | Tables (§8.9) |
| `progress` | Progress (§8.15) |
| `artifact` | A card that opens a side or bottom sheet |

Unknown parts render as plain text.

---

## 9. Component library decision

**Keep shadcn/ui, initialised on Base UI primitives** (`components.json`: `"style": "base-maia"`, `"iconLibrary": "phosphor"`). The pinned CLI derives Base UI from the style prefix; a separate `base` field is invalid, and plain `maia` would select Radix. Recorded in [ADR-056](../adr/adr-056.md); configuration syntax matches the [official schema](https://ui.shadcn.com/schema.json).

| Option | Verdict | Why |
|---|---|---|
| **shadcn/ui + Base UI** | **Chosen** | We own the code; Tailwind v4 tokens; Base UI is shadcn's default and ships the most complete native-style Drawer (snap points, velocity-aware swipe tuned for 120Hz, edge swipe areas, keyboard awareness) plus a swipe-dismiss Toast |
| shadcn/ui + Radix | Supported, not default | Mature, but no native-style drawer (Vaul, its usual partner, is near-dormant) |
| React Aria Components | By exception | Gold-standard accessibility and `usePress`/`useLongPress` (optional for hold-to-talk); no bottom sheet |
| Ark UI | Not needed | Comparable drawer; would duplicate Base UI |
| Konsta UI | Rejected | Native skins (we want one identity), weak accessibility, simple sheets |
| Ionic React, Framework7 | Rejected | Their own routers fight the App Router; Shadow DOM and non-Tailwind CSS |
| Tamagui | Rejected | Compiler and provider cost with no React Native benefit |
| Mantine, Radix Themes, HeroUI | Rejected | Desktop-oriented or stale; HeroUI's drawer is a side panel |

**Supporting libraries:**
- **Phosphor Icons**, for its regular, fill and duotone weights.
- **Motion** (`motion/react-m` + LazyMotion), loading its drag/pan features lazily and only for swipe rows and custom gestures.
- **No** Vaul, `@use-gesture` (dormant) or haptics libraries.

A Radix or React Aria component may be adopted **only by exception**: behind the same Nilumi component contract, with an ADR note and focus, portal and accessibility tests. They are not drop-in replacements.

---

## 10. shadcn/ui customization rules

1. **Tokens only.** Components use token utilities. Tailwind's default palette is removed in `@theme` (`--color-*: initial`), and the stock shadow steps (`shadow-xs`…`shadow-2xl`) are re-pointed at the room-tinted elevations, so stock components never cast grey shadows. Because Tailwind silently emits nothing for unknown classes, `pnpm ui:lint-classes` fails the build on default-palette classes (`bg-blue-500`), raw white/black (`bg-black/80`, `text-white`), backdrop blur, translucent focus rings (`ring-ring/50`) and raw `var(--radius-*)`. It scans `packages/ui`, every app under `apps/` and the device-check route. Raw hex and `oklch()` in components are forbidden; add a token instead.
2. **Variable mapping.** shadcn's variable names are kept so stock components work:

   | shadcn variable | Nilumi value |
   |---|---|
   | `--background`, `--card`, `--popover` | The white component surface |
   | `--foreground` | Navy ink |
   | `--primary` | Navy |
   | `--secondary` | White (secondary buttons add a border) |
   | `--muted`, `--accent` | Room tint |
   | `--muted-foreground` | Secondary ink |
   | `--destructive` | Danger **ink** (text-safe, because stock components use `text-destructive` and `bg-destructive/10`) |
   | `--border` | Hairline |
   | `--input` | 3:1 control border |
   | `--ring` | Focus ink |
   | `--sidebar-*` | Desktop sidebar |
   | `--chart-*` | Chart series |

   **The page floor is separate** (`bg-room-floor` on the shell), so the shadcn surfaces (cards, popovers, sheets) stay white. Inputs are the exception: stock Maia gives them a `bg-input/30` wash, so they are forked to `bg-background` (rule 4).
3. **Nilumi tokens live beside them:**
   - Room tokens: `room-*` and each room by name (`today-*` … `linen-*`).
   - `voice-*` and the semantic triples (`success-*`, `warning-*`, `danger-*`, `info-*`).
   - `household`, `visibility-*`, `member-*`, `scrim`, `focus`, `hairline`, `control`.
   - The `shadow-card` / `float` / `overlay` shadows, the `ease-*` easings, the `animate-*` animations, and the `text-display` … `text-tab` type steps.
4. **Maia is a starting fork.** Its per-component geometry is hard-coded, so we edit generated files in place. Variants go in each component's `cva` (Button gains `tonal` and `voice`; Badge gains `household`, `shared` and `private`); there are never wrapper-on-wrapper overrides. Every customised file is listed in the register in [`packages/ui/README.md`](../../packages/ui/README.md) and re-diffed whenever shadcn updates it.
5. **Primitives vs composites.** `src/components/ui/*` stay product-agnostic shadcn primitives. `src/components/nilumi/*` compose them and own Nilumi meaning: tab tray, room shell, capture bar, mic button, result card, approval card, evidence chip, visibility badge, list row, swipe row, empty state and banners.
6. **New-component checklist** (after `shadcn add`):
   - tokens only;
   - 48px targets with `min-h-(--control-height)` (replace Maia's fixed `h-9`/`h-10`);
   - every state (hover, focus, pressed, disabled, loading, error, empty);
   - dark mode;
   - reduced motion;
   - Tamil text;
   - 200% text;
   - portalled content inherits the room;
   - inputs on `bg-background`;
   - no `ring-ring/50` or `outline-ring/50`;
   - `bg-scrim` instead of `bg-black/80`, and no `backdrop-blur`;
   - z-index from `--z-*`;
   - `rounded-*` utilities only, never `var(--radius-*)`;
   - window classes `medium:`/`expanded:`/`wide:` instead of `md:`/`lg:`;
   - added to the register.
7. **One theme source of truth:** `class="dark"`, `color-scheme`, `data-room` and `data-text-scale` on `<html>`, set before paint by `themeBootScript` and changed afterwards with `setRoom`, `setTheme` and `setTextScale` (`src/lib/theme.ts`). `setRoom` also writes `<meta name="theme-color">`, converting the room's **target** floor to hex, because `--room` is mid-transition right after a change.
8. **Never accept the CSS patch** that `shadcn init` or `shadcn add` proposes for `globals.css`: it adds a white `body` and a translucent `outline-ring/50`. `shadcn/tailwind.css` is already imported deliberately for the data-attribute variants.
9. **Distribution later.** If a second app needs the theme, publish `globals.css` as a private shadcn registry item (`registry:style` with `cssVars`).

---

## 11. Token reference (`globals.css` structure)

| Section | Contents |
|---|---|
| 1. Primitives | `:root` and `:root.dark`: ink, action, voice, semantic triples, visibility, members, charts, and all six room palettes |
| 2. Room scope | `:root[data-room=…]` points `--room`, `--room-tint`, `--room-strong`, `--room-ink`, `--room-surface` and `--room-shadow` at one palette |
| 3. System tokens | The shadcn mapping (plus `--primary-hover`), elevation, radius, `--text-scale`, fonts, layout (`--gutter`, plus `--header-height`, `--tray-height` and `--capture-height`, which grow with the text; and `--bottom-dock`, `--tray-overhang`, `--keyboard-inset`, `--content-max`), control sizes, durations and z-layers. Also: text-scale steps, `data-tray="flat"`, responsive gutters, the desktop floor, the compact density layer and `data-theme-switching` |
| 4. `@theme` | Colour utilities, fonts, radius, shadows (stock `shadow-xs`…`2xl` re-pointed at the tinted elevations), type steps (scaled), breakpoints `medium`/`expanded`/`wide` (stock `sm`…`2xl` aliased to them), easings, animations and keyframes |
| 5. Base | Borders, the html/body floor, safe scroll padding, the room transition, selection, placeholder, `:lang(ta)` and touch-action |
| 6. Utilities | `pt-safe`, `pb-safe`, `px-gutter`, `pb-tray`, `content-column`, `touch-target`, `no-callout`, `scroll-contain`, `focus-ring`, `focus-inverse`, `motion-fade`, `tabular`, `icon-duotone-tint` and `skeleton`; plus shadcn's `data-open:`/`data-checked:` variants, `no-scrollbar` and `scroll-fade` |
| 7. Platform guards | The unlayered focus contract (with focus delegation for wrapped fields, inverse surfaces and forced colors), the iOS input-zoom guard (including responsive variants), and reduced motion (with the spinner pulse) |

---

## 12. Folder structure and maintainability

```
PRODUCT.md                          product record (users, purpose, brand commitments)
DESIGN.md                           durable visual decisions (summary of this spec)
pnpm-workspace.yaml, package.json   workspace root (ADR-002)
packages/ui/                        @nilumi/ui
  components.json                   shadcn: Base UI base, Maia fork, Phosphor
  src/styles/globals.css            ← the single source of truth
  src/fonts.ts                      font contract, Tamil-run splitter, text-scale steps
  src/lib/utils.ts                  cn()
  src/lib/theme.ts                  boot script, setRoom / setTheme / setTextScale, theme-color sync
  src/components/ui/                shadcn primitives, added as features need them
  src/components/nilumi/            product composites (from Phase 1)
  scripts/check-contrast.mjs        contrast gate (pnpm ui:contrast)
  scripts/check-classes.mjs         class lint (pnpm ui:lint-classes)
  specimen/                         static visual specimen (pnpm ui:specimen)
  README.md                         usage + customised-files register
spikes/s1/app/design-check/         interactive device check (Base UI Drawer, Toast, shell)
docs/design/29-design-system.md     this spec
docs/design/31-device-qa.md         device QA matrix
docs/design/explorations/           the six rendered directions (decision record)
```

**Using it in apps/web (Phase 1):**
- Reuse this existing `packages/ui` as the production UI package. Keep the specimens as review references and add reusable React components to `src/`; screen compositions and data wiring live in `apps/web` in this same monorepo.
- Load fonts in `app/fonts.ts` with `next/font`.
- In `app/globals.css`, add `@import "@nilumi/ui/globals.css";` and `@source "../../../packages/ui/src";`. Tailwind v4 skips symlinked `node_modules`, and `@source` belongs in CSS, not in `layout.tsx`.
- Import that CSS in `app/layout.tsx` and inline `themeBootScript` in `<head>`.
- Set `transpilePackages: ["@nilumi/ui"]` and `outputFileTracingRoot`.
- Point `components.json` aliases at the package.

**Shell height measurement.** The token heights are formulas. Once the real shell exists, a `ResizeObserver` may write the measured header, tray and dock heights to `--header-height`, `--tray-height` and `--bottom-dock` on `<html>`; the CSS formulas remain the fallback.

**Governance (how the system changes):**
1. Propose the change against this spec (screenshot or specimen).
2. Edit tokens in `globals.css` only.
3. Run `pnpm ui:check` (contrast gate, class lint and typecheck); it must pass.
4. Rebuild the specimen and check every room in both themes.
5. Update this spec and `DESIGN.md`.
6. Changes to rooms, voice, visibility or motion personality need an ADR amendment.

Version the system with this document's title. v1 is this release.

---

## 13. Validation

| Check | How | Status |
|---|---|---|
| Contrast | `pnpm ui:contrast`: 69 pairs × 6 rooms × 2 themes × phone and desktop, alpha composited, plus a check that every `@theme` variable resolves; failing pairs exit 1 | Passing (1,656/1,656) |
| Class lint | `pnpm ui:lint-classes`: no default-palette classes, raw white/black, backdrop blur, translucent focus rings or raw radius variables, across `packages/ui`, `apps/*` and the device-check route | Passing |
| Visual specimen | `pnpm ui:specimen`, then open `packages/ui/specimen/index.html`: room, component and state references, light/dark, Tamil, 100/150/200% text, Admin | Built; screen-by-screen and component-by-component owner review pending (owner clarification, October 10) |
| Device check | `/design-check` in the S1 spike plus [31 Device QA](31-device-qa.md), run on the iPhone and Android phones | Route built and verified in a desktop browser; owner to run the matrix on both phones |
| Design detector | The impeccable detector over the specimen and CSS | Clean, with intentional findings classified (Appendix A) |
| Independent review | Three models (GPT-5.5, Claude Sonnet 5.5, Gemini 3.8 Flash) at plan, at the token checkpoint and on the finished build | Complete: all approve with changes, changes applied (Appendix A.1–A.3) |

---

## 14. Assumptions, risks and open questions

**Assumptions**
- The Phase 1 app lives in this repository as `apps/web`, alongside `apps/worker`, and consumes the existing `packages/ui`; no replacement UI package is created.
- Kids are subjects, not users, in the MVP; kid mode (H5) gets its own pass.
- No logo exists yet; a Nunito wordmark stands in on splash screens.

**Risks**
| Risk | Mitigation |
|---|---|
| Room colours read as meaning | Rooms only tint floors, the active tab and source-room badges; visibility is shape-coded; soft status fills only on white |
| "Colourful" reads thin | Source-room badges, duotone room icons and floors make Today and Inbox multi-colour |
| Pastels wash out in sunlight | Navy ink on white cards carries content; the gate checks every floor |
| Feels childish | Nunito and Noto only, restrained sizes, playful motion only on small confirmations, plain copy, compact Admin |
| 200% text | Type-only scale, `min-height` controls, container queries; verified in the specimen |
| iOS 26 status-bar, viewport and overscroll bugs (WebKit #301994, #316008) | No status-bar meta; floor on html and body; device QA matrix |
| Android installed-app edge-to-edge broken | Tray and header work with and without it |
| Maia updates overwrite customisations | Register plus re-diff |
| Base UI is younger than Radix | It is shadcn's default; exceptions only behind the Nilumi contract |

**Open questions (recommendations applied)**
- Talk keeps the lilac floor with white bubbles.
- Two member hues exist for "who added".
- Compact density only inside Admin.
- Brand mark and app icon: a separate task.

---

## Appendix A — Review and resolutions

### A.1 Plan review (10 Oct 2026)

GPT-5.5, Claude Sonnet 5.5 and Gemini 3.8 Flash independently reviewed the plan; all three returned **approve with changes**. Accepted:

| Finding | Resolution |
|---|---|
| Room tokens on the shell wouldn't reach portalled sheets, toasts and dialogs; re-pointing `--background` would turn inputs and sheets pastel | `data-room` on `<html>`; `--background` stays white; separate `--room-floor` |
| Prototype contrast failures: white mic glyph 2.63:1; borders 1.77:1 (2.15 dark); success text 3.88:1; danger on soft 4.07:1; translucent focus ring 1.33:1 | Navy glyph; 3:1 control border; semantic `ink` tokens; opaque ring; enforced by the gate |
| Visibility badges reused the Lists and Memory floor colours | Shape-coded visibility in ink tones |
| Danger-soft on the peach floor 1.02:1 | Soft fills only on white |
| Baloo Thambi 2 is a display face and reads childish | Dropped; Noto Sans Tamil everywhere |
| Line-heights below Noto Tamil's metrics | Every step ≥ 1.4; `:lang(ta)` 1.6 |
| Mixed Tamil has no `lang` | Renderer wraps Tamil runs |
| Root-size scaling would balloon spacing and break 200% | Type-only `--text-scale`; `min-height` controls; capped tab labels |
| Tab tray ignored phased tabs; two mics on one screen | Phased 2–5 tray; Talk tab navigates; one mic per screen |
| Status-bar mechanism | No meta; the page background is the floor; per-room `theme-color` |
| Android back with sheets; keyboard reset; hold-to-talk callout; scroll ownership | History-backed sheets; `visualViewport` reset; mic hardening; document scroller |
| Room change via View Transitions is fragile | `@property --room` transition |
| Admin needs density; charts can't be pastel | `data-density="compact"`; mid-chroma chart series |
| Undo toast too short; segmented OTP; zoom lock; focus obscured | 8–10s pausing toasts; one-time-code field; no zoom lock; `scroll-padding` |
| Maia geometry is hard-coded; Maia ships Hugeicons | Maia treated as a fork with a register; Phosphor configured |
| Static specimen can't test gestures or iOS 26 bugs | Device-check route in S1 plus a QA matrix |

**Rejected:** hiding tab labels at large text sizes (Gemini). Labels-always is a decided navigation rule ([Application flows §4.1](../core/28-application-flows.md#41-navigation)); labels cap at 1.25× and wrap instead.

### A.2 Token checkpoint review (10 Oct 2026)

The same three models reviewed `globals.css`, the gate and this spec before the specimen was built. Sonnet confirmed by compiling: the Tailwind v4 usage, the cascade, the `@property` transition and the hex tables are sound. Accepted fixes:

| Finding | Resolution |
|---|---|
| Stock Maia components use `outline-none` plus a translucent `ring-ring/50` (2.67–2.98:1). The base-layer focus rule loses to utilities. `--focus-inverse` was never applied | An unlayered `:focus-visible` outline wins over `outline-none`; inverse focus inside `.bg-primary` and `[data-surface="inverse"]`; `Highlight` in forced colors; class lint bans translucent rings |
| The gate skipped `@media`, but the desktop floor (55/45 mix) dropped separation to 1.07 | The gate now evaluates the desktop viewport, including `color-mix()`; the floor mix is 85/15 (minimum 1.104) |
| `--destructive` as the danger fill fails as text on stock 10% washes (4.22) | `--destructive` = danger ink; the 10%/20% wash pairs are gated |
| Dark 20% danger wash (4.33) and the stock input wash placeholder (4.38) | Dark danger ink and secondary ink lightened; both pairs gated |
| Dark Household badge vanished on dark cards (1.01:1) | Dark fill raised to L 0.405; badge-vs-card separation gated at ≥ 1.15 |
| Control border on tints was 2.93:1 | Border darkened; border-on-tint gated at 3:1 |
| Duotone second tone was tint on a tint badge (1:1) | Second tone is the room's strong colour |
| Fixed header and tray heights under-reserve at large text (2.4.11) | The heights are functions of `--text-scale`; `--capture-height` and `--bottom-dock` added; the ResizeObserver path documented |
| `pointer: coarse` misses hybrid touch devices; compact large control was 40px on touch | `any-pointer: coarse` everywhere; compact touch controls are all 44px; compact small control is 36px |
| The input-zoom `!important` overrode large text utilities | The guard only lifts small text utilities |
| `motion-fade` only existed under reduced motion; frozen spinners | A real `motion-fade` utility; spinners pulse under reduced motion |
| The `--room` glide also fires on a theme toggle | `data-theme-switching` disables transitions for one frame (`setTheme`) |
| `theme-color` read the in-flight `--room` value | `syncThemeColor` reads the target `--{room}-floor` and converts it to hex |
| Preflight placeholder at 50% `currentColor` | `::placeholder` uses secondary ink |
| `bg-blue-500` doesn't fail a build | Class lint (`pnpm ui:lint-classes`) |
| `shadcn init/add` would add a white body, `outline-ring/50` and the `shadcn/tailwind.css` import | The import is added deliberately; never accept the CSS patch |
| The dark variant didn't match `<html>` itself | `@custom-variant dark (&:where(.dark, .dark *))` |
| A shared `/g` Tamil regex is stateful | `tamilRuns()` factory and `splitTamilRuns()` |
| Missing `hooks` export; `@source` location; stock `md:`/`lg:` breakpoints | Export added; `@source` goes in CSS; checklist says use `medium:`/`expanded:`/`wide:` |

**Rejected or deferred:**
- *Cross-room badge ink on another room's tint (Gemini):* not a real case. Source-room badges always pair a room's ink with **its own** tint, and the gate checks every such pair.
- *Transition `background-color` directly instead of `--room` (Gemini):* it would re-trigger on every animated frame. The `@property` glide stays, and the desktop `color-mix` floor is a device-QA row instead.
- *Hover and pressed state modelling (Sonnet):* hover is now an explicit, gated token (`--primary-hover`; others use the gated room tint). Pressed is a scale, not a colour.
- *A computed-style pass in a browser (Sonnet):* done once against the specimen in a real browser (§13). The static gate stays the repeatable CI check.

### A.3 Final build review (10 Oct 2026)

The same three models reviewed the finished system: the spec, `globals.css`, the gates, the specimen and the device-check route. All three returned **approve with changes**, with no blockers. Each finding was verified against the code, the installed Base UI 1.9.0 source or a compiled probe before it was accepted or rejected.

| Finding | Resolution |
|---|---|
| The device-check route set theme and fonts after hydration, so it couldn't prove "no flash"; its `theme-color` was light-only (GPT, Sonnet) | Inline boot script (fonts, room, theme) before paint; a light/dark `theme-color` media pair; `suppressHydrationWarning` on the spike's `<html>` |
| "System" didn't follow OS changes while the app stayed open (GPT, Sonnet) | `initTheme()` and `setTheme("system")` listen to `prefers-color-scheme`; QA row 19 |
| The unlayered outline double-drew on wrapped inputs (inner input plus wrapper), and §8.2's border-plus-halo contradicted §4.9 (Sonnet) | `data-focus-delegate` (and shadcn's `input-group-control`) opt out; the wrapper draws the same outline (`data-focus-ring-within`, shadcn's `input-group`); one focus language, halo dropped |
| The route's theme effect re-ran on room changes and cancelled the floor glide (Sonnet) | The effect depends on the theme only; verified mid-glide in the browser |
| Stock shadcn still cast grey shadows (`shadow-2xl`) and could use `bg-black/80`, `text-white` or `backdrop-blur` unnoticed (Sonnet) | Stock shadow steps re-pointed at the tinted elevations; the class lint now rejects raw white/black and backdrop blur, and scans `apps/` and the route |
| Stock `sm`–`2xl` breakpoints switched at other widths, and stock `md:text-sm` escaped the iOS zoom guard (Sonnet) | Stock breakpoints aliased to the window classes; the guard matches responsive variants |
| `danger-soft` "Remove rice" sat directly on the room floor (Gemini, Sonnet) | The item's actions live on a white card in the route and the specimen |
| Toast action and close were 40px targets (Gemini, Sonnet); Undo left its own toast up (Sonnet) | `touch-target` (44px); Undo closes its toast before confirming |
| The sheet's Save scrolled away, so QA row 7 couldn't test a pinned action (Sonnet) | Footer outside `Drawer.Content`, offset by `--drawer-keyboard-inset` |
| The App Router root layout can't server-render `data-room` (Sonnet) | The boot script derives it from the URL (`roomForPath`) |
| No long-word wrap for Tamil at 200% (Sonnet) | `overflow-wrap: anywhere` on the body |
| Live regions mounted with their content aren't reliably announced (Sonnet) | Persistent regions: the specimen toast host and a screen-reader "Listening" status in the route |
| Spec drift: `theme-color` "read from `--room`"; `TAMIL_RUN` (Sonnet) | Corrected to the target `--{room}-floor` and `tamilRuns()`/`splitTamilRuns()` |
| The class lint didn't cover consuming apps (Gemini) | It scans `packages/ui`, `apps/*` and the device-check route |

**Rejected (with evidence):**
- *`no-scrollbar`/`scroll-fade` aren't generated (GPT):* they come from the imported `shadcn/tailwind.css` and are present in the built CSS.
- *The sheet lags because its transition stays on while swiping (Gemini):* Base UI sets an inline `transition: none` on the popup while swiping (`useSwipeDismiss`).
- *Snap-offset `padding-bottom` squashes the sheet (Gemini):* it is Base UI's documented snap-point pattern, and it keeps the scroll area inside the visible half (the pinned Save is visible at 50%).
- *The toast viewport blocks taps without `pointer-events-none` (Gemini):* the viewport measures 0px tall with and without toasts, because toasts are absolutely positioned.
- *Dark popovers equal the card colour (Sonnet):* sheets and dialogs always sit over the 62% scrim, which separates them from the dimmed cards.
- *`shadcn` should be a devDependency (Sonnet):* consumers' Tailwind resolves `shadcn/tailwind.css` through `@nilumi/ui` at build time, so it is a real dependency.

Verified after the fixes: `pnpm ui:check` (1,656/1,656 contrast checks, class lint with a negative test of the new rules, typecheck), the S1 spike's typecheck and `next build`, and in-browser checks of the boot path, the room glide, Undo, the pinned sheet action, focus delegation and 200% text.
