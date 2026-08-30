/**
 * Service Worker for Pulse Wellness Tracker
 * Enables offline access and caches static assets
 */
const CACHE_NAME = 'pulse-v1';
const PRECACHE = [
  '/',
  '/wellness-tracker.html',
  '/js/pulse.min.js',
  '/js/pulse.js',
  '/js/chart.umd.min.js',
  '/manifest.json'
];

// Install: pre-cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for same-origin, network-first for external
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for API calls and external resources
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache CDN resources
          if (response.ok && (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('cdn.jsdelivr.net'))) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for local assets
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => {
        // Fallback to index for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/wellness-tracker.html');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});
