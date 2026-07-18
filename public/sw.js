const CACHE_NAME = "digiconnect-static-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/logo-navbar.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-icon-512.png",
];

const PRIVATE_PATH_PREFIXES = [
  "/api/",
  "/admin",
  "/agent",
  "/ap",
  "/customer",
  "/customer-auth-v2",
  "/dashboard",
  "/login",
  "/signup",
  "/reset-password",
  "/forgot-password",
  "/auth/",
  "/invoice/",
  "/insurance-quotation/",
  "/pay/",
  "/apply",
  "/print",
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

function isStaticAsset(request, url) {
  if (url.pathname.startsWith("/_next/static/")) {
    return true;
  }

  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/images/")) {
    return true;
  }

  return ["image", "font", "style", "script"].includes(request.destination);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (!isSameOrigin(url) || isPrivatePath(url.pathname)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (!isStaticAsset(request, url)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          void cache.put(request, responseToCache);
        });

        return response;
      });
    }),
  );
});
