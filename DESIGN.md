---
name: Nilumi
description: A calm voice-first Home with persistent activities, contextual pastel accents and accessible household controls.
colors:
  # Contextual activity accents; legacy room names preserved. Light values; dark "dusky rooms" live in globals.css.
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

[globals.css](packages/ui/src/styles/globals.css) is normative: OKLCH values are unchanged; frontmatter hex values are their existing sRGB approximations. Legacy today/lists/talk/tasks/memory and tab-tray token names remain compatibility names, not a five-tab application requirement. [Detailed design](docs/design/29-design-system.md) owns Home interaction rules; [ADR-056](docs/adr/adr-056.md) owns the visual choice.

## Stable Home and contextual accents

Retain pastel surfaces, white cards, navy ink and coral voice controls. Home has one persistent header/composer, a brief, a focused activity and Recent. Use existing peach for resting brief, mint for shopping, lilac for conversational drafting, butter for schedule and sky for evidence contexts as subtle activity accents. Changing topic must not move the composer or remap navigation. Semantic colors show status; shape/text visibility badges show Household/Shared/Private.

## Typography, layout and accessibility

Retain Nunito with Noto Sans Tamil fallback, existing fixed typography steps and 100–200% in-app text scaling for type only. Preserve token spacing/radii, contrast gates, visible focus, large touch targets and reduced motion. White component surfaces and inherited theme tokens support portals/dark mode. Full Tamil UI localization is deferred; Tamil/mixed-script text is required now.

## Home interaction

Persistent composer offers one tap to start foreground conversation, text input and explicit End. Listening/speaking indicators include accessible text; Mute, Stop and Replay are separate. Recent restores current authorized activity. Loading preserves usable results. Renderer changes use stable item keys and never reorder a focused control. Topic switches fence old generation/audio. Checklists expose check and uncheck; tables/timelines/diagrams have narrow-screen and text alternatives.

## Status

Tokens, fonts/helpers and HTML specimens exist. Reusable React components, Home renderer and production app are unimplemented. Old static room examples are reference artifacts, not the new application specification. Source/specimen changes belong to P0/P2 implementation. [Device QA](docs/design/31-device-qa.md) and [the implementation plan](docs/plans/implementation-plan.md) own proof.
