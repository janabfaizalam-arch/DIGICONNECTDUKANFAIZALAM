import "server-only";

import { generateJson } from "@/lib/content-engine/ai/generate";
import { bannedPhrasesIn, voicePrompt } from "@/lib/content-engine/brand-voice";
import type { BrandSettings, ContentFormat } from "@/lib/content-engine/types";

/**
 * Stage 03 — the master piece.
 *
 * One post is written properly here and everything downstream is a
 * repackaging of it. That ordering matters: writing seven platform posts from
 * the same brief gives seven mediocre posts, and rewriting one good post for
 * seven platforms gives seven good ones.
 *
 * The format decides the shape. A reel is a script with scenes and spoken
 * lines; a carousel is six slides; an article has headings. Asking for
 * "content" and hoping gets prose that fits nowhere, so the shape is
 * specified per format below.
 */

const SYSTEM = `You write social content for a small-town Indian digital services shop.
Write the way the shop talks to a customer at its counter: plain, specific, useful.
Never use generic corporate language. Never use em dashes. Never write a windy opening.
Never state a government amount, fee, eligibility rule or deadline that was not given to you —
if a figure is needed and was not supplied, write the sentence without the figure.
Return JSON only.`;

/** What each format is, as instructions the model can actually follow. */
const FORMAT_BRIEF: Record<ContentFormat, string> = {
  REEL: `A reel script.
- hook: the first spoken line, under 12 words
- scenes: 4 to 6 scenes. Each has: scene (what is on screen), spoken (the line said aloud,
  one or two sentences), on_screen (the text overlay, under 6 words)
- cta: the closing line, one action`,
  CAROUSEL: `A carousel.
- hook: slide 1, the line that makes somebody swipe
- slides: 5 slides after the first. Each has: heading (under 6 words) and body (one or two lines)
- cta: the final slide's line, one action`,
  STATIC_POSTER: `A single poster.
- hook: the headline, under 7 words
- body: 2 or 3 lines of supporting text
- cta: one action`,
  STORY: `A story frame.
- hook: the top line, under 8 words
- body: one or two short lines
- cta: what to tap or reply`,
  THREAD: `A thread.
- hook: the opening post
- slides: 4 to 6 further posts, each with heading and body
- cta: the closing post`,
  FACEBOOK_POST: `A Facebook post.
- hook: the first line
- body: 3 to 5 short paragraphs
- cta: one action`,
  YOUTUBE_SHORT: `A YouTube Short.
- title: a title somebody would actually search for, under 70 characters
- hook: the first spoken line
- scenes: 3 to 5 scenes with scene, spoken, on_screen
- description: 3 or 4 lines for the description box
- cta: the closing line`,
  WHATSAPP: `A WhatsApp message to one customer.
- hook: the opening line
- body: 2 or 3 short lines, simple Hindi
- cta: something they can reply to`,
  ARTICLE: `A website article.
- title: an SEO title under 65 characters
- hook: the first paragraph, which answers the question immediately
- sections: 4 to 6 sections, each with heading and body (2 to 4 paragraphs)
- cta: the closing paragraph`,
};

export type Draft = {
  title: string;
  hook: string;
  /** The body as one string, formatted for the format it was written in. */
  body: string;
  cta: string;
  /** Reel and Short only. Kept structured so a designer can read the script. */
  scenes: { scene: string; spoken: string; onScreen: string }[];
  /** Carousel, thread and article. */
  sections: { heading: string; body: string }[];
  caption: string;
  hashtags: string[];
  /** Words the brand said it never wants, found anyway. Shown, not stripped. */
  warnings: string[];
};

type RawDraft = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

/**
 * Flatten the structured answer into a readable body.
 *
 * Both are kept: `scenes` and `sections` so the design and repurpose stages
 * can use the structure, `body` so a person reading the draft screen sees a
 * post rather than a JSON tree.
 */
