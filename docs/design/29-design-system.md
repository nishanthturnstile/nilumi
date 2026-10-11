# Design System: Home and persistent activities

 Baseline2026-10-10. Existing visual foundation is implemented; Home components/renderer are **selected for prototype** and **planned for MVP**. This document changes guidance, not tokens, fonts or specimens.

 ## 1. Experience and shell

 Stable Home combines brief, focused activity, persistent composer and Recent. Supporting Inbox/Settings/Admin open from the header/menu. Use contextual accents with existing room-token names; they no longer encode five domain tabs. Resting Home may show a brief and saved activity; switching topic moves activity focus without moving composer or discarding prior state.

 ## 2. Input and speech controls

 One tap starts foreground conversation. Persistent microphone/session indication includes accessible listening text; processing and speaking have separate states. End releases media; Mute controls spoken output; Stop stops current speech; Replay reads the currently authorized response. Typed text stays quiet in auto mode. Never rely on color/waveform alone or auto-start the mic after permission/focus changed. Announce concise state changes with polite live regions rather than every partial transcript.

 ## 3. Focus and renderer transitions

 Trusted checklist/table/timeline/text/simple-diagram components share stable keys based on domain item IDs. Apply committed values without remounting focused controls. Buffer/reconcile layout replacements during interaction, preserving selection, reading order and scroll. Topic switch is deliberate; late output/audio cannot steal focus. Animated transitions are short/optional; reduced motion shows immediate stable content. Loading retains current result with status, not an empty shifting skeleton. Invalid generation falls back to last authorized layout/text.

 ## 4. Foundations


### 4.1 Colour

**Rooms (contextual activity accenting only).** Each room has five values: the **floor** (page background), **tint** (active pill, hover, chips), **strong** (decorative fills and selection), **ink** (tinted text and icons, ≥ 4.5:1 on white, floor and tint) and **card surface**.

| Room | Floor | Tint | Strong | Ink | Dark floor | Dark card | Dark tint | Dark ink |
|---|---|---|---|---|---|---|---|---|
| Resting Home (legacy today; peach) | `#FFE7D9` | `#FFD3BD` | `#FFB08A` | `#9A3B17` | `#2E211C` | `#3D2D27` | `#503931` | `#FFB896` |
| Lists (mint) | `#D9F2E6` | `#BEE7D3` | `#8CD4B1` | `#1A6A48` | `#1D2B25` | `#283A32` | `#335043` | `#8FDDB8` |
| Conversation draft (legacy talk; lilac) | `#EAE4FF` | `#D8CEFF` | `#B8A7FF` | `#5240BF` | `#232035` | `#2F2B45` | `#3F3962` | `#C3B8FF` |
| Tasks (butter) | `#FFF1C4` | `#FFE391` | `#FFD059` | `#765300` | `#2A2619` | `#383223` | `#4D4429` | `#F4D36E` |
| Memory (sky) | `#DEECFF` | `#C5DCFF` | `#97C0FF` | `#26599F` | `#1C2533` | `#273244` | `#33445E` | `#A3C6FF` |
| Linen (neutral) | `#F5F1EE` | `#EAE3DE` | `#D6CBC3` | `#5C544D` | `#252220` | `#322E2B` | `#443E3A` | `#D9D0CA` |

Light cards are white in every room. Hex values are sRGB approximations of the OKLCH tokens in `globals.css`.

**How rooms are applied.** The boot script sets `data-room` on `<html>` before first paint (from the URL, `roomForPath`) and the future Home adapter updates it on deliberate activity changes. All `--room-*` tokens then point at that room's palette, so portalled sheets, toasts, popovers and dialogs inherit the room. `html` and `body` paint `--room-floor`, which is also the colour iOS uses for the status bar. The floor glides between rooms (a registered `@property --room` transition), while the header and tray stay still. On screens 1024px and wider, the light floor is mixed 15% toward white so large areas feel calmer while cards still separate (≥ 1.10, checked by the gate). A theme switch sets `data-theme-switching` for one frame so the floor doesn't glide between light and dark.

