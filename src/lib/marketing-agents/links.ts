import type { SocialPlatformId } from "@/lib/marketing-agents/config";

/**
 * Links and text shaping that every post shares.
 *
 * A post that brings a visitor nobody can attribute is a post nobody can
 * learn from. Every link the agents write carries UTM tags naming the
 * platform and the day's campaign, so Google Analytics and the admin
 * analytics can say which platform actually sends customers.
 */

export function trackedUrl(input: {
  siteUrl: string;
  path: string;
  platform: SocialPlatformId | "blog";
  campaign: string;
}): string {
  const url = new URL(input.path, `${input.siteUrl.replace(/\/$/, "")}/`);
  url.searchParams.set("utm_source", input.platform);
  url.searchParams.set("utm_medium", input.platform === "blog" ? "article" : "social");
  url.searchParams.set("utm_campaign", input.campaign);
  return url.toString();
}

/** `daily-2026-09-25-pan-card` — readable in an analytics report. */
export function campaignName(runDate: string, serviceSlug: string) {
  return `daily-${runDate}-${serviceSlug}`.slice(0, 90);
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Cut text to a limit on a word boundary, with an ellipsis if anything went. */
export function clampText(text: string, limit: number) {
  const clean = text.trim();
  if ([...clean].length <= limit) return clean;
  const chars = [...clean].slice(0, Math.max(0, limit - 1)).join("");
  const lastSpace = chars.lastIndexOf(" ");
  const cut = lastSpace > limit * 0.6 ? chars.slice(0, lastSpace) : chars;
  return `${cut.trimEnd()}…`;
}

export function normaliseHashtags(tags: string[], max: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(`#${tag}`);
    if (out.length >= max) break;
  }
  return out;
}

/** Character budgets per platform, including the link and hashtags. */
export const PLATFORM_LIMITS: Record<SocialPlatformId, { text: number; hashtags: number }> = {
  facebook: { text: 2000, hashtags: 5 },
  instagram: { text: 2200, hashtags: 15 },
  threads: { text: 500, hashtags: 3 },
  // X counts every link as 23 characters, whatever its length.
  x: { text: 280, hashtags: 2 },
  linkedin: { text: 3000, hashtags: 5 },
  telegram: { text: 1024, hashtags: 4 },
  pinterest: { text: 500, hashtags: 5 },
};

const X_LINK_WEIGHT = 23;

/**
 * Assemble the final text for one platform: body, then the link, then the
 * hashtags — trimming the body, never the link, when it is too long.
 */
export function composePost(input: {
  platform: SocialPlatformId;
  body: string;
  link: string | null;
  hashtags: string[];
}): string {
  const limits = PLATFORM_LIMITS[input.platform];
  const tags = normaliseHashtags(input.hashtags, limits.hashtags).join(" ");
  const linkLine = input.link ? `👉 ${input.link}` : "";
  const linkCost = input.link ? (input.platform === "x" ? X_LINK_WEIGHT + 3 : [...linkLine].length) : 0;
  const separators = (linkLine ? 2 : 0) + (tags ? 2 : 0);
  const budget = limits.text - linkCost - [...tags].length - separators;
  const body = clampText(input.body, Math.max(40, budget));
  return [body, linkLine, tags].filter(Boolean).join("\n\n");
}

/** Today's date in India, as YYYY-MM-DD — the shop's day, not the server's. */
export function indiaDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
