// ─── PlanIQ Custom Service Worker ────────────────────────────────────────────
// next-pwa merges this file into the auto-generated Workbox service worker.
// Handles: push notifications, notification click, and controlled update flow.

declare const self: ServiceWorkerGlobalScope;

// ── Controlled update: only activate when the app explicitly asks ───────────
// The app sends {type:'SKIP_WAITING'} when the user taps "Update Now".
// This prevents silent mid-session refreshes.
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Push event: show notification ──────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  let payload = { title: 'PlanIQ Reminder', body: 'You have an upcoming activity.', tag: 'planiq', url: '/calendar' };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: payload.tag,
      renotify: true,
      data: { url: payload.url },
      // @ts-ignore — vibrate is valid in non-Safari
      vibrate: [100, 50, 100],
    })
  );
});

// ── Notification click: focus app or open calendar ─────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data?.url ?? '/calendar') as string;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({ type: 'NOTIFICATION_CLICK', url });
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
