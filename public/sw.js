// Service worker for offline play.
//
// There is no server-rendered dynamic data anywhere in this app (no
// backend, no API routes) -- every route is static and the checkers engine
// (lib/checkers/checkersEngine.worker.ts, bundled as a native Web Worker
// module) is a static asset -- so caching is enough to make the whole app
// (including a game against the computer) work offline after the first
// successful visit to a given page/asset. Two different strategies are used
// depending on what's being requested:
//
// 1. Next.js App Router's client-side navigation issues its own internal
//    "flight" data fetches (marked with an `RSC: 1` request header), and a
//    full-page HTML navigation (`request.mode === 'navigate'`: a hard
//    load/reload, or opening the installed PWA from the home screen) is the
//    entry point for every visit. Both go NETWORK-FIRST: if we served a
//    cached copy while the network was actually available, an older
//    payload can be served with no way for the page to detect it -- for
//    flight requests this can silently break in-app navigation (a stale
//    cached flight response pointing at an outdated route tree); for
//    full-page navigations it means a fixed bug (like a layout or rendering
//    fix) stays invisible indefinitely because the stale HTML/script
//    references keep being served first, with the real fetch only warming
//    the cache "for next time". Network-first avoids both: online, we
//    always defer to the real request; offline, we fall back to whatever
//    was last cached.
// 2. Everything else -- static assets (`/_next/static/...`, the checkers
//    engine worker bundle, icons, manifest) -- is CACHE-FIRST. These URLs
//    are either content-hashed or genuinely static, so a cached copy is
//    always safe to serve immediately, and we refresh the cache in the
//    background for next time.
//
// We deliberately do NOT try to precache the hashed Next.js build chunks by
// URL: their filenames change every deploy, so a hardcoded list would go
// stale immediately. Runtime caching sidesteps that entirely -- whatever the
// browser actually requests gets cached, whatever the current build's real
// filenames are.
//
// Bump CACHE_NAME on any change to this file's caching behavior: `activate`
// deletes every cache that isn't the current name, so this is what makes a
// deployed change actually take effect for previously-installed clients
// instead of quietly reusing whatever was already on disk.
const CACHE_NAME = 'checkers-sensei-cache-v1';

self.addEventListener('install', () => {
  // Activate this version as soon as it finishes installing, without
  // waiting for old tabs using a previous service worker to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isNetworkFirstRequest(request) {
  return request.headers.get('RSC') === '1' || request.mode === 'navigate';
}

async function networkFirst(cache, request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    // Network unavailable -- fall back to the last cached response for this
    // route. Next.js appends a cache-busting `_rsc` query param that
    // changes per request, so match ignoring the search string: this app
    // has no server-varying query params (?mode=ai etc. are read
    // client-side only), so a cached entry for the same path is always a
    // valid stand-in regardless of that param.
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(cache, request, event) {
  const cached = await cache.match(request);
  if (cached) {
    // Serve immediately, and refresh the cache in the background so the
    // next visit picks up any change (stale-while-revalidate). This never
    // blocks, and never lets a failed background fetch affect the response
    // we already have.
    event.waitUntil(
      fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
        })
        .catch(() => {})
    );
    return cached;
  }

  // Not cached yet: go to the network, and cache a successful response for
  // next time (including offline visits).
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only cache GET requests, and only same-origin ones (never intercept
  // cross-origin calls -- there aren't any today, but this keeps the worker
  // safe if one is ever added).
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        isNetworkFirstRequest(request)
          ? networkFirst(cache, request)
          : cacheFirst(cache, request, event)
      )
  );
});
