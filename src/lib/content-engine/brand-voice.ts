/**
 * How DigiConnect sounds, and where that description comes from.
 *
 * The default below is a starting point written from how the shop already
 * talks to customers at the counter. It is not meant to stay the default:
 * the Brand screen takes ten or twenty posts that actually worked, and the
 * analysis replaces every field here with something derived from real text.
 * A voice guide asserted by a model that has never read your posts is a
 * guess; one derived from them is a description.
 *
 * Every generation prompt in this engine ends with `voicePrompt()`, so
 * changing the guide changes the writing everywhere at once.
 */

import type { BrandSettings, BrandVoiceGuide } from "@/lib/content-engine/types";

export const DEFAULT_VOICE: BrandVoiceGuide = {
  sentenceStyle: "Short sentences. One idea each. Rarely more than twelve words.",
  vocabulary:
    "Everyday Hinglish. The words a customer uses at the counter — 'form bharna', 'documents', " +
    "'last date' — not the words a government circular uses.",
  tone: "Practical and trustworthy. Helpful without being pushy. Never dramatic about somebody's money.",
  hookStyle:
    "Open with the customer's actual problem or a real question somebody asked. Never open with " +
    "'In today's digital world'.",
  ctaStyle:
    "One action, stated plainly. 'WhatsApp kijiye', 'dukan par aa jaiye', 'form yahan bhariye'. " +
    "Never two actions in one post.",
  paragraphLength: "One to three lines. White space between them so it reads on a phone.",
  punctuation:
    "Full stops. Question marks where a question is asked. No em dashes, no exclamation walls, " +
    "at most one emoji and only where it helps scanning.",
  commonPhrases: [
    "aasan bhasha mein",
    "documents ye lagenge",
    "last date nikal na jaaye",
    "ek baar dukan par aa jaiye",
    "hum kar denge",
  ],
  wordsToAvoid: [
    "revolutionary",
    "cutting-edge",
    "seamless",
    "unlock",
    "empower",
    "in today's digital world",
    "leverage",
    "one-stop solution",
    "hassle-free",
    "game-changer",
  ],
  analyzedAt: null,
  sampleCount: 0,
};

export const DEFAULT_BRAND: BrandSettings = {
  brandName: "DigiConnect Dukan",
  logoUrl: null,
  primaryColors: ["#075bbb", "#ff6800"],
  secondaryColors: ["#10213d", "#eaf4ff"],
  fonts: { heading: "Poppins", body: "Inter" },
  tone: "Practical, trustworthy, simple, customer-friendly, professional.",
  preferredLanguage: "Hinglish (Hindi in Roman script, English for official terms)",
  wordsToAvoid: DEFAULT_VOICE.wordsToAvoid,
  ctaRules: [
    "One call to action per post.",
    "Name the action, not the benefit: 'WhatsApp kijiye', not 'get started today'.",
    "Never promise an outcome the government decides — approval, amount, or date.",
  ],
  audience:
    "Customers of a small-town digital services shop: workers, shopkeepers, farmers, students and " +
    "their families. Many read Hindi more comfortably than English. Most are on a phone.",
  businessCategories: [
    "Labour Card",
    "Government schemes",
    "ITR & GST",
    "Insurance",
    "Credit & loans",
    "Certificates & documents",
    "Printing & Smart Print",
  ],
  visualRules: [
    "Logo bottom-right, never over a face.",
    "Headline in no more than seven words.",
    "Rupee figures large enough to read at thumbnail size.",
    "Never put a scheme amount on a design that has not been fact checked.",
  ],
  voice: DEFAULT_VOICE,
};

/**
 * The voice, as the paragraph every prompt carries.
 *
 * Written as instructions rather than description because that is what a
 * model follows. The negative list is last on purpose: it is the part most
 * often ignored, and last is where instructions stick.
 */
export function voicePrompt(brand: BrandSettings): string {
  const voice = brand.voice ?? DEFAULT_VOICE;
  const avoid = [...new Set([...(brand.wordsToAvoid ?? []), ...(voice.wordsToAvoid ?? [])])];

  return [
    `You are writing as ${brand.brandName}, a digital services shop.`,
    `Audience: ${brand.audience}`,
    `Language: ${brand.preferredLanguage}.`,
    `Tone: ${brand.tone}`,
    "",
    "Voice rules, derived from this shop's own posts:",
    `- Sentences: ${voice.sentenceStyle}`,
    `- Vocabulary: ${voice.vocabulary}`,
    `- Hooks: ${voice.hookStyle}`,
    `- Calls to action: ${voice.ctaStyle}`,
    `- Paragraphs: ${voice.paragraphLength}`,
    `- Punctuation: ${voice.punctuation}`,
    voice.commonPhrases.length ? `- Phrases this shop actually uses: ${voice.commonPhrases.join("; ")}` : "",
    "",
    ...(brand.ctaRules.length ? ["CTA rules:", ...brand.ctaRules.map((rule) => `- ${rule}`), ""] : []),
    "Never do these:",
    "- Never use generic corporate language or marketing filler.",
    "- Never use em dashes.",
    "- Never open with a windy preamble; the first line is the hook.",
    "- Never state a government amount, fee, eligibility rule or deadline you were not given.",
    avoid.length ? `- Never use these words or phrases: ${avoid.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * The parts of the guide a model may rewrite from example posts.
 *
 * `analyzedAt` and `sampleCount` are set by the server from what it actually
 * read, never by the model: a guide that claims to have been derived from
 * forty posts when it saw three is worse than no guide at all.
 */
export const ANALYSABLE_VOICE_FIELDS = [
  "sentenceStyle",
  "vocabulary",
  "tone",
  "hookStyle",
  "ctaStyle",
  "paragraphLength",
  "punctuation",
  "commonPhrases",
  "wordsToAvoid",
] as const;

export function mergeVoice(current: BrandVoiceGuide, incoming: Partial<BrandVoiceGuide>): BrandVoiceGuide {
  const merged: BrandVoiceGuide = { ...current };
  for (const field of ANALYSABLE_VOICE_FIELDS) {
    const value = incoming[field];
    if (Array.isArray(value) && value.length) {
      (merged[field] as string[]) = value.map((item) => String(item)).filter(Boolean);
    } else if (typeof value === "string" && value.trim()) {
      (merged[field] as string) = value.trim();
    }
  }
  return merged;
}

/**
 * Things the shop said it never wants to see, found in generated text.
 *
 * The prompt already forbids them; this catches the times the model does it
 * anyway. Returned rather than stripped, because silently rewriting a draft
 * hides the fact that the model is drifting.
 */
export function bannedPhrasesIn(text: string, brand: BrandSettings): string[] {
  const haystack = (text ?? "").toLowerCase();
  const banned = [...new Set([...(brand.wordsToAvoid ?? []), ...(brand.voice?.wordsToAvoid ?? [])])];
  const found = banned.filter((word) => word && haystack.includes(word.toLowerCase()));
  // The em dash is a house rule rather than a word, so it is checked separately.
  if (text?.includes("—")) found.push("em dash");
  return found;
}
