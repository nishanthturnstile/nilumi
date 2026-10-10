---
name: Nilumi
description: A calm home with five softly coloured rooms. Spacious, colourful and a little playful, for a mom and her children.
colors:
  # Rooms: wayfinding only. Light values; dark "dusky rooms" live in globals.css.
  today-floor: "#FFE7D9"
  today-tint: "#FFD3BD"
  today-strong: "#FFB08A"
  today-ink: "#9A3B17"
  lists-floor: "#D9F2E6"
  lists-tint: "#BEE7D3"
  lists-strong: "#8CD4B1"
  lists-ink: "#1A6A48"
  talk-floor: "#EAE4FF"
  talk-tint: "#D8CEFF"
  talk-strong: "#B8A7FF"
  talk-ink: "#5240BF"
  tasks-floor: "#FFF1C4"
  tasks-tint: "#FFE391"
  tasks-strong: "#FFD059"
  tasks-ink: "#765300"
  memory-floor: "#DEECFF"
  memory-tint: "#C5DCFF"
  memory-strong: "#97C0FF"
  memory-ink: "#26599F"
  linen-floor: "#F5F1EE"
  linen-tint: "#EAE3DE"
  linen-strong: "#D6CBC3"
  linen-ink: "#5C544D"
  # Core
  card: "#FFFFFF"
  ink: "#2D2940"
  ink-2: "#5A546E"
  control-border: "#79738D"
  action: "#2D2940"
  voice: "#FF7657"
  voice-glyph: "#2D2940"
  voice-on-action: "#FFB39E"
  household-fill: "#F1EDF1"
  # Semantic triples: fill / soft (on white only) / ink
  success: "#24935F"
  success-soft: "#DDF3E7"
  success-ink: "#17734A"
  warning: "#B57401"
  warning-soft: "#FFF0CC"
  warning-ink: "#835401"
  danger: "#CF3B2C"
  danger-soft: "#FFE5E1"
  danger-ink: "#A62A1D"
  info: "#2F6FD0"
  info-soft: "#E1ECFF"
  info-ink: "#23579F"
  # Member hues ("who added")
  member-rose: "#A3154F"
  member-rose-soft: "#FCE1EC"
  member-teal: "#0E6476"
  member-teal-soft: "#D3F0F5"
typography:
  display:
    fontFamily: "Nunito, \"Noto Sans Tamil\", system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.4
  title-1:
    fontFamily: "Nunito, \"Noto Sans Tamil\", system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.4
  title-2:
    fontFamily: "Nunito, \"Noto Sans Tamil\", system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 750
    lineHeight: 1.4
  headline:
    fontFamily: "Nunito, \"Noto Sans Tamil\", system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.41
  body:
    fontFamily: "Nunito, \"Noto Sans Tamil\", system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.5
  callout:
    fontFamily: "Nunito, \"Noto Sans Tamil\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.53
  subhead:
    fontFamily: "Nunito, \"Noto Sans Tamil\", system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
  footnote:
    fontFamily: "Nunito, \"Noto Sans Tamil\", system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.54
  caption:
    fontFamily: "Nunito, \"Noto Sans Tamil\", system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.5
  tab:
    fontFamily: "Nunito, \"Noto Sans Tamil\", system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.25
rounded:
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "28px"
  2xl: "36px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  gutter-compact: "20px"
  gutter-medium: "24px"
  gutter-expanded: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.card}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-tonal:
    backgroundColor: "{colors.today-tint}"
    textColor: "{colors.today-ink}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-destructive:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger-ink}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-voice:
    backgroundColor: "{colors.voice}"
    textColor: "{colors.voice-glyph}"
    rounded: "{rounded.full}"
    size: "48px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "52px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "20px"
  icon-badge:
    backgroundColor: "{colors.lists-tint}"
    textColor: "{colors.lists-ink}"
    rounded: "{rounded.full}"
    size: "40px"
  badge-household:
    backgroundColor: "{colors.household-fill}"
    textColor: "{colors.ink-2}"
    typography: "{typography.footnote}"
    rounded: "{rounded.full}"
    height: "24px"
  toast:
    backgroundColor: "{colors.action}"
    textColor: "{colors.card}"
    typography: "{typography.subhead}"
    rounded: "{rounded.full}"
    height: "52px"
  tab-tray:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-2}"
    typography: "{typography.tab}"
  sheet:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
