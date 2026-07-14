/* Bottlehero static cache — version replaced at deploy sync time. */
const CACHE_VERSION = '__BOTTLEHERO_CACHE_VERSION__';
const CACHE_NAME = `bottlehero-static-${CACHE_VERSION}`;

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isShellRequest(url) {
  return url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('/sw.js') || url.pathname.endsWith('/src/settings.json');
}

function isCacheableAsset(request, url) {
  if (request.method !== 'GET') {
    return false;
  }
  if (isApiRequest(url) || isShellRequest(url)) {
    return false;
  }
  return url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/src/')
    || /\.(js|wasm|css|png|jpe?g|mp3|m4a|ico|bin|json)$/i.test(url.pathname);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('bottlehero-static-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  if (isApiRequest(url)) {
    return;
  }
  if (isShellRequest(url)) {
    event.respondWith(fetch(event.request));
    return;
  }
  if (!isCacheableAsset(event.request, url)) {
    return;
  }
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) {
        return cached;
      }
      const response = await fetch(event.request);
      if (response.ok) {
        cache.put(event.request, response.clone());
      }
      return response;
    }),
  );
});
