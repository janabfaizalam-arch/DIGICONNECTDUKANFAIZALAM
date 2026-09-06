/**
 * How an idea earns its place at the top of the list.
 *
 * Five axes out of ten, summed to fifty. The arithmetic is trivial; what
 * this file is really for is the second half — re-weighting those axes with
 * what this shop's own posts actually did. A generic model will always rank
 * "5 tips for GST registration" highly. The enquiry log says problem-solving
 * posts about Labour Card bring people to the counter and generic service
 * advertisements do not, and after a few weeks of data that is the ranking
 * worth trusting.
 *
 * Pure. Given the same idea and the same performance history it returns the
 * same number, which is what makes the ranking explainable to the person
 * reading it.
 */

import {
  MAX_AXIS_SCORE,
  MAX_TOTAL_SCORE,
  SCORE_AXES,
  type ContentFormat,
  type ContentIdea,
  type IdeaScores,
} from "@/lib/content-engine/types";

/** A model can return 11, or -2, or "high". None of those may reach the table. */
export function clampScore(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(MAX_AXIS_SCORE, Math.round(number)));
}

export function normalizeScores(raw: Partial<Record<string, unknown>>): IdeaScores {
  const scores = {} as IdeaScores;
  for (const axis of SCORE_AXES) scores[axis] = clampScore(raw?.[axis]);
  return scores;
}

export function totalScore(scores: IdeaScores): number {
  return SCORE_AXES.reduce((sum, axis) => sum + clampScore(scores[axis]), 0);
}

export { MAX_TOTAL_SCORE };

/* ─────────────────────────────────────────────────────────────────────────
   What actually worked
   ───────────────────────────────────────────────────────────────────────── */

/**
 * One line of history: a category, a hook style or a format, and how it did.
 *
 * `weight` is the number of posts behind the figure. Two posts are not
 * evidence, and the multiplier below leans on this so that a single lucky
 * reel does not rewrite the ranking.
 */
export type PerformanceSignal = {
  key: string;
  /** Mean engagements-plus-enquiries per post, normalised elsewhere. */
  score: number;
  weight: number;
};

export type PerformanceHistory = {
  byCategory: PerformanceSignal[];
  byFormat: PerformanceSignal[];
  byHookStyle: PerformanceSignal[];
  /** The mean across everything, so a signal can be judged above or below it. */
  baseline: number;
};

export const EMPTY_HISTORY: PerformanceHistory = {
  byCategory: [],
  byFormat: [],
  byHookStyle: [],
  baseline: 0,
};

/**
 * Confidence grows with the number of posts, and stops at four.
 *
 * A category with one post gets almost no say; one with eight or more gets
 * the full adjustment. This is a deliberately blunt curve — the alternative
 * is a statistical model nobody in the shop could explain, and an unexplainable
 * ranking is one that gets ignored.
 */
function confidence(weight: number): number {
  if (weight <= 0) return 0;
  return Math.min(1, weight / 4);
}

function signalFor(signals: PerformanceSignal[], key: string): PerformanceSignal | null {
  const wanted = key.trim().toLowerCase();
  if (!wanted) return null;
  return signals.find((signal) => signal.key.trim().toLowerCase() === wanted) ?? null;
}

/**
 * How much better or worse than average this signal did, as -1…+1.
 *
 * Relative to the baseline rather than absolute, because absolute reach on a
 * 900-follower account means nothing on its own and the comparison between
 * this shop's own posts means everything.
 */
function relative(signal: PerformanceSignal | null, baseline: number): number {
  if (!signal || baseline <= 0) return 0;
  const ratio = (signal.score - baseline) / baseline;
  return Math.max(-1, Math.min(1, ratio)) * confidence(signal.weight);
}

export type RankedIdea = ContentIdea & {
  /** Total after history is applied. What the list is sorted by. */
  rankedScore: number;
  /** How far history moved it, so the screen can say "+4 because…". */
  historyAdjustment: number;
  /** One line, in plain words, naming what moved it. */
  historyReason: string;
};

/**
 * The self-improving part of the idea bank.
 *
 * The model's five scores are the starting point; the shop's own numbers
 * push a topic up or down by at most a fifth of the total. Capped on purpose:
 * history should reorder a list, not replace the judgement that built it, or
 * the engine would spend six weeks posting nothing but whatever went viral
 * once.
 */
export const MAX_HISTORY_SWING = MAX_TOTAL_SCORE * 0.2;

