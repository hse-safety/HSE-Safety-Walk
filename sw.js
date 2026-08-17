/* HSE Safety Walk v134 legacy-cache cleanup only. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try { const keys = await caches.keys(); await Promise.all(keys.filter(k => /hse[-_ ]?safety[-_ ]?walk/i.test(k)).map(k => caches.delete(k))); } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    try { const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true}); for (const client of clients) client.navigate(client.url); } catch (_) {}
  })());
});
self.addEventListener('fetch', () => {});
