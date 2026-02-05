// Azular PWA Service Worker
const BUILD_ID = "2025.02.21.01"; 
const CACHE_NAME = `azular-cache-${BUILD_ID}`;

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json"
];

// Instalação: Cacheia o essencial
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação: Limpa caches de builds anteriores
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log("SW: Removendo cache antigo:", name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Estratégia diferenciada
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Navegação (HTML): Network First
  // Garante que o usuário pegue o index.html novo se houver internet
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }

  // 2. Ignorar chamadas de API e Firebase
  if (
    url.origin.includes("firestore.googleapis.com") ||
    url.origin.includes("firebase") ||
    request.method !== "GET"
  ) {
    return;
  }

  // 3. Assets Estáticos: Cache First
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((networkResponse) => {
        // Opcional: Cachear dinamicamente outros assets do mesmo domínio
        if (networkResponse.status === 200 && url.origin === location.origin) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});