export function rankIdeas(ideas: ContentIdea[], history: PerformanceHistory = EMPTY_HISTORY): RankedIdea[] {
  return ideas
    .map((idea) => {
      const category = relative(signalFor(history.byCategory, idea.category), history.baseline);
      const format = relative(signalFor(history.byFormat, idea.suggestedFormat), history.baseline);
      const hook = relative(signalFor(history.byHookStyle, hookStyleOf(idea.title)), history.baseline);

      // Category counts double: what a post is about moves the needle more
      // than whether it was a reel or a carousel, and the enquiry log says so.
      const combined = (category * 2 + format + hook) / 4;
      const adjustment = Number((combined * MAX_HISTORY_SWING).toFixed(2));
      const base = idea.totalScore || totalScore(idea.scores);

      return {
        ...idea,
        rankedScore: Number(Math.max(0, Math.min(MAX_TOTAL_SCORE, base + adjustment)).toFixed(2)),
        historyAdjustment: adjustment,
        historyReason: explain(idea, { category, format, hook }),
      };
    })
    .sort((a, b) => b.rankedScore - a.rankedScore || a.title.localeCompare(b.title));
}

function explain(
  idea: ContentIdea,
  parts: { category: number; format: number; hook: number },
): string {
  const notes: string[] = [];
  if (parts.category > 0.05) notes.push(`"${idea.category}" posts have been doing better than average`);
  if (parts.category < -0.05) notes.push(`"${idea.category}" posts have been doing worse than average`);
  if (parts.format > 0.05) notes.push(`${idea.suggestedFormat.toLowerCase()} format is working`);
  if (parts.format < -0.05) notes.push(`${idea.suggestedFormat.toLowerCase()} format has been weak`);
  if (parts.hook > 0.05) notes.push("this hook style has pulled enquiries before");
  if (parts.hook < -0.05) notes.push("this hook style has not pulled enquiries before");
  return notes.length ? notes.join("; ") : "No performance history for this topic yet — scored on merit alone.";
}

/* ─────────────────────────────────────────────────────────────────────────
   Hook styles
   ───────────────────────────────────────────────────────────────────────── */

export const HOOK_STYLES = [
  "question",
  "warning",
  "number_list",
  "deadline",
  "story",
  "myth_busting",
  "how_to",
  "statement",
] as const;
export type HookStyle = (typeof HOOK_STYLES)[number];

/**
 * Which family a hook belongs to, from the words in it.
 *
 * Crude string matching rather than a model call, and that is the point:
 * this runs on every idea in every ranking, and paying for a classification
 * that a regular expression answers correctly nine times in ten is exactly
 * the spending this engine is supposed to avoid.
 */
export function hookStyleOf(hook: string): HookStyle {
  const text = (hook ?? "").toLowerCase().trim();
  if (!text) return "statement";
  if (/(kya|kaise|kyun|why|how|what|when|kab|kaun)\b.*\?|\?$/.test(text)) {
    return /(kaise|how to|how do)/.test(text) ? "how_to" : "question";
  }
  if (/(savdhan|saavdhan|warning|galti|mistake|reject|bachiye|dhyan|beware|khatra)/.test(text)) return "warning";
  if (/^\s*\d+\s|(\b\d+\s+(cheez|tarike|ways|things|tips|documents|steps|point))/.test(text)) return "number_list";
  /*
    Myth-busting is checked before deadlines on purpose. "Log kehte hain ye
    scheme band ho gayi" is somebody correcting a rumour, not announcing a
    closing date, and the deadline pattern would otherwise claim it on the
    strength of "band ho". An explicit myth frame outranks an incidental
    closing word.
  */
  if (/(myth|galat fehmi|afwah|log kehte|sach ye|truth)/.test(text)) return "myth_busting";
  if (/(last date|aakhri|antim|deadline|khatam|closing|band ho|ends)/.test(text)) return "deadline";
  if (/(ek customer|kal ek|aaye the|kahani|story|humare paas)/.test(text)) return "story";
  return "statement";
}

/**
 * Recommend a format from what the scores say.
 *
 * A high-shareability, high-hook idea is a reel; a document-heavy explainer
 * is a carousel; a deadline is a story because it stops mattering on Friday.
 */
export function suggestFormat(scores: IdeaScores, government: boolean): ContentFormat {
  if (scores.freshness_score >= 9) return "STORY";
  if (scores.shareability_score >= 8 && scores.hook_score >= 7) return "REEL";
  if (government || scores.business_value_score >= 8) return "CAROUSEL";
  if (scores.demand_score >= 8) return "WHATSAPP";
  return "STATIC_POSTER";
}
