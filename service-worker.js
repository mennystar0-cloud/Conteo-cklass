// service-worker.js — Conteo Cklass (validado)
const CACHE = 'cklass-conteo-v3';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

function isFirebaseCatalogUrl(url) {
  try {
    const u = new URL(url);
    const isFB = u.hostname.includes('firebasestorage.googleapis.com');
    const decoded = decodeURIComponent(u.pathname);
    // ✔️ coincide con /o/static/ del objeto catalogo-master.csv
    return isFB && decoded.includes('/o/static/');
  } catch {
    return false;
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  // ✔️ Catálogo en Storage: network-first
  if (isFirebaseCatalogUrl(request.url)) {
    e.respondWith(
      fetch(request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ✔️ Shell: cache-first
  e.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