**Source-room colour.** Icon badges on cards are tinted by the room the item **comes from**: a reminder shows butter, a list item mint, a memory sky. Home and Inbox therefore become multi-coloured, and the colour always means "where this lives", never status.

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

**Families.** **Nunito** (variable, rounded terminals) for all Latin text: one family, as product UI should. **Noto Sans Tamil** (variable) for all Tamil, headings included; it is Android's own system Tamil font. The stack is `Nunito, "Noto Sans Tamil", system-ui`. Planned apps/web will load both through `next/font` and exposes them as `--font-nunito` and `--font-noto-tamil` (see `packages/ui/src/fonts.ts`). Rounded "bubble" display fonts (Baloo Thambi 2, Fredoka) were rejected as childish.

**Scale.** Fixed steps (no fluid type), roughly a 1.2 ratio, every step at least 1.4 line-height so Tamil vowel signs never clip:

| Token (`text-*`) | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `display` | 32px | 1.4 | 800 | Home greeting, large titles |
| `title-1` | 26px | 1.4 | 800 | Screen titles |
| `title-2` | 20px | 1.4 | 750 | Section headings |
| `headline` | 17px | 1.41 | 700 | Card titles |
| `body` | 16px | 1.5 | 500 | Body text, inputs |
| `callout` | 15px | 1.53 | 500 | Secondary body |
| `subhead` | 14px | 1.5 | 600 | Meta rows, labels |
| `footnote` | 13px | 1.54 | 600 | Chips, badges, captions |
| `caption` | 12px | 1.5 | 700 | Small labels |
| `tab` | 12px (capped at 1.25× scale) | 1.25 | 700 | Legacy specimen labels (may wrap to two lines); compatibility token, not a Home navigation requirement. The one exception to the 1.4 rule: short labels in a fixed-height tray; Tamil labels get 1.6 through `:lang(ta)`, and the tray height reserves two lines |

Tailwind's own `text-xs` to `text-4xl` are re-based on the same scale, so stock shadcn components grow with the setting too.

**Text scaling to 200%.** The root stays 16px. `html[data-text-scale="100|115|130|150|175|200"]` sets `--text-scale`, which multiplies **only the type tokens**; spacing, radius and targets stay fixed, so layouts don't balloon. Controls use `min-height` and grow with their text; rows and cards wrap; tab labels cap at 1.25× and wrap. Size-sensitive components use container queries rather than `rem` media queries. The app-controlled scale applies through this one setting; browser zoom remains available. `-apple-system-body` is not used, because it would scale twice.

**Mixed-script text.** Transcripts, names and list items mix Tamil into English without a `lang` attribute, so renderers wrap Tamil runs (U+0B80–U+0BFF; `tamilRuns()`/`splitTamilRuns()` in `fonts.ts`) in `<span lang="ta">`. `:lang(ta)` sets a 1.6 line-height and forbids letter-spacing and all-caps. The body sets `overflow-wrap: anywhere`, so a long Tamil word (Tamil breaks only at spaces) wraps instead of overflowing at 200%. Tamil stays at 1em rather than being shrunk to match Nunito's x-height; legibility of the script wins over typographic evenness. Clamped text keeps vertical slack.

**Numbers.** Nunito's digits are already tabular (every digit advances 600/1000), so quantities, times and money align by default. `tabular` (a utility) is available for other fonts.

### 4.3 Spacing and layout

