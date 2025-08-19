// service-worker.js — Conteo Cklass
// Estrategias:
//  - Precarga SOLO el shell (index/manifest/íconos)
//  - NUNCA precachea el CSV del catálogo
//  - Para el catálogo en Firebase Storage => network-first (y copia en cache por si te quedas sin red)

const CACHE = 'cklass-conteo-v3'; // <- cambia la versión cuando despliegues para forzar actualización
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Agrega aquí tus JS/CSS locales si existen, por ejemplo:
  // './app.js',
  // './styles.css',
];

// Detecta URLs de Firebase Storage que apunten a la carpeta del catálogo (static/)
function isFirebaseCatalogUrl(url) {
  try {
    const u = new URL(url);
    const isFB = u.hostname.includes('firebasestorage.googleapis.com');
    // El path de Storage suele verse como: /v0/b/<bucket>/o/<ruta_urlencoded>?...
    // Buscamos que la ruta (decodificada) contenga /o/static/
    const decodedPath = decodeURIComponent(u.pathname);
    const isStaticFolder = decodedPath.includes('/o/static/');
    return isFB && isStaticFolder;
  } catch {
    return false;
  }
}

// ===== Install: precache del shell =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ===== Activate: limpia caches viejas =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ===== Fetch: rutas de caché =====
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo manejamos GET
  if (request.method !== 'GET') return;

  // 1) Catálogo en Firebase Storage (carpeta static/) => NETWORK-FIRST
  if (isFirebaseCatalogUrl(request.url)) {
    event.respondWith(
      fetch(request)
        .then((netResp) => {
          // Guarda copia para uso offline si luego no hay red
          const clone = netResp.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return netResp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 2) Shell y otros recursos locales => CACHE-FIRST
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// Permite forzar actualización del SW desde la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
