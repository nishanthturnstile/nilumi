/**
 * Runtime theme contract. Everything lives on <html> so portalled UI inherits it:
 *   data-room · class "dark" + style.colorScheme · data-text-scale · data-tray
 * Run `themeBootScript` inline before first paint (give <html> suppressHydrationWarning), call `initTheme()`
 * once after hydration, then use the setters.
 */
export const rooms = ["today", "lists", "talk", "tasks", "memory", "linen"] as const;
export type Room = (typeof rooms)[number];
export type ThemePreference = "system" | "light" | "dark";

const STORAGE = { theme: "nilumi.theme", textScale: "nilumi.textScale" } as const;

/** Room for a URL path: "/" is Today, a first segment naming a room is that room, everything else (Inbox,
 *  Settings, Admin, sign-in) is linen. Used before paint and on client navigation (`setRoom(roomForPath(p))`). */
export function roomForPath(pathname: string): Room {
  const first = pathname.split("/")[1] ?? "";
  if (first === "") return "today";
  return (rooms as readonly string[]).includes(first) && first !== "linen" ? (first as Room) : "linen";
}

/** Inline before first paint. The App Router root layout can't see the pathname, so the room is derived from
 *  location here (unless the server already rendered data-room); theme and text scale come from storage. */
export const themeBootScript = `(()=>{try{var d=document.documentElement,t=localStorage.getItem("${STORAGE.theme}")||"system",
s=localStorage.getItem("${STORAGE.textScale}");if(!d.dataset.room){var f=location.pathname.split("/")[1]||"",
r=${JSON.stringify(rooms.filter((r) => r !== "linen"))};d.dataset.room=f===""?"today":r.indexOf(f)>=0?f:"linen";}
var dark=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);
d.classList.toggle("dark",dark);d.style.colorScheme=dark?"dark":"light";if(s&&s!=="100")d.dataset.textScale=s;}catch(e){}})();`;

/** Resolve any CSS colour (including oklch) to #rrggbb via a 1×1 canvas — `theme-color` needs sRGB. */
function toHex(cssColor: string): string {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return "#ffffff";
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Android colours its status bar from <meta name="theme-color">. Read the room's *target* floor primitive
 *  (not --room, which is mid-transition right after a change). iOS 26 uses the page background instead.
 *  Server-render a light/dark media pair (the first room's floors) for the first frame; this points every
 *  theme-color tag at the in-app theme, updating them in place because the framework owns those nodes. */
export function syncThemeColor(room: Room = currentRoom()) {
  const html = document.documentElement;
  const value = getComputedStyle(html).getPropertyValue(`--${room}-floor`).trim();
  if (!value) return;
  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
  if (!metas.length) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    metas.push(document.head.appendChild(meta));
  }
  const hex = toHex(value);
  for (const meta of metas) {
    meta.removeAttribute("media");
    meta.content = hex;
  }
}

export function currentRoom(): Room {
  const r = document.documentElement.dataset.room as Room | undefined;
  return r && (rooms as readonly string[]).includes(r) ? r : "linen";
}

/** Switch rooms (on tab navigation). The floor glides via the registered --room transition. */
export function setRoom(room: Room) {
  document.documentElement.dataset.room = room;
  syncThemeColor(room);
}

const darkQuery = () => matchMedia("(prefers-color-scheme: dark)");
let systemListener: (() => void) | null = null;

function applyTheme(pref: ThemePreference) {
  const html = document.documentElement;
  const dark = pref === "dark" || (pref === "system" && darkQuery().matches);
  html.dataset.themeSwitching = "";
  html.classList.toggle("dark", dark);
  html.style.colorScheme = dark ? "dark" : "light";
  syncThemeColor();
  requestAnimationFrame(() => requestAnimationFrame(() => delete html.dataset.themeSwitching));
}

/** "System" follows the OS live (an installed app can stay open across a scheduled light/dark switch). */
function followSystem(pref: ThemePreference) {
  if (systemListener) darkQuery().removeEventListener("change", systemListener);
  systemListener = null;
  if (pref !== "system") return;
  systemListener = () => applyTheme("system");
  darkQuery().addEventListener("change", systemListener);
}

/** Switch theme without the floor gliding between light and dark (data-theme-switching disables transitions). */
export function setTheme(pref: ThemePreference) {
  localStorage.setItem(STORAGE.theme, pref);
  applyTheme(pref);
  followSystem(pref);
}

/** Call once after hydration: syncs theme-color with the booted theme and starts following the OS when the
 *  preference is "system". */
export function initTheme() {
  let pref: ThemePreference = "system";
  try {
    pref = (localStorage.getItem(STORAGE.theme) as ThemePreference | null) ?? "system";
  } catch {}
  syncThemeColor();
  followSystem(pref);
}

/** In-app Text size (OS text-size settings don't reach installed web apps). 100 removes the attribute. */
export function setTextScale(step: 100 | 115 | 130 | 150 | 175 | 200) {
  localStorage.setItem(STORAGE.textScale, String(step));
  if (step === 100) delete document.documentElement.dataset.textScale;
  else document.documentElement.dataset.textScale = String(step);
}
