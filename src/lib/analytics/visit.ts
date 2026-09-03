/**
 * What a visit is, before any database is involved.
 *
 * Every decision here is about keeping two things true at once: the admin
 * panel should answer "how many people, from where, looking at what", and the
 * site should hold nothing that could identify the person who looked.
 *
 * So: no IP address is ever stored, no cookie is set, and the visitor id is a
 * hash that changes every day. It is enough to count the same person twice in
 * an afternoon and not enough to follow them into next week.
 */

import { createHash } from "crypto";

export type VisitSource =
  | "direct"
  | "google"
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "youtube"
  | "linkedin"
  | "x"
  | "telegram"
  | "email"
  | "other";

export type VisitDevice = "phone" | "tablet" | "desktop";

/** How a visitor arrived, in words a shop owner can act on. */
export function classifySource(referrer: string | null | undefined, utmSource?: string | null): VisitSource {
  const utm = String(utmSource ?? "").trim().toLowerCase();
  if (utm) {
    const fromUtm = matchKnownSource(utm);
    if (fromUtm) return fromUtm;
    return "other";
  }

  const host = referrerHost(referrer);
  if (!host) return "direct";

  return matchKnownSource(host) ?? "other";
}

function matchKnownSource(value: string): VisitSource | null {
  if (/(^|\.)google\.|googleusercontent|^google$/.test(value)) return "google";
  // WhatsApp forwards land as a link from the app itself, which is how most
  // of this shop's traffic arrives.
  if (/whatsapp|^wa$/.test(value)) return "whatsapp";
  if (/facebook|fb\.com|^fb$|m\.facebook/.test(value)) return "facebook";
  if (/instagram|^ig$/.test(value)) return "instagram";
  if (/youtube|youtu\.be|^yt$/.test(value)) return "youtube";
  if (/linkedin|lnkd\.in/.test(value)) return "linkedin";
  if (/twitter|^x\.com$|\.x\.com$|^x$/.test(value)) return "x";
  if (/telegram|^t\.me$/.test(value)) return "telegram";
  if (/mail|email|newsletter/.test(value)) return "email";
  return null;
}

/** The bare host of a referring page, or null when there is not one. */
export function referrerHost(referrer: string | null | undefined): string | null {
  const raw = String(referrer ?? "").trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Whether the referrer is this site itself.
 *
 * A visitor moving between pages is not a new arrival, and counting it as one
 * would make every source look like "direct" once somebody clicked twice.
 */
export function isSelfReferral(referrer: string | null | undefined, siteHost: string): boolean {
  const host = referrerHost(referrer);
  if (!host) return false;
  const bare = siteHost.toLowerCase().replace(/^www\./, "");
  return host === bare;
}

/** Phone, tablet or desktop — the only distinction worth acting on. */
export function deviceFromUserAgent(userAgent: string | null | undefined): VisitDevice {
  const ua = String(userAgent ?? "").toLowerCase();
  if (!ua) return "desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|windows phone/.test(ua)) return "phone";
  return "desktop";
}

/**
 * Crawlers, previewers and uptime checks.
 *
 * Left in, they would put "0 seconds, one page, from the United States" into
 * a shop owner's dashboard every few minutes and make the numbers useless.
 */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  const ua = String(userAgent ?? "").toLowerCase();
  if (!ua) return true;
  return /bot|crawler|spider|crawling|slurp|preview|monitor|curl|wget|python-requests|axios|headless|lighthouse|pingdom|uptime|facebookexternalhit|whatsapp|telegrambot|vercel-screenshot|node-fetch/.test(
    ua,
  );
}

/**
 * The page, without anything personal hanging off it.
 *
 * Query strings carry tracking codes, tokens, and sometimes a mobile number a
 * customer was looking up. The path alone answers "which page", which is the
 * question being asked.
 */
export function normalisePath(input: string | null | undefined): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  let path = raw;
  try {
    // Accept a full URL or a bare path.
    path = raw.startsWith("http") ? new URL(raw).pathname : raw.split("?")[0].split("#")[0];
  } catch {
    path = raw.split("?")[0].split("#")[0];
  }

  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/+$/, "") || "/";
  if (path.length > 300) path = path.slice(0, 300);
  return path;
}

/** Paths that are machinery rather than pages somebody chose to look at. */
export function isTrackablePath(path: string): boolean {
  return !/^\/(api|_next|favicon|robots|sitemap|manifest|sw\.js|icons?\/)/.test(path);
}

/**
 * A visitor id that expires at midnight.
 *
 * Built from things we never keep — the IP and the user agent — plus the day
 * and a server secret. It lets the panel say "42 people, 96 page views"
 * without the row it came from being traceable to anybody, and it cannot be
 * joined across days even by us.
 */
export function dailyVisitorHash(input: {
  ip: string | null | undefined;
  userAgent: string | null | undefined;
  day: string;
  salt: string;
}): string {
  const material = [input.salt, input.day, String(input.ip ?? ""), String(input.userAgent ?? "")].join("|");
  return createHash("sha256").update(material).digest("hex").slice(0, 32);
}

/** UTC date, the way the table stores a day. */
export function utcDay(when: Date = new Date()): string {
  return when.toISOString().slice(0, 10);
}

export const SOURCE_LABELS: Record<VisitSource, string> = {
  direct: "Direct / typed",
  google: "Google",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  telegram: "Telegram",
  email: "Email",
  other: "Other sites",
};

export const DEVICE_LABELS: Record<VisitDevice, string> = {
  phone: "Phone",
  tablet: "Tablet",
  desktop: "Computer",
};
