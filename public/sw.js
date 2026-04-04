const CACHE_NAME = 'bowser-shell-v2';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only cache-first for same-origin shell assets
  if (url.origin === self.location.origin && (url.pathname === '/' || url.pathname === '/index.html' || url.pathname.endsWith('.png'))) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
