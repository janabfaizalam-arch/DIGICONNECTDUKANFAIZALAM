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

/** Never intercept or cache these paths (auth, APIs, HTML that must stay fresh). */
const PRIVATE_PATH_PREFIXES = [
  "/api/",
  "/admin",
  "/agent",
  "/customer",
  "/customer-auth",
  "/customer-auth-v2",
  "/dashboard",
  "/login",
  "/signup",
  "/reset-password",
  "/forgot-password",
  "/auth/",
  "/invoice/",
  "/insurance-quotation/",
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

/** Icons/images/fonts only — never permanently cache /_next/static JS (stale auth bundles). */
function isCacheableStaticAsset(request, url) {
  if (url.pathname.startsWith("/_next/static/")) {
    return false;
  }

  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/images/")) {
    return true;
  }

  return ["image", "font"].includes(request.destination);
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

  // Never intercept non-GET (POST OTP/auth) — let the network handle it.
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (!isSameOrigin(url) || isPrivatePath(url.pathname)) {
    return;
  }

  // Navigations: network-only with offline fallback (no HTML cache).
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Next.js hashed bundles: network-first so deploys pick up new auth JS immediately.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match(request)),
    );
    return;
  }

  if (!isCacheableStaticAsset(request, url)) {
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
