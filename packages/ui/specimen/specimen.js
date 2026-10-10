// Specimen page: controls, six live rooms, component catalog, Admin desktop. Everything uses design-system utilities.
(function () {
  const K = window.NK;
  const I = K.icon;
  const html = document.documentElement;
  const state = { room: "linen", theme: "light", scale: "100", tabs: "5" };
  const ROOMS = ["today", "lists", "talk", "tasks", "memory", "linen"];
  const ROOM_NAMES = { today: "Today · peach", lists: "Lists · mint", talk: "Talk · lilac", tasks: "Tasks · butter", memory: "Memory · sky", linen: "Linen · neutral" };
  const SWATCH = {
    today: ["bg-today", "bg-today-tint", "bg-today-strong", "bg-today-ink"],
    lists: ["bg-lists", "bg-lists-tint", "bg-lists-strong", "bg-lists-ink"],
    talk: ["bg-talk", "bg-talk-tint", "bg-talk-strong", "bg-talk-ink"],
    tasks: ["bg-tasks", "bg-tasks-tint", "bg-tasks-strong", "bg-tasks-ink"],
    memory: ["bg-memory", "bg-memory-tint", "bg-memory-strong", "bg-memory-ink"],
    linen: ["bg-linen", "bg-linen-tint", "bg-linen-strong", "bg-linen-ink"],
  };
  const FLOOR = { today: "bg-today", lists: "bg-lists", talk: "bg-talk", tasks: "bg-tasks", memory: "bg-memory", linen: "bg-linen" };

  const select = (key, label, options) =>
    `<label class="flex items-center gap-2 text-subhead text-muted-foreground">${label}
      <select data-key="${key}" class="min-h-10 rounded-full border-[1.5px] border-input bg-background px-3 text-subhead text-foreground">
        ${options.map(([v, t]) => `<option value="${v}" ${state[key] === v ? "selected" : ""}>${t}</option>`).join("")}
      </select></label>`;
  document.getElementById("controls").innerHTML = [
    select("room", "Page room", ROOMS.map((r) => [r, ROOM_NAMES[r]])),
    select("theme", "Theme", [["light", "Light"], ["dark", "Dark"]]),
    select("scale", "Text size", [["100", "100%"], ["130", "130%"], ["150", "150%"], ["200", "200%"]]),
    select("tabs", "Tray phase", [["2", "P1 · 2 tabs"], ["3", "P2 · 3 tabs"], ["4", "P3 · 4 tabs"], ["5", "P5 · 5 tabs"]]),
  ].join("");

  const sec = (id, title, intro, body) =>
    `<section id="${id}" class="sp-section"><h2 class="text-title-1">${title}</h2>${intro ? `<p class="mt-2 max-w-[70ch] text-callout text-muted-foreground">${intro}</p>` : ""}<div class="mt-6">${body}</div></section>`;
  const label = (t) => `<p class="mb-2 max-w-[60ch] text-footnote text-muted-foreground">${t}</p>`;

  const phones = () =>
    `<div class="flex gap-6 overflow-x-auto px-2 pb-4 no-scrollbar">${ROOMS.map(
      (r) =>
        `<figure class="shrink-0"><div class="sp-device sp-device-sm"><div class="sp-clip"><iframe title="${ROOM_NAMES[r]} room" loading="lazy" src="phone.html?room=${r}&theme=${state.theme}&scale=${state.scale}&tabs=${state.tabs}"></iframe></div></div><figcaption class="mt-3 text-center text-subhead text-muted-foreground">${ROOM_NAMES[r]}</figcaption></figure>`,
    ).join("")}</div>`;

  const roomsColour = () => `
    <div class="grid gap-4 medium:grid-cols-2 expanded:grid-cols-3">
      ${ROOMS.map(
        (r) => `<div class="rounded-xl ${FLOOR[r]} p-4">
          <p class="text-headline text-foreground">${ROOM_NAMES[r]}</p>
          <div class="mt-3 grid grid-cols-4 gap-2">${SWATCH[r].map((c, i) => `<div><span class="block h-12 rounded-md ${c} border border-border"></span><span class="mt-1 block text-caption text-muted-foreground">${["floor", "tint", "strong", "ink"][i]}</span></div>`).join("")}</div>
          <div class="mt-3 flex flex-wrap gap-1.5 rounded-lg bg-card p-3">${K.badge("household")}${K.badge("shared")}${K.badge("private")}${K.iconBadge(r, "house", "size-8", "size-4")}</div>
        </div>`,
      ).join("")}
    </div>
    <div class="mt-6 grid gap-4 medium:grid-cols-2">
      <div class="rounded-xl bg-card p-5 shadow-card">${label("Semantic: soft fills only on white, ink for text, fill for icons")}
        <div class="flex flex-wrap gap-2">${K.status("success", "Saved")}${K.status("warning", "Due today")}${K.status("danger", "Overdue")}${K.status("info", "Not done yet")}</div>
        <div class="mt-3 flex gap-3 text-success">${I("check-circle", "fill", "size-6")}<span class="text-warning">${I("warning", "fill", "size-6")}</span><span class="text-danger">${I("warning", "fill", "size-6")}</span><span class="text-info">${I("info", "fill", "size-6")}</span></div>
      </div>
      <div class="rounded-xl bg-card p-5 shadow-card">${label("Ink, action, voice, members")}
        <div class="flex flex-wrap items-center gap-3"><span class="text-headline text-foreground">Ink</span><span class="text-headline text-muted-foreground">Secondary</span>${K.button("primary", "Action")}${K.voiceButton()}${K.avatar("M")}${K.avatar("A", "b")}</div>
      </div>
    </div>`;

  const type = () => `
    <div class="rounded-xl bg-card p-6 shadow-card">
      ${[["text-display", "Display · 32", "Good morning, Meera"], ["text-title-1", "Title 1 · 26", "What we know"], ["text-title-2", "Title 2 · 20", "Needs attention now"], ["text-headline", "Headline · 17", "Car insurance renews on Sunday"], ["text-body", "Body · 16", "Washing machine warranty ends on 15 Apr 2028."], ["text-callout", "Callout · 15", "Heard: “our washing machine warranty ends…”"], ["text-subhead", "Subhead · 14", "From memory · 2 Sep · 10:00 am"], ["text-footnote", "Footnote · 13", "Household · Shared · Private"], ["text-caption", "Caption · 12", "UPDATED 10 OCT"]]
        .map(([c, l, s]) => `<div class="grid gap-1 border-b border-border py-3 last:border-0 medium:grid-cols-[10rem_1fr] medium:items-baseline"><span class="text-footnote text-muted-foreground">${l}</span><span class="${c}">${s}</span></div>`)
        .join("")}
      <div class="grid gap-1 py-3 medium:grid-cols-[10rem_1fr] medium:items-baseline"><span class="text-footnote text-muted-foreground">Tamil · Noto Sans Tamil</span>
        <div><p class="text-title-2">${K.ta("நிலுமி · இன்றைய நினைவூட்டல்கள்")}</p><p class="text-body">Arjun added ${K.ta("தேங்காய், பால், கறிவேப்பிலை")} to the list.</p><p class="tabular text-body">Digits align: 1,240 · 98.50 · 07:30</p></div></div>
    </div>`;

  const components = () => `
    <div class="grid gap-6 expanded:grid-cols-2">
      <div class="rounded-xl bg-card p-5 shadow-card">${label("Buttons · primary, secondary, tonal, ghost, destructive, voice, disabled, loading")}
        <div class="flex flex-wrap items-center gap-2">${K.button("primary", "Approve")}${K.button("secondary", "Edit")}${K.button("tonal", "Add item", "", "plus")}${K.button("ghost", "Not now")}${K.button("destructive", "Forget", "", "trash")}${K.voiceButton()}
          ${K.button("primary", "Disabled", "disabled")}<button type="button" class="${K.BTN.primary}" aria-busy="true"><span class="size-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>Saving</button></div>
      </div>
      <div class="rounded-xl bg-card p-5 shadow-card">${label("Inputs and forms")}
        <div class="grid gap-4">${K.field({ label: "Name", placeholder: "e.g. Plumber Ravi", help: "Shown on cards and in answers." })}${K.field({ label: "Phone", value: "98xxx", error: "Enter all 10 digits, like 98765 43210." })}</div>
      </div>
      <div class="space-y-3">${label("Cards · item, result, approval")}
        ${K.itemCard({ room: "memory", ico: "shield-check", title: "Car insurance renews on Sunday", meta: K.evidence("From memory · 2 Sep") + K.badge("household") })}
        ${K.resultCard({ text: "Washing machine warranty ends on <b>15 Mar 2028</b>", heard: "our washing machine warranty ends on March 15, 2028" })}
        ${K.approvalCard()}
      </div>
      <div class="space-y-3">${label("Lists, tabs, switches")}
        <ul class="rounded-xl bg-card shadow-card">${K.listRow({ title: "Rice", qty: "2 kg", who: "M" })}${K.listRow({ title: `${K.ta("தேங்காய்")} (coconut)`, qty: "2", who: "A", whoKey: "b", last: true })}</ul>
        ${K.segmented(["Mine", "Ours"])}
        <div class="rounded-xl bg-card px-5 py-2 shadow-card">${K.switchCtl(true, "Speak replies")}${K.switchCtl(false, "Quiet hours")}</div>
      </div>
      <div class="space-y-3">${label("Banners, toast")}
        ${K.banner("warning", "wifi-slash", "Offline · 3 changes waiting")}${K.banner("info", "info", "Some answers are simpler this month", "Why?")}
        <div class="relative">${K.toast("Removed rice")}</div>
        ${K.button("secondary", "Show a toast", 'data-toast="Undone · warranty date removed"')}
      </div>
      <div class="space-y-3">${label("Loading and empty")}
        ${K.skeletonCard()}${K.thinking()}
        <div class="rounded-xl bg-card shadow-card">${K.emptyState({ room: state.room, ico: "list-checks", title: "Your list is empty", body: "Say “add milk” or type it below; both phones see it straight away.", action: "Add an item" })}</div>
      </div>
      <div class="space-y-3">${label("Navigation · phased tray (P1 → P5)")}
        ${["2", "3", "4", "5"].map((n) => `<div class="relative h-28 overflow-hidden rounded-xl bg-room-floor [transform:translateZ(0)]">${K.tray(n === "2" ? "today" : "lists", Number(n))}</div>`).join("")}
      </div>
      <div class="space-y-3">${label("Dialog (desktop) · irreversible confirmation")}
        <div class="rounded-xl bg-scrim p-6"><div role="alertdialog" aria-labelledby="dlg-t" class="mx-auto max-w-110 rounded-xl bg-popover p-6 shadow-overlay">
          <h3 id="dlg-t" class="text-title-2">Forget the warranty date?</h3>
          <p class="mt-2 text-body text-muted-foreground">This can’t be undone. Both of you will stop seeing it, and Nilumi won’t use it in answers.</p>
          <div class="mt-5 flex flex-wrap justify-end gap-2">${K.button("secondary", "Cancel", "autofocus")}${K.button("danger", "Forget warranty date")}</div>
        </div></div>
      </div>
    </div>`;

  const admin = () => `
    <div data-density="compact" class="overflow-hidden rounded-xl bg-card shadow-card expanded:grid expanded:grid-cols-[15rem_1fr]">
      <nav aria-label="Admin" class="hidden border-r border-border bg-sidebar p-3 expanded:block">
        ${[["chart-bar", "Traces", true], ["receipt", "Costs"], ["code", "Predicates"], ["users", "Members"], ["download-simple", "Backups"]]
          .map(([ico, l, on]) => `<a href="#" ${on ? 'aria-current="page"' : ""} class="flex min-h-(--control-height) items-center gap-3 rounded-md px-3 text-subhead ${on ? "bg-sidebar-accent font-black text-room-ink" : "text-sidebar-foreground"}">${I(ico, on ? "fill" : "regular", "size-5")}${l}</a>`)
          .join("")}
      </nav>
      <div class="p-5">
        <div class="flex flex-wrap items-center gap-3"><h3 class="text-title-2">Turn traces</h3><span class="ml-auto"></span>${K.button("secondary", "Filter", "", "funnel")}</div>
        <div class="mt-4 overflow-x-auto"><table class="w-full min-w-xl text-left text-subhead">
          <thead class="sticky top-0 bg-card text-footnote text-muted-foreground"><tr>${["When", "Member", "Turn", "Latency", "Cost", "Result"].map((h) => `<th scope="col" class="h-10 border-b border-border px-3 font-bold">${h}</th>`).join("")}</tr></thead>
          <tbody class="tabular">
            ${[["09:41", "Meera", "“Add detergent and two kilos of rice”", "1.2 s", "₹0.18", K.status("success", "2 saved")], ["09:38", "Arjun", `<span class="text-muted-foreground">Text hidden (another adult)</span>`, "2.9 s", "₹0.22", K.status("success", "Answered")], ["09:12", "Meera", "“My ATM PIN is …”", "0.4 s", "₹0.00", K.status("info", "Refused")], ["08:57", "Meera", "“When is the PTM?”", "6.4 s", "₹0.31", K.status("danger", "STT timeout")]]
              .map((r) => `<tr class="hover:bg-room-tint">${r.map((c) => `<td class="h-(--row-height) border-b border-border px-3">${c}</td>`).join("")}</tr>`)
              .join("")}
          </tbody></table></div>
        <div class="mt-6 grid gap-5 expanded:grid-cols-2">
          <div>${label("Spend this month (₹) · labelled bars")}
            ${[["Language", 62, "bg-chart-1"], ["Speech-to-text", 44, "bg-chart-2"], ["Voice", 31, "bg-chart-3"], ["Embeddings", 9, "bg-chart-4"]]
              .map(([l, v, c]) => `<div class="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 py-1 text-subhead"><span>${l}</span><span class="h-3 rounded-full bg-room-tint"><span class="block h-3 rounded-full ${c}" style="width:${v}%"></span></span><span class="tabular text-right">${v * 4}</span></div>`)
              .join("")}
          </div>
          <div>${label("Trace payload")}
            <pre class="overflow-x-auto rounded-lg bg-surface p-4 font-mono text-footnote text-surface-foreground">{ "turn": "t_0912", "commands": 2,
  "results": ["saved", "saved"],
  "latency_ms": { "stt": 610, "nlu": 380 } }</pre>
          </div>
        </div>
      </div>
    </div>`;

  function render() {
    html.dataset.room = state.room;
    html.classList.toggle("dark", state.theme === "dark");
    html.style.colorScheme = state.theme;
    if (state.scale === "100") delete html.dataset.textScale;
    else html.dataset.textScale = state.scale;
    document.getElementById("specimen").innerHTML = [
      `<section class="pt-4"><h1 class="text-display">Pastel Rooms</h1><p class="mt-2 max-w-[70ch] text-body text-muted-foreground">Nilumi’s design system, rendered from the real <code class="font-mono text-subhead">globals.css</code>. Each phone below is a separate page with its own <code class="font-mono text-subhead">data-room</code>, exactly as the app scopes rooms. Use the controls to change the catalog’s room, the theme, the text size and the tab-tray phase. All names and items are made up.</p></section>`,
      sec("rooms-live", "Six rooms, live", "Tap ticks, hold the mic, approve the suggestion, open “Rice” in Lists, or tap Undo to see the motion.", phones()),
      sec("colour", "Colour", "Rooms are wayfinding only. Status uses semantic colours on white. Visibility is shape-coded — Household (soft fill), Shared (outline), Private (dashed) — and reads the same on every floor.", roomsColour()),
      sec("type", "Typography", "Nunito for Latin, Noto Sans Tamil for Tamil. Fixed steps × the in-app text scale; every step at least 1.4 line-height.", type()),
      sec("components", "Components", `Rendered in the ${ROOM_NAMES[state.room]} room. Switch “Page room” to see tints and focus in every room.`, components()),
      sec("admin", "Desktop · Admin (compact density)", "The one dense surface: linen room, 10px base radius, 40px rows, tabular numbers, labelled charts, another adult’s turn text hidden.", admin()),
    ].join("");
  }

  document.getElementById("controls").addEventListener("change", (e) => {
    const key = e.target.dataset.key;
    if (!key) return;
    if (key === "theme") html.dataset.themeSwitching = "";
    state[key] = e.target.value;
    render();
    requestAnimationFrame(() => requestAnimationFrame(() => delete html.dataset.themeSwitching));
  });
  render();
})();
