// /public/sw.js
// Cleanup script to automatically unregister any stale Service Worker left on localhost:3000
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => {
      console.log('[ServiceWorker] Stale localhost service worker unregistered successfully.');
    })
  );
});
