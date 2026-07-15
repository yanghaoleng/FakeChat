const CACHE_NAME = "chat-static-assets-20260715-v2";
const CACHE_PREFIX = "chat-static-assets-";
const CACHE_STATIC_ASSETS = "CACHE_STATIC_ASSETS";
const MAX_PARALLEL_CACHE_WRITES = 4;
const LOCAL_VISUAL_ASSET_PATTERN = /\/(?:avatars|memes|viral-assets|jojo-assets|wechat-ui|dingtalk-ui)\//;
const LOCAL_ICON_PATTERN = /\/(?:site-icon|favicon-(?:viral|jojo))\.svg$/;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== CACHE_STATIC_ASSETS || !Array.isArray(data.urls)) return;

  const replyPort = event.ports && event.ports[0];
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const urls = [...new Set(data.urls.filter(isCacheableMessageUrl))];
      const failedCount = await cacheUrls(cache, urls);
      replyPort?.postMessage({ ok: failedCount === 0 });
    } catch {
      replyPort?.postMessage({ ok: false });
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !isLocalVisualAsset(request.url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      event.waitUntil(fetchAndCache(cache, request).catch(() => undefined));
      return cached;
    }

    return fetchAndCache(cache, request);
  })());
});

function isLocalVisualAsset(requestUrl) {
  const url = new URL(requestUrl);
  if (url.origin !== self.location.origin) return false;
  return LOCAL_VISUAL_ASSET_PATTERN.test(url.pathname) || LOCAL_ICON_PATTERN.test(url.pathname);
}

function isCacheableMessageUrl(requestUrl) {
  if (typeof requestUrl !== "string") return false;
  try {
    return isLocalVisualAsset(new URL(requestUrl, self.location.origin).href);
  } catch {
    return false;
  }
}

async function cacheUrls(cache, urls) {
  let cursor = 0;
  let failedCount = 0;

  const cacheNext = async () => {
    while (cursor < urls.length) {
      const url = urls[cursor];
      cursor += 1;
      try {
        await fetchAndCache(cache, new Request(url, { credentials: "same-origin" }));
      } catch {
        failedCount += 1;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(MAX_PARALLEL_CACHE_WRITES, urls.length) }, cacheNext)
  );
  return failedCount;
}

async function fetchAndCache(cache, request) {
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}
