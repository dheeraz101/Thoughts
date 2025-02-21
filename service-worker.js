const CACHE_NAME = 'Thoughts-v1';
const ASSETS_TO_CACHE = [
  '/',              // Root route
  '/index.html',    // Main HTML file
  '/manifest.json', // Manifest file
  '/icon-192x192.png', // Icons
  '/icon-512x512.png',
  '/icon-144x144.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((err) => {
        console.error('Service Worker: Cache failed', err);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if available
        if (response) {
          return response;
        }
        // Fetch from network if not in cache
        return fetch(event.request).then((response) => {
          // Only cache valid responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          return response;
        }).catch(() => {
          // Fallback for offline (optional: return a custom offline page)
          return caches.match('/index.html');
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
    })
  );
});