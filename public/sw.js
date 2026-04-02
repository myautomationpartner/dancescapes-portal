/**
 * Service Worker — Dancescapes Portal PWA
 * Strategy:
 *   • App Shell (HTML, fonts, SVG icons) → Cache First, revalidate in background
 *   • API calls (n8n, Cloudflare Pages /api/inbox) → Network First, fall back to cache
 *   • Everything else → Network First
 *
 * Phase 1 (PWA):  Installable, works offline with cached data.
 * Phase 2 (Cap):  Capacitor loads this same sw.js inside the WebView.
 * Phase 3 (API):  Upgrade to Workbox or background-sync when needed.
 */

const CACHE_VERSION = 'v2';
const SHELL_CACHE   = `map-shell-${CACHE_VERSION}`;
const DATA_CACHE    = `map-data-${CACHE_VERSION}`;

// App shell — static assets that form the UI skeleton
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icons/icon-192.webp',
  '/assets/icons/icon-512.webp',
  // Google Fonts are cross-origin — they cache themselves via their own SW
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap',
];

// URL patterns that should ALWAYS go network-first (live data)
const NETWORK_FIRST_PATTERNS = [
  'my-automation-partner.pages.dev/api/',   // D1 inbox API
  'n8n.myautomationpartner.com/webhook/',   // n8n webhooks
  'app.metricool.com/api/',                 // Metricool
];

// ─── Install: cache the app shell ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(APP_SHELL).catch((err) => {
        // Don't fail install if a single asset 404s (e.g. font CDN offline)
        console.warn('[SW] Shell pre-cache partial failure:', err.message);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: purge old cache versions ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: routing logic ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Skip non-GET and browser-extension requests
  if (request.method !== 'GET' || !url.startsWith('http')) return;

  // Network-first for live API data
  const isApiCall = NETWORK_FIRST_PATTERNS.some((p) => url.includes(p));
  if (isApiCall) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Cache-first for app shell
  event.respondWith(cacheFirst(request, SHELL_CACHE));
});

// ─── Strategy: Cache First (with background revalidation) ────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Revalidate in background so next load is fresh
    fetch(request).then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
    }).catch(() => {});
    return cached;
  }
  // Not in cache — go to network
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Offline and no cache — return the cached index.html as fallback
    return cache.match('/index.html');
  }
}

// ─── Strategy: Network First (with cache fallback) ───────────────────────────
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Return empty JSON for API calls when fully offline
    return new Response(JSON.stringify({ offline: true, messages: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ─── Push Notifications (Phase 2+) ───────────────────────────────────────────
// When Firebase Messaging can't find a running page, it delegates to
// this service worker to display the notification.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'New message', body: event.data.text() }; }

  const title   = data.notification?.title ?? data.title ?? 'Dancescapes Portal';
  const options = {
    body:  data.notification?.body  ?? data.body  ?? 'You have a new message.',
    icon:  '/assets/icon.png',
    badge: '/assets/icon.png',
    data:  { url: data.data?.url ?? '/' },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click → open/focus the app ─────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
