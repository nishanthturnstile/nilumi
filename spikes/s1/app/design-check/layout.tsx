import type { Metadata, Viewport } from "next";
import { Noto_Sans_Tamil, Nunito } from "next/font/google";
import type { ReactNode } from "react";
import { FontVars } from "./font-vars";
import "./design-check.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const notoTamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-noto-tamil", display: "swap" });
const fontClasses = [nunito.variable, notoTamil.variable];

// Next's `appleWebApp` always emits apple-mobile-web-app-status-bar-style (defaulting to "default"), so reset it
// and emit only the title. With no status-bar tag, iOS 26 colours the status bar from the page background (the
// room floor). Standalone display comes from the manifest.
export const metadata: Metadata = {
  title: "Nilumi · design check",
  appleWebApp: null,
  other: { "apple-mobile-web-app-title": "Nilumi" },
};

// First frame on Android: the Today floor for each system theme. syncThemeColor collapses this pair into one tag.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFE7D9" },
    { media: "(prefers-color-scheme: dark)", color: "#2E211C" },
  ],
};

// Before first paint (mirrors packages/ui themeBootScript; this route starts on Today in the System theme and
// doesn't persist preferences). The spike's root <html> has suppressHydrationWarning for these attributes.
const bootScript = `(()=>{try{var d=document.documentElement;d.classList.add(${fontClasses
  .map((c) => JSON.stringify(c))
  .join(",")});d.dataset.room="today";var dark=matchMedia("(prefers-color-scheme: dark)").matches;
d.classList.toggle("dark",dark);d.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

export default function DesignCheckLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static boot script, no user input */}
      <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      <FontVars className={fontClasses.join(" ")} />
      {children}
    </>
  );
}
