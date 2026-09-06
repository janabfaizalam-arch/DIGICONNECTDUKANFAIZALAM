import { describe, expect, it } from "vitest";

import {
  EMPTY_HISTORY,
  MAX_HISTORY_SWING,
  clampScore,
  hookStyleOf,
  normalizeScores,
  rankIdeas,
  suggestFormat,
  totalScore,
} from "@/lib/content-engine/scoring";
import { MAX_TOTAL_SCORE, type ContentIdea } from "@/lib/content-engine/types";

/**
 * Scoring, and the part that makes it this shop's rather than a model's.
 *
 * A generic ranking always puts "5 tips for GST registration" near the top.
 * The point of the history weighting is that the enquiry log gets a vote, and
 * these tests pin down how big a vote: enough to reorder a list, never enough
 * to replace the judgement that built it.
 */

function idea(overrides: Partial<ContentIdea> = {}): ContentIdea {
  const scores = normalizeScores({
    hook_score: 6,
    demand_score: 6,
    freshness_score: 6,
    business_value_score: 6,
    shareability_score: 6,
  });
  return {
    id: "idea-1",
    title: "Labour Card ke fayde",
    description: "",
    source: "ai",
    sourceUrl: null,
    category: "Labour Card",
    targetAudience: "",
    scores,
    totalScore: totalScore(scores),
    scoreReason: "",
    suggestedFormat: "CAROUSEL",
    status: "NEW",
    government: true,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("a score a model returned is never trusted as given", () => {
  it("clamps anything outside 0 to 10", () => {
    expect(clampScore(11)).toBe(10);
    expect(clampScore(-4)).toBe(0);
    expect(clampScore(7.6)).toBe(8);
  });

  it("treats words and nulls as zero rather than crashing", () => {
    expect(clampScore("high")).toBe(0);
    expect(clampScore(null)).toBe(0);
    expect(clampScore(undefined)).toBe(0);
    expect(clampScore(Number.NaN)).toBe(0);
  });

  it("fills in every axis, even the ones the model forgot", () => {
    const scores = normalizeScores({ hook_score: 9 });
    expect(scores.hook_score).toBe(9);
    expect(scores.demand_score).toBe(0);
    expect(totalScore(scores)).toBe(9);
  });

  it("never totals above the maximum", () => {
    const scores = normalizeScores({
      hook_score: 50,
      demand_score: 50,
      freshness_score: 50,
      business_value_score: 50,
      shareability_score: 50,
    });
    expect(totalScore(scores)).toBe(MAX_TOTAL_SCORE);
  });
});

describe("the shop's own numbers get a vote", () => {
  it("changes nothing when there is no history", () => {
    const [ranked] = rankIdeas([idea()], EMPTY_HISTORY);
    expect(ranked.historyAdjustment).toBe(0);
    expect(ranked.rankedScore).toBe(ranked.totalScore);
    expect(ranked.historyReason).toContain("No performance history");
  });

  it("lifts a topic that has been bringing enquiries", () => {
    const [ranked] = rankIdeas([idea()], {
      byCategory: [{ key: "Labour Card", score: 200, weight: 6 }],
      byFormat: [],
      byHookStyle: [],
      baseline: 100,
    });

    expect(ranked.historyAdjustment).toBeGreaterThan(0);
    expect(ranked.rankedScore).toBeGreaterThan(ranked.totalScore);
    expect(ranked.historyReason).toContain("Labour Card");
  });

  it("pushes down a topic that has not", () => {
    const [ranked] = rankIdeas([idea()], {
      byCategory: [{ key: "Labour Card", score: 20, weight: 6 }],
      byFormat: [],
      byHookStyle: [],
      baseline: 100,
    });

    expect(ranked.historyAdjustment).toBeLessThan(0);
    expect(ranked.historyReason).toContain("worse than average");
  });

  it("barely listens to a single post", () => {
    const thin = rankIdeas([idea()], {
      byCategory: [{ key: "Labour Card", score: 400, weight: 1 }],
      byFormat: [],
      byHookStyle: [],
      baseline: 100,
    })[0];

    const solid = rankIdeas([idea()], {
      byCategory: [{ key: "Labour Card", score: 400, weight: 8 }],
      byFormat: [],
      byHookStyle: [],
      baseline: 100,
    })[0];

    expect(thin.historyAdjustment).toBeLessThan(solid.historyAdjustment);
    expect(thin.historyAdjustment).toBeLessThan(solid.historyAdjustment / 3);
  });

  it("never lets history swing a score by more than a fifth", () => {
    const [ranked] = rankIdeas([idea()], {
      byCategory: [{ key: "Labour Card", score: 100_000, weight: 100 }],
      byFormat: [{ key: "CAROUSEL", score: 100_000, weight: 100 }],
      byHookStyle: [{ key: "statement", score: 100_000, weight: 100 }],
      baseline: 1,
    });

    expect(Math.abs(ranked.historyAdjustment)).toBeLessThanOrEqual(MAX_HISTORY_SWING + 0.01);
  });

  it("sorts by the adjusted score, not the raw one", () => {
    const strong = idea({ id: "a", title: "Aaa", category: "Weak topic" });
    const weak = idea({
      id: "b",
      title: "Bbb",
      category: "Strong topic",
      scores: normalizeScores({
        hook_score: 5,
        demand_score: 5,
        freshness_score: 5,
        business_value_score: 5,
        shareability_score: 5,
      }),
      totalScore: 25,
    });

    const ranked = rankIdeas([strong, weak], {
      byCategory: [
        { key: "Strong topic", score: 500, weight: 10 },
        { key: "Weak topic", score: 10, weight: 10 },
      ],
      byFormat: [],
      byHookStyle: [],
      baseline: 100,
    });

    expect(ranked[0].id).toBe("b");
  });

  it("stays inside the score range whatever history says", () => {
    const [ranked] = rankIdeas(
      [idea({ scores: normalizeScores({ hook_score: 10, demand_score: 10, freshness_score: 10, business_value_score: 10, shareability_score: 10 }), totalScore: 50 })],
      {
        byCategory: [{ key: "Labour Card", score: 10_000, weight: 50 }],
        byFormat: [],
        byHookStyle: [],
        baseline: 1,
      },
    );

    expect(ranked.rankedScore).toBeLessThanOrEqual(MAX_TOTAL_SCORE);
    expect(ranked.rankedScore).toBeGreaterThanOrEqual(0);
  });
});

describe("recognising a hook's family without paying for a model call", () => {
  it("reads the shapes this shop's posts actually use", () => {
    expect(hookStyleOf("Labour Card kaise banwayen?")).toBe("how_to");
    expect(hookStyleOf("Kya aapko pata hai?")).toBe("question");
    expect(hookStyleOf("Savdhan: ye galti mat kijiye")).toBe("warning");
    expect(hookStyleOf("5 documents jo lagenge")).toBe("number_list");
    expect(hookStyleOf("Last date 31 March hai")).toBe("deadline");
    expect(hookStyleOf("Log kehte hain ye scheme band ho gayi")).toBe("myth_busting");
    expect(hookStyleOf("Kal ek customer aaye the")).toBe("story");
  });

  it("falls back to a statement rather than guessing", () => {
    expect(hookStyleOf("DigiConnect Dukan")).toBe("statement");
    expect(hookStyleOf("")).toBe("statement");
  });
});

describe("suggesting a format from the scores", () => {
  it("makes a very fresh topic a story, because it stops mattering on Friday", () => {
    expect(
      suggestFormat(
        normalizeScores({ hook_score: 5, demand_score: 5, freshness_score: 10, business_value_score: 5, shareability_score: 5 }),
        false,
      ),
    ).toBe("STORY");
  });

  it("makes a shareable, hooky topic a reel", () => {
    expect(
      suggestFormat(
        normalizeScores({ hook_score: 9, demand_score: 5, freshness_score: 4, business_value_score: 5, shareability_score: 9 }),
        false,
      ),
    ).toBe("REEL");
  });

  it("makes a government explainer a carousel", () => {
    expect(
      suggestFormat(
        normalizeScores({ hook_score: 5, demand_score: 5, freshness_score: 4, business_value_score: 5, shareability_score: 5 }),
        true,
      ),
    ).toBe("CAROUSEL");
  });
});