---

# Design System: Nilumi

`packages/ui/src/styles/globals.css` is normative: its OKLCH tokens are the source of truth, and the hex values here are sRGB approximations. The full rationale, component rules and review record are in [`docs/design/29-design-system.md`](docs/design/29-design-system.md); the decision is [ADR-056](docs/adr/adr-056.md).

## Overview

**Creative North Star: "Pastel Rooms"**

Nilumi is a calm home with five softly coloured rooms. Each tab is a room with its own pastel floor: Today is peach, Lists mint, Talk lilac, Tasks butter and Memory sky, with a neutral linen room for Inbox, Settings, Admin and sign-in. White cards rest on the floor, deep navy ink keeps every word crisp, even in Chennai sunlight, and coral is Nilumi's voice. The room colour tells you where you are; it never decorates.

It is built for a mom and her children: spacious, colourful and a little playful, yet professional and never childish. Space comes first. A screen holds at most three "needs attention" items before scrolling, one idea per card and one primary action per section. Playfulness lives in motion, never in words: a soft spring when something is ticked, a breathing ring while listening, a floor that glides between rooms. Where trust matters (Forget, health facts, privacy), the motion stops and the copy turns plain.

It should feel like a native app on both phones without wearing either platform's skin. That means a bottom tab tray, sheets instead of modals, history-aware back, safe areas and one Nilumi identity everywhere. The anti-reference is the corporate SaaS dashboard: grey canvases, dense tables and small type on everyday screens.

**Key Characteristics:**
- A pastel floor per room; white cards; navy ink; coral only for voice.
- Generous space: 20px gutters, 12px between cards, 32px between sections.
- Big, soft shapes: pill controls, 28px cards and 36px sheet corners.
- One rounded family (Nunito) with Noto Sans Tamil for every Tamil run.
- Small, purposeful springs; no page-load choreography.
- Solid surfaces only; no glass.

## Colors

The palette is sunny and soft at the edges and firm at the centre: pastel floors for place, white for content, navy for words and actions, coral for the voice.

### Primary
- **Evening Navy** (`#2D2940`): every primary text, primary button, toast and the focus outline. Dark mode flips it to warm white (`#FFF4EE`).
- **Coral Voice** (`#FF7657`): record controls and the listening and speaking states, always with a navy glyph (5.3:1). Brighter in dark mode (`#FF8E72`).

### Room floors (wayfinding)
- **Peach Morning** (`#FFE7D9`, Today), **Fresh Mint** (`#D9F2E6`, Lists), **Soft Lilac** (`#EAE4FF`, Talk), **Butter** (`#FFF1C4`, Tasks), **Clear Sky** (`#DEECFF`, Memory), **Linen** (`#F5F1EE`, Inbox, Settings, Admin, sign-in).
- Each room has five values, each with one job: **floor** (page), **tint** (active pill, hover, chips), **strong** (decorative fills, selection, duotone second tone), **ink** (tinted text and icons, ≥ 4.5:1 on white, floor and tint) and **card surface**.
- Dark mode is **dusky rooms**: every room keeps its hue at low lightness, and each card is a measured step lighter than its floor.

### Neutral
- **Card White** (`#FFFFFF`): every card, sheet, popover and input, in every room.
- **Dusk Grey-Violet** (`#5A546E`, `ink-2`): meta text, placeholders and helper text.
- **Control Border** (`#79738D`): inputs, checkboxes and switch tracks; ≥ 3:1 on white, every floor and every tint.

### Semantic
- **Success, Warning, Danger, Info** come as triples: a **fill** for icons (≥ 3:1), a **soft** background, and a separate **ink** for text (≥ 4.5:1 on white and on its soft).

### Named Rules
**The Colour Means Something Rule.** Room colour says where you are, semantic colour says what's happening, and a visibility badge says who can see it. Colour is never decoration and never the only signal.

**The Source Room Rule.** Icon badges are tinted by the room an item comes from: a reminder is butter, a list item mint, a memory sky. Today and Inbox become multi-coloured on purpose.

**The Soft-On-White Rule.** Semantic soft backgrounds sit only on white surfaces, never directly on a room floor.

**The Shape-Coded Privacy Rule.** Visibility never uses hue. Household is a soft neutral fill, Shared a solid outline, Private a dashed outline, each with an icon and a label.

