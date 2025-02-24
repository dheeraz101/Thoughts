const CACHE_NAME = 'Thoughts-v1.5.3'; // Update this with each major release
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

// Install: Cache initial assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Activate immediately
      .catch((err) => console.error('Service Worker: Cache failed', err))
  );
});

// Fetch: Serve from cache, update cache when online, fallback to offline.html
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Always try to fetch from network when online
      const networkFetch = fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        // Update cache with fresh response
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Offline: Use cached response or fallback
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') return caches.match('/index.html');
        return caches.match('/offline.html');
      });

      // Return cached response immediately (offline-first), then update
      return cachedResponse || networkFetch;
    })
  );
});

// Activate: Clean up old caches and take control
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log(`Service Worker: Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for messages from client (e.g., to force update)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});