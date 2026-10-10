/**
 * Font contract for the Nilumi design system.
 *
 * `next/font` must run inside the Next.js app, so apps/web loads the fonts in its own
 * `app/fonts.ts` and attaches these CSS variables to <html>. globals.css reads them
 * (with plain-name fallbacks for the static specimen).
 *
 *   // apps/web/app/fonts.ts
 *   import { Nunito, Noto_Sans_Tamil } from "next/font/google";
 *   export const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
 *   export const notoTamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-noto-tamil", display: "swap" });
 *   // <html className={`${nunito.variable} ${notoTamil.variable}`}>
 *
 * Both are variable fonts, so no weight list is needed. Noto Sans Tamil is the same family
 * Android uses for Tamil, so text that leaks in before a Tamil UI exists already matches.
 */
export const fontVariables = {
  latin: "--font-nunito",
  tamil: "--font-noto-tamil",
} as const;

export const fontFamilies = {
  latin: "Nunito",
  tamil: "Noto Sans Tamil",
} as const;

/** Tamil block (U+0B80–U+0BFF). Renderers wrap matching runs in <span lang="ta">.
 *  A factory, because a shared /g regex is stateful (lastIndex) across .test()/.exec() calls. */
export const TAMIL_RUN_SOURCE = "[\\u0B80-\\u0BFF]+(?:[\\s\\u200C\\u200D]+[\\u0B80-\\u0BFF]+)*";
export const tamilRuns = () => new RegExp(TAMIL_RUN_SOURCE, "g");

/** Splits mixed text into runs so renderers can wrap Tamil in <span lang="ta">. */
export function splitTamilRuns(text: string): Array<{ text: string; tamil: boolean }> {
  const out: Array<{ text: string; tamil: boolean }> = [];
  let last = 0;
  for (const m of text.matchAll(tamilRuns())) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), tamil: false });
    out.push({ text: m[0], tamil: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), tamil: false });
  return out;
}

/** In-app Text size steps (1 = 100%). Applied as html[data-text-scale]. */
export const textScaleSteps = [100, 115, 130, 150, 175, 200] as const;
export type TextScaleStep = (typeof textScaleSteps)[number];
