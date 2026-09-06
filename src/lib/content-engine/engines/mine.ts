import "server-only";

import { generateJson } from "@/lib/content-engine/ai/generate";
import { voicePrompt } from "@/lib/content-engine/brand-voice";
import { dedupe } from "@/lib/content-engine/duplicates";
import { looksGovernmental } from "@/lib/content-engine/publishing-guard";
import { normalizeScores, suggestFormat, totalScore } from "@/lib/content-engine/scoring";
import { CONTENT_FORMATS, type BrandSettings, type ContentFormat, type IdeaSource } from "@/lib/content-engine/types";
import type { NewIdea } from "@/lib/content-engine/repository";

/**
 * Stage 01 — where the week's topics come from.
 *
 * The one thing this stage must not do is invent. A model asked for "ten
 * content ideas for a digital services shop" returns ten ideas that would fit
 * any shop in India, and a year of posting those is what makes an account
 * indistinguishable from every other account. So the mine takes real inputs —
 * the questions customers actually asked, the services this shop actually
 * sells, the government topics it actually files, what its own posts actually
 * did — and asks for ideas grounded in them.
 *
 * The scores come back with a reason attached because a ranking nobody can
 * argue with is a ranking nobody uses.
 */

export type MineInput = {
  brand: BrandSettings;
  /** Real questions from customers, leads or comments. The best input there is. */
  customerQuestions: string[];
  /** Services this shop actually sells, by name. */
  services: string[];
  /** Government topics currently live — schemes, deadlines, rule changes. */
  governmentTopics: { title: string; note: string; sourceUrl?: string }[];
  /** What the Learn engine concluded last time, in plain words. */
  performanceNote: string;
  /** Titles already in the bank or recently published, to avoid repeating. */
  existingTitles: string[];
  /** Narrow the mine to one subject: "5 Labour Card ideas do." */
  topic?: string;
  count: number;
};

export type MinedIdea = NewIdea & { duplicateOf?: string };

const SYSTEM = `You are the content strategist for a small-town Indian digital services shop.
You are given the shop's real inputs: questions its customers asked, services it sells, government
topics it files, and how its own past posts performed. Propose content ideas grounded ONLY in those
inputs. Never propose a generic social media idea that would fit any business. Never invent a
government scheme, amount, deadline or eligibility rule; if a government topic is given to you,
refer to it without adding facts to it.
Return JSON only.`;

type RawIdea = {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  target_audience?: unknown;
  source?: unknown;
  source_url?: unknown;
  hook_score?: unknown;
  demand_score?: unknown;
  freshness_score?: unknown;
  business_value_score?: unknown;
  shareability_score?: unknown;
  reason?: unknown;
  suggested_format?: unknown;
};

const VALID_SOURCES: IdeaSource[] = [
  "customer_question",
  "government_update",
  "service_catalogue",
  "past_performance",
  "faq",
  "comment",
  "document",
  "manual",
  "ai",
];

function parseIdeas(value: unknown): RawIdea[] {
  if (Array.isArray(value)) return value as RawIdea[];
  if (value && typeof value === "object" && Array.isArray((value as { ideas?: unknown }).ideas)) {
    return (value as { ideas: RawIdea[] }).ideas;
  }
  throw new Error("Expected an array of ideas.");
}

function asFormat(value: unknown, fallback: ContentFormat): ContentFormat {
  const upper = String(value ?? "").toUpperCase().replace(/[\s-]/g, "_");
  return (CONTENT_FORMATS as readonly string[]).includes(upper) ? (upper as ContentFormat) : fallback;
}

function asUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function buildPrompt(input: MineInput): string {
  const lines: string[] = [
    voicePrompt(input.brand),
    "",
    `Propose ${input.count} content ideas.`,
    input.topic ? `Every idea must be about: ${input.topic}.` : "",
    "",
    "SHOP'S SERVICES:",
    ...(input.services.length ? input.services.map((service) => `- ${service}`) : ["- (none supplied)"]),
    "",
    "REAL CUSTOMER QUESTIONS (the strongest source — prefer these):",
    ...(input.customerQuestions.length
      ? input.customerQuestions.slice(0, 40).map((question) => `- ${question}`)
      : ["- (none supplied)"]),
    "",
    "LIVE GOVERNMENT TOPICS (refer to these; do not add facts to them):",
    ...(input.governmentTopics.length
      ? input.governmentTopics.slice(0, 25).map((topic) => `- ${topic.title}: ${topic.note}`)
      : ["- (none supplied)"]),
    "",
    "WHAT THIS SHOP'S OWN POSTS SHOWED:",
    input.performanceNote || "- No performance history yet.",
    "",
    "ALREADY POSTED OR ALREADY IN THE IDEA BANK — do not repeat these:",
    ...(input.existingTitles.length
      ? input.existingTitles.slice(0, 60).map((title) => `- ${title}`)
      : ["- (nothing yet)"]),
    "",
    "Score each idea 0-10 on five axes and explain the score in one sentence a shopkeeper would understand:",
    "- hook_score: would the first line stop a thumb",
    "- demand_score: are customers actually asking about this",
    "- freshness_score: is this newly relevant right now",
    "- business_value_score: does it lead to paid work at this shop",
    "- shareability_score: would somebody forward it to family",
    "",
    "Return JSON: an array of objects with keys: title, description, category, target_audience,",
    "source (one of customer_question, government_update, service_catalogue, past_performance, faq,",
    "comment, document, ai), source_url (or null), hook_score, demand_score, freshness_score,",
    "business_value_score, shareability_score, reason, suggested_format (REEL, CAROUSEL,",
    "STATIC_POSTER, STORY, THREAD, FACEBOOK_POST, YOUTUBE_SHORT, WHATSAPP, ARTICLE).",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

/**
 * Ask for ideas, then throw away the ones already said.
 *
 * The model is told what exists and still repeats itself, so the deduplication
 * below is not belt-and-braces; it is the thing that stops the bank filling up
 * with four phrasings of the same Labour Card post.
 */
export async function mineIdeas(input: MineInput): Promise<{ ideas: MinedIdea[]; dropped: number }> {
  const raw = await generateJson<RawIdea[]>({
    task: "strategy",
    system: SYSTEM,
    prompt: buildPrompt(input),
    parse: parseIdeas,
    // Pressing "Generate more" must not return the cached previous ten.
    fresh: true,
    temperature: 0.9,
  });

  const candidates: MinedIdea[] = raw
    .map((item): MinedIdea | null => {
      const title = String(item.title ?? "").trim();
      if (!title) return null;

      const scores = normalizeScores({
        hook_score: item.hook_score,
        demand_score: item.demand_score,
        freshness_score: item.freshness_score,
        business_value_score: item.business_value_score,
        shareability_score: item.shareability_score,
      });
      const description = String(item.description ?? "").trim();
      const government = looksGovernmental(title, description, String(item.category ?? ""));
      const source = VALID_SOURCES.includes(String(item.source ?? "") as IdeaSource)
        ? (String(item.source) as IdeaSource)
        : "ai";

      return {
        title: title.slice(0, 200),
        description: description.slice(0, 1500),
        source,
        sourceUrl: asUrl(item.source_url),
        category: String(item.category ?? "General").trim().slice(0, 80) || "General",
        targetAudience: String(item.target_audience ?? input.brand.audience).trim().slice(0, 300),
        scores,
        totalScore: totalScore(scores),
        scoreReason: String(item.reason ?? "").trim().slice(0, 500),
        suggestedFormat: asFormat(item.suggested_format, suggestFormat(scores, government)),
        status: "NEW" as const,
        government,
      } satisfies MinedIdea;
    })
    .filter((idea): idea is MinedIdea => idea !== null);

  const existing = input.existingTitles.map((title) => ({ title } as MinedIdea));
  const { kept, dropped } = dedupe(candidates, existing, (idea) => idea.title);

  return { ideas: kept, dropped: dropped.length };
}
