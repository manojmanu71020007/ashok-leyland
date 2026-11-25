// Service Worker for Ashok Leyland Bus Management System PWA
const CACHE_NAME = 'ashok-leyland-pwa-v15';
const STATIC_ICON_URLS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ICON_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.map((name) => caches.delete(name)))
    ).then(() => self.clients.claim()).then(() =>
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          try {
            client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
          } catch (_) {}
        });
      })
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Always hit network without cache for APIs, SSE streams, HTML, JS, CSS, JSON, and Expo bundles
  const isDynamicOrCode =
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_expo/') ||
    url.pathname === '/' ||
    /\.(html|js|css|json)$/i.test(url.pathname) ||
    request.mode === 'navigate';

  if (isDynamicOrCode) {
    event.respondWith(
      fetch(new Request(request, { cache: 'no-store' })).catch(() => fetch(request))
    );
    return;
  }

  // Static media/icons: network-first with cache fallback for offline resilience
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
