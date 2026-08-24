// Minimal service worker. Its job is to exist: a browser will not offer to
// install a web app without one that handles fetch.
//
// It deliberately does NOT cache pages. Every screen on this site is
// server-rendered from live data (fixtures, availability, scores), so a
// cache-first worker would happily show last week's fixtures to someone
// standing in the gym — worse than a plain network error.
//
// ponytail: passthrough only. If offline support is ever wanted, cache the
// static /_next/static assets and the crest, and leave HTML alone.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  // Drop anything an earlier, cache-happy version of this file left behind.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
