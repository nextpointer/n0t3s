/* N0T3S service worker — offline shell + runtime cache.
 *
 * Guarantees:
 * - Never reads or writes IndexedDB; user data lives only in the app
 *   itself. This worker only touches the Cache API for the app shell.
 * - Never caches non-GET traffic (deletes, saves, anything destructive)
 *   and never intercepts /api/* (the AI proxy et al. go straight to the
 *   network, unmodified).
 * - Navigations are network-first, so an online user always receives the
 *   newest build; caches are only a fallback for offline reads.
 * - New deploys install in the background; activation purges every cache
 *   version but its own, so no stale build survives past a soft update.
 *
 * Bump VERSION whenever the static build's output changes (every deploy).
 */
const VERSION = "v1";
const PRECACHE = `n0t3s-precache-${VERSION}`;
const RUNTIME = `n0t3s-runtime-${VERSION}`;

/** App-shell URLs stored at install, kept warm for the cold-offline start. */
const PRECACHE_URLS = [
  "/",
  "/help",
  "/offline",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // Per-URL adds (not addAll) so one missing asset can never
      // fail the whole installation.
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      // The new worker waits offstage until the running one is done;
      // the page decides when to load it (SKIP_WAITING below).
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PRECACHE, RUNTIME];
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("n0t3s-") && !keep.includes(name))
          .map((name) => caches.delete(name)),
      );
      // Take control of already-open pages so later navigations from
      // them (including the reload the user confirms) use this worker.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  // The page sends this only after the user explicitly accepts the
  // "update available" toast — never automatic.
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only same-origin GETs participate. POST/DELETE/PATCH (and range
  // requests) fall straight through to the network, untouched.
  if (url.origin !== self.location.origin) return;
  if (request.method !== "GET") return;
  if (request.headers.has("range")) return;
  // API traffic (AI proxy etc.) is never served from cache.
  if (url.pathname.startsWith("/api/")) return;

  // Static Next assets are content-hashed and immutable: cache-first,
  // forever, within a cache version.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(RUNTIME);
          cache.put(request, fresh.clone());
        }
        return fresh;
      })(),
    );
    return;
  }

  // Everything else — navigations, RSC payloads, icons — is
  // network-first with a cache fallback, so an online user is always
  // current and an offline one gets whatever was fetched before.
  event.respondWith(
    (async () => {
      let cached;
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok && fresh.type === "basic") {
          const cache = await caches.open(RUNTIME);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        // Offline: cached copy if this exact URL was seen before;
        // navigations fall back to the offline page.
        cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          return (await caches.match("/offline")) || Response.error();
        }
        return Response.error();
      }
    })(),
  );
});
