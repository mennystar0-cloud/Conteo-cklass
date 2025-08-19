// service-worker.js — Conteo Cklass (completo)
const CACHE_VERSION = 'cklass-conteo-v6'; // ← súbelo si vuelves a publicar
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // ⚠️ No precachear el CSV (lo trae el SDK con getDownloadURL + fetch)
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(PRECACHE);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
  })());
  self.clients.claim();
});

// Cache-first para el shell de la app (mismo origen)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(event.request);
      return cached || fetch(event.request);
    })());
  }
});

// Permitir forzar actualización desde la app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
