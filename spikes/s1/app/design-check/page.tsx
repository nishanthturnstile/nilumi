"use client";

import { Drawer } from "@base-ui/react/drawer";
import { Toast } from "@base-ui/react/toast";
import {
  BellIcon,
  BookBookmarkIcon,
  CalendarCheckIcon,
  ChatCircleDotsIcon,
  HouseIcon,
  LinkSimpleIcon,
  ListChecksIcon,
  LockIcon,
  MicrophoneIcon,
  PencilSimpleIcon,
  ShoppingCartIcon,
  SunIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react";
import { type ComponentType, type ReactNode, useEffect, useRef, useState } from "react";

type Room = "today" | "lists" | "talk" | "tasks" | "memory" | "linen";
type IconType = ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" | "duotone" }>;

const TABS: Record<Exclude<Room, "linen">, { label: string; Icon: IconType }> = {
  today: { label: "Today", Icon: SunIcon },
  lists: { label: "Lists", Icon: ListChecksIcon },
  talk: { label: "Talk", Icon: ChatCircleDotsIcon },
  tasks: { label: "Tasks", Icon: CalendarCheckIcon },
  memory: { label: "Memory", Icon: BookBookmarkIcon },
};
const PHASES: Record<number, Exclude<Room, "linen">[]> = {
  2: ["today", "talk"],
  3: ["today", "lists", "talk"],
  4: ["today", "lists", "talk", "memory"],
  5: ["today", "lists", "talk", "tasks", "memory"],
};
const TITLES: Record<Room, string> = {
  today: "Good morning, Meera",
  lists: "Shopping",
  talk: "Talk",
  tasks: "Tasks",
  memory: "What we know",
  linen: "Inbox",
};

// Mirrors packages/ui/src/lib/theme.ts (the spike can't import across its Turbopack root).
function toHex(cssColor: string) {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return "#ffffff";
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
function syncThemeColor(room: Room) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${room}-floor`).trim();
  if (!value) return;
  // Point the server-rendered light/dark media pair (React-managed, so updated in place, never removed) at the
  // in-app theme's floor
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

/** Keeps docked UI above the software keyboard (Safari has no `interactive-widget`). */
function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const html = document.documentElement;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      html.style.setProperty("--keyboard-inset", `${Math.round(inset)}px`);
      html.dataset.keyboard = inset > 80 ? "open" : "closed";
    };
    const later = () => setTimeout(update, 300);
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", later);
    document.addEventListener("visibilitychange", update);
    document.addEventListener("focusout", later);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", later);
      document.removeEventListener("visibilitychange", update);
      document.removeEventListener("focusout", later);
      html.style.removeProperty("--keyboard-inset");
      delete html.dataset.keyboard;
    };
  }, []);
}

const btn =
  "inline-flex min-h-(--control-height) items-center justify-center gap-2 rounded-full px-5 text-subhead font-bold select-none transition-transform duration-(--duration-instant) ease-spring-soft active:scale-[0.97]";

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-full bg-room-tint p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className="min-h-11 rounded-full text-subhead text-muted-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-card"
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-card p-5 text-card-foreground shadow-card ${className}`}>{children}</div>;
}

