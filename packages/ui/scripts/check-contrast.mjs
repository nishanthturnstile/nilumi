#!/usr/bin/env node
/**
 * Nilumi contrast gate — `pnpm ui:contrast`
 *
 * Resolves the real tokens in src/styles/globals.css for every room × theme × viewport (the same cascade the
 * browser applies to <html data-room class="dark">, including the ≥ 64rem desktop floor), composites
 * translucent colours onto their background, and checks WCAG 2.2 AA pairs: text 4.5:1, non-text (icons,
 * borders, focus) 3:1, plus surface separation. It also fails if any var() exposed by @theme is undefined.
 * Exits 1 on any failure. Voice fill (coral) vs its surroundings is exempt: the record control is identified
 * by its glyph (gated at 3:1) and label, not its boundary (WCAG 1.4.11).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse, wcagContrast, formatHex, blend, interpolate } from "culori";

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = process.env.NILUMI_CSS ?? join(here, "..", "src", "styles", "globals.css");
const css = readFileSync(cssPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

const ROOMS = ["today", "lists", "talk", "tasks", "memory", "linen"];
const THEMES = ["light", "dark"];

/** Rule blocks in source order. Top-level `@media (min-width…)` bodies are parsed and tagged; other at-rules are skipped. */
function topLevelBlocks(text, media = null) {
  const blocks = [];
  let depth = 0;
  let start = 0;
  let selector = "";
  let bodyStart = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (depth === 0) {
        selector = text.slice(start, i).trim();
        bodyStart = i + 1;
      }
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const body = text.slice(bodyStart, i);
        if (!selector.startsWith("@")) blocks.push({ selector, body, media });
        else if (media === null && /^@media\s*\(min-width:/.test(selector)) blocks.push(...topLevelBlocks(body, selector));
        start = i + 1;
      }
    } else if (ch === ";" && depth === 0) {
      start = i + 1;
    }
  }
  return blocks;
}

function declarations(body) {
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim().replace(/\s+/g, " ");
  return out;
}

function selectorMatch(sel, room, theme) {
  const s = sel.trim();
  if (!s.startsWith(":root")) return null;
  let rest = s.slice(5);
  let notDark = false;
  if (rest.includes(":not(.dark)")) {
    notDark = true;
    rest = rest.replace(":not(.dark)", "");
  }
  if (rest.includes(":not(")) return null;
  const isDark = rest.includes(".dark");
  const roomAttr = rest.match(/\[data-room="(\w+)"\]/);
  const other = rest.replace(".dark", "").replace(/\[data-room="\w+"\]/, "");
  if (other.trim() !== "") return null; // e.g. [data-text-scale]
  if (isDark && theme !== "dark") return null;
  if (notDark && theme === "dark") return null;
  if (roomAttr && roomAttr[1] !== room) return null;
  return 1 + (isDark || notDark ? 1 : 0) + (roomAttr ? 1 : 0);
}

const blocks = topLevelBlocks(css);
const VIEWPORTS = ["mobile", "desktop"];

function tokensFor(room, theme, viewport) {
  const applicable = [];
  blocks.forEach((b, order) => {
    if (b.media && viewport !== "desktop") return;
    let best = null;
    for (const sel of b.selector.split(",")) {
      const spec = selectorMatch(sel, room, theme);
      if (spec !== null) best = Math.max(best ?? 0, spec);
    }
    if (best !== null) applicable.push({ spec: best, order, decls: declarations(b.body) });
  });
  applicable.sort((a, b) => a.spec - b.spec || a.order - b.order);
  return Object.assign({}, ...applicable.map((a) => a.decls));
}

