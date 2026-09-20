/**
 * Service worker for an eight-hour event on a saturated venue wifi.
 *
 * Strategy by kind of request:
 *   - navigation (the HTML): network first with a short timeout, cached shell as fallback
 *   - hashed build assets, stickers, fonts: cache first, they never change under the same URL
 *   - API and websockets: never cached here, the app has its own localStorage cache
 *
 * Bump CACHE_VERSION on every deploy so old shells are dropped.
 */

const CACHE_VERSION = "devfest-v1";
const SHELL = "/index.html";
const NAV_TIMEOUT_MS = 3500;

const PRECACHE = [SHELL, "/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/stickers/") ||
    url.pathname.startsWith("/brand/") ||
    /\.(css|js|woff2?|png|webp|svg|ico)$/.test(url.pathname)
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && request.method === "GET") {
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstShell(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NAV_TIMEOUT_MS);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) cache.put(SHELL, response.clone());
    return response;
  } catch {
    const cached = (await cache.match(SHELL)) || (await cache.match("/"));
    if (cached) return cached;
    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstShell(request));
    return;
  }
  if (isStatic(url)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});
