import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none';",
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
  /*
    One CM YUVA page, at the slug customers actually reach.

    The site carried two CM YUVA services: `cm-yuva-loan`, the row an
    administrator created and which the services directory links to, and the
    older `cm-yuva-entrepreneur-loan-assistance`, which the navigation menu,
    the DGCNT5K coupon and the search synonyms still point at. Two URLs for one
    service splits the traffic, splits the SEO, and is how the redesigned page
    ended up built on the slug nobody visits.

    The old slug now redirects permanently to the live one, so every existing
    link, bookmark and indexed result lands on the single page.
  */
  async redirects() {
    return [
      {
        source: "/services/cm-yuva-entrepreneur-loan-assistance",
        destination: "/services/cm-yuva-loan",
        permanent: true,
      },
    ];
  },
  reactStrictMode: true,
  // Keep native Argon2 out of the bundler graph for App Router server code.
  serverExternalPackages: ["argon2"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
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
