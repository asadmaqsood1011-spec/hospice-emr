// Hospice EMR service worker
// Strategy:
// - App shell: cache-first, fallback to network
// - HTML/page navigations: network-first, fallback to cache (so users get fresh data when online)
// - API: network-only (PHI must not sit in SW cache by default)
// - Static assets: stale-while-revalidate

const VERSION = "v1";
const APP_SHELL_CACHE = `hospice-emr-shell-${VERSION}`;
const STATIC_CACHE = `hospice-emr-static-${VERSION}`;
const PAGE_CACHE = `hospice-emr-pages-${VERSION}`;

const APP_SHELL = ["/", "/login", "/patients", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![APP_SHELL_CACHE, STATIC_CACHE, PAGE_CACHE].includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache auth + API endpoints (PHI must stay on server)
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/api/auth/")) return;

  // Next.js static assets: stale-while-revalidate
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // HTML navigations: network-first with cached fallback
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }
});

async function networkFirst(request, cacheName) {
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match("/patients") || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((resp) => {
      if (resp.ok) cache.put(request, resp.clone());
      return resp;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// Background sync trigger from clients
self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_OUTBOX") {
    event.source?.postMessage({ type: "SYNC_REQUESTED" });
  }
});
