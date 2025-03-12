// service-worker.js
const CACHE_VERSION = '1.5.6+12032025'; // Sync with APP_VERSION in script.js
const CACHE_NAME = `Thoughts-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `${CACHE_NAME}-dynamic`;

// Core assets to cache on install (ensure all are critical and exist)
const ASSETS_TO_CACHE = [
    '/', // Root URL (often resolves to index.html)
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
    '/screenshots/mobile-view.png',
    '/sounds/click.ogg',
    '/sounds/error.ogg',
    '/sounds/fireworks.ogg',
    '/sounds/fireworksschoolprid.ogg',
    '/sounds/long-touch.ogg',
    '/sounds/shooting-stars.ogg',
    '/sounds/single-firework.ogg',
    '/sounds/snow.ogg',
    '/sounds/stars.ogg',
    '/sounds/success.ogg',
    '/sounds/tone.ogg'
];

// Install event: Cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Installing and caching assets');
                return cache.addAll(ASSETS_TO_CACHE)
                    .then(() => {
                        console.log('All assets cached successfully');
                        return cache.add('/index.html'); // Ensure index.html is cached
                    })
                    .catch(err => {
                        console.error('Failed to cache some assets:', err);
                        return cache.addAll(['/index.html']); // Fallback to cache index.html at minimum
                    });
            })
            .then(() => {
                console.log('Service Worker: Install complete');
                self.skipWaiting(); // Ensure new service worker activates immediately
            })
            .catch(err => console.error('Install failed:', err))
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME, DYNAMIC_CACHE_NAME];
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
        })
        .then(() => {
            console.log('Service Worker: Activation complete');
            return self.clients.claim(); // Claim clients immediately after activation
        })
        .catch(err => console.error('Activation failed:', err))
    );
});

// Fetch event: Offline-first strategy with robust fallback
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Bypass caching for manifest.json to always fetch the latest version
    if (url.pathname === '/manifest.json') {
        event.respondWith(
            fetch(event.request).catch(() => {
                // Fallback to cached manifest if network fetch fails
                return caches.match('/manifest.json');
            })
        );
        return;
    }    

    // Handle dynamic resources (e.g. drafts, posts, languages)
    if (url.pathname === '/draft' || url.pathname === '/posts' || url.pathname === '/languages') {
        event.respondWith(
            caches.open(DYNAMIC_CACHE_NAME)
                .then(cache => cache.match(event.request))
                .then(response => response || new Response('No cached data', { status: 404 }))
        );
        return;
    }

    // Use cache-first strategy for all other requests
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    console.log('Serving cached response for:', url.pathname);
                    return cachedResponse;
                }
                return fetch(event.request)
                    .then(networkResponse => {
                        if (networkResponse && networkResponse.ok) {
                            // Clone the response immediately to avoid reusing its body
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        if (event.request.mode === 'navigate') {
                            console.log('Network unavailable, serving cached index.html');
                            return caches.match('/index.html') || new Response('Offline: App unavailable', { status: 503 });
                        }
                        return new Response('Resource unavailable offline', { status: 503 });
                    });
            })
    );
});

// Message event: Handle updates, drafts, posts, and languages
self.addEventListener('message', (event) => {
    if (!event.data || !event.data.type) return;

    switch (event.data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting().then(() => {
                self.clients.claim();
                console.log('Service Worker: Activated via SKIP_WAITING');
            });
            break;
        case 'UPDATE_CACHE':
            event.waitUntil(
                caches.open(CACHE_NAME)
                    .then(cache => {
                        // Update cache in smaller chunks
                        const chunkSize = 5;
                        const assetsToUpdate = [...ASSETS_TO_CACHE]; // Copy the array
                        
                        function updateChunk(index) {
                            const chunk = assetsToUpdate.slice(index, index + chunkSize);
                            if (chunk.length === 0) {
                                console.log('Cache update complete');
                                event.ports[0]?.postMessage({ status: 'success' });
                                return;
                            }
                            
                            Promise.all(chunk.map(asset => cache.add(asset)))
                                .then(() => {
                                    console.log(`Chunk updated: ${chunk.join(', ')}`);
                                    updateChunk(index + chunkSize); // Recursive call for next chunk
                                })
                                .catch(err => {
                                    console.error('Cache update failed for chunk:', chunk, err);
                                    event.ports[0]?.postMessage({ status: 'error', error: err.message });
                                });
                        }
                        
                        updateChunk(0); // Start updating in chunks
                    })
            );
            break;
        case 'SAVE_DRAFT':
            event.waitUntil(
                caches.open(DYNAMIC_CACHE_NAME)
                    .then(cache => cache.put('/draft', new Response(event.data.draft)))
                    .then(() => console.log('Draft saved to cache'))
            );
            break;
        case 'SAVE_POSTS':
            event.waitUntil(
                caches.open(DYNAMIC_CACHE_NAME)
                    .then(cache => cache.put('/posts', new Response(event.data.posts)))
                    .then(() => console.log('Posts saved to cache'))
            );
            break;
        case 'SAVE_LANGUAGES':
            event.waitUntil(
                caches.open(DYNAMIC_CACHE_NAME)
                    .then(cache => cache.put('/languages', new Response(event.data.languages)))
                    .then(() => console.log('Languages saved to cache'))
            );
            break;
        case 'CLEAR_DRAFT':
            event.waitUntil(
                caches.open(DYNAMIC_CACHE_NAME)
                    .then(cache => cache.delete('/draft'))
                    .then(() => console.log('Draft cleared from cache'))
            );
            break;
    }
});