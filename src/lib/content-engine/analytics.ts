/**
 * What the numbers say, and how the engine learns from them.
 *
 * The trap this file exists to avoid: optimising for reach. Reach is the
 * number every platform shows first and the one that matters least to a shop
 * that makes money when somebody walks in. So the score below weights an
 * enquiry far above a like, and a customer above an enquiry, and the
 * comparison the Learn engine runs is between posts that brought people to
 * the counter and posts that did not.
 *
 * Pure arithmetic. The AI's part is downstream: it reads these groupings and
 * writes the sentence a person reads.
 */

import { hookStyleOf, type PerformanceHistory, type PerformanceSignal } from "@/lib/content-engine/scoring";
import type { ContentAnalyticsRow, ContentPlatform } from "@/lib/content-engine/types";

/**
 * One published post with everything needed to judge it.
 *
 * Analytics rows are per platform per collection, so a post that went to
 * Instagram and WhatsApp has several; `summarise` folds them into one row per
 * post before anything is compared.
 */
export type PostPerformance = {
  postId: string;
  topic: string;
  category: string;
  hook: string;
  format: string;
  platforms: ContentPlatform[];
  publishedAt: string | null;
  /** Local hour of publication, 0–23, for the posting-time comparison. */
  publishedHour: number | null;
  metrics: Metrics;
  score: number;
};

export type Metrics = {
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  watchTimeSeconds: number;
  enquiries: number;
  leads: number;
  customers: number;
  revenue: number;
};

export const EMPTY_METRICS: Metrics = {
  impressions: 0,
  reach: 0,
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  clicks: 0,
  watchTimeSeconds: 0,
  enquiries: 0,
  leads: 0,
  customers: 0,
  revenue: 0,
};

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function addMetrics(a: Metrics, b: Partial<Metrics>): Metrics {
  const out = { ...a };
  for (const key of Object.keys(EMPTY_METRICS) as (keyof Metrics)[]) {
    out[key] = num(a[key]) + num(b[key]);
  }
  return out;
}

export function metricsFromRow(row: ContentAnalyticsRow): Metrics {
  return {
    impressions: num(row.impressions),
    reach: num(row.reach),
    views: num(row.views),
    likes: num(row.likes),
    comments: num(row.comments),
    shares: num(row.shares),
    saves: num(row.saves),
    clicks: num(row.clicks),
    watchTimeSeconds: num(row.watchTimeSeconds),
    enquiries: num(row.enquiries),
    leads: num(row.leads),
    customers: num(row.customers),
    revenue: num(row.revenue),
  };
}

/**
 * One number per post, weighted towards what pays the rent.
 *
 * A like is worth one point, a share five, an enquiry twenty-five, a customer
 * a hundred. Those ratios are not measured, they are a decision — and it is
 * the right decision for a shop where one Labour Card customer is worth more
 * than four hundred impressions. Written here in one place so it can be
 * argued with rather than being implicit in a sort order somewhere.
 */
export const METRIC_WEIGHTS: Record<keyof Metrics, number> = {
  impressions: 0,
  reach: 0.01,
  views: 0.02,
  likes: 1,
  comments: 3,
  shares: 5,
  saves: 4,
  clicks: 2,
  watchTimeSeconds: 0.01,
  enquiries: 25,
  leads: 40,
  customers: 100,
  revenue: 0.05,
};