**The One Microphone Rule.** The mic glyph appears only on a real record control, once per screen. The Talk tab uses a conversation glyph.

## Typography

**Display and Body Font:** Nunito (variable, rounded terminals), with `system-ui` as the fallback.
**Tamil:** Noto Sans Tamil (variable) for every Tamil run, headings included.

**Character:** one warm, rounded family carries everything: friendly enough for a family, crisp enough to be trusted. Rounded "bubble" display fonts were rejected as childish.

### Hierarchy
- **Display** (800, 32px, 1.4): the Today greeting and large titles.
- **Title 1** (800, 26px, 1.4): screen titles.
- **Title 2** (750, 20px, 1.4): section headings.
- **Headline** (700, 17px, 1.41): card titles.
- **Body** (500, 16px, 1.5): body text and inputs (never below 16px on touch screens).
- **Callout** (500, 15px, 1.53): secondary body.
- **Subhead** (600, 14px, 1.5): meta rows and labels.
- **Footnote** (600, 13px, 1.54): chips, badges and captions.
- **Caption** (700, 12px, 1.5): small labels.
- **Tab** (700, 12px, 1.25, capped at 1.25× scale): tab labels, which may wrap to two lines.

### Named Rules
**The Text Size Rule.** An in-app setting multiplies only the type (`--text-scale`, 100–200%). Spacing, radius and targets stay fixed, controls use `min-height`, rows wrap, and inline icons are sized in `em`.

**The Tamil Breathing Room Rule.** Every step is at least 1.4 line-height, and Tamil gets 1.6 through `:lang(ta)`, with no letter-spacing and no all-caps. Renderers wrap Tamil runs in `<span lang="ta">`.

## Layout

Mobile-first at 360px, thumb-first. The document is the scroller; sheets own their nested scrollers.

- **Spacing:** a 4px base (2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80).
- **Gutters:** 20px on phones, 24px from 600px, 32px from 1024px.
- **Rhythm:** 12px between cards in a group, 32px between sections, with more space above a heading than below it.
- **Targets:** 48px for primary, list and tray controls, with 44px as the absolute floor. Compact 36px controls exist only on desktop Admin (`data-density="compact"`), and touch pointers get 44px even there.
- **Content widths:** a 720px column for Today and Talk, sheets up to 640px, and 420px side sheets.
- **Shell:** a sticky room-floor header, a white bottom tab tray (2–5 tabs as phases ship), and Talk raised in the centre once there are 3 or more tabs. Header, tray and composer heights grow with the text. The raised tab's overhang (`--tray-overhang`) is cleared by docks, toasts and scroll padding.
- **Breakpoints:** `medium` 600px (rail), `expanded` 1024px (sidebar plus side sheets; desktop floors lighten 15% toward white) and `wide` 1440px. Larger windows add columns and panes; they never shrink targets or hide labels.

## Elevation & Depth

Depth is soft coloured light on a pastel floor. Shadows are tinted from the current room's ink, never grey, so a card on butter casts a warm shadow and one on sky a cool one. In dark mode, depth comes from lighter surfaces instead: each dark card is a measured step above its floor. Surfaces are solid, with no glass or backdrop blur on anything people read.

### Shadow Vocabulary
- **Card** (`shadow-card`: `0 1px 2px` at 8% plus `0 12px 28px -18px` at 42% of the room shadow): cards on the floor.
- **Float** (`shadow-float`: `0 2px 6px` at 10% plus `0 18px 40px -20px` at 52%): the capture bar, the tab tray, the raised Talk tab and the toast.
- **Overlay** (`shadow-overlay`: `0 -10px 44px -14px` at 40%, over `bg-scrim`): sheets and dialogs. The scrim stays at full strength at every snap point.

### Named Rules
**The No Nested Cards Rule.** One idea per card. Rows inside a card are flat and separated by hairlines.

## Shapes

Big, soft and concentric. `--radius: 1.25rem` drives the scale, and an inner radius equals the outer radius minus the padding.

- **12px** (`rounded-sm`): inputs inside cards and small chips.
- **16px** (`rounded-md`): inner containers.
- **20px** (`rounded-lg`): rows, small cards and textareas.
- **28px** (`rounded-xl`): cards.
- **36px** (`rounded-2xl`): sheet top corners.
- **Pill** (`rounded-full`): every button, chip, badge, avatar, input and the capture bar.

