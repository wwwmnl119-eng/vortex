const CACHE_NAME = "vortex-tg-theme-v2-channelfix";
const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/ui.js",
  "/mobile",
  "/mobile/index.html",
  "/mobile/style.css?v=channelfix2",
  "/mobile/app.js?v=channelfix2",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  const isDynamicFrontend =
    url.pathname === "/mobile" ||
    url.pathname === "/mobile/" ||
    url.pathname === "/mobile/index.html" ||
    url.pathname.endsWith("/mobile/style.css") ||
    url.pathname.endsWith("/mobile/app.js") ||
    url.searchParams.has("v");

  if (isDynamicFrontend) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
