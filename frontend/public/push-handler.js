/* eslint-disable no-restricted-globals */
/**
 * Push event handlers loaded into the Workbox-generated service worker
 * via vite-plugin-pwa workbox.importScripts.
 */
self.addEventListener('push', (event) => {
  let title = 'TrapHouse Kitchen';
  let body = 'Your order status was updated';
  let data = { url: '/orders' };

  try {
    if (event.data) {
      const payload = event.data.json();
      if (payload.title) title = payload.title;
      if (payload.body) body = payload.body;
      if (payload.data) data = { ...data, ...payload.data };
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) body = text;
    } catch {
      // keep defaults
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/orders';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // navigate may fail on older browsers
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
