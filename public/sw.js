/* Sautika service worker.
 *
 * Goal: a learner on a weak or metered connection can reopen the pages and
 * lessons they have already visited. Nothing private is cached: API responses
 * and the Clerk callback never touch a cache.
 */

const VERSION = 'sautika-v2';
const PAGES_CACHE = `${VERSION}-pages`;
const ASSETS_CACHE = `${VERSION}-assets`;
const SHELL_CACHE = `${VERSION}-shell`;

const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest', '/icons/icon-192.png'];

const MAX_PAGES = 40;
const MAX_ASSETS = 300;

const ASSET_EXTENSIONS = /\.(?:css|js|woff2?|ttf|otf|eot|png|jpe?g|gif|webp|avif|svg|ico)$/i;

/** Keeps a cache from growing without limit, dropping the oldest entries first. */
async function trim(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

function isCacheable(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/')) return false;
  if (url.pathname.startsWith('/sso-callback')) return false;
  return true;
}

function isAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/') ||
    ASSET_EXTENSIONS.test(url.pathname)
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => !name.startsWith(VERSION)).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  // Shared phones: wipe the previous learner's pages when they sign out.
  if (event.data === 'sautika:clear-pages') {
    event.waitUntil(caches.delete(PAGES_CACHE));
  }
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(PAGES_CACHE);
      await cache.put(request, response.clone());
      void trim(PAGES_CACHE, MAX_PAGES);
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response('You are offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function handleAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(ASSETS_CACHE);
    await cache.put(request, response.clone());
    void trim(ASSETS_CACHE, MAX_ASSETS);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isCacheable(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isAsset(url)) {
    event.respondWith(handleAsset(request));
  }
});