function resolve(tokens, value, seen = new Set()) {
  return value.replace(/var\((--[\w-]+)(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (_, name, fallback) => {
    if (seen.has(name)) throw new Error(`cycle at ${name}`);
    if (tokens[name] !== undefined) return resolve(tokens, tokens[name], new Set([...seen, name]));
    if (fallback !== undefined) return resolve(tokens, fallback, seen);
    throw new Error(`undefined token ${name}`);
  });
}

/** Split a CSS argument list on top-level commas. */
function splitArgs(s) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Parses a colour, including `color-mix(in oklab, A p%, B)` (the only mix form the tokens use). */
function parseColor(value) {
  const v = value.trim();
  const mix = v.match(/^color-mix\(\s*in oklab\s*,([\s\S]*)\)$/);
  if (!mix) return parse(v);
  const [a, b] = splitArgs(mix[1]);
  const pa = a.match(/^(.*?)\s+(\d+(?:\.\d+)?)%$/);
  const ca = parseColor(pa ? pa[1] : a);
  const cb = parseColor(b);
  const weightA = pa ? Number(pa[2]) / 100 : 0.5;
  return interpolate([cb, ca], "oklab")(weightA);
}

function color(tokens, name) {
  // "--a/10 over --b": token --a at 10% alpha composited onto --b (how `bg-a/10` renders on a --b surface)
  const over = name.match(/^(--[\w-]+)\/(\d+) over (--[\w-]+)$/);
  if (over) {
    const base = color(tokens, over[3]);
    return blend([base, { ...color(tokens, over[1]), alpha: Number(over[2]) / 100 }], "normal", "rgb");
  }
  const raw = tokens[name];
  if (raw === undefined) throw new Error(`missing ${name}`);
  const value = resolve(tokens, raw);
  const c = parseColor(value);
  if (!c) throw new Error(`cannot parse ${name}: ${value}`);
  return c;
}

/** Composite a translucent foreground onto an opaque background (both culori colours). */
function flatten(fg, bg) {
  if (fg.alpha === undefined || fg.alpha >= 1) return fg;
  return blend([bg, fg], "normal", "rgb");
}

const TEXT = 4.5;
const UI = 3;
const SEP = 1.1;

/** [fg token, bg token, minimum, label] — bg tokens are always opaque. */
const PAIRS = [
  // Text on the page floor, cards and room tint
  ["--foreground", "--room-floor", TEXT, "ink on floor"],
  ["--foreground", "--background", TEXT, "ink on card"],
  ["--foreground", "--room-tint", TEXT, "ink on room tint"],
  ["--muted-foreground", "--room-floor", TEXT, "secondary ink on floor"],
  ["--muted-foreground", "--background", TEXT, "secondary ink on card"],
  ["--muted-foreground", "--room-tint", TEXT, "secondary ink on room tint (chips)"],
  ["--room-ink", "--background", TEXT, "room ink on card"],
  ["--room-ink", "--room-floor", TEXT, "room ink on floor"],
  ["--room-ink", "--room-tint", TEXT, "room ink on tint (active tab, badges)"],
  ["--primary-foreground", "--primary", TEXT, "primary button text"],
  ["--primary-foreground", "--primary-hover", TEXT, "primary button text (hover)"],
  ["--secondary-foreground", "--secondary", TEXT, "secondary button text"],
  ["--accent-foreground", "--accent", TEXT, "accent (hover/selected) text"],
  ["--voice-on-action", "--primary", TEXT, "toast action (Undo) on toast"],
  ["--destructive-foreground", "--destructive", TEXT, "solid destructive text"],
  ["--destructive", "--background", TEXT, "destructive text on card"],
  ["--destructive", "--destructive/10 over --background", TEXT, "destructive text on 10% wash"],
  ["--destructive", "--destructive/20 over --background", TEXT, "destructive text on 20% wash"],
  ["--muted-foreground", "--input/30 over --background", TEXT, "placeholder on stock input wash"],
  ["--selection-foreground", "--selection", TEXT, "selected text"],
  ["--visibility-household-foreground", "--visibility-household", TEXT, "Household badge"],
  ["--visibility-outline-foreground", "--background", TEXT, "Shared/Private badge text"],
  ["--member-a", "--member-a-soft", TEXT, "member A initials"],
  ["--member-b", "--member-b-soft", TEXT, "member B initials"],
  ...["success", "warning", "danger", "info"].flatMap((s) => [
    [`--${s}-ink`, "--background", TEXT, `${s} text on card`],
    [`--${s}-ink`, `--${s}-soft`, TEXT, `${s} text on ${s} soft`],
    [`--${s}`, "--background", UI, `${s} icon/fill on card`],
    [`--${s}-foreground`, `--${s}`, UI, `${s} glyph on fill`],
  ]),
  // Source-room badges: any room's colours can appear on any card (e.g. a Lists item on Today)
  ...ROOMS.flatMap((r) => [
    [`--${r}-ink`, `--${r}-tint`, TEXT, `${r} badge ink on ${r} tint`],
    [`--${r}-ink`, "--background", TEXT, `${r} ink on card`],
  ]),
  // Non-text: controls, focus, voice, visibility outlines, charts
  ["--input", "--background", UI, "control border on card"],
  ["--input", "--room-floor", UI, "control border on floor"],
  ["--input", "--room-tint", UI, "control border on tint (selected rows, segmented track)"],
  ["--ring", "--background", UI, "focus ring on card"],
  ["--ring", "--room-floor", UI, "focus ring on floor"],
  ["--ring", "--room-tint", UI, "focus ring on tint"],
  ["--focus-inverse", "--primary", UI, "inverse focus inside toast/primary surface"],
  ["--primary", "--room-floor", UI, "primary button edge on floor"],
  ["--voice-foreground", "--voice", UI, "mic glyph on coral"],
  ["--visibility-outline", "--background", UI, "Shared/Private badge outline"],
  ...[1, 2, 3, 4, 5].map((n) => [`--chart-${n}`, "--background", UI, `chart ${n} on card`]),
  // Separation (not WCAG; keeps cards and shape-coded badges readable as objects)
  ["--room-floor", "--background", SEP, "floor vs card separation"],
  ["--visibility-household", "--background", 1.15, "Household badge fill vs card"],
];

const failures = [];
const summary = [];
for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    for (const room of ROOMS) {
      const t = tokensFor(room, theme, viewport);
      const ctx = `${viewport}/${theme}/${room}`;
      let lowest = { ratio: Infinity, label: "" };
      for (const [fgName, bgName, min, label] of PAIRS) {
        let ratio;
        try {
          const bg = color(t, bgName);
          const fg = flatten(color(t, fgName), bg);
          ratio = wcagContrast(fg, bg);
        } catch (e) {
          failures.push(`${ctx}: ${label} → ${e.message}`);
          continue;
        }
        if (ratio < min) failures.push(`${ctx}: ${label} ${ratio.toFixed(2)} < ${min}`);
        if (min === TEXT && ratio < lowest.ratio) lowest = { ratio, label };
      }
      const sep = wcagContrast(color(t, "--room-floor"), color(t, "--background"));
      summary.push(
        `${viewport.padEnd(7)} ${theme.padEnd(5)} ${room.padEnd(6)} floor ${formatHex(color(t, "--room-floor"))}  card ${formatHex(
          color(t, "--background"),
        )}  separation ${sep.toFixed(3)}  lowest text ${lowest.ratio.toFixed(2)} (${lowest.label})`,
      );
    }
  }
}

const total = PAIRS.length * ROOMS.length * THEMES.length * VIEWPORTS.length;

// Every var() that @theme exposes as a utility must resolve in every context (no silent skips).
const themeInline = css.match(/@theme inline\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
const runtimeOnly = new Set(["--font-nunito", "--font-noto-tamil"]); // set by next/font; have fallbacks
const themeRefs = [...new Set([...themeInline.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]))];
for (const viewport of VIEWPORTS)
  for (const theme of THEMES)
    for (const room of ROOMS) {
      const t = tokensFor(room, theme, viewport);
      for (const ref of themeRefs)
        if (t[ref] === undefined && !runtimeOnly.has(ref))
          failures.push(`${viewport}/${theme}/${room}: @theme references undefined ${ref}`);
    }

console.log(
  `Nilumi contrast gate — ${PAIRS.length} pairs × ${ROOMS.length} rooms × ${THEMES.length} themes × ${VIEWPORTS.length} viewports`,
);
console.log(summary.join("\n"));
if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s):\n` + failures.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log(`\n✓ All ${total} checks pass.`);