- **Base unit** 4px; steps 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 (Tailwind's `--spacing` scale).
- **Gutters** (`--gutter`): 20px compact, 24px medium, 32px expanded; `px-gutter` also clears landscape notches.
- **Rhythm:** 12px between cards in a group, 32px between sections, more space above a heading than below it.
- **Targets:** 48px for primary, list and tray controls (`--control-height`), 44px absolute floor (`--target-min`, `touch-target` utility). Compact controls (36px) exist on desktop only.
- **Content widths:** `--content-max` 720px for Home activity columns; sheets up to 640px; side sheets 420px.
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
| 2 | `shadow-float` | Home composer, floating controls; legacy specimen tray |
| 3 | `shadow-overlay` + `bg-scrim` | Sheets, dialogs |

Shadows are **tinted from the room's ink**, never grey, so they read as soft coloured light on a pastel floor. In dark mode elevation comes from lighter surfaces (each dark card is a measured step above its floor), not shadows. **Surfaces are solid.** No glass or backdrop blur on anything people read.

### 4.6 Iconography

**Phosphor Icons**, configured as shadcn's icon library:

- **Regular** weight for UI.
- **Fill** for selected activity/control states; legacy specimens also use it for active tabs.
- **Duotone** for room, category and empty-state icons, with the second tone set to the room's strong colour through the `icon-duotone-tint` utility (`--duotone` overrides it). Phosphor's second tone is a 20% `currentColor` path by default. The strong colour stays visible on a tint badge, which the tint itself would not.
- Sizes are 16, 20, 24, 32 and 48px. Icons on cards sit in round 40px badges tinted by their source room.
- **Inline icons** (inside chips, badges, buttons and messages) are sized in `em` (`size-[1.1em]`) so they grow with the text scale, as SF Symbols do with Dynamic Type. Use the **bold** weight at these small sizes for legibility. Standalone icons (tray, header, badges) stay at fixed sizes.
- **The microphone glyph appears only on real record controls**, one per screen. The Home microphone button is a real capture control; its adjacent text-entry control uses a conversation glyph. Static reference glyphs do not override this behavior.

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
- **Use scene:** light for the 7:30 am Home brief in daylight and at the shop; dark for reminders checked in bed.

### 4.9 Accessibility standards (WCAG 2.2 AA)

| Requirement | How Nilumi meets it |
|---|---|
| 1.4.3 / 1.4.11 contrast | Text ≥ 4.5:1; icons, borders and focus ≥ 3:1. Enforced by `pnpm ui:contrast`: 69 pairs × 6 rooms × 2 themes × phone and desktop, with alpha compositing. It covers every source-room badge, hover, the destructive and input washes stock shadcn uses, and badge separation. Coral's boundary is exempt because the glyph (≥ 3:1) and label identify the record control. Semantic `*-foreground` colours are for **glyphs only**, never text |
| 1.4.1 use of colour | Visibility = icon + label + shape; done = check + strikethrough; selected activity/control = filled icon + bolder label + appropriate `aria-current`/`aria-selected` (the tint pill is decoration) |
| 1.4.4 / 1.4.10 resize and reflow | In-app text size to 200%; `min-height` controls; wrapping rows. Header, tray and composer heights are functions of the text scale, so reserved space grows with the text. The viewport meta never sets `maximum-scale` or `user-scalable=no` |
| 2.4.7 / 2.4.11 / 2.4.13 focus | An opaque 2px outline with 2px offset, **unlayered**, so it wins over any component's `outline-none`. Navy on light; warm white on dark and inside navy surfaces (toasts, `data-surface="inverse"`); `Highlight` in forced-colors mode. Translucent rings are banned by the class lint. `scroll-padding` keeps focus clear of the header, tray and any bottom dock |
| 2.5.7 dragging | Every swipe or drag has a tap alternative; foreground conversation has tap-to-start, text and keyboard alternatives |
| 2.5.8 target size | 48px controls; 44px floor via `touch-target` |
| 2.2.1 timing | Undo toasts last 8–10s, pause on focus, hover or touch, and the result card keeps its own Undo |
| 3.3.8 authentication | The sign-in code is one `autocomplete="one-time-code"` field that accepts paste |
| 4.1.3 status | Toasts and result cards announce through polite live regions |
| Motion | `prefers-reduced-motion` respected without hiding state |
| Inputs | Never below 16px on touch-capable devices (`any-pointer: coarse`), so iOS never auto-zooms; placeholders use secondary ink (≥ 4.5:1), not preflight's 50% `currentColor` |

---



 ## 5. Responsive activities

 | Component | Compact phone | Desktop / accessibility |
 |---|---|---|
 | Checklist | Single column, generous row/checkbox targets; quantities wrap; pending/conflict status separate | Same IDs/controls; keyboard Space toggles explicit desired state; no hover-only actions |
 | Table | Prioritize meaningful columns; card projection or local horizontal scroll with labelled headers | Real table semantics, sortable only through trusted controls; page itself never overflows |
 | Timeline | Vertical event order and explicit times | Optional wider grouping; source labels/reading order preserved |
 | Text | Readable measure, Tamil wrapping, evidence chips | Keyboard-accessible references, 200% text reflow |
 | Simple diagram | Trusted nonexecutable nodes, labels and linear text equivalent | No essential information conveyed solely by connectors/color; focus order follows equivalent text |
 | Recent | Sheet/picker with safe titles; return focus to opener | Accessible list/dialog, keyboard selection; no private content from other member |

 Composer respects safe-area and visualViewport keyboard behavior; it remains reachable at200% text without covering the active controls. Desktop keeps one focused canvas with comfortable readable width, not a dense multi-panel dashboard. Browser history closes overlays before leaving Home. Theme/text scale initialize before first paint; portals inherit tokens.

 ## 6. Contextual trust controls

 Show actual receipts, per-command failures, Undo, Edit and visibility. Evidence opens a contextual sheet/activity and restores prior focus. Health Confirm, irreversible Forget and suggestion Approve/Edit/Reject use plain copy and no celebratory motion. Model-generated layouts cannot hide required permissions/errors or create executable controls. Drafts are labelled as drafts; committed list/fact/task state comes from backend projections.

 ## 7. Components and ownership

 Extend packages/ui with customized shadcn Base UI/maia primitives as needed. Nilumi owns composer, speech status, activity frame, Recent, evidence/approval/receipt elements and trusted renderer adapters. Existing HTML specimens are reference examples; import them as inspiration rather than production components. json-render composes the catalogue but does not supply design tokens or authorization.

 ## 8. Existing customization and token reference


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
5. **Primitives vs composites.** `src/components/ui/*` stay product-agnostic shadcn primitives. `src/components/nilumi/*` compose them and own Nilumi meaning: Home shell, persistent composer, Recent, speech status, mic button, result card, approval card, evidence chip, visibility badge, list row, swipe row, empty state and banners.
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



 ## 9. Verification and future source changes

 Preserve current contrast/class/type checks. P0 prototypes Home; P2 ships components and specimen updates, keyboard/Back/focus, offline fonts, PWA updates and renderer bounds. P8 repeats multilingual/device/accessibility regressions. [Device QA](31-device-qa.md) records real phone outcomes; prior desktop preview is not installed-phone proof.

 ## Appendix A — Review and resolutions

 Dated October10 reference-build review history. Its room/tab examples describe the unchanged artifacts, not a requirement for the new Home shell. Current choices above supersede historical navigation recommendations; reviewed token accessibility corrections remain applicable.


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
| Tab tray ignored phased tabs; two mics on one screen | Historical static reference resolution: phased2–5 tray and Talk navigation. Superseded for the application by stable Home; the reviewed specimen remains unchanged |
| Status-bar mechanism | No meta; the page background is the floor; per-room `theme-color` |
| Android back with sheets; keyboard reset; hold-to-talk callout; scroll ownership | History-backed sheets; `visualViewport` reset; mic hardening; document scroller |
| Room change via View Transitions is fragile | `@property --room` transition |
| Admin needs density; charts can't be pastel | `data-density="compact"`; mid-chroma chart series |
| Undo toast too short; segmented OTP; zoom lock; focus obscured | 8–10s pausing toasts; one-time-code field; no zoom lock; `scroll-padding` |
| Maia geometry is hard-coded; Maia ships Hugeicons | Maia treated as a fork with a register; Phosphor configured |
| Static specimen can't test gestures or iOS 26 bugs | Device-check route in S1 plus a QA matrix |

**Rejected:** hiding tab labels at large text sizes (Gemini). That decision described the static reference tray. Current Home uses labelled controls and Recent; the legacy tab type token remains unchanged and is not a navigation requirement.

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
