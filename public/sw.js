self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const target = new URL(data.url ?? "/", self.location.origin);
  if (data.notification_id) {
    target.searchParams.set("notification", data.notification_id);
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title ?? "Tanbunism", {
        body: data.body ?? "",
        icon: data.icon ?? "/icon-192.png",
        badge: data.badge ?? "/icon-192.png",
        tag: data.notification_id
          ? `tanbunism-${data.notification_id}`
          : "tanbunism",
        data: { url: target.href },
      }),
      typeof self.navigator.setAppBadge === "function" && data.unread_count
        ? self.navigator.setAppBadge(data.unread_count)
        : Promise.resolve(),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? self.location.origin;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        const target = new URL(targetUrl);
        const existing = clients.find(
          (client) => new URL(client.url).origin === target.origin,
        );
        if (existing) {
          await existing.navigate(target.href);
          return existing.focus();
        }
        return self.clients.openWindow(target.href);
      }),
  );
});
