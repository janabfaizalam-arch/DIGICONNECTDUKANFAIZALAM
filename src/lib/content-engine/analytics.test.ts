import { describe, expect, it } from "vitest";

import {
  EMPTY_METRICS,
  METRIC_WEIGHTS,
  addMetrics,
  buildHistory,
  compare,
  metricsFromRow,
  performanceScore,
  type Metrics,
  type PostPerformance,
} from "@/lib/content-engine/analytics";
import type { ContentAnalyticsRow } from "@/lib/content-engine/types";

/**
 * The numbers, and the thing they are deliberately not optimising for.
 *
 * Reach is the figure every platform shows first and the one that matters
 * least to a shop that makes money when somebody walks in. These tests pin
 * down that an enquiry outweighs a pile of likes, because the whole self
 * improving loop is built on this ordering.
 */

function metrics(overrides: Partial<Metrics> = {}): Metrics {
  return { ...EMPTY_METRICS, ...overrides };
}

function post(id: string, overrides: Partial<PostPerformance> = {}): PostPerformance {
  const own = overrides.metrics ?? EMPTY_METRICS;
  return {
    postId: id,
    topic: id,
    category: "Labour Card",
    hook: "Kya aapko pata hai?",
    format: "CAROUSEL",
    platforms: ["INSTAGRAM"],
    publishedAt: "2026-09-01T04:30:00.000Z",
    publishedHour: 10,
    metrics: own,
    score: performanceScore(own),
    ...overrides,
  };
}

describe("scoring a post by what it was worth to the shop", () => {
  it("counts an enquiry for far more than a like", () => {
    expect(METRIC_WEIGHTS.enquiries).toBeGreaterThan(METRIC_WEIGHTS.likes * 10);
    expect(METRIC_WEIGHTS.customers).toBeGreaterThan(METRIC_WEIGHTS.enquiries);
  });

  it("counts impressions for nothing at all", () => {
    expect(METRIC_WEIGHTS.impressions).toBe(0);
  });

  it("ranks one enquiry above two hundred likes", () => {
    expect(performanceScore(metrics({ enquiries: 1 }))).toBeGreaterThan(0);
    expect(performanceScore(metrics({ enquiries: 3 }))).toBeGreaterThan(
      performanceScore(metrics({ likes: 60 })),
    );
  });

  it("ignores a negative or nonsensical figure rather than subtracting it", () => {
    expect(performanceScore(metrics({ likes: -50, enquiries: 2 }))).toBe(
      performanceScore(metrics({ enquiries: 2 })),
    );
  });

  it("adds up rows from several platforms into one post", () => {
    const total = addMetrics(metrics({ reach: 100, enquiries: 1 }), { reach: 50, enquiries: 2 });
    expect(total.reach).toBe(150);
    expect(total.enquiries).toBe(3);
  });

  it("reads a database row defensively", () => {
    const row = { likes: "40", enquiries: null, revenue: undefined } as unknown as ContentAnalyticsRow;
    const read = metricsFromRow(row);
    expect(read.likes).toBe(40);
    expect(read.enquiries).toBe(0);
    expect(read.revenue).toBe(0);
  });
});

describe("grouping what worked", () => {
  it("averages rather than sums, so one prolific category does not win by volume", () => {
    const history = buildHistory([
      post("a", { category: "Labour Card", metrics: metrics({ enquiries: 4 }) }),
      post("b", { category: "Labour Card", metrics: metrics({ enquiries: 4 }) }),
      post("c", { category: "Printing", metrics: metrics({ enquiries: 6 }) }),
    ]);

    expect(history.byCategory[0].key).toBe("Printing");
    expect(history.byCategory.find((signal) => signal.key === "Labour Card")?.weight).toBe(2);
  });

  it("groups hooks by their family, not by their words", () => {
    const history = buildHistory([
      post("a", { hook: "Kya aapko pata hai?", metrics: metrics({ enquiries: 5 }) }),
      post("b", { hook: "Kya aap jaante hain?", metrics: metrics({ enquiries: 5 }) }),
    ]);

    expect(history.byHookStyle).toHaveLength(1);
    expect(history.byHookStyle[0].weight).toBe(2);
  });

  it("returns an empty history rather than dividing by zero", () => {
    expect(buildHistory([]).baseline).toBe(0);
  });
});

describe("comparing the best against the worst", () => {
  const posts = Array.from({ length: 12 }, (_, index) =>
    post(`post-${index}`, { metrics: metrics({ enquiries: index, reach: 100 }) }),
  );

  it("takes five and five when there are enough posts", () => {
    const result = compare(posts);
    expect(result.top).toHaveLength(5);
    expect(result.bottom).toHaveLength(5);
    expect(result.top[0].score).toBeGreaterThan(result.bottom[0].score);
  });

  it("never lets the two groups overlap", () => {
    // With six posts, "top 5 vs bottom 5" compares a post against itself and
    // produces a confident sentence about nothing.
    const result = compare(posts.slice(0, 6));
    const top = new Set(result.top.map((item) => item.postId));
    expect(result.bottom.some((item) => top.has(item.postId))).toBe(false);
  });

  it("says plainly when there is nothing to compare", () => {
    expect(compare([post("only")]).observations[0]).toContain("Not enough published posts");
  });

  it("states the enquiry gap, which is the comparison that matters", () => {
    expect(compare(posts).observations.join(" ")).toMatch(/enquiries/);
  });

  it("notices posts that got reach and brought nobody in", () => {
    const reachOnly = Array.from({ length: 6 }, (_, index) =>
      post(`reach-${index}`, { metrics: metrics({ reach: 5000 }) }),
    );
    expect(compare(reachOnly).observations.join(" ")).toContain("no enquiries at all");
  });

  it("adds up the period's totals", () => {
    expect(compare(posts).totals.reach).toBe(1200);
  });
});