function flatten(draft: Omit<Draft, "body" | "warnings">): string {
  if (draft.scenes.length) {
    return draft.scenes
      .map((scene, index) =>
        [
          `Scene ${index + 1}: ${scene.scene}`,
          scene.spoken ? `Bolna hai: ${scene.spoken}` : "",
          scene.onScreen ? `Screen par: ${scene.onScreen}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n");
  }
  if (draft.sections.length) {
    return draft.sections.map((section) => `${section.heading}\n${section.body}`).join("\n\n");
  }
  return draft.caption;
}

export async function writeDraft(input: {
  brand: BrandSettings;
  topic: string;
  hook: string;
  angleReason: string;
  format: ContentFormat;
  audience: string;
  government: boolean;
  /** Verified facts the writer may use. Anything not here must not be asserted. */
  verifiedFacts: string[];
}): Promise<Draft> {
  const prompt = [
    voicePrompt(input.brand),
    "",
    `Topic: ${input.topic}`,
    `Use this hook, or a sharper version of it: ${input.hook}`,
    input.angleReason ? `Why this angle: ${input.angleReason}` : "",
    `Audience: ${input.audience || input.brand.audience}`,
    "",
    input.government
      ? [
          "THIS IS GOVERNMENT INFORMATION. Two rules override everything else:",
          "1. You may state ONLY the facts listed below. No other amount, date, fee, document or",
          "   eligibility rule may appear anywhere in the output.",
          "2. Where a figure would be natural but is not in the list, write the sentence without it",
          "   and tell the reader to confirm at the shop.",
          "",
          "VERIFIED FACTS YOU MAY USE:",
          ...(input.verifiedFacts.length
            ? input.verifiedFacts.map((fact) => `- ${fact}`)
            : ["- (none supplied — write the post without any figures, dates or eligibility rules)"]),
          "",
        ].join("\n")
      : "",
    `FORMAT — ${input.format}:`,
    FORMAT_BRIEF[input.format],
    "",
    "Also return:",
    "- caption: the caption as it would be posted, with line breaks",
    "- hashtags: 5 to 10 relevant hashtags without the # symbol",
    "",
    "Return one JSON object with the keys named above.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const raw = await generateJson<RawDraft>({
    task: "final_writing",
    system: SYSTEM,
    prompt,
    parse: (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Expected a single draft object.");
      }
      return value as RawDraft;
    },
    fresh: true,
    temperature: 0.8,
  });

  const scenes = list(raw.scenes).map((scene) => ({
    scene: text(scene.scene),
    spoken: text(scene.spoken),
    onScreen: text(scene.on_screen ?? scene.onScreen),
  }));

  const sections = list(raw.sections ?? raw.slides).map((section) => ({
    heading: text(section.heading),
    body: text(section.body),
  }));

  const partial = {
    title: text(raw.title) || input.topic,
    hook: text(raw.hook) || input.hook,
    cta: text(raw.cta),
    scenes,
    sections,
    caption: text(raw.caption) || text(raw.description),
    hashtags: (Array.isArray(raw.hashtags) ? raw.hashtags : [])
      .map((tag) => String(tag).replace(/^#/, "").trim())
      .filter(Boolean)
      .slice(0, 12),
  };

  const body = flatten(partial);
  const warnings = bannedPhrasesIn([partial.hook, body, partial.caption, partial.cta].join("\n"), input.brand);

  return { ...partial, body, warnings };
}

/**
 * Rewrite one piece of text without regenerating the post.
 *
 * "Is caption ko aur simple Hindi mein karo" is a formatting job, not a
 * writing job, so it goes to the cheap tier. Regenerating the whole draft to
 * shorten a caption would cost several times as much and lose the parts the
 * admin already approved of.
 */
export async function rewrite(input: {
  brand: BrandSettings;
  text: string;
  instruction: string;
}): Promise<string> {
  const result = await generateJson<{ text: string }>({
    task: "simple_rewrite",
    system: SYSTEM,
    prompt: [
      voicePrompt(input.brand),
      "",
      "Rewrite the text below. Change nothing about its meaning, and do not add any fact,",
      "figure, date or eligibility rule that is not already in it.",
      "",
      `Instruction: ${input.instruction}`,
      "",
      "TEXT:",
      input.text,
      "",
      'Return JSON: { "text": "the rewritten text" }',
    ].join("\n"),
    parse: (value) => {
      const out = text((value as { text?: unknown })?.text);
      if (!out) throw new Error("The rewrite came back empty.");
      return { text: out };
    },
    fresh: true,
    temperature: 0.4,
  });

  return result.text;
}
