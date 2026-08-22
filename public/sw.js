// Self-destruct service worker on localhost/development to prevent conflicts with Vite HMR
if (self.location.hostname.includes('localhost') || self.location.hostname.includes('127.0.0.1')) {
  self.addEventListener('install', () => {
    self.skipWaiting();
  });
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll())
        .then((clients) => {
          clients.forEach((client) => {
            if (client.navigate) client.navigate(client.url);
          });
        })
    );
  });
}

// Bumped to v2 when the body font changed: the old cache holds a STATIC_ASSETS
// list without Plex, and the activate handler deletes any cache whose name is
// not the current one, so a returning user gets the new set rather than a page
// missing its text face.
const CACHE_NAME = 'lightkit-cache-v2';
// Tile cache is keyed by URL, so it survived the Leaflet -> OpenLayers swap.
const TILE_CACHE = 'map-tiles';
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  // Self-hosted fonts. Precached so the interface renders correctly offline
  // instead of falling back to a system face mid-flight. Plex sets everything
  // you read; Josefin sets the wordmark, headings and uppercase labels.
  '/fonts/ibm-plex-sans-latin.woff2',
  '/fonts/josefin-sans-latin.woff2'
];

// On install, cache the core skeleton
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// On activate, clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== TILE_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests (like POST)
  if (request.method !== 'GET') return;

  // Handle map tiles: Cache-First strategy to allow offline viewing of pre-loaded areas
  if (
    url.hostname.includes('basemaps.cartocdn.com') ||
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('server.arcgisonline.com')
  ) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached tile instantly, update in background if online (Stale-While-Revalidate)
            if (navigator.onLine) {
              fetch(request).then((networkResponse) => {
                if (networkResponse.status === 200) {
                  cache.put(request, networkResponse);
                }
              }).catch(() => {});
            }
            return cachedResponse;
          }
          // Fetch from network and save to cache
          return fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Fallback for missing offline tiles
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }

  // Handle local application assets (assets and pages): Stale-While-Revalidate strategy
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Offline fallback
            return cachedResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
});

// Handle custom skip waiting messages from the UI
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
