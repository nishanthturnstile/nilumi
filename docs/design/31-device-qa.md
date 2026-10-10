# 31 — Device QA matrix: installed-PWA shell

> **Status:** Ready to run · **Date:** 10 October 2026
> **Related:** [29 Design System §5](29-design-system.md#5-native-app-feel-installed-pwa) · [ADR-056](../adr/adr-056.md) · [30 UI platform research §8](../research/30-ui-platform-research.md#8-ios-26--android-2026-installed-pwa-specifics) · Route: `spikes/s1/app/design-check`

The static specimen can't exercise gestures, the keyboard or iOS 26's standalone quirks. This matrix runs the real shell on both household phones. It uses the S1 spike, which is already installed as a PWA on both:

- the **Pastel Rooms tokens** (`@nilumi/ui/globals.css`);
- a header and the phased tab tray;
- the Talk composer with the `visualViewport` hook;
- a **Base UI Drawer** with snap points and history-back;
- a **Base UI Toast** with Undo;
- the text-size and theme controls;
- Tamil text.

## How to run

1. Deploy the spike to its staging URL (as for earlier S1/S4 runs).
2. On each phone, open the installed app and tap **Design check** on the home screen. It is a full page load, so the route's own head metadata applies. Use the in-page controls to switch theme, text size and tray phase; the tabs switch rooms.
3. Record **Pass / Fail / Note** per row, the device, the OS version and a screenshot for every Fail.

Devices: the iPhone on the current iOS 26.x, and the Android phone with current Chrome. Run in **portrait**, plus landscape where marked.

> **Status-bar caveat (row 1).** The route emits no `apple-mobile-web-app-status-bar-style` tag, but the spike's start page (`/`) still does (`statusBarStyle: "default"` in `spikes/s1/app/layout.tsx`), and iOS may keep the launch document's setting. If row 1 fails, remove `statusBarStyle` there too (`appleWebApp: null` plus `other: { "apple-mobile-web-app-title": "Nilumi" }`), reinstall the app, and re-run row 1. Record which configuration you tested.

## Matrix

| # | Area | Steps | Expected |
|---|---|---|---|
| 1 | Status bar (iOS) | Switch rooms in light, then dark | The bar matches each room floor; no dark scrim; text stays legible (WebKit #301994) |
| 2 | Status bar (Android) | Switch rooms in light and dark | The status bar takes the room colour (`theme-color`); the nav bar may stay default (known Chrome gap) |
| 3 | Viewport height (iOS) | Scroll to the bottom; rotate; return | No gap or overflow under the tray; no whole-page rubber-band drag (WebKit #316008) |
| 4 | Safe areas | Portrait and landscape | The tray clears the home indicator; content clears the notch; landscape gutters clear the camera |
| 5 | Overscroll | Pull down at the top and up at the bottom; scroll inside the open sheet to its end | No browser pull-to-refresh; the sheet's inner scroll doesn't drag the page |
| 6 | Keyboard: composer | In Talk, focus "Say or type something"; type; dismiss | The composer sits directly above the keyboard (no tray-sized gap); after dismissal it returns above the tray and the raised Talk tab without a reload |
| 7 | Keyboard: sheet | Open the sheet, focus its input | The pinned Save button stays visible above the keyboard |
| 8 | Sheet gestures | Open; drag between 50% and 92%; flick down | Snaps feel native (no jank at 120Hz on iPhone); a flick dismisses it |
| 9 | Android back | Open the sheet, press system back | The sheet closes; the page stays. Back again leaves the route |
| 10 | Toast | Tap "Remove rice" at P5, then at P1 | The toast rises above the tray and clears the raised Talk tab (P5); Undo works; it pauses while touched; a swipe dismisses it |
| 11 | Hold-to-talk surface | Long-press the mic for 2s | No iOS callout, text selection or context menu; the listening ring and label show |
| 12 | Room change | Tap through the tabs | The floor glides; the header and tray don't flash |
| 13 | Text size 200% | Set 200%; visit every block | No clipped or overlapping text; tab labels wrap to at most two lines; controls grow |
| 14 | Tamil | Read the Tamil rows at 100% and 200% | Vowel signs aren't clipped; Noto Sans Tamil renders, not a fallback |
| 15 | Fonts offline | Load once online; enable airplane mode; relaunch | Nunito and Tamil still render (after the Phase 1 service worker precaches them) |
| 16 | Reduced motion | Turn on OS Reduce Motion; repeat 8, 10, 11, 12 | Movement is near-instant; the listening state stays visible as a static ring and label |
| 17 | Dark mode | System dark; then the in-app override | No flash of light theme on launch; all rooms are dusky; focus rings are visible |
| 18 | Contrast in sunlight | Outdoors, Lists room, light theme | Item text and checkboxes are clearly readable |
| 19 | System theme, live | Theme = System; with the app open, switch the OS between light and dark | The rooms, status bar and `theme-color` follow without a reload |

## Results

| Device | OS / browser | Date | Fails | Notes |
|---|---|---|---|---|
| iPhone | | | | |
| Android | | | | |

Fails feed back into [29 Design System](29-design-system.md) and, where a platform behaviour changes, into [ADR-056](../adr/adr-056.md).
