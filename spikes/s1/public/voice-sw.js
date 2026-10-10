// S4 only. No fetch handler: requests from /voice use the browser's network
// path without waking a worker. The separate /sw.js registration owns the
// offline home shell and existing push subscriptions.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