function Badge({ kind }: { kind: "household" | "shared" | "private" }) {
  if (kind === "household")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-household px-[0.8em] py-[0.2em] text-footnote text-household-foreground">
        <HouseIcon weight="fill" className="size-[1.1em]" />
        Household
      </span>
    );
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-[1.5px] border-visibility-outline px-[0.8em] py-[0.12em] text-footnote text-visibility-foreground ${kind === "private" ? "border-dashed" : ""}`}>
      {kind === "shared" ? <UsersIcon weight="bold" className="size-[1.1em]" /> : <LockIcon weight="bold" className="size-[1.1em]" />}
      {kind === "shared" ? "Shared" : "Private"}
    </span>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="absolute right-0 bottom-0 left-0 z-[calc(1000-var(--toast-index))] [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-var(--toast-index)*0.75rem))] rounded-full bg-primary text-primary-foreground shadow-float [transition:transform_0.4s_cubic-bezier(0.16,1,0.3,1),opacity_0.3s] data-ending-style:opacity-0 data-limited:opacity-0 data-starting-style:[transform:translateY(150%)] data-ending-style:data-[swipe-direction=down]:[transform:translateY(150%)] data-ending-style:data-[swipe-direction=left]:[transform:translateX(-150%)] data-ending-style:data-[swipe-direction=right]:[transform:translateX(150%)]"
    >
      <Toast.Content className="flex min-h-13 items-center gap-3 py-1.5 pr-2 pl-5">
        <Toast.Title className="flex-1 text-subhead" />
        <Toast.Action className="touch-target min-h-10 rounded-full px-4 text-subhead font-extrabold text-voice-on-action" />
        <Toast.Close aria-label="Dismiss" className="touch-target grid size-10 place-items-center rounded-full">
          <XIcon weight="bold" className="size-4" />
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

function Page() {
  const [room, setRoomState] = useState<Room>("today");
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [scale, setScale] = useState<"100" | "150" | "200">("100");
  const [phase, setPhase] = useState(5);
  const [listening, setListening] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pushed = useRef(false);
  const toasts = Toast.useToastManager();
  useKeyboardInset();

  const tabs = PHASES[phase];
  const raised = tabs.length >= 3;

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.room = room;
    if (raised) delete html.dataset.tray;
    else html.dataset.tray = "flat";
    // Docked composer = capture bar + its band padding + the tray overhang it covers
    html.style.setProperty("--bottom-dock", room === "talk" ? "calc(var(--capture-height) + 1.25rem + var(--tray-overhang))" : "0px");
    syncThemeColor(room);
  }, [room, raised]);

  // Theme only: re-running on room changes would set data-theme-switching and cancel the floor glide.
  useEffect(() => {
    const html = document.documentElement;
    const query = matchMedia("(prefers-color-scheme: dark)");
    let frame = 0;
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && query.matches);
      html.dataset.themeSwitching = "";
      html.classList.toggle("dark", dark);
      html.style.colorScheme = dark ? "dark" : "light";
      syncThemeColor((html.dataset.room as Room | undefined) ?? "today");
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => delete html.dataset.themeSwitching);
      });
    };
    apply();
    // "System" follows the OS live while the app stays open
    if (theme === "system") query.addEventListener("change", apply);
    return () => {
      query.removeEventListener("change", apply);
      cancelAnimationFrame(frame);
    };
  }, [theme]);

  useEffect(() => {
    const html = document.documentElement;
    if (scale === "100") delete html.dataset.textScale;
    else html.dataset.textScale = scale;
  }, [scale]);

  // Android system back closes the sheet before leaving the page.
  useEffect(() => {
    const onPop = () => {
      if (pushed.current) {
        pushed.current = false;
        setSheetOpen(false);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const changeSheet = (open: boolean) => {
    if (open && !pushed.current) {
      history.pushState({ nilumiSheet: true }, "");
      pushed.current = true;
    }
    if (!open && pushed.current) {
      pushed.current = false;
      history.back();
    }
    setSheetOpen(open);
  };

  const removeRice = () => {
    const id = toasts.add({
      title: "Removed rice",
      timeout: 9000,
      actionProps: {
        children: "Undo",
        // Toast.Action doesn't dismiss its toast; close it before confirming the undo
        onClick: () => {
          toasts.close(id);
          toasts.add({ title: "Rice is back on the list", timeout: 4000 });
        },
      },
    });
  };

  return (
    <div className="relative min-h-dvh pb-tray">
      <header className="sticky top-0 z-(--z-header) bg-room-floor pt-safe">
        <div className="flex min-h-(--header-height) items-center gap-2 px-gutter">
          <span className="grid size-10 place-items-center rounded-full bg-member-a-soft text-subhead font-extrabold text-member-a">M</span>
          <button type="button" onClick={() => setRoomState("linen")} aria-label="Inbox, 2 unread" className="relative ml-auto grid size-12 place-items-center rounded-full bg-card text-foreground shadow-card">
            <BellIcon className="size-6" />
            <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full border-2 border-room-floor bg-destructive px-1 text-tab text-destructive-foreground">2</span>
          </button>
        </div>
      </header>

      <main className="content-column space-y-4 px-gutter">
        <h1 className={room === "today" ? "text-display" : "text-title-1"}>{TITLES[room]}</h1>

        <Card className="space-y-3">
          <p className="text-subhead text-muted-foreground">Device check controls (tabs below switch rooms)</p>
          <Segmented label="Theme" value={theme} onChange={setTheme} options={[["system", "System"], ["light", "Light"], ["dark", "Dark"]]} />
          <Segmented label="Text size" value={scale} onChange={setScale} options={[["100", "100%"], ["150", "150%"], ["200", "200%"]]} />
          <Segmented label="Tray phase" value={String(phase)} onChange={(v) => setPhase(Number(v))} options={[["2", "P1"], ["3", "P2"], ["4", "P3"], ["5", "P5"]]} />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lists-tint text-lists-ink">
              <ShoppingCartIcon weight="duotone" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-headline">Shopping list · 6 items</p>
              <p className="text-callout text-muted-foreground">
                Arjun added <span lang="ta">தேங்காய், பால், கறிவேப்பிலை</span>
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button type="button" className="touch-target inline-flex min-h-8 items-center gap-1.5 rounded-full bg-room-tint px-[0.9em] py-[0.32em] text-footnote text-muted-foreground">
              <LinkSimpleIcon weight="bold" className="size-[1.1em]" />
              From memory · 2 Sep
            </button>
            <Badge kind="household" />
            <Badge kind="shared" />
            <Badge kind="private" />
          </div>
        </Card>

        {/* Soft fills sit only on white: the item's actions live in its card, not on the floor */}
        <Card className="flex flex-wrap items-center gap-2 p-4">
          <span className="mr-auto text-headline">Rice · 2 kg</span>
          <button type="button" onClick={() => changeSheet(true)} className={`${btn} border-[1.5px] border-input bg-background text-foreground`}>
            <PencilSimpleIcon weight="bold" className="size-[1.15em]" />
            Open
          </button>
          <button type="button" onClick={removeRice} className={`${btn} bg-danger-soft text-danger-ink`}>
            <TrashIcon weight="bold" className="size-[1.15em]" />
            Remove
          </button>
        </Card>

        <ul className="rounded-xl bg-card px-4 shadow-card" aria-label="Scroll and overscroll test rows">
          {Array.from({ length: 18 }, (_, i) => (
            <li key={i} className="flex min-h-(--row-height) items-center gap-3 border-b border-border last:border-0">
              <span className="tabular text-subhead text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-body">{i % 3 === 0 ? <span lang="ta">தேங்காய் எண்ணெய்</span> : "Scroll to the end and pull past it"}</span>
            </li>
          ))}
        </ul>
      </main>

      {room === "talk" && (
        // The floor band runs behind the tray to the screen edge, so nothing peeks between them and the raised
        // Talk tab overlaps the band, never the pill. With the keyboard open it rides on top of the keyboard.
        <div
          className="fixed inset-x-0 z-(--z-tray) bg-room-floor px-gutter pt-2 pb-[calc(var(--tray-height)+env(safe-area-inset-bottom)+var(--tray-overhang)+0.75rem)] in-data-[keyboard=open]:pb-3"
          style={{ bottom: "var(--keyboard-inset)" }}
        >
          <div data-focus-ring-within className="content-column flex min-h-(--capture-height) items-center gap-3 rounded-full bg-card py-1.5 pr-1.5 pl-5 shadow-float">
            {/* Persistent live region: announced when its text changes, unlike a region mounted with content */}
            <span className="sr-only" role="status">
              {listening ? "Listening" : ""}
            </span>
            {listening ? (
              <span className="flex flex-1 items-center gap-2 text-body font-bold" aria-hidden="true">
                <span className="flex h-5 items-center gap-0.5 text-voice" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <i key={i} className="block h-5 w-1 rounded-full bg-current animate-level-bar" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </span>
                Listening…
              </span>
            ) : (
              <input data-focus-delegate aria-label="Say or type something" placeholder="Say or type something" className="min-w-0 flex-1 bg-transparent text-body outline-hidden" />
            )}
            <span className={`rounded-full ${listening ? "animate-listen-ring" : ""}`}>
              <button
                type="button"
                aria-label="Hold to talk"
                className="no-callout grid size-11 touch-none place-items-center rounded-full bg-voice text-voice-foreground shadow-float"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setListening(true);
                  navigator.vibrate?.(10);
                }}
                onPointerUp={() => setListening(false)}
                onPointerCancel={() => setListening(false)}
                onLostPointerCapture={() => setListening(false)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <MicrophoneIcon weight="fill" className="size-6" />
              </button>
            </span>
          </div>
        </div>
      )}

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-(--z-tray) rounded-t-[1.875rem] bg-card pb-safe shadow-overlay">
        <ul className="mx-auto grid max-w-lg items-end px-2 pt-2 pb-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map((t) => {
            const { label, Icon } = TABS[t];
            const on = t === room;
            if (t === "talk" && raised)
              return (
                <li key={t} className="flex justify-center">
                  <button type="button" onClick={() => setRoomState(t)} aria-current={on ? "page" : undefined} className={`flex flex-col items-center gap-1 text-tab ${on ? "text-room-ink" : "text-muted-foreground"}`}>
                    <span className="-mt-7 grid size-15 place-items-center rounded-full bg-voice text-voice-foreground shadow-float">
                      <Icon weight="fill" className="size-7" />
                    </span>
                    {label}
                  </button>
                </li>
              );
            return (
              <li key={t} className="flex justify-center">
                <button type="button" onClick={() => setRoomState(t)} aria-current={on ? "page" : undefined} className={`flex min-w-16 flex-col items-center gap-1 text-tab ${on ? "font-black text-room-ink" : "text-muted-foreground"}`}>
                  <span className={`grid h-8 w-14 place-items-center rounded-full ${on ? "bg-room-tint" : ""}`}>
                    <Icon weight={on ? "fill" : "regular"} className="size-6" />
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <Drawer.Root open={sheetOpen} onOpenChange={changeSheet} snapPoints={[0.5, 0.92]}>
        <Drawer.VirtualKeyboardProvider>
          <Drawer.Portal>
            {/* Modal sheet: full scrim at every snap point. Base UI's backdrop --drawer-swipe-progress ramps between the
                first two snap points (an "undimmed lower detent"), so the scrim deliberately ignores it. */}
            <Drawer.Backdrop className="fixed inset-0 z-(--z-overlay) min-h-dvh bg-scrim transition-opacity duration-(--duration-slow) data-ending-style:opacity-0 data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
            <Drawer.Viewport className="fixed inset-0 z-(--z-overlay) flex touch-none items-end justify-center">
              <Drawer.Popup className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-(--sheet-max) touch-none flex-col rounded-t-2xl bg-popover text-popover-foreground shadow-overlay [padding-bottom:max(0px,calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y)))] [transform:translateY(calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y)))] transition-transform duration-(--duration-slow) ease-decelerate data-ending-style:[transform:translateY(calc(100%+2px))] data-starting-style:[transform:translateY(calc(100%+2px))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]">
                <div className="shrink-0 touch-none px-gutter pt-2.5 select-none">
                  <div className="mx-auto h-1.5 w-9 rounded-full bg-input" aria-hidden="true" />
                  <div className="flex items-center justify-between pt-3">
                    <Drawer.Title className="text-title-2">Rice</Drawer.Title>
                    <Drawer.Close aria-label="Close" className="grid size-12 place-items-center rounded-full text-muted-foreground">
                      <XIcon weight="bold" className="size-5" />
                    </Drawer.Close>
                  </div>
                </div>
                <Drawer.Content className="scroll-contain grid min-h-0 flex-1 touch-auto gap-4 overflow-y-auto px-gutter pt-2 pb-4">
                  <Drawer.Description className="text-callout text-muted-foreground">Drag between half and full height; flick down or press Back to close.</Drawer.Description>
                  {["Quantity", "Note", "Shop"].map((label) => (
                    <label key={label} className="grid gap-1.5">
                      <span className="text-subhead">{label}</span>
                      <input className="min-h-(--control-height-lg) rounded-full border-[1.5px] border-input bg-background px-5 text-body" placeholder={label === "Quantity" ? "2 kg" : ""} />
                    </label>
                  ))}
                  {Array.from({ length: 8 }, (_, i) => (
                    <p key={i} className="text-callout text-muted-foreground">
                      Inner scroll row {i + 1}
                    </p>
                  ))}
                </Drawer.Content>
                {/* The main action is pinned outside the scroll body and rides above the keyboard (spec §8.3) */}
                <div className="shrink-0 border-t border-border px-gutter pt-3 pb-[calc(0.75rem+max(env(safe-area-inset-bottom),var(--drawer-keyboard-inset,0px)))]">
                  <Drawer.Close className={`${btn} min-h-(--control-height-lg) w-full bg-primary text-primary-foreground`}>Save</Drawer.Close>
                </div>
              </Drawer.Popup>
            </Drawer.Viewport>
          </Drawer.Portal>
        </Drawer.VirtualKeyboardProvider>
      </Drawer.Root>

      <Toast.Portal>
        <Toast.Viewport
          className="fixed inset-x-3 z-(--z-toast) mx-auto max-w-md"
          style={{ bottom: "calc(var(--tray-height) + max(var(--bottom-dock), var(--tray-overhang)) + env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </div>
  );
}

export default function DesignCheckPage() {
  return (
    <Toast.Provider timeout={9000} limit={2}>
      <Page />
    </Toast.Provider>
  );
}
