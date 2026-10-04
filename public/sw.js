/* CodeRender service worker: Web Push display + click-through. No audio here
   (workers can't beep) — the page plays the chime on arrival instead. */
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