Borders are rare and meaningful: 1.5px `control-border` on inputs and secondary buttons, a solid outline for Shared, a dashed outline for Private. In Admin's compact density the base radius drops to 10px.

## Components

Every component inherits these rules through tokens. shadcn/ui (on Base UI) is installed into `packages/ui` as a fork and adapted to the system, never the other way round.

### Buttons
- **Shape:** pills, 48px minimum height (52px for a sheet's main action), 20px horizontal padding; icon buttons are 48px circles.
- **Primary:** navy fill with white text. **One primary per section.**
- **Secondary:** white with a 1.5px control border. **Tonal:** room tint with room ink, for in-room actions. **Ghost:** text only.
- **Destructive:** danger-soft with danger ink, on white only. Solid danger appears only inside a confirmation that names the action.
- **Voice:** a coral circle with a navy glyph.
- **States:** a press scales to 0.97 and springs back; hover (desktop only) uses the room tint; focus is an opaque 2px outline; disabled is 40% opacity.

### Chips and badges
- **Evidence chip:** room tint with secondary ink, a link icon, 32px tall with a 44px hit area. It shows where a fact came from.
- **Visibility badge:** 24px, never navy, never tappable-looking. Each carries an icon, a label and its shape code.

### Cards
- **Style:** white, 28px corners, `shadow-card`, 16–20px padding, height follows the content.
- **Anatomy:** a 40px source-room icon badge, a headline title, a meta row (evidence chip, time, visibility badge), and one trailing action.
- **Result cards** state what was heard, what was done, where it came from and who can see it, with Undo and Edit.

### Inputs
- **Style:** a white pill, 52px, with a 1.5px control border, 16px text and a secondary-ink placeholder.
- **Focus:** the standard 2px navy outline around the pill; in wrapped fields and the capture bar the wrapper draws it.
- **Capture bar:** "Say or type something" is a white pill holding the screen's only mic.

### Navigation
- **Tab tray:** white, 30px top corners, `shadow-float`, labels always visible. The active tab has a fill icon, a bolder label in room ink and a room-tint pill behind the icon. The raised coral Talk tab navigates; it never records.
- **Header:** a large title that collapses on scroll, the Inbox bell with a count, and the avatar. Sub-screens always show a back button.
- **Larger windows:** a rail or sidebar with the same items and states.

### Sheets, toasts and lists
- **Bottom sheet:** a Base UI Drawer with 36px top corners, a grabber, snap points at 50% and 92%, history-backed close, and keyboard awareness.
- **Toast:** a navy pill above the tray, 52px, with the Undo action in light coral; it lasts 8–10s, pauses on touch and can be swiped away.
- **Lists:** grouped in white cards, 64px rows that wrap, round 48px-target checkboxes that tick with a drawn check and a soft ripple.

## Do's and Don'ts

### Do:
- **Do** set `data-room` on `<html>` before first paint so sheets, toasts and dialogs inherit the room.
- **Do** use tokens only (`bg-card`, `text-room-ink`, `rounded-xl`, `shadow-card`, `min-h-(--control-height)`), and run `pnpm ui:check` (the contrast gate plus the class lint) after any colour change.
- **Do** keep at most three "needs attention" items before scrolling and 32px between sections.
- **Do** tint icon badges by their source room, and pair every colour signal with an icon or a label.
- **Do** keep motion small and purposeful, and keep functional states visible under Reduce Motion.
- **Do** put a back button on every sub-screen, and let Android back close sheets first.

### Don't:
- **Don't** make it look like a SaaS dashboard: no grey canvases, dense tables or small type on everyday screens. Tables are for desktop Admin only.
- **Don't** use Tailwind's default palette, translucent focus rings or raw `var(--radius-*)`; the class lint rejects them.
- **Don't** put semantic soft fills directly on a room floor, or use pastel floors as chart colours.
- **Don't** use glass, backdrop blur or the iOS status-bar meta tag.
- **Don't** add playful motion to Forget, health or privacy flows, or choreograph page loads.
- **Don't** use rounded "bubble" display fonts, mascots or gamification (streaks, scratch cards).
- **Don't** nest cards, or show more than one mic per screen.
