// Nilumi specimen kit: reference markup for every component, built only from design-system utilities.
// Class names are written out literally (never assembled) so Tailwind can see them.
(function () {
  const P = window.PHOSPHOR || {};
  const icon = (name, weight = "regular", cls = "size-5") =>
    `<svg viewBox="0 0 256 256" fill="currentColor" class="${cls} shrink-0" aria-hidden="true">${(P[name] || {})[weight] || ""}</svg>`;

  // Source-room tints: a Lists item shows mint on any screen. Literal strings for Tailwind.
  const ROOM_BADGE = {
    today: "bg-today-tint text-today-ink",
    lists: "bg-lists-tint text-lists-ink",
    talk: "bg-talk-tint text-talk-ink",
    tasks: "bg-tasks-tint text-tasks-ink",
    memory: "bg-memory-tint text-memory-ink",
    linen: "bg-linen-tint text-linen-ink",
  };
  const iconBadge = (room, name, size = "size-10", iconSize = "size-5") =>
    `<span class="grid ${size} shrink-0 place-items-center rounded-full ${ROOM_BADGE[room]} icon-duotone-tint" style="--duotone: var(--${room}-strong)">${icon(name, "duotone", iconSize)}</span>`;

  const BTN_BASE =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 min-h-(--control-height) text-subhead font-bold select-none transition-[transform,background-color,box-shadow] duration-(--duration-instant) ease-spring-soft active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none";
  const BTN = {
    primary: `${BTN_BASE} bg-primary text-primary-foreground hover:bg-primary-hover`,
    secondary: `${BTN_BASE} bg-background text-foreground border-[1.5px] border-input hover:bg-accent`,
    tonal: `${BTN_BASE} bg-room-tint text-room-ink hover:shadow-card`,
    ghost: `${BTN_BASE} px-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground`,
    destructive: `${BTN_BASE} bg-danger-soft text-danger-ink`,
    danger: `${BTN_BASE} bg-destructive text-destructive-foreground`,
  };
  const button = (variant, label, attrs = "", ico = "") =>
    `<button type="button" class="${BTN[variant]}" ${attrs}>${ico ? icon(ico, "bold", "size-[1.15em]") : ""}${label}</button>`;
  const voiceButton = (attrs = "", size = "size-12") =>
    `<button type="button" aria-label="Hold to talk" class="voice-btn no-callout touch-none grid ${size} shrink-0 place-items-center rounded-full bg-voice text-voice-foreground shadow-float transition-transform duration-(--duration-instant) ease-spring-soft active:scale-[0.94]" ${attrs}>${icon("microphone", "fill", "size-6")}</button>`;

  const badge = (kind) => {
    if (kind === "household")
      return `<span class="inline-flex items-center gap-1 rounded-full bg-household px-[0.8em] py-[0.2em] text-footnote text-household-foreground">${icon("house", "fill", "size-[1.1em]")}Household</span>`;
    if (kind === "shared")
      return `<span class="inline-flex items-center gap-1 rounded-full border-[1.5px] border-visibility-outline px-[0.8em] py-[0.12em] text-footnote text-visibility-foreground">${icon("users", "bold", "size-[1.1em]")}Shared</span>`;
    return `<span class="inline-flex items-center gap-1 rounded-full border-[1.5px] border-dashed border-visibility-outline px-[0.8em] py-[0.12em] text-footnote text-visibility-foreground">${icon("lock", "bold", "size-[1.1em]")}Private</span>`;
  };
  const evidence = (text) =>
    `<button type="button" class="touch-target inline-flex min-h-8 items-center gap-1.5 rounded-full bg-room-tint px-[0.9em] py-[0.32em] text-footnote text-muted-foreground">${icon("link-simple", "bold", "size-[1.1em]")}${text}</button>`;
  const status = (kind, text) => {
    const map = {
      success: "bg-success-soft text-success-ink",
      warning: "bg-warning-soft text-warning-ink",
      danger: "bg-danger-soft text-danger-ink",
      info: "bg-info-soft text-info-ink",
    };
    return `<span class="inline-flex items-center whitespace-nowrap rounded-full px-[0.8em] py-[0.2em] text-footnote ${map[kind]}">${text}</span>`;
  };
  const avatar = (initial, who = "a", size = "size-10 text-subhead") =>
    `<span class="grid ${size} shrink-0 place-items-center rounded-full font-extrabold ${who === "a" ? "bg-member-a-soft text-member-a" : "bg-member-b-soft text-member-b"}">${initial}</span>`;
  const ta = (text) => `<span lang="ta">${text}</span>`;

  const check = (checked = false, label = "Mark done") =>
    `<button type="button" role="checkbox" aria-checked="${checked}" aria-label="${label}" class="tick group relative grid size-12 shrink-0 place-items-center rounded-full">
      <span class="grid size-7 place-items-center rounded-full border-2 border-input text-success-foreground transition-colors duration-(--duration-quick) group-aria-checked:border-success group-aria-checked:bg-success group-aria-checked:animate-tick-ripple">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true"><path d="M20 6 9 17l-5-5" class="[stroke-dasharray:24] [stroke-dashoffset:24] group-aria-checked:animate-check-draw"/></svg>
      </span>
    </button>`;

  const switchCtl = (on, label) =>
    `<label class="flex min-h-(--control-height) items-center justify-between gap-4 text-body">
      <span>${label}</span>
      <button type="button" role="switch" aria-checked="${on}" aria-label="${label}" class="switch group relative h-8 w-13 shrink-0 rounded-full border-[1.5px] border-input bg-room-tint transition-colors duration-(--duration-quick) aria-checked:border-success aria-checked:bg-success">
        <span class="absolute top-0.5 left-0.5 size-6 rounded-full bg-background shadow-card transition-transform duration-(--duration-base) ease-spring-soft group-aria-checked:translate-x-5"></span>
      </button>
    </label>`;

  const field = ({ label, placeholder = "", value = "", help = "", error = "", ico = "" }) =>
    `<div class="grid gap-1.5">
      <label class="text-subhead text-foreground">${label}</label>
      <div data-focus-ring-within class="flex min-h-(--control-height-lg) items-center gap-3 rounded-full border-[1.5px] ${error ? "border-danger-ink" : "border-input"} bg-background px-5">
        ${ico ? `<span class="text-muted-foreground">${icon(ico, "regular", "size-5")}</span>` : ""}
        <input data-focus-delegate class="min-w-0 flex-1 bg-transparent text-body text-foreground outline-hidden" placeholder="${placeholder}" value="${value}" aria-invalid="${!!error}" />
      </div>
      ${error ? `<p class="flex items-center gap-1.5 text-subhead text-danger-ink">${icon("warning", "fill", "size-[1.15em]")}${error}</p>` : help ? `<p class="text-subhead text-muted-foreground">${help}</p>` : ""}
    </div>`;

  const segmented = (options, selected = 0) =>
    `<div role="tablist" class="segmented relative grid rounded-full bg-room-tint p-1" style="grid-template-columns: repeat(${options.length}, 1fr)">
      <span class="seg-thumb absolute inset-y-1 left-1 rounded-full bg-background shadow-card transition-transform duration-(--duration-base) ease-standard" style="width: calc((100% - 0.5rem) / ${options.length}); transform: translateX(${selected * 100}%)"></span>
      ${options.map((o, i) => `<button type="button" role="tab" aria-selected="${i === selected}" data-index="${i}" class="relative z-10 min-h-11 rounded-full text-subhead text-muted-foreground aria-selected:text-foreground">${o}</button>`).join("")}
    </div>`;

  // Cards
  const card = (inner, extra = "") => `<div class="rounded-xl bg-card p-5 text-card-foreground shadow-card ${extra}">${inner}</div>`;
  const itemCard = ({ room, ico, title, meta = "", trailing = "" }) =>
    card(
      `<div class="flex items-center gap-4">
        ${iconBadge(room, ico)}
        <div class="min-w-0 flex-1">
          <p class="text-headline">${title}</p>
          ${meta ? `<div class="mt-2 flex flex-wrap gap-1.5">${meta}</div>` : ""}
        </div>
        ${trailing}
      </div>`,
      "p-4",
    );
  const resultCard = ({ kind = "saved", text, heard, vis = "household" }) => {
    const head = {
      saved: [`check-circle`, "text-success-ink", "Saved"],
      updated: [`arrows-clockwise`, "text-info-ink", "Updated"],
      failed: [`warning`, "text-danger-ink", "Not saved"],
    }[kind];
    return card(
      `<div class="flex items-center gap-2">
        <span class="${head[1]}">${icon(head[0], "fill", "size-5")}</span>
        <span class="text-subhead font-extrabold ${head[1]}">${head[2]}</span>
        <span class="ml-auto">${badge(vis)}</span>
      </div>
      <p class="mt-3 text-body">${text}</p>
      ${heard ? `<p class="mt-2 text-callout text-muted-foreground">Heard: “${heard}”</p>` : ""}
      ${kind === "failed" ? "" : `<div class="mt-4 flex flex-wrap gap-2">${button("secondary", "Undo", 'data-toast="Undone · warranty date removed"', "arrow-counter-clockwise")}${button("ghost", "Edit", "", "pencil-simple")}</div>`}`,
    );
  };
  const approvalCard = () =>
    card(
      `<div class="approval">
        <div class="flex items-start gap-3">
          ${iconBadge("tasks", "lightbulb")}
          <div class="min-w-0 flex-1">
            <p class="text-footnote text-muted-foreground">Suggestion</p>
            <p class="text-headline">Move “Call plumber Ravi” to tomorrow, 10:00 am?</p>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-1.5">${evidence("Overdue since Wednesday")}${badge("household")}</div>
        <div class="approval-actions mt-4 flex flex-wrap gap-2">${button("primary", "Approve", 'data-approve=""')}${button("ghost", "Edit")}${button("ghost", "Not now")}</div>
        <p class="approval-done mt-4 hidden items-center gap-2 text-subhead text-success-ink animate-rise">${icon("check-circle", "fill", "size-5")}Moved to tomorrow, 10:00 am</p>
      </div>`,
    );

  const listRow = ({ title, qty = "", who = "", whoKey = "a", checked = false, last = false }) =>
    `<li class="relative flex min-h-(--row-height) items-center gap-2 pl-1 pr-4 ${last ? "" : "border-b border-border"}">
      ${check(checked, `Tick ${title.replace(/<[^>]+>/g, "")}`)}
      <span class="min-w-0 flex-1 text-body in-[.is-done]:text-muted-foreground in-[.is-done]:line-through">${title}</span>
      ${qty ? `<span class="tabular text-callout text-muted-foreground">${qty}</span>` : ""}
      ${who ? avatar(who, whoKey, "size-6 text-caption") : ""}
    </li>`;

  const emptyState = ({ room, ico, title, body, action }) =>
    `<div class="flex flex-col items-center px-6 py-10 text-center">
      <span class="grid size-24 place-items-center rounded-full ${ROOM_BADGE[room]} icon-duotone-tint" style="--duotone: var(--${room}-strong)">${icon(ico, "duotone", "size-12")}</span>
      <h3 class="mt-5 text-title-2">${title}</h3>
      <p class="mt-2 max-w-[32ch] text-callout text-muted-foreground">${body}</p>
      <div class="mt-5">${button("tonal", action, "", "plus")}</div>
    </div>`;

  const skeletonCard = () =>
    card(
      `<div class="flex items-center gap-4"><span class="skeleton size-10 rounded-full"></span><div class="flex-1 space-y-2"><span class="skeleton block h-4 w-3/4 rounded-full"></span><span class="skeleton block h-3 w-1/2 rounded-full"></span></div></div>`,
      "p-4",
    );
  const thinking = () =>
    `<div class="inline-flex items-center gap-1.5 rounded-xl rounded-bl-md bg-card px-4 py-3 shadow-card" role="status" aria-label="Nilumi is thinking">
      <span class="size-2 rounded-full bg-voice animate-thinking"></span><span class="size-2 rounded-full bg-voice animate-thinking [animation-delay:150ms]"></span><span class="size-2 rounded-full bg-voice animate-thinking [animation-delay:300ms]"></span>
    </div>`;

  const banner = (kind, ico, text, action = "") => {
    const map = { info: "bg-info-soft text-info-ink", warning: "bg-warning-soft text-warning-ink" };
    return `<div role="status" class="flex items-center gap-2.5 rounded-full bg-card p-1.5 pr-4 shadow-card">
      <span class="grid size-8 place-items-center rounded-full ${map[kind]}">${icon(ico, "bold", "size-4")}</span>
      <span class="text-subhead text-foreground">${text}</span>${action ? `<a href="#" class="ml-auto text-subhead text-room-ink underline underline-offset-4">${action}</a>` : ""}
    </div>`;
  };

  // The host (in the page) is the persistent polite live region; a toast mounted into it is announced.
  const toast = (text) =>
    `<div class="toast focus-inverse pointer-events-auto flex min-h-13 items-center gap-3 rounded-full bg-primary py-1.5 pl-5 pr-2 text-subhead text-primary-foreground shadow-float animate-rise">
      <span>${text}</span>
      <button type="button" class="touch-target ml-auto min-h-10 rounded-full px-4 font-extrabold text-voice-on-action">Undo</button>
    </div>`;

  // Navigation: phased tray (2–5 tabs). Talk is raised in the centre from 3 tabs; it navigates, never records.
  const TABS = {
    today: ["Today", "sun"],
    lists: ["Lists", "list-checks"],
    talk: ["Talk", "chat-circle-dots"],
    tasks: ["Tasks", "calendar-check"],
    memory: ["Memory", "book-bookmark"],
  };
  const PHASES = { 2: ["today", "talk"], 3: ["today", "lists", "talk"], 4: ["today", "lists", "talk", "memory"], 5: ["today", "lists", "talk", "tasks", "memory"] };
  const tray = (active, count = 5) => {
    const keys = PHASES[count] || PHASES[5];
    const raised = keys.length >= 3;
    return `<nav aria-label="Main" class="tray fixed inset-x-0 bottom-0 z-(--z-tray) rounded-t-[1.875rem] bg-card pb-safe shadow-overlay">
      <ul class="mx-auto grid max-w-lg items-end px-2 pt-2 pb-2" style="grid-template-columns: repeat(${keys.length}, 1fr)">
        ${keys
          .map((k) => {
            const [label, ico] = TABS[k];
            const on = k === active;
            if (k === "talk" && raised)
              return `<li class="flex justify-center"><a href="#" ${on ? 'aria-current="page"' : ""} class="flex flex-col items-center gap-1 text-tab ${on ? "text-room-ink" : "text-muted-foreground"}"><span class="-mt-7 grid size-15 place-items-center rounded-full bg-voice text-voice-foreground shadow-float">${icon(ico, "fill", "size-7")}</span><span class="text-center">${label}</span></a></li>`;
            return `<li class="flex justify-center"><a href="#" ${on ? 'aria-current="page"' : ""} class="flex min-w-16 flex-col items-center gap-1 text-tab ${on ? "font-black text-room-ink" : "text-muted-foreground"}"><span class="grid h-8 w-14 place-items-center rounded-full ${on ? "bg-room-tint" : ""}">${icon(ico, on ? "fill" : "regular", "size-6")}</span><span class="text-center">${label}</span></a></li>`;
          })
          .join("")}
      </ul>
    </nav>`;
  };

  window.NK = {
    icon, iconBadge, button, voiceButton, badge, evidence, status, avatar, ta, check, switchCtl, field, segmented,
    card, itemCard, resultCard, approvalCard, listRow, emptyState, skeletonCard, thinking, banner, toast, tray,
    ROOM_BADGE, BTN,
  };

  // Shared behaviour (ticks, switches, segmented, approve, toasts, hold-to-talk)
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;
    if (t.matches('a[href="#"]')) e.preventDefault();
    if (t.classList.contains("tick")) {
      const on = t.getAttribute("aria-checked") !== "true";
      t.setAttribute("aria-checked", on);
      t.closest("li")?.classList.toggle("is-done", on);
      if (on && navigator.vibrate) navigator.vibrate(10);
    } else if (t.getAttribute("role") === "switch") {
      t.setAttribute("aria-checked", t.getAttribute("aria-checked") !== "true");
    } else if (t.getAttribute("role") === "tab" && t.closest(".segmented")) {
      const seg = t.closest(".segmented");
      seg.querySelectorAll('[role="tab"]').forEach((b) => b.setAttribute("aria-selected", b === t));
      seg.querySelector(".seg-thumb").style.transform = `translateX(${Number(t.dataset.index) * 100}%)`;
    } else if (t.hasAttribute("data-approve")) {
      const a = t.closest(".approval");
      a.querySelector(".approval-actions").classList.add("hidden");
      a.querySelector(".approval-done").classList.replace("hidden", "flex");
    } else if (t.hasAttribute("data-toast")) {
      const host = document.querySelector(".toast-host");
      if (host) {
        host.innerHTML = toast(t.getAttribute("data-toast"));
        clearTimeout(host._t);
        host._t = setTimeout(() => (host.innerHTML = ""), 9000);
      }
    }
  });
  document.addEventListener("pointerdown", (e) => {
    const v = e.target.closest(".voice-btn");
    if (!v) return;
    const target = document.querySelector(v.getAttribute("data-listen") || ".composer");
    target?.classList.add("is-listening");
    if (navigator.vibrate) navigator.vibrate(10);
  });
  const stop = () => document.querySelectorAll(".is-listening").forEach((n) => n.classList.remove("is-listening"));
  document.addEventListener("pointerup", stop);
  document.addEventListener("pointercancel", stop);
  document.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".voice-btn")) e.preventDefault();
  });
})();
