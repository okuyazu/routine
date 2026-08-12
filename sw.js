// Service worker.
// - App shell: stale-while-revalidate — loads instantly from cache, then
//   refreshes in the background so new versions appear on the next open
//   (no more getting stuck on an old cached build).
// - Data files: network-first, so edits from Claude/ChatGPT show up right away.
const VERSION = 'v18';
const SHELL = `benchmarks-shell-${VERSION}`;
const DATA = `benchmarks-data-${VERSION}`;

const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './finance/',
  './finance/index.html',
  './finance/styles.css',
  './finance/app.js',
  './finance/manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL && k !== DATA).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Serve from cache immediately, update the cache from the network in the
// background, and fall back to the app shell when offline.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || cache.match('./index.html');
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // Data & note files: network-first, fall back to cache (so you can view offline).
  if (url.pathname.includes('/data/') || url.pathname.includes('/projects/') || url.pathname.includes('/inbox/') || url.pathname.includes('/money/')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(DATA).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(staleWhileRevalidate(e.request));
});
