// One app screen per room, rendered inside a real <html data-room> page (the way the app scopes rooms).
// Query: ?room=today|lists|talk|tasks|memory|linen&theme=light|dark&scale=100..200&tabs=2..5
(function () {
  const q = new URLSearchParams(location.search);
  const room = q.get("room") || "today";
  const html = document.documentElement;
  html.dataset.room = room;
  if (q.get("theme") === "dark") {
    html.classList.add("dark");
    html.style.colorScheme = "dark";
  }
  const scale = q.get("scale");
  if (scale && scale !== "100") html.dataset.textScale = scale;
  const tabs = Number(q.get("tabs") || 5);
  if (tabs < 3) html.dataset.tray = "flat";
  const K = window.NK;
  const I = K.icon;

  const header = (title, { back = false, large = true } = {}) => `
    <header class="sticky top-0 z-(--z-header) bg-room-floor pt-safe">
      <div class="flex min-h-(--header-height) items-center gap-2 px-gutter">
        ${back ? `<a href="#" aria-label="Back" class="-ml-2 grid size-12 place-items-center rounded-full text-foreground">${I("caret-left", "bold", "size-6")}</a>` : K.avatar("M")}
        ${!large ? `<p class="text-headline">${title}</p>` : ""}
        <a href="#" aria-label="Inbox, 2 unread" class="relative ml-auto grid size-12 place-items-center rounded-full bg-card text-foreground shadow-card">
          ${I("bell", "regular", "size-6")}
          <span class="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full border-2 border-room-floor bg-destructive px-1 text-tab text-destructive-foreground">2</span>
        </a>
      </div>
    </header>`;

  const section = (title) => `<h2 class="mt-8 mb-3 text-title-2">${title}</h2>`;
  const capture = () => `
    <div class="composer group mt-5 flex min-h-(--capture-height) items-center gap-3 rounded-full bg-card py-1.5 pr-1.5 pl-5 shadow-float">
      <span class="flex-1 text-body text-muted-foreground group-[.is-listening]:hidden">Say or type something</span>
      <span class="hidden flex-1 items-center gap-2 text-body font-bold text-foreground group-[.is-listening]:flex">
        <span class="flex h-5 items-center gap-0.5 text-voice" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<i class="block h-5 w-1 origin-center rounded-full bg-current animate-level-bar" style="animation-delay:${i * 120}ms"></i>`).join("")}</span>Listening…
      </span>
      <span class="rounded-full group-[.is-listening]:animate-listen-ring">${K.voiceButton("", "size-11")}</span>
    </div>`;

  const screens = {
    today: () => `
      ${header("Today")}
      <main class="content-column px-gutter">
        <p class="text-subhead text-muted-foreground">Friday, 10 October</p>
        <h1 class="text-display">Good morning, Meera</h1>
        <p class="mt-1 text-callout text-muted-foreground">Three things need you today.</p>
        ${capture()}
        ${section("Needs attention now")}
        <div class="space-y-3">
          ${K.itemCard({ room: "memory", ico: "shield-check", title: "Car insurance renews on Sunday", meta: K.evidence("From memory · 2 Sep") + K.badge("household") })}
          ${K.itemCard({ room: "tasks", ico: "graduation-cap", title: "Pay Aarav’s school fees", meta: K.status("warning", "Today · 10:00 am"), trailing: K.check(false, "Mark school fees done") })}
          ${K.itemCard({ room: "lists", ico: "shopping-cart", title: "Shopping list · 6 items", meta: `<span class="text-callout text-muted-foreground">Arjun added ${K.ta("தேங்காய், பால்")}</span>`, trailing: `<span class="text-muted-foreground">${I("caret-right", "bold", "size-5")}</span>` })}
          ${K.approvalCard()}
        </div>
        ${section("Later this week")}
        <ul class="rounded-xl bg-card px-4 shadow-card">
          ${[["drop", "memory", "Water purifier service", "Tue, 14 Oct", "household"], ["gift", "tasks", "Diwali sweets order", "Sat, 18 Oct", "shared"], ["heartbeat", "memory", "Anniversary gift ideas", "Only you can see this", "private"]]
            .map(([ico, r, t, s, v], i, a) => `<li class="flex min-h-(--row-height) items-center gap-3 py-2.5 ${i < a.length - 1 ? "border-b border-border" : ""}">${K.iconBadge(r, ico, "size-9", "size-4")}<div class="min-w-0 flex-1"><p class="text-body font-bold break-words">${t}</p><div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1"><span class="text-subhead text-muted-foreground">${s}</span>${K.badge(v)}</div></div></li>`)
            .join("")}
        </ul>
        <p class="mt-8 text-center text-callout text-muted-foreground">That’s everything for now.</p>
      </main>`,

    lists: () => `
      ${header("Lists")}
      <main class="content-column px-gutter">
        <h1 class="text-title-1">Shopping</h1>
        <div class="mt-3">${K.banner("warning", "wifi-slash", "Offline · 2 changes waiting")}</div>
        <div class="mt-4">${K.segmented(["To buy · 5", "Bought · 3"])}</div>
        <div class="mt-4">${K.field({ label: "Add an item", placeholder: "Add to the list…", ico: "plus" })}</div>
        <ul class="mt-4 rounded-xl bg-card shadow-card">
          ${K.listRow({ title: "Rice", qty: "2 kg", who: "M" })}
          ${K.listRow({ title: `${K.ta("தேங்காய்")} (coconut)`, qty: "2", who: "A", whoKey: "b" })}
          <li class="relative overflow-hidden border-b border-border no-callout touch-pan-y">
            <div class="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-danger-soft text-danger-ink">${I("trash", "bold", "size-6")}<span class="sr-only">Remove</span></div>
            <div class="relative flex min-h-(--row-height) -translate-x-24 items-center gap-2 bg-card pl-1 pr-4">${K.check(false, "Tick detergent")}<span class="flex-1 text-body">Detergent</span><span class="tabular text-callout text-muted-foreground">1</span></div>
          </li>
          ${K.listRow({ title: "Dishwashing liquid", who: "M" })}
          ${K.listRow({ title: "Milk", qty: "2 L", who: "A", whoKey: "b", last: true })}
        </ul>
        <p class="mt-2 text-subhead text-muted-foreground">Swipe a row left to remove it, or open it for more.</p>
        <div class="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-card p-4 shadow-card"><span class="mr-auto text-headline">Rice · 2 kg</span>${K.button("secondary", "Open", "data-sheet-open", "pencil-simple")}${K.button("destructive", "Remove", 'data-toast="Removed rice"', "trash")}</div>
        ${section("Bought")}
        <ul class="rounded-xl bg-card shadow-card">${K.listRow({ title: "Bananas", qty: "6", who: "M", checked: true, last: true }).replace('<li class="', '<li class="is-done ')}</ul>
      </main>
      <div class="sheet fixed inset-0 z-(--z-overlay) hidden" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="absolute inset-0 bg-scrim animate-fade-in" data-sheet-close></div>
        <div class="absolute inset-x-0 bottom-0 mx-auto max-w-(--sheet-max) rounded-t-2xl bg-popover pb-safe shadow-overlay animate-rise">
          <div class="mx-auto mt-2.5 h-1.5 w-9 rounded-full bg-input" aria-hidden="true"></div>
          <div class="flex items-center justify-between px-gutter pt-3"><h2 id="sheet-title" class="text-title-2">Rice</h2><button type="button" aria-label="Close" class="grid size-12 place-items-center rounded-full text-muted-foreground" data-sheet-close>${I("x", "bold", "size-5")}</button></div>
          <div class="scroll-contain grid gap-4 px-gutter pt-2 pb-4">
            ${K.field({ label: "Quantity", value: "2 kg" })}
            ${K.field({ label: "Note", placeholder: "Brand, size…", help: "Visible to both of you." })}
            <div class="flex flex-wrap gap-1.5">${K.badge("household")}${K.evidence("Added by Meera · 9 Oct")}</div>
            <button type="button" class="${K.BTN.primary} min-h-(--control-height-lg) w-full" data-sheet-close>Save</button>
          </div>
        </div>
      </div>`,

    talk: () => `
      ${header("Talk")}
      <main class="content-column space-y-3 px-gutter">
        <h1 class="text-title-1">Talk</h1>
        <div class="flex justify-end"><p class="max-w-[85%] rounded-xl rounded-br-md bg-primary px-4 py-3 text-body text-primary-foreground">Our washing machine warranty ends on March 15, 2028</p></div>
        ${K.resultCard({ text: "Washing machine warranty ends on <b>15 Mar 2028</b>", heard: "our washing machine warranty ends on March 15, 2028" })}
        <div class="flex justify-end"><p class="max-w-[85%] rounded-xl rounded-br-md bg-primary px-4 py-3 text-body text-primary-foreground">That’s wrong, make it April 15</p></div>
        ${K.resultCard({ kind: "updated", text: "Warranty ends <s class='text-muted-foreground'>15 Mar 2028</s> → <b>15 Apr 2028</b>" })}
        <div class="flex justify-end"><p class="max-w-[85%] rounded-xl rounded-br-md bg-primary px-4 py-3 text-body text-primary-foreground">Remind me about the washing machine</p></div>
        <div class="max-w-[90%] rounded-xl rounded-bl-md bg-card p-4 shadow-card">
          <p class="text-body">Which one — the Bosch or the LG?</p>
          <div class="mt-3 flex flex-wrap gap-2">${K.button("tonal", "The Bosch")}${K.button("tonal", "The LG")}</div>
        </div>
        ${K.resultCard({ kind: "failed", text: "I couldn’t save “my ATM PIN”. That sounds sensitive, so I won’t store it.", vis: "private" })}
        ${K.thinking()}
      </main>
      <div class="fixed inset-x-0 bottom-0 z-(--z-tray) bg-room-floor px-gutter pt-2 pb-[calc(var(--tray-height)+env(safe-area-inset-bottom)+var(--tray-overhang)+0.75rem)]"><div class="content-column">${capture().replace("mt-5 ", "")}</div></div>`,

    tasks: () => `
      ${header("Tasks")}
      <main class="content-column px-gutter">
        <h1 class="text-title-1">Tasks</h1>
        <div class="mt-4">${K.segmented(["Mine", "Ours"], 1)}</div>
        ${section("Overdue")}
        ${K.itemCard({ room: "tasks", ico: "warning", title: "Call plumber Ravi", meta: K.status("danger", "Overdue since Wed") + K.badge("household"), trailing: K.check(false, "Mark call plumber done") })}
        ${section("Today")}
        <div class="space-y-3">
          ${K.itemCard({ room: "tasks", ico: "graduation-cap", title: "Pay Aarav’s school fees", meta: `<span class="tabular text-subhead text-muted-foreground">10:00 am</span>` + K.badge("household"), trailing: K.check(false, "Mark school fees done") })}
          ${K.itemCard({ room: "tasks", ico: "car", title: "Check the tyre pressure", meta: `<span class="flex items-center gap-1.5 text-subhead text-muted-foreground">${K.avatar("A", "b", "size-5 text-caption")}from Arjun · Sun 09:00</span>`, trailing: K.check(true, "Tyre pressure done") })}
        </div>
        ${section("Coming up")}
        ${K.skeletonCard()}
        <div class="mt-3">${K.itemCard({ room: "memory", ico: "drop", title: "Purifier filter change", meta: `<span class="text-subhead text-muted-foreground">Every 6 months · next Tue, 14 Oct</span>` })}</div>
      </main>`,

    memory: () => `
      ${header("Memory")}
      <main class="content-column px-gutter">
        <h1 class="text-title-1">What we know</h1>
        <div class="mt-4">${K.field({ label: "Search", placeholder: "Search memories", ico: "magnifying-glass" })}</div>
        <div class="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,calc(9.5rem*var(--text-scale))),1fr))] gap-3">
          ${[["washing-machine", "Appliances", 7], ["users", "People", 12], ["graduation-cap", "Kids", 9], ["house", "Home", 15], ["car", "Vehicles", 3], ["heartbeat", "Health", 4]]
            .map(([ico, l, n]) => `<a href="#" class="flex min-h-24 min-w-0 flex-col justify-between rounded-xl bg-card p-4 shadow-card">${K.iconBadge("memory", ico)}<span class="mt-3 text-headline break-words">${l}</span><span class="tabular text-subhead text-muted-foreground">${n} facts</span></a>`)
            .join("")}
        </div>
        ${section("Washing machine (Bosch)")}
        <div class="rounded-xl bg-card px-5 py-2 shadow-card">
          ${[["Warranty ends", "15 Apr 2028", "was 15 Mar 2028 · changed 10 Oct", "household"], ["Bought", "March 2023", "you said on 5 Oct, 7:30 pm", "household"], ["Last serviced", "3 Oct 2026", "imported from home items", "household"]]
            .map(([k, v, s, vis], i, a) => `<div class="py-3 ${i < a.length - 1 ? "border-b border-border" : ""}"><div class="flex items-center justify-between gap-3"><p class="text-subhead text-muted-foreground">${k}</p>${K.badge(vis)}</div><p class="tabular text-headline">${v}</p><p class="text-subhead text-muted-foreground">${s}</p></div>`)
            .join("")}
          <div class="flex flex-wrap gap-2 pt-1 pb-3">${K.button("ghost", "Edit", "", "pencil-simple")}${K.button("destructive", "Forget…", "", "trash")}</div>
        </div>
        ${section("Needs your confirmation")}
        ${K.card(`<p class="text-body">Arjun is allergic to cashews.</p><p class="mt-1 text-subhead text-muted-foreground">Health facts are only used after you confirm them.</p><div class="mt-3 flex flex-wrap gap-2">${K.button("primary", "Confirm")}${K.button("ghost", "That’s not right")}</div>`)}
      </main>`,

    linen: () => `
      ${header("Inbox", { back: true })}
      <main class="content-column px-gutter">
        <h1 class="text-title-1">Inbox</h1>
        <div class="mt-3">${K.banner("info", "info", "Some answers are simpler this month", "Why?")}</div>
        ${section("Inbox")}
        <div class="space-y-3">
          ${K.itemCard({ room: "tasks", ico: "bell", title: "Check the tyre pressure", meta: `<span class="text-subhead text-muted-foreground">Delivered 09:00 · from Arjun</span>` })}
          ${K.card(`<div class="flex items-center gap-2">${K.status("info", "Not done yet")}<span class="text-subhead text-muted-foreground">Saved 8:12 pm</span></div><p class="mt-2 text-body">“When is the next PTM at Aarav’s school?”</p><div class="mt-3 flex flex-wrap gap-2">${K.button("secondary", "Retry", "", "arrows-clockwise")}${K.button("ghost", "Discard")}</div>`)}
        </div>
        ${section("Settings")}
        <div class="rounded-xl bg-card px-5 py-3 shadow-card">
          <p class="text-subhead text-muted-foreground">Text size</p>
          <div class="mt-2">${K.segmented(["Default", "Large", "Largest"], scale === "200" ? 2 : scale === "150" ? 1 : 0)}</div>
          <p class="mt-4 text-subhead text-muted-foreground">Appearance</p>
          <div class="mt-2">${K.segmented(["System", "Light", "Dark"], q.get("theme") === "dark" ? 2 : 0)}</div>
          <div class="mt-3 border-t border-border pt-1">${K.switchCtl(true, "Speak replies")}${K.switchCtl(false, "Quiet hours")}</div>
        </div>
        ${K.emptyState({ room: "linen", ico: "tray", title: "You’re all caught up", body: "Delivered reminders and anything that needs you will appear here.", action: "Add a reminder" })}
      </main>`,
  };

  if (room === "talk") html.style.setProperty("--bottom-dock", "calc(var(--capture-height) + 1.25rem + var(--tray-overhang))");
  document.getElementById("app").innerHTML = `<div class="relative min-h-dvh pb-tray">${(screens[room] || screens.today)()}</div>${K.tray(room, tabs)}`;

  document.addEventListener("click", (e) => {
    const sheet = document.querySelector(".sheet");
    if (!sheet) return;
    if (e.target.closest("[data-sheet-open]")) sheet.classList.remove("hidden");
    if (e.target.closest("[data-sheet-close]")) sheet.classList.add("hidden");
  });
})();
