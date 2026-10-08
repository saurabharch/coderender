/* CodeRender service worker: Web Push display + click-through, plus an
   offline app shell. Navigations are network-first (HTML is never stale);
   only the /offline fallback, icons, and manifest are precached, and only
   versioned framework assets are cached at runtime. API calls pass through
   untouched — queued sales live in the POS outbox, never in this cache. */
self.addEventListener("push", (event) => {
  const data = (() => {
    try { return event.data ? event.data.json() : {}; } catch { return {}; }
  })();
  const title = data.title || "CodeRender";
  const promise = self.registration.showNotification(title, {
    body: data.body || "You have a new update.",
    icon: data.icon || "/icon.svg",
    badge: data.badge || "/icon.svg",
    tag: "coderender",
    renotify: true,
  });
  if (event.waitUntil) event.waitUntil(promise);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const open = self.clients.openWindow("/");
  if (event.waitUntil) event.waitUntil(open);
});

const CACHE = "cr-shell-v1";
const SHELL = ["/offline", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  const warm = caches.open(CACHE)
    .then((c) => c.addAll(SHELL))
    .then(() => self.skipWaiting())
    .catch(() => self.skipWaiting());
  if (event.waitUntil) event.waitUntil(warm);
});

self.addEventListener("activate", (event) => {
  const purge = caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
    .catch(() => {});
  if (event.waitUntil) event.waitUntil(purge);
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  let url;
  try {
    url = new URL(request.url);
  } catch { return; }
  if (url.origin !== self.location.origin) return;
  // API + sync traffic: network only, never cached, never faked.
  if (url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }
  // Versioned framework assets + shell files: cache-first with network fill.
  if (url.pathname.startsWith("/_next/static/") || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit || fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        }).catch(() => hit)),
    );
  }
});
