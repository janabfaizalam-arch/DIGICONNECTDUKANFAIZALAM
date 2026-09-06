import "server-only";

import { generateJson } from "@/lib/content-engine/ai/generate";
import { voicePrompt } from "@/lib/content-engine/brand-voice";
import { HOOK_DUPLICATE_THRESHOLD, findDuplicate, freshnessAgainst } from "@/lib/content-engine/duplicates";
import { hookStyleOf } from "@/lib/content-engine/scoring";
import { CONTENT_FORMATS, type BrandSettings, type ContentAngle, type ContentFormat, type ContentIdea } from "@/lib/content-engine/types";

/**
 * Stage 02 — five ways in, and which one to take.
 *
 * One topic has many openings and they are not equally good: "Labour Card ke
 * fayde" and "Labour Card hai lekin ye ek kaam nahi kiya to paisa nahi
 * milega" are the same information and completely different posts. Generating
 * several and picking one is cheap; realising after publishing that the flat
 * one went out is not.
 *
 * Freshness is computed here rather than asked for. A model has no memory of
 * what this shop posted in March, so asking it "is this hook fresh?" gets a
 * confident guess. Comparing against the recorded hooks gets an answer.
 */

export type AngleInput = {
  brand: BrandSettings;
  idea: Pick<ContentIdea, "title" | "description" | "category" | "targetAudience" | "suggestedFormat" | "government">;
  /** Every hook this shop has used, most recent first. */
  usedHooks: string[];
  count: number;
};

const SYSTEM = `You write opening hooks for a small-town Indian digital services shop.
A hook is the first line of a post: it has to stop somebody scrolling. Write hooks about the real
problem the customer has, never about the shop. Never invent a government amount, deadline or
eligibility rule. Return JSON only.`;

type RawAngle = {
  hook?: unknown;
  why?: unknown;
  format?: unknown;
  appeal?: unknown;
};

function parseAngles(value: unknown): RawAngle[] {
  if (Array.isArray(value)) return value as RawAngle[];
  if (value && typeof value === "object" && Array.isArray((value as { hooks?: unknown }).hooks)) {
    return (value as { hooks: RawAngle[] }).hooks;
  }
  throw new Error("Expected an array of hooks.");
}

function asFormat(value: unknown, fallback: ContentFormat): ContentFormat {
  const upper = String(value ?? "").toUpperCase().replace(/[\s-]/g, "_");
  return (CONTENT_FORMATS as readonly string[]).includes(upper) ? (upper as ContentFormat) : fallback;
}

function clampTen(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(10, Math.round(number))) : 5;
}

export async function generateAngles(input: AngleInput): Promise<ContentAngle[]> {
  const recent = input.usedHooks.slice(0, 40);

  const prompt = [
    voicePrompt(input.brand),
    "",
    `Topic: ${input.idea.title}`,
    input.idea.description ? `Detail: ${input.idea.description}` : "",
    `Category: ${input.idea.category}`,
    `Audience: ${input.idea.targetAudience || input.brand.audience}`,
    input.idea.government
      ? "This is government information. The hook may create urgency about a deadline only if the deadline was given to you; otherwise talk about the problem, not the date."
      : "",
    "",
    `Write ${Math.max(5, input.count)} DIFFERENT hooks. Each must take a genuinely different angle:`,
    "a question somebody asked, a mistake people make, a deadline, a myth, a real counter story,",
    "a number list, a warning. Do not write five versions of the same sentence.",
    "",
    recent.length ? "HOOKS THIS SHOP HAS ALREADY USED — take a different angle from all of these:" : "",
    ...recent.map((hook) => `- ${hook}`),
    "",
    "For each hook return: hook (the line itself, under 90 characters), why (one sentence on why it",
    "works for this audience), format (REEL, CAROUSEL, STATIC_POSTER, STORY, THREAD, FACEBOOK_POST,",
    "YOUTUBE_SHORT, WHATSAPP, ARTICLE), appeal (0-10, estimated audience appeal).",
    "Return a JSON array.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const raw = await generateJson<RawAngle[]>({
    task: "strategy",
    system: SYSTEM,
    prompt,
    parse: parseAngles,
    fresh: true,
    temperature: 0.95,
  });

  const angles: ContentAngle[] = raw
    .map((item) => String(item.hook ?? "").trim())
    .map((hook, index) => ({ hook, item: raw[index] }))
    .filter(({ hook }) => hook.length > 0)
    .map(({ hook, item }) => ({
      hook: hook.slice(0, 200),
      reason: String(item.why ?? "").trim().slice(0, 300),
      format: asFormat(item.format, input.idea.suggestedFormat),
      freshness: freshnessAgainst(hook, input.usedHooks),
      appeal: clampTen(item.appeal),
      recommended: false,
    }));

  return recommend(angles);
}

/**
 * Pick one, and say so.
 *
 * Appeal and freshness together, appeal weighted higher: a hook nobody has
 * used that also nobody would click is not the recommendation. An admin can
 * always choose differently — the point is that the screen has an opinion
 * rather than five equal options and a shrug.
 */
export function recommend(angles: ContentAngle[]): ContentAngle[] {
  if (!angles.length) return angles;
  let bestIndex = 0;
  let bestScore = -1;

  angles.forEach((angle, index) => {
    const score = angle.appeal * 0.7 + angle.freshness * 0.3;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return angles.map((angle, index) => ({ ...angle, recommended: index === bestIndex }));
}

/** A hook that is a rephrasing of one already used, so the screen can say so. */
export function repeatWarning(hook: string, usedHooks: string[]): string | null {
  const match = findDuplicate(hook, usedHooks, (used) => used, HOOK_DUPLICATE_THRESHOLD);
  return match ? `Very close to a hook already used: "${match.item}"` : null;
}

export { hookStyleOf };
