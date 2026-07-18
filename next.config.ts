import type { NextConfig } from "next";

// Evidence-based CSP covering every external resource found in the codebase:
// - Razorpay checkout (script + iframe + API + telemetry)
// - Google Analytics (gtag loader + collection)
// - Meta Pixel (fbevents.js + pixel image/track endpoints)
// - Supabase (REST + realtime websockets + storage images)
// - Google Fonts stylesheet used by the AP services share view
// Deployed as REPORT-ONLY first: violations surface in the browser console
// (and any configured reporting endpoint) without breaking checkout, auth,
// analytics, or the service worker. Promote to enforcing
// Content-Security-Policy only after production console review.
const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  // 'unsafe-inline' is required by Next.js inline runtime scripts and the GA/Pixel bootstraps.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Admin-managed content (slides, service banners, logos) may reference
  // arbitrary HTTPS hosts, so img-src stays broad; next/image remotePatterns
  // below restricts which hosts get optimized/proxied.
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://lumberjack.razorpay.com https://checkout.razorpay.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net https://bifrost.unifers.ai",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none';",
  },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: contentSecurityPolicyReportOnly,
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Restricted from the previous wildcard ("**"). Every allowed host is
    // evidenced in the codebase or database content:
    // - Supabase storage: admin uploads (slides, service heroes, documents previews)
    // - unsplash: V5 seed banners + homepage trending imagery
    // - digiconnectdukan.com / rnos.in: brand assets referenced by CMS defaults
    // - googleusercontent / graph.facebook: OAuth avatar URLs on profiles
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "digiconnectdukan.com" },
      { protocol: "https", hostname: "www.digiconnectdukan.com" },
      { protocol: "https", hostname: "rnos.in" },
      { protocol: "https", hostname: "www.rnos.in" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "graph.facebook.com" },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
