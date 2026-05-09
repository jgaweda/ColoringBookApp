// Greedy Cookie service worker. Cache-first for static assets, network-first for the manifest.
const VERSION = "v1.0.0";
const CACHE = `gc-${VERSION}`;

const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./js/app.js",
  "./js/palette.js",
  "./js/audio.js",
  "./js/db.js",
  "./js/region-mask.js",
  "./js/canvas/canvas-view.js",
  "./js/canvas/line-art.js",
  "./js/canvas/paint.js",
  "./js/canvas/brush.js",
  "./js/canvas/stickers.js",
  "./js/canvas/undo-stack.js",
  "./js/views/home.js",
  "./js/views/picker.js",
  "./js/views/gallery.js",
  "./js/views/settings.js",
  "./js/views/parental-gate.js",
  "./data/categories.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" })));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Only handle our own origin.
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML so updates land quickly.
  if (request.mode === "navigate" || request.destination === "document") {
    e.respondWith(networkFirst(request));
    return;
  }
  // Cache-first for everything else.
  e.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    if (resp.ok && resp.type === "basic") cache.put(request, resp.clone());
    return resp;
  } catch (_) {
    return cached || new Response("Offline", { status: 504 });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const resp = await fetch(request);
    if (resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch (_) {
    const cached = await cache.match(request) || await cache.match("./index.html");
    return cached || new Response("Offline", { status: 504 });
  }
}
