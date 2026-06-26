const CACHE_NAME = "farmrise-pwa-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.png"
];

// Install Service Worker and cache essential static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[FarmRise SW] Caching app shell static assets...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate & release stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[FarmRise SW] Clearing stale cache key:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Resilient Network-First fetch handler with fallback to Cache for offline experience
self.addEventListener("fetch", (event) => {
  const req = event.request;
  
  // Skip external Firestore web streams API, analytics, third-party CDNs if we block caching for them
  if (
    req.url.includes("firestore.googleapis.com") || 
    req.url.includes("appwrite") ||
    req.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        // Cache newly fetched valid static assets
        if (
          networkRes.status === 200 && 
          (req.url.includes(".js") || req.url.includes(".css") || req.url.includes(".png") || req.url.includes(".svg"))
        ) {
          const cacheCopy = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, cacheCopy);
          });
        }
        return networkRes;
      })
      .catch(() => {
        // Fallback to cache when network is disrupted / offline
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) {
            return cachedRes;
          }
          // If accessing secondary SPA routes, serve the root index.html from cache
          if (req.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      })
  );
});

// Interactive background notifications listener for custom push events
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});
