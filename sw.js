
const CACHE_NAME = 'pickleflow-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // In a build environment, we let Vite handle asset versioning.
  // This simple fetch handler ensures the app stays online-first.
  event.respondWith(fetch(event.request));
});
