const CACHE_NAME = 'hse-safety-walk-v150';
const APP_SHELL = [
  './',
  './index.html',
  './safety-login.html',
  './app-v137.html',
  './safety-walk-cover.png?v=150',
  './manifest.webmanifest?v=150',
  './icon-192.png?v=150',
  './icon-512.png?v=150',
  './apple-touch-icon.png?v=150'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => /^hse-safety-walk-/i.test(key) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request, { cache: 'no-store' }))
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true });
          return cached || caches.match('./safety-login.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => {
      const network = fetch(new Request(request, { cache: 'no-store' }))
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
