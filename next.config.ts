import type { NextConfig } from "next";

/**
 * Nothing on this site may be put in a frame by anybody.
 *
 * The panel and the portal both carry live sessions and one-click actions, so
 * a page of ours inside somebody else's frame is a click a customer did not
 * mean to make.
 */
const noFraming = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none';",
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
];

/**
 * The homepage is the one exception, and only for us.
 *
 * The Homepage Studio shows the real front page in a frame beside the list of
 * its bands — the whole point being that you arrange the page while looking at
 * it. `'self'` permits that and nothing else: another site framing rnos.in is
 * refused exactly as before, since an attacker cannot serve a page from this
 * origin. `SAMEORIGIN` says the same thing to browsers that predate CSP.
 */
const sameOriginFraming = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self';",
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
];

const securityHeaders = [
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
    /*
      Both of these match "/", and for a repeated header key the last match is
      the one that is sent — so the blanket refusal goes first and the
      homepage's narrower rule overrides it. Written the other way round the
      studio's preview frame stays blank, which is exactly what happened.
    */
    return [
      {
        source: '/(.*)',
        headers: [...securityHeaders, ...noFraming],
      },
      {
        source: '/',
        headers: sameOriginFraming,
      },
      {
        /*
          The installer has to arrive as text, not as a download.

          A .ps1 has no registered type, so it is served as
          application/octet-stream — and PowerShell 7's Invoke-RestMethod
          hands back a byte array for that, which `| iex` cannot execute. The
          shop owner sees a type-conversion error instead of an install. On
          Windows PowerShell 5.1 it happens to work, which is exactly the kind
          of difference that makes this fail only on somebody else's counter.
        */
        source: '/print-station/install.ps1',
        headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }],
      },
    ];
  },
};

export default nextConfig;
