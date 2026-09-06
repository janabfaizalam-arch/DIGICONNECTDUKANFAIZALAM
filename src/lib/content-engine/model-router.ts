/**
 * Which model does which job, and why the cheap one usually wins.
 *
 * This engine runs weekly on its own. Left unrouted it would call the
 * strongest model to decide whether a caption is too long, and a shop paying
 * for that would switch the whole thing off within a month. So every task is
 * named here and given a tier, and the expensive tier is reserved for the
 * four jobs where a weak answer actually costs something: deciding what to
 * post, checking a government claim, writing the master copy, and reading the
 * month's numbers.
 *
 * Model identifiers live here and nowhere else, so the day a better one ships
 * this is the file that changes.
 */

/**
 * Named jobs, not free-form strings.
 *
 * A caller passing a task the router has never heard of would silently get a
 * default, and the default that saves money is the one that gives bad
 * answers. A closed list means an unrouted task is a type error.
 */
export const AI_TASKS = [
  // Cheap: mechanical work with an obviously right answer.
  "classify_topic",
  "score_idea",
  "format_caption",
  "simple_rewrite",
  "translate_simplify",
  "hashtags",
  "repurpose_version",
  "design_copy",
  // Expensive: judgement, where being wrong costs money or trust.
  "strategy",
  "research_synthesis",
  "final_writing",
  "fact_check",
  "performance_analysis",
  "voice_analysis",
  "command_planning",
] as const;

export type AiTask = (typeof AI_TASKS)[number];

export type ModelTier = "fast" | "strong";

/**
 * The two models, named once.
 *
 * Gemini, because this codebase already talks to Gemini for Smart Print and
 * a second provider would mean a second key, a second bill and a second set
 * of failure modes for no gain.
 */
export const MODELS: Record<ModelTier, string> = {
  fast: "gemini-2.5-flash-lite",
  strong: "gemini-2.5-flash",
};

const TIERS: Record<AiTask, ModelTier> = {
  classify_topic: "fast",
  score_idea: "fast",
  format_caption: "fast",
  simple_rewrite: "fast",
  translate_simplify: "fast",
  hashtags: "fast",
  repurpose_version: "fast",
  design_copy: "fast",

  strategy: "strong",
  research_synthesis: "strong",
  final_writing: "strong",
  fact_check: "strong",
  performance_analysis: "strong",
  voice_analysis: "strong",
  command_planning: "strong",
};

export function tierFor(task: AiTask): ModelTier {
  return TIERS[task];
}

export function modelFor(task: AiTask): string {
  return MODELS[tierFor(task)];
}

/**
 * How long each tier may take before it is a failure.
 *
 * An administrator pressing "Generate ideas" is watching a spinner, so the
 * fast tier gives up quickly. The strong tier is used for work worth waiting
 * for, and its callers show a progress state rather than a spinner.
 */
export const TIMEOUT_MS: Record<ModelTier, number> = {
  fast: 25_000,
  strong: 60_000,
};

/**
 * How many times a call is worth repeating.
 *
 * Retries cost money as well as time, so the strong tier gets one fewer: a
 * failed research synthesis retried three times is three times the bill for
 * the same outage.
 */
export const MAX_ATTEMPTS: Record<ModelTier, number> = {
  fast: 3,
  strong: 2,
};

/* ─────────────────────────────────────────────────────────────────────────
   Not calling at all
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A short-lived cache of identical requests.
 *
 * The same weekly mine asks the same question about the same service
 * catalogue; regenerating a design specification for an unchanged post is
 * money spent to get the same bytes back. Keyed on the exact prompt, held in
 * memory, and deliberately small — this is a cost guard, not a data store,
 * and a serverless instance that loses it has lost nothing that matters.
 */
const CACHE_TTL_MS = 15 * 60_000;
const CACHE_MAX_ENTRIES = 200;

type CacheEntry = { value: unknown; expiresAt: number };
const cache = new Map<string, CacheEntry>();

export function cacheKey(task: AiTask, prompt: string): string {
  // The prompt can be several kilobytes; a length-plus-sample key keeps the
  // map small while still changing whenever the prompt does in any real way.
  let hash = 0;
  for (let index = 0; index < prompt.length; index += 1) {
    hash = (hash * 31 + prompt.charCodeAt(index)) | 0;
  }
  return `${task}:${prompt.length}:${hash}`;
}

export function readCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function writeCache(key: string, value: unknown): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Oldest insertion first; Map preserves that order.
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearCache(): void {
  cache.clear();
}
