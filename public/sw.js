// Minimal service worker: enables installability. Intentionally caches nothing,
// so authenticated pages are never stored on the device.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
