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
    One page per service, at the slug customers actually reach.

    Two services shipped as two rows each, and in both cases the redesigned
    page was built on one slug while some links pointed at the other:

      • CM YUVA — `cm-yuva-loan` is the row an administrator created and the
        one the services directory links to; `cm-yuva-entrepreneur-loan-
        assistance` is what the navigation menu, the DGCNT5K coupon and the
        search synonyms still point at.

      • DPR — `detailed-project-report` is the published row, the one with the
        dedicated page and the thirteen configured application questions;
        `dpr-report` is an older duplicate whose `status` was never set, so it
        is missing from every listing yet still resolves if somebody has the
        link. Anyone reaching the application through it was asked the six
        shared questions and none of the thirteen.

    Both old slugs now redirect permanently to the live one — the service page
    and the application alike, since a stale link is as likely to point at the
    form as at the page.
  */
  async redirects() {
    return [
      {
        source: "/services/cm-yuva-entrepreneur-loan-assistance",
        destination: "/services/cm-yuva-loan",
        permanent: true,
      },
      {
        source: "/services/dpr-report",
        destination: "/services/detailed-project-report",
        permanent: true,
      },
      {
        source: "/apply/dpr-report",
        destination: "/apply/detailed-project-report",
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
