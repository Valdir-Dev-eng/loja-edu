const STATIC_CACHE = "sorofarma-static-v1";
const IMAGE_CACHE = "sorofarma-images-v1";

// So os dois casos abaixo passam pelo Service Worker. Tudo o resto (HTML,
// /api/*, /auth/*) vai direto pra rede — cachear isso quebraria o gate de
// sessao (Cache Components/PPR) e o estado do carrinho/checkout.
function isImmutableStaticAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
}

function isImageRequest(request, url) {
  if (request.destination === "image") return true;
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/image");
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, IMAGE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isImmutableStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isImageRequest(request, url)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached ?? networkFetch;
}
