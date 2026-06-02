// service-worker.js
const CACHE_VERSION = '2.3.5';
const CACHE_NAME = `thoughts-v${CACHE_VERSION}`;

// Core assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/custom.min.css',
  '/script.min.js',
  '/confetti.js',
  '/manifest.json',
  '/languages.json',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-144x144.png',
  '/screenshots/desktop-view.png',
  '/screenshots/mobile-view.png',
  '/sounds/click.ogg',
  '/sounds/error.ogg',
  '/sounds/success.ogg',
  '/sounds/stars.ogg',
  '/sounds/tone.ogg',
  '/sounds/long-touch.ogg',
  '/sounds/single-firework.ogg',
  '/sounds/fireworksschoolprid.ogg',
  '/sounds/shooting-stars.ogg',
  '/sounds/snow.ogg',
  '/sounds/fireworks.ogg'
];

// Install: cache all assets, then skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => {
        console.log('Service Worker: All assets cached');
        return self.skipWaiting();
      })
      .catch(err => console.error('Install failed:', err))
  );
});

// Activate: delete old caches, claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key.startsWith('thoughts-v'))
          .map(key => {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log('Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Fetch: network-first for HTML/JS/CSS, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Let external language-store/GitHub requests pass through. Do not cache opaque
  // or failed cross-origin responses; they can break fetch with invalid Response values.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', {
        status: 502,
        statusText: 'External request unavailable'
      }))
    );
    return;
  }

  // Always go to network for manifest (needed for update detection)
  if (url.pathname === '/manifest.json') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/manifest.json'))
    );
    return;
  }

  const isNavigation = event.request.mode === 'navigate';
  const isCode = /\.(js|css|html?)$/.test(url.pathname);

  // Network-first for documents and code (ensures latest version)
  if (isNavigation || isCode) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh response for offline use
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Fall back to cache when offline
          return caches.match(event.request)
            .then(cached => cached || caches.match('/offline.html'));
        })
    );
    return;
  }

  // Cache-first for static assets (images, sounds, screenshots)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return new Response('', {
          status: 504,
          statusText: 'Offline'
        });
      });
    })
  );
});

// Message handler — handles update + lightweight local backups
self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;

      case 'SAVE_POSTS':
        await cache.put('/posts', new Response(event.data.posts || '[]', {
          headers: { 'Content-Type': 'application/json' }
        }));
        break;

      case 'SAVE_DRAFT':
        await cache.put('/draft', new Response(event.data.draft || '', {
          headers: { 'Content-Type': 'text/plain' }
        }));
        break;

      case 'CLEAR_DRAFT':
        await cache.delete('/draft');
        break;

      case 'SAVE_LANGUAGES':
        await cache.put('/languages', new Response(event.data.languages || '{}', {
          headers: { 'Content-Type': 'application/json' }
        }));
        break;
    }
  })());
});

// Suppress console.log in production
const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
if (!isDev) {
  console.log = () => {};
}
