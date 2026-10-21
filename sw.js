// Ashok-Leyland Bus Management System PWA Service Worker
const CACHE_NAME = 'ashok-leyland-pwa-v5';

const STATIC_ASSETS = [
    '/',
    '/login.html',
    '/login.css',
    '/login.js',
    '/i18n.js',
    '/admin.html',
    '/scheduling.html',
    '/depot-operations.html',
    '/charging.html',
    '/cleaning.html',
    '/sync-engine.js',
    '/manifest.json',
    '/splash-screen.png',
    '/pwa-app.js',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-maskable-192.png',
    '/icons/icon-maskable-512.png',
    '/icons/apple-touch-icon.png'
];

// 1. Install event: pre-cache essential core assets & activate immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                STATIC_ASSETS.map((url) =>
                    cache.add(url).catch((err) => {
                        console.warn('[PWA SW] Precache skipped for:', url, err.message);
                    })
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// 2. Activate event: clean up outdated caches & claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[PWA SW] Deleting obsolete cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch event: Network-first for dynamic data & HTML, cache-first/stale-while-revalidate for static assets
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Skip non-GET requests, Firebase authentication URLs, or SSE streams
    if (req.method !== 'GET') return;
    if (url.pathname.includes('/api/sync-events') || url.pathname.includes('/events')) return;
    if (url.origin.includes('firebase') || url.origin.includes('googleapis.com') || url.origin.includes('identitytoolkit')) return;

    // A. API and bus state requests: STRICT Network-First (real-time data priority)
    if (url.pathname.startsWith('/api/') || url.pathname.endsWith('bus_state.json') || url.pathname.endsWith('soc_logs')) {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res && res.status === 200) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    // B. HTML Pages: Network-First so updates on Render are instantly received, fallback to cache offline
    if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res && res.status === 200) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(req).then((cached) => cached || caches.match('/login.html')))
        );
        return;
    }

    // C. Static Assets (CSS, JS, Images, Icons): Stale-While-Revalidate
    event.respondWith(
        caches.match(req).then((cached) => {
            const fetchPromise = fetch(req)
                .then((networkRes) => {
                    if (networkRes && networkRes.status === 200) {
                        const copy = networkRes.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    }
                    return networkRes;
                })
                .catch(() => null);

            return cached || fetchPromise;
        })
    );
});
