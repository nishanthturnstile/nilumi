const CACHE = "nilumi-s1-v2";
const SHELL = ["/", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("nilumi-s1-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // SSE, no-store speech and authenticated routes always use the network.
  if (url.origin !== self.location.origin ||
    !(SHELL.includes(url.pathname) || url.pathname.startsWith("/_next/static/"))) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && !res.headers.get("Cache-Control")?.includes("no-store")) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {}));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached || Response.error();
      })
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Nilumi", body: "You have a reminder" };
  try { if (event.data) data = event.data.json(); } catch {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: "/icon-192.png",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.focus();
    return self.clients.openWindow(new URL("/", self.location.origin).href);
  })());
});
