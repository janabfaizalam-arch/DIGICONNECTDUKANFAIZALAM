/**
 * How the marketing agents are switched on, and which platforms they may use.
 *
 * Everything here is read from the environment at call time. Posting to a
 * public account in the shop's name is not something that should happen
 * because a variable was misspelt, so the mode is fail-closed: anything other
 * than an exact `draft` or `live` means the agents do nothing at all.
 *
 *   disabled — nothing runs (the default)
 *   draft    — research, write and draw, save the blog article as a draft,
 *              post nowhere. Read the results in the admin panel first.
 *   live     — the same, then publish the article and post to every
 *              platform whose credentials are set.
 */

export type MarketingAgentsMode = "disabled" | "draft" | "live";

export function resolveMarketingAgentsMode(raw = process.env.MARKETING_AGENTS_MODE): MarketingAgentsMode {
  const value = (raw ?? "").trim().toLowerCase();
  return value === "draft" || value === "live" ? value : "disabled";
}

export type SocialPlatformId =
  | "facebook"
  | "instagram"
  | "threads"
  | "x"
  | "linkedin"
  | "telegram"
  | "pinterest";

/** Order matters: Facebook goes first because its photo gives Instagram a JPEG. */
export const PLATFORM_ORDER: SocialPlatformId[] = [
  "facebook",
  "instagram",
  "threads",
  "x",
  "linkedin",
  "telegram",
  "pinterest",
];

/** The variables each platform needs. A platform with any of them blank is skipped. */
export const PLATFORM_ENV: Record<SocialPlatformId, string[]> = {
  facebook: ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN"],
  instagram: ["INSTAGRAM_BUSINESS_ACCOUNT_ID", "META_PAGE_ACCESS_TOKEN"],
  threads: ["THREADS_USER_ID", "THREADS_ACCESS_TOKEN"],
  x: ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"],
  linkedin: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"],
  telegram: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
  pinterest: ["PINTEREST_ACCESS_TOKEN", "PINTEREST_BOARD_ID"],
};

export const PLATFORM_LABELS: Record<SocialPlatformId, string> = {
  facebook: "Facebook Page",
  instagram: "Instagram",
  threads: "Threads",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  telegram: "Telegram Channel",
  pinterest: "Pinterest",
};

export function env(name: string, source: NodeJS.ProcessEnv = process.env): string {
  return (source[name] ?? "").trim();
}

export function isPlatformConfigured(platform: SocialPlatformId, source: NodeJS.ProcessEnv = process.env) {
  return PLATFORM_ENV[platform].every((name) => env(name, source).length > 0);
}

export function configuredPlatforms(source: NodeJS.ProcessEnv = process.env): SocialPlatformId[] {
  return PLATFORM_ORDER.filter((platform) => isPlatformConfigured(platform, source));
}

/** A status list the admin screen can show without revealing any value. */
export function platformConfigStatus(source: NodeJS.ProcessEnv = process.env) {
  return PLATFORM_ORDER.map((platform) => ({
    platform,
    label: PLATFORM_LABELS[platform],
    configured: isPlatformConfigured(platform, source),
    missing: PLATFORM_ENV[platform].filter((name) => env(name, source).length === 0),
  }));
}

/**
 * Which Gemini models to use.
 *
 * Google retires model names for new projects without notice — the first
 * live run here failed because `gemini-2.5-flash` had been withdrawn. So the
 * environment can pin a model, and otherwise the newest one the API key can
 * see is chosen at run time (see `resolveModels` in llm.ts). These fallbacks
 * are only used if the model list cannot be read at all.
 */
export const FALLBACK_TEXT_MODEL = "gemini-3.8-flash";
export const FALLBACK_IMAGE_MODEL = "gemini-3.8-flash-image";

export function pinnedTextModel() {
  return env("MARKETING_AGENTS_TEXT_MODEL") || null;
}

export function pinnedImageModel() {
  return env("MARKETING_AGENTS_IMAGE_MODEL") || null;
}

function versionOf(name: string) {
  return (name.match(/^gemini-(\d+(?:\.\d+)?)-/)?.[1] ?? "0").split(".").map(Number);
}

function compareVersions(a: number[], b: number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * The newest Flash model of a kind among the names the API returned
 * (`models/gemini-3.8-flash` or bare). Stable names beat previews; a preview
 * is used only when no stable model of that kind exists.
 */
export function pickLatestModel(names: string[], kind: "text" | "image"): string | null {
  const suffix = kind === "image" ? "-flash-image" : "-flash";
  const stable = new RegExp(`^gemini-\\d+(?:\\.\\d+)?${suffix}$`);
  const preview = new RegExp(`^gemini-\\d+(?:\\.\\d+)?${suffix}-preview(?:-[\\w-]+)?$`);
  const bare = names.map((name) => name.replace(/^models\//, ""));

  for (const pattern of [stable, preview]) {
    const matches = bare.filter((name) => pattern.test(name));
    if (matches.length) {
      return matches.sort((a, b) => compareVersions(versionOf(b), versionOf(a)))[0];
    }
  }
  return null;
}

export function brandName() {
  return env("MARKETING_BRAND_NAME") || "DigiConnect Dukan";
}

/**
 * Every secret the publishers may hold, so an error message can be scrubbed
 * of them before it is stored or shown. Telegram's token sits in the URL
 * path, and some platforms echo the request back in their errors.
 */
export function secretValues(source: NodeJS.ProcessEnv = process.env): string[] {
  const names = new Set<string>(["GEMINI_API_KEY"]);
  for (const list of Object.values(PLATFORM_ENV)) {
    for (const name of list) {
      if (/TOKEN|SECRET|KEY/.test(name)) names.add(name);
    }
  }
  return [...names].map((name) => env(name, source)).filter((value) => value.length >= 8);
}

export function redact(text: string, source: NodeJS.ProcessEnv = process.env): string {
  let clean = text;
  for (const secret of secretValues(source)) clean = clean.split(secret).join("[redacted]");
  return clean
    .replace(/(access_token=)[^&\s"']+/gi, "$1[redacted]")
    .replace(/\/bot\d+:[A-Za-z0-9_-]+/g, "/bot[redacted]")
    .replace(/\bAIza[0-9A-Za-z_-]{10,}/g, "[redacted]");
}
