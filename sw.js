/* HSE Safety Walk v131 cache cleanup service worker.
   This file intentionally removes older app caches and unregisters itself. */
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) client.navigate(client.url);
    } catch (_) {}
  })());
});

self.addEventListener('fetch', () => {
  /* No interception: always use the network/current GitHub Pages files. */
});