export function performanceScore(metrics: Metrics): number {
  return Number(
    (Object.keys(METRIC_WEIGHTS) as (keyof Metrics)[])
      .reduce((sum, key) => sum + num(metrics[key]) * METRIC_WEIGHTS[key], 0)
      .toFixed(2),
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Grouping
   ───────────────────────────────────────────────────────────────────────── */

function groupBy(posts: PostPerformance[], keyOf: (post: PostPerformance) => string): PerformanceSignal[] {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const post of posts) {
    const key = keyOf(post).trim();
    if (!key) continue;
    const bucket = buckets.get(key) ?? { total: 0, count: 0 };
    bucket.total += post.score;
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .map(([key, bucket]) => ({ key, score: bucket.total / bucket.count, weight: bucket.count }))
    .sort((a, b) => b.score - a.score);
}

export function buildHistory(posts: PostPerformance[]): PerformanceHistory {
  if (!posts.length) return { byCategory: [], byFormat: [], byHookStyle: [], baseline: 0 };
  const baseline = posts.reduce((sum, post) => sum + post.score, 0) / posts.length;
  return {
    byCategory: groupBy(posts, (post) => post.category),
    byFormat: groupBy(posts, (post) => post.format),
    byHookStyle: groupBy(posts, (post) => hookStyleOf(post.hook)),
    baseline,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   The comparison the Learn engine reads
   ───────────────────────────────────────────────────────────────────────── */

export type LearnComparison = {
  top: PostPerformance[];
  bottom: PostPerformance[];
  history: PerformanceHistory;
  byPlatform: PerformanceSignal[];
  byHour: PerformanceSignal[];
  totals: Metrics;
  /** Facts the model is given, so it explains rather than invents. */
  observations: string[];
};

/**
 * Split the period into its best and worst, with enough context to explain it.
 *
 * Five and five, as the brief says, but only when there are enough posts for
 * the two groups not to overlap. With six posts, "top 5 vs bottom 5" compares
 * a post against itself and produces a confident sentence about nothing.
 */
export function compare(posts: PostPerformance[], size = 5): LearnComparison {
  const ranked = [...posts].sort((a, b) => b.score - a.score);
  const groupSize = Math.min(size, Math.floor(ranked.length / 2));

  const top = groupSize ? ranked.slice(0, groupSize) : ranked.slice(0, 1);
  const bottom = groupSize ? ranked.slice(-groupSize) : [];

  const totals = posts.reduce<Metrics>((sum, post) => addMetrics(sum, post.metrics), EMPTY_METRICS);

  return {
    top,
    bottom,
    history: buildHistory(posts),
    byPlatform: groupBy(posts, (post) => post.platforms[0] ?? ""),
    byHour: groupBy(posts, (post) => (post.publishedHour === null ? "" : String(post.publishedHour))),
    totals,
    observations: observationsFor(posts, top, bottom),
  };
}

/**
 * The facts, stated before a model is allowed near them.
 *
 * The Learn engine's job is to say something a shopkeeper can act on. Handing
 * a model raw rows invites it to assert a pattern that is not there, so the
 * arithmetic is done here and the model is asked to explain these lines
 * rather than to find its own.
 */
function observationsFor(
  posts: PostPerformance[],
  top: PostPerformance[],
  bottom: PostPerformance[],
): string[] {
  if (posts.length < 2) return ["Not enough published posts yet to compare anything."];

  const notes: string[] = [];
  const enquiriesTop = top.reduce((sum, post) => sum + post.metrics.enquiries, 0);
  const enquiriesBottom = bottom.reduce((sum, post) => sum + post.metrics.enquiries, 0);
  notes.push(
    `Top ${top.length} posts produced ${enquiriesTop} enquiries; bottom ${bottom.length} produced ${enquiriesBottom}.`,
  );

  const history = buildHistory(posts);
  const bestCategory = history.byCategory[0];
  const worstCategory = history.byCategory[history.byCategory.length - 1];
  if (bestCategory && worstCategory && bestCategory.key !== worstCategory.key) {
    notes.push(
      `Best topic: "${bestCategory.key}" (${bestCategory.weight} posts). ` +
        `Weakest: "${worstCategory.key}" (${worstCategory.weight} posts).`,
    );
  }

  const bestFormat = history.byFormat[0];
  if (bestFormat && history.byFormat.length > 1) {
    notes.push(`Best format: ${bestFormat.key} across ${bestFormat.weight} posts.`);
  }

  const bestHook = history.byHookStyle[0];
  if (bestHook && history.byHookStyle.length > 1) {
    notes.push(`Best hook style: ${bestHook.key.replace(/_/g, " ")}.`);
  }

  const hours = groupBy(posts, (post) => (post.publishedHour === null ? "" : String(post.publishedHour)));
  if (hours.length > 1 && hours[0].weight >= 2) {
    notes.push(`Best posting hour so far: ${hours[0].key}:00 local.`);
  }

  const reachOnly = posts.filter((post) => post.metrics.reach > 0 && post.metrics.enquiries === 0);
  if (reachOnly.length >= 2) {
    notes.push(`${reachOnly.length} posts got reach but produced no enquiries at all.`);
  }

  return notes;
}

/** The dashboard's week, from analytics rows and the posts they belong to. */
export function weeklyTotals(posts: PostPerformance[], since: Date): Metrics {
  return posts
    .filter((post) => post.publishedAt && Date.parse(post.publishedAt) >= since.getTime())
    .reduce<Metrics>((sum, post) => addMetrics(sum, post.metrics), EMPTY_METRICS);
}
