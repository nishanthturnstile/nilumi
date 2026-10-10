#!/usr/bin/env node
/**
 * Nilumi class lint — `pnpm ui:lint-classes`
 *
 * Tailwind silently emits nothing for unknown utilities, so removing the default palette doesn't fail a build.
 * This scan does: it rejects default-palette colour utilities, raw white/black, backdrop blur, translucent focus
 * rings and `var(--radius-*)` references (which resolve at :root and ignore compact density) in component,
 * app and specimen sources.
 * Usage: node scripts/check-classes.mjs [dir ...]
 *   (defaults: src, specimen, every app under apps/, and the S1 spike's design-check route; missing dirs are skipped)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "..", "..");
const dirs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [join(root, "src"), join(root, "specimen"), join(repo, "apps"), join(repo, "spikes", "s1", "app", "design-check")];
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".html"]);
const SKIP = new Set(["node_modules", "dist", ".next"]);

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const RULES = [
  {
    id: "default-palette",
    re: new RegExp(
      `(?<![\\w-])(?:[\\w-]+:)*(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|caret|accent|decoration|shadow)-(?:${PALETTE})-\\d{2,3}(?![\\w-])`,
      "g",
    ),
    why: "Tailwind's default palette is removed; use a Nilumi token (e.g. bg-room-tint, text-danger-ink).",
  },
  {
    id: "translucent-focus",
    re: /(?<![\w-])(?:[\w-]+:)*(?:ring|outline)-(?:ring|focus)\/\d+(?![\w-])/g,
    why: "Focus must be an opaque 2px outline (≥ 3:1). Remove it; the global :focus-visible applies.",
  },
  {
    id: "raw-radius-var",
    re: /var\(--radius-(?:sm|md|lg|xl|2xl|3xl|4xl)\)/g,
    why: "Use rounded-* utilities; var(--radius-*) resolves at :root and ignores compact density.",
  },
  {
    id: "raw-white-black",
    re: /(?<![\w-])(?:[\w-]+:)*(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|caret|accent|decoration|shadow)-(?:white|black)(?:\/\d+)?(?![\w-])/g,
    why: "Use semantic tokens: bg-card/bg-background, text-foreground, text-primary-foreground, bg-scrim.",
  },
  {
    id: "glass",
    re: /(?<![\w-])(?:[\w-]+:)*backdrop-blur(?:-[\w-]+)?(?![\w-])/g,
    why: "Surfaces are solid: no glass or backdrop blur on anything people read.",
  },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* files(p);
    else if (EXT.has(extname(name))) yield p;
  }
}

const problems = [];
for (const dir of dirs) {
  let exists = true;
  try {
    statSync(dir);
  } catch {
    exists = false;
  }
  if (!exists) continue;
  for (const file of files(dir)) {
    if (file.endsWith("check-classes.mjs")) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const rule of RULES)
        for (const m of line.matchAll(rule.re))
          problems.push(`${relative(root, file)}:${i + 1}  ${rule.id}  "${m[0]}" — ${rule.why}`);
    });
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} class problem(s):\n` + problems.map((p) => "  " + p).join("\n"));
  process.exit(1);
}
console.log("✓ No forbidden classes (default palette, raw white/black, backdrop blur, translucent focus rings, raw radius vars).");
