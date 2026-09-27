/**
 * Content-Security-Policy for the site.
 *
 * Every origin below is one the browser actually loads from, found by reading
 * the code (see docs/compliance/COMPLIANCE_AUDIT.md, "CSP inventory"):
 *
 *   Supabase      — auth/data calls from the browser, public storage images/video
 *   Razorpay      — checkout.js, the payment iframe, its API and telemetry
 *                   (checkout / api / lumberjack / cdn .razorpay.com)
 *   Google Analytics 4, Meta Pixel — only after cookie consent
 *   YouTube (nocookie) / Vimeo    — embedded videos
 *   vercel.live   — the preview-deployment toolbar, previews only
 *
 * Two headers are produced:
 *
 *   • Content-Security-Policy — always enforced. Only directives that cannot
 *     break a legitimate third party: no plugins, no <base> hijacking, no
 *     framing by other sites, and HTTPS upgrades.
 *   • The full allowlist policy — sent as Content-Security-Policy-Report-Only
 *     by default, or merged into the enforced header when CSP_ENFORCE=true.
 *     Report-only first because the payment popup cannot be exercised from a
 *     test environment; violations are reported to /api/csp-report, and once
 *     production shows none the switch is one environment variable.
 *
 * `script-src` keeps 'unsafe-inline' because Next.js inlines its bootstrap
 * scripts and the consent-gated analytics loaders are inline. Moving to a
 * nonce ('strict-dynamic') is possible but forces every page to render
 * dynamically; that trade-off is recorded in the audit, not made here.
 */

export type CspOptions = {
  supabaseUrl?: string | null;
  /** Vercel preview deployments load the vercel.live toolbar. */
  isPreview?: boolean;
  /** `'none'` everywhere except the homepage, which the admin studio frames. */
  frameAncestors: "'none'" | "'self'";
  reportUri?: string;
};

const RAZORPAY = "https://*.razorpay.com";
const GA = ["https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.analytics.google.com"];
const META_SCRIPT = "https://connect.facebook.net";
const META_BEACON = "https://www.facebook.com";
const VIDEO_FRAMES = ["https://www.youtube-nocookie.com", "https://www.youtube.com", "https://player.vimeo.com"];
const VERCEL_LIVE = "https://vercel.live";

function supabaseOrigins(url?: string | null) {
  if (!url) return { https: [] as string[], wss: [] as string[] };
  try {
    const { host, protocol } = new URL(url);
    if (protocol !== "https:" && !host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
      return { https: [] as string[], wss: [] as string[] };
    }
    return { https: [`${protocol}//${host}`], wss: [`${protocol === "https:" ? "wss" : "ws"}://${host}`] };
  } catch {
    return { https: [] as string[], wss: [] as string[] };
  }
}

function serialize(directives: Record<string, string[]>) {
  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

/** Always-enforced directives. Safe for every page and every third party. */
export function buildBaselineDirectives(options: Pick<CspOptions, "frameAncestors">): Record<string, string[]> {
  return {
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "frame-ancestors": [options.frameAncestors],
    "upgrade-insecure-requests": [],
  };
}

/** The full allowlist policy. */
export function buildFullDirectives(options: CspOptions): Record<string, string[]> {
  const supabase = supabaseOrigins(options.supabaseUrl);
  const preview = options.isPreview ? [VERCEL_LIVE] : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", RAZORPAY, GA[0], META_SCRIPT, ...preview],
    "style-src": ["'self'", "'unsafe-inline'"],
    // Admin-managed banners, gallery images and reel thumbnails can live on
    // any HTTPS host; images cannot execute, so https: is the pragmatic bound.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...supabase.https, ...supabase.wss, RAZORPAY, ...GA, META_BEACON, ...preview],
    "media-src": ["'self'", "blob:", ...supabase.https],
    "frame-src": ["'self'", RAZORPAY, ...VIDEO_FRAMES, ...preview],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "form-action": ["'self'", RAZORPAY],
    ...buildBaselineDirectives(options),
  };
  if (options.reportUri) directives["report-uri"] = [options.reportUri];
  return directives;
}

export type CspHeader = { key: string; value: string };

/** The CSP headers for one route group. */
export function buildCspHeaders(options: CspOptions & { enforce: boolean }): CspHeader[] {
  const full = serialize(buildFullDirectives(options));
  if (options.enforce) {
    return [{ key: "Content-Security-Policy", value: full }];
  }
  return [
    { key: "Content-Security-Policy", value: serialize(buildBaselineDirectives(options)) },
    { key: "Content-Security-Policy-Report-Only", value: full },
  ];
}

/** Reads the deployment's settings from the environment. */
export function cspOptionsFromEnv(env: Record<string, string | undefined> = process.env) {
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    isPreview: env.VERCEL_ENV === "preview",
    enforce: env.CSP_ENFORCE === "true",
    reportUri: "/api/csp-report",
  };
}
