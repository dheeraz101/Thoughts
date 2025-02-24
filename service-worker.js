const CACHE_NAME = 'Thoughts-v1.5.4-beta'; // Update with each release
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/custom.css',
  '/script.js',
  '/confetti.js',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-144x144.png',
  '/offline.html', // Fallback page
  '/screenshots/desktop-view.png',
  '/screenshots/mobile-view.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting()) // Immediately activate
      .catch(err => console.error('Cache failed:', err))
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all clients immediately
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const networkFetch = fetch(event.request, { cache: 'no-store' }).then(networkResponse => {
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        // Always return network response for navigation when online
        if (navigator.onLine && event.request.mode === 'navigate') {
          return networkResponse;
        }
        return networkResponse;
      }).catch(() => {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') return caches.match('/index.html');
        return caches.match('/offline.html') || new Response('Offline', { status: 503 });
      });
      // Cache-first for offline or non-navigation
      return cachedResponse || networkFetch;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});