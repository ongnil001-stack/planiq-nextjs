/**
 * PlanIQ Custom Service Worker — notification scheduling
 * ─────────────────────────────────────────────────────────
 * Merged into the workbox-generated SW by next-pwa.
 */

const _pendingNotifications = new Map();

self.addEventListener('message', event => {
  const { type, payload } = event.data || {};

  if (type === 'SCHEDULE_NOTIFICATION') {
    const { tag, title, body, delay, url } = payload;
    if (_pendingNotifications.has(tag)) {
      clearTimeout(_pendingNotifications.get(tag));
    }
    const tid = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon:     '/icons/icon-192.png',
        badge:    '/icons/icon-72.png',
        tag,
        renotify: true,
        data:     { url: url || '/dashboard' },
        vibrate:  [150, 80, 150],
        actions:  [
          { action: 'open',    title: 'Open PlanIQ' },
          { action: 'dismiss', title: 'Dismiss'     },
        ],
      });
      _pendingNotifications.delete(tag);
    }, Math.max(delay, 0));
    _pendingNotifications.set(tag, tid);
  }

  if (type === 'CANCEL_NOTIFICATION') {
    const { tag } = payload;
    if (_pendingNotifications.has(tag)) {
      clearTimeout(_pendingNotifications.get(tag));
      _pendingNotifications.delete(tag);
    }
  }

  if (type === 'CANCEL_ALL_NOTIFICATIONS') {
    _pendingNotifications.forEach(tid => clearTimeout(tid));
    _pendingNotifications.clear();
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const targetUrl = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
