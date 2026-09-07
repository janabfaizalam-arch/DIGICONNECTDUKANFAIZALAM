import "server-only";

import { generateJson } from "@/lib/content-engine/ai/generate";
import { compare, type LearnComparison, type PostPerformance } from "@/lib/content-engine/analytics";

/**
 * Stage 09 — reading the month's numbers out loud.
 *
 * The arithmetic is done before the model sees anything. `analytics.ts` has
 * already worked out which posts did well, which topics and formats and hook
 * styles they share, and what the bottom group has in common. The model's job
 * here is narrow and it is the job models are actually good at: turning those
 * groupings into a sentence a shopkeeper reads once and acts on.
 *
 * That ordering is not stylistic. A model handed raw rows will find a pattern
 * whether or not one is there, and a confident sentence about a pattern that
 * does not exist is worse than no analysis, because the next week's content
 * plan is built on it.
 */

const SYSTEM = `You explain social media performance to the owner of a small-town Indian services shop.
You are given arithmetic that has already been done. Explain what it shows in plain words.
Rules:
- Never assert a pattern that is not in the numbers you were given.
- Never use percentages you were not given.
- If there is not enough data to conclude anything, say exactly that.
- One or two sentences per point. No marketing language.
Return JSON only.`;

export type LearnResult = {
  /** The sentence the dashboard shows. */
  summary: string;
  winningTopics: string[];
  winningHooks: string[];
  winningFormats: string[];
  winningCtas: string[];
  winningTimes: string[];
  weakTopics: string[];
  weakHooks: string[];
  weakFormats: string[];
  /** Topics to mine next week, from what worked. */
  nextTopics: string[];
  comparison: LearnComparison;
};

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 10)
    : [];
}

/**
 * What can be said without a model at all.
 *
 * Used when nothing is configured, and as the answer when there are too few
 * posts to compare. A shop with four published posts does not need a
 * paragraph of analysis; it needs to be told it has four published posts.
 */
export function offlineSummary(comparison: LearnComparison): LearnResult {
  return {
    summary: comparison.observations.join(" "),
    winningTopics: comparison.history.byCategory.slice(0, 3).map((signal) => signal.key),
    winningHooks: comparison.history.byHookStyle.slice(0, 2).map((signal) => signal.key.replace(/_/g, " ")),
    winningFormats: comparison.history.byFormat.slice(0, 2).map((signal) => signal.key),
    winningCtas: [],
    winningTimes: comparison.byHour.slice(0, 2).map((signal) => `${signal.key}:00`),
    weakTopics: comparison.history.byCategory.slice(-2).map((signal) => signal.key),
    weakHooks: comparison.history.byHookStyle.slice(-1).map((signal) => signal.key.replace(/_/g, " ")),
    weakFormats: comparison.history.byFormat.slice(-1).map((signal) => signal.key),
    nextTopics: comparison.top.map((post) => post.category).filter(Boolean).slice(0, 5),
    comparison,
  };
}

export async function learn(posts: PostPerformance[]): Promise<LearnResult> {
  const comparison = compare(posts);

  // Below four published posts there is nothing to compare, and asking a
  // model to compare them anyway produces a confident sentence about noise.
  if (posts.length < 4) return offlineSummary(comparison);

  const prompt = [
    `${posts.length} posts were published in this period.`,
    "",
    "THE ARITHMETIC (already computed — explain this, do not recompute it):",
    ...comparison.observations.map((note) => `- ${note}`),
    "",
    "TOP POSTS:",
    ...comparison.top.map(
      (post) =>
        `- "${post.topic}" (${post.category}, ${post.format}) — score ${post.score}, ` +
        `${post.metrics.enquiries} enquiries, ${post.metrics.shares} shares, ${post.metrics.reach} reach. ` +
        `Hook: ${post.hook}`,
    ),
    "",
    "BOTTOM POSTS:",
    ...comparison.bottom.map(
      (post) =>
        `- "${post.topic}" (${post.category}, ${post.format}) — score ${post.score}, ` +
        `${post.metrics.enquiries} enquiries, ${post.metrics.shares} shares, ${post.metrics.reach} reach. ` +
        `Hook: ${post.hook}`,
    ),
    "",
    "Return one JSON object:",
    "- summary: two or three sentences. Say what actually distinguishes the top group from the bottom",
    '  group. Example of the right shape: "Problem-solving posts are generating more enquiries than',
    '  generic service advertisements."',
    "- winning_topics, winning_hooks, winning_formats, winning_ctas, winning_times: arrays of short strings",
    "- weak_topics, weak_hooks, weak_formats: arrays of short strings",
    "- next_topics: 5 topics to write about next week, based on what worked",
  ].join("\n");

  try {
    const raw = await generateJson<Record<string, unknown>>({
      task: "performance_analysis",
      system: SYSTEM,
      prompt,
      parse: (value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new Error("Expected one analysis object.");
        }
        return value as Record<string, unknown>;
      },
      fresh: true,
      temperature: 0.4,
    });

    return {
      summary: String(raw.summary ?? "").trim() || comparison.observations.join(" "),
      winningTopics: stringList(raw.winning_topics),
      winningHooks: stringList(raw.winning_hooks),
      winningFormats: stringList(raw.winning_formats),
      winningCtas: stringList(raw.winning_ctas),
      winningTimes: stringList(raw.winning_times),
      weakTopics: stringList(raw.weak_topics),
      weakHooks: stringList(raw.weak_hooks),
      weakFormats: stringList(raw.weak_formats),
      nextTopics: stringList(raw.next_topics),
      comparison,
    };
  } catch (caught) {
    /*
      The numbers are worth more than the prose. If the model is unavailable
      the shop still gets its comparison, rather than an empty analytics
      screen and an error.
    */
    console.warn("[content-engine] learn fell back to arithmetic only", {
      detail: caught instanceof Error ? caught.message : String(caught),
    });
    return offlineSummary(comparison);
  }
}

/**
 * The plain-language note the Mine engine carries into next week.
 *
 * This is the loop closing: what the numbers said becomes part of the prompt
 * that decides what gets written next.
 */
export function performanceNote(result: LearnResult | null): string {
  if (!result) return "";
  return [
    result.summary,
    result.winningTopics.length ? `Topics that worked: ${result.winningTopics.join(", ")}.` : "",
    result.winningFormats.length ? `Formats that worked: ${result.winningFormats.join(", ")}.` : "",
    result.weakTopics.length ? `Topics that did not work: ${result.weakTopics.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
