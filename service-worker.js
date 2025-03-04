const CACHE_NAME = 'Thoughts-v1.5.4-beta-final_0x';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/custom.min.css',
    '/script.min.js',
    '/confetti.js',
    '/manifest.json',
    '/languages.json',
    '/icon-192x192.png',
    '/icon-512x512.png',
    '/icon-144x144.png',
    '/offline.html',
    '/screenshots/desktop-view.png',
    '/screenshots/mobile-view.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
            .catch(err => console.error('Cache failed during install:', err))
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
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const networkFetch = fetch(event.request, { cache: 'no-store' })
                .then(networkResponse => {
                    if (networkResponse.ok && navigator.onLine) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                try {
                                    cache.put(event.request, responseToCache);
                                } catch (err) {
                                    console.warn(`Failed to cache ${event.request.url}: ${err}`);
                                }
                            });
                    }
                    if (navigator.onLine && event.request.mode === 'navigate') {
                        return networkResponse;
                    }
                    return networkResponse;
                })
                .catch(err => {
                    console.warn(`Network fetch failed for ${event.request.url}: ${err}`);
                    if (cachedResponse) return cachedResponse;
                    if (event.request.mode === 'navigate') return caches.match('/index.html');
                    return caches.match('/offline.html') || new Response('Offline', { status: 503 });
                });
            return cachedResponse || networkFetch;
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});