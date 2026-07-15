/* Bottlehero static cache — version replaced at deploy sync time. */
const CACHE_VERSION = '20260715102123';
const CACHE_NAME = `bottlehero-static-${CACHE_VERSION}`;

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

/** HTML / SW / settings：永远走网络，避免壳层卡住旧版。 */
function isShellRequest(url) {
  return url.pathname === '/'
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('/sw.js')
    || url.pathname.endsWith('/src/settings.json');
}

/**
 * Cocos Web 构建常复用固定文件名（如 /src/chunks/bundle.js、assets/main/index.js）。
 * 对这些内容变化但 URL 不变的脚本必须网络优先，否则手机会一直吃旧包。
 */
function isVolatileScript(url) {
  if (/\.js$/i.test(url.pathname) || /\.json$/i.test(url.pathname) || /\.wasm$/i.test(url.pathname)) {
    return true;
  }
  return url.pathname.startsWith('/src/');
}

function isCacheableMedia(request, url) {
  if (request.method !== 'GET') {
    return false;
  }
  if (isApiRequest(url) || isShellRequest(url) || isVolatileScript(url)) {
    return false;
  }
  return url.pathname.startsWith('/assets/')
    || /\.(png|jpe?g|mp3|m4a|ico|bin|css)$/i.test(url.pathname);
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  if (isApiRequest(url)) {
    return;
  }
  if (isShellRequest(url) || isVolatileScript(url)) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request)),
    );
    return;
  }
  if (!isCacheableMedia(event.request, url)) {
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
