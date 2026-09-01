/**
 * Where this site lives.
 *
 * Two different fallbacks were hardcoded in two different files —
 * `digiconnectdukan.com` in one and `www.rnos.in` in another — so a QR code
 * and an email could point at different domains for the same shop. One
 * answer, and it is the domain customers actually type.
 */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in").replace(/\/$/, "");
}
