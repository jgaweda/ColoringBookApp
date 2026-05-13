// Greedy Cookie service worker.
// Strategy:
//   - precache: app shell + every JS module + the catalog + icons + splashes
//   - network-first: HTML documents (so updates land quickly)
//   - cache-first: everything else, with a runtime fill for line-art assets
const VERSION = "v1.0.1";
const CACHE = `gc-${VERSION}`;
const RUNTIME_CACHE = `gc-runtime-${VERSION}`;

const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-maskable.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-32.png",
  "./js/app.js",
  "./js/palette.js",
  "./js/audio.js",
  "./js/db.js",
  "./js/region-mask.js",
  "./js/install-hint.js",
  "./js/canvas/canvas-view.js",
  "./js/canvas/line-art.js",
  "./js/canvas/brush.js",
  "./js/canvas/stickers.js",
  "./js/canvas/undo-stack.js",
  "./js/views/home.js",
  "./js/views/picker.js",
  "./js/views/gallery.js",
  "./js/views/settings.js",
  "./js/views/parental-gate.js",
  "./data/categories.json",
  "./splash/ipadpro129-portrait.png",
  "./splash/ipadpro129-landscape.png",
  "./splash/ipadpro11-portrait.png",
  "./splash/ipadpro11-landscape.png",
  "./splash/ipadair-portrait.png",
  "./splash/ipadair-landscape.png",
  "./splash/ipad-portrait.png",
  "./splash/ipad-landscape.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Resilient precache: a single missing asset must not abort install.
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        const resp = await fetch(new Request(url, { cache: "reload" }));
        if (resp.ok) await cache.put(url, resp);
      } catch (_) { /* ignore */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || request.destination === "document") {
    e.respondWith(networkFirst(request));
    return;
  }
  // Line-art assets fill the runtime cache on first use so they survive offline.
  if (url.pathname.includes("/assets/line-art/")) {
    e.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }
  e.respondWith(cacheFirst(request, CACHE));
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
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
