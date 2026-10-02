/* Offline support for Vocabulario.
 * - App shell pages and the word list are precached on install.
 * - Built assets (/_next/static) are immutable: cache-first.
 * - Pages: network-first, falling back to the cached copy (query string ignored), then to the home page.
 * - /content.json: stale-while-revalidate, so studying never waits on the network.
 */
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const PRECACHE = ["/", "/study", "/sets", "/settings", "/import", "/content.json", "/manifest.webmanifest", "/icons/192"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(RUNTIME)).put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, event) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(req, { ignoreSearch: true });
  const update = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => undefined);
  if (hit) {
    event.waitUntil(update);
    return hit;
  }
  return (await update) ?? Response.error();
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(new URL(req.url).pathname in PRECACHE_SET ? SHELL : RUNTIME);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const hit = (await caches.match(req)) ?? (await caches.match(req, { ignoreSearch: true }));
    return hit ?? (await caches.match("/")) ?? Response.error();
  }
}
const PRECACHE_SET = Object.fromEntries(PRECACHE.map((p) => [p, true]));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // React Server Component payloads vary by headers; let them go to the network (Next falls back to a full load).
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(req));
  } else if (url.pathname === "/content.json") {
    event.respondWith(staleWhileRevalidate(req, event));
  } else if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
  }
});
