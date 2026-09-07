const CACHE_VERSION = "astral-tarot-v21-qimen-ai-readable-20260907";
const CORE_CACHE = `${CACHE_VERSION}-core`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const CORE_ASSETS = [
  "./",
  "./tarot.html",
  "./emil-redesign.css?v=20260907-qimen-ai-readable",
  "./tarot-bg.png",
  "./manifest.webmanifest",
  "./assets/icons/tarot-icon.svg",
  "./assets/icons/tarot-icon-192.png",
  "./assets/icons/tarot-icon-512.png",
  "./assets/icons/tarot-maskable-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./vendor/three/three.module.min.js",
  "./scripts/meihua-display.mjs",
  "./scripts/meihua-insight.mjs",
  "./scripts/qimen-insight.mjs",
  "./scripts/bazhai-insight.mjs",
  "./scripts/zhouyi-text.mjs",
  "./books/meihua-yishu-wikisource/meihua-numeric-cast/scripts/meihua.mjs"
];

const majorCards = Array.from({ length: 22 }, (_, i) => `ar${String(i).padStart(2, "0")}.jpg`);
const suits = ["wa", "cu", "sw", "pe"];
const ranks = ["ac", "02", "03", "04", "05", "06", "07", "08", "09", "10", "pa", "kn", "qu", "ki"];
const CARD_ASSETS = [
  ...majorCards,
  ...suits.flatMap((suit) => ranks.map((rank) => `${suit}${rank}.jpg`))
].map((file) => `./assets/cards/${file}`);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([CORE_CACHE, ASSET_CACHE]);
    await Promise.all((await caches.keys()).filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CORE_CACHE);
  try {
    // Bypass the browser HTTP cache for navigations so an installed PWA can
    // discover a freshly deployed HTML shell on the next open.
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match("./tarot.html"));
  }
}

async function cacheFirst(request) {
  // Core modules/styles live in CORE_CACHE; card images live in ASSET_CACHE.
  // Check both so an offline reload can execute the app shell, not just draw cards.
  const coreCache = await caches.open(CORE_CACHE);
  const coreCached = (await coreCache.match(request)) || (await coreCache.match(request, { ignoreSearch: true }));
  if (coreCached) return coreCached;
  const cache = await caches.open(ASSET_CACHE);
  const cached = (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(cacheFirst(event.request));
});

async function broadcast(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ ...message, version: CACHE_VERSION }));
}

async function cardCacheStatus() {
  const cache = await caches.open(ASSET_CACHE);
  const matches = await Promise.all(CARD_ASSETS.map((url) => cache.match(url)));
  return { completed: matches.filter(Boolean).length, total: CARD_ASSETS.length };
}

let warmPromise = null;
function warmCardCache() {
  if (warmPromise) return warmPromise;
  warmPromise = (async () => {
    const cache = await caches.open(ASSET_CACHE);
    const cached = await Promise.all(CARD_ASSETS.map((url) => cache.match(url)));
    let completed = cached.filter(Boolean).length;
    let failed = 0;
    await broadcast({ type: "CARD_CACHE_PROGRESS", completed, total: CARD_ASSETS.length, failed });
    await Promise.all(CARD_ASSETS.map(async (url, index) => {
      if (cached[index]) return;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
        await cache.put(url, response);
      } catch {
        failed++;
      } finally {
        completed++;
        if (completed === CARD_ASSETS.length || completed % 6 === 0) {
          await broadcast({ type: "CARD_CACHE_PROGRESS", completed, total: CARD_ASSETS.length, failed });
        }
      }
    }));
    await broadcast({ type: "CARD_CACHE_READY", total: CARD_ASSETS.length, failed });
  })().finally(() => { warmPromise = null; });
  return warmPromise;
}

self.addEventListener("message", (event) => {
  const type = event.data?.type;
  if (type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (type === "GET_CACHE_STATUS") {
    event.waitUntil(cardCacheStatus().then((status) => broadcast({ type: "CARD_CACHE_STATUS", ...status })));
    return;
  }
  if (type === "WARM_CARD_CACHE") event.waitUntil(warmCardCache());
});
