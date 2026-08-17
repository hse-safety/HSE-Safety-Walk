/* HSE Safety Walk v132 legacy-cache cleanup service worker.
   The app itself no longer depends on offline cache. If an older registered worker
   updates to this file, it deletes only HSE Safety Walk caches and unregisters itself. */
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys
        .filter(key => /hse[-_ ]?safety[-_ ]?walk/i.test(key))
        .map(key => caches.delete(key)));
    } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) client.navigate(client.url);
    } catch (_) {}
  })());
});

self.addEventListener('fetch', () => {
  /* No interception: use the current GitHub Pages files. */
});
