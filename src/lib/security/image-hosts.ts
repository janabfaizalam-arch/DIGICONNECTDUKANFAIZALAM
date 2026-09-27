/**
 * Which remote images the Next.js image optimiser (`/_next/image`) may fetch.
 *
 * `hostname: "**"` made the optimiser an open proxy: anyone could ask this
 * server to download, resize and re-serve an image from any host, spending our
 * bandwidth and compute and lending our domain to whatever it fetched. Only
 * hosts the site genuinely serves images from are listed now.
 *
 * Images from anywhere else (an admin pasting a link to some other site) still
 * display: `SafeImage` marks them `unoptimized`, so the visitor's browser loads
 * them directly instead of our server fetching them.
 */

export type RemoteImagePattern = {
  protocol: "https";
  hostname: string;
  pathname?: string;
};

const STATIC_HOSTS: RemoteImagePattern[] = [
  { protocol: "https", hostname: "images.unsplash.com" },
  { protocol: "https", hostname: "i.ytimg.com" },
  { protocol: "https", hostname: "img.youtube.com" },
  // Google account avatars on the customer dashboard.
  { protocol: "https", hostname: "lh3.googleusercontent.com" },
  { protocol: "https", hostname: "rnos.in" },
  { protocol: "https", hostname: "www.rnos.in" },
];

export function remoteImagePatterns(supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): RemoteImagePattern[] {
  const patterns = [...STATIC_HOSTS];
  if (supabaseUrl) {
    try {
      const { hostname, protocol } = new URL(supabaseUrl);
      if (protocol === "https:") {
        // Public buckets only: private buckets are never served by URL.
        patterns.unshift({ protocol: "https", hostname, pathname: "/storage/v1/object/public/**" });
      }
    } catch {
      // A malformed URL simply adds nothing.
    }
  }
  return patterns;
}

function globToRegExp(glob: string) {
  const escaped = glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*")}$`);
}

/** Whether `src` will be accepted by the optimiser (local paths always are). */
export function isOptimizableImage(src: unknown, patterns: RemoteImagePattern[] = remoteImagePatterns()): boolean {
  if (typeof src !== "string" || !src) return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return patterns.some(
    (p) => globToRegExp(p.hostname).test(url.hostname) && (!p.pathname || globToRegExp(p.pathname).test(url.pathname)),
  );
}
