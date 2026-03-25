const CACHE_NAME = "vortex-tg-theme-v1";
const ASSETS = ["/","/index.html","/style.css","/ui.js","/mobile","/mobile/index.html","/mobile/style.css","/mobile/app.js","/manifest.json","/icon-192.png","/icon-512.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
