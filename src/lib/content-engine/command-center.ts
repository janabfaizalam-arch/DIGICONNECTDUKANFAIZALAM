/**
 * Understanding "Is hafte kya post karna chahiye?"
 *
 * The command centre is a chat box, and the temptation is to send every
 * sentence to a model and let it decide. Two reasons not to. A model asked
 * "number 2 chalao" with no grounding will happily invent which idea number
 * two is; and paying for a model call to recognise "5 Labour Card ideas do"
 * is exactly the spending the cost rules forbid.
 *
 * So the common shapes are matched here, for free and predictably, and
 * anything unrecognised falls through to the model with the real state of the
 * engine attached. Hindi, Hinglish and English all appear in the same
 * sentence in this shop, so every pattern accepts all three.
 *
 * Pure: parsing only. Running the intent is the route's job.
 */

import { ALL_PLATFORMS } from "@/lib/content-engine/platforms";
import type { ContentFormat, ContentPlatform } from "@/lib/content-engine/types";

export type CommandIntent =
  | { kind: "plan_week"; detail: string }
  | { kind: "run_idea"; reference: number | string }
  | { kind: "generate_ideas"; count: number; topic: string }
  | { kind: "more_hooks"; count: number; reference: string }
  | { kind: "simplify"; reference: string; language: "hindi" | "english" | "hinglish" }
  | { kind: "convert_format"; format: ContentFormat; reference: string }
  | { kind: "analyse"; period: "week" | "month" | "all" }
  | { kind: "calendar"; days: number }
  | { kind: "status" }
  | { kind: "platform_version"; platform: ContentPlatform; reference: string }
  | { kind: "unknown"; text: string };

const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

export function normalizeCommand(text: string): string {
  return (text ?? "")
    .replace(/[०-९]/g, (digit) => DEVANAGARI_DIGITS[digit] ?? digit)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function firstNumber(text: string, fallback: number): number {
  const match = text.match(/\b(\d{1,2})\b/);
  const value = match ? Number.parseInt(match[1], 10) : Number.NaN;
  return Number.isFinite(value) && value > 0 ? Math.min(20, value) : fallback;
}

const FORMAT_WORDS: [RegExp, ContentFormat][] = [
  [/carousel|carousal|slide/, "CAROUSEL"],
  [/reel|video/, "REEL"],
  [/story|stories/, "STORY"],
  [/short/, "YOUTUBE_SHORT"],
  [/poster|image|photo|banner/, "STATIC_POSTER"],
  [/thread/, "THREAD"],
  [/whatsapp|wa message/, "WHATSAPP"],
  [/article|blog|website/, "ARTICLE"],
];

const PLATFORM_WORDS: [RegExp, ContentPlatform][] = [
  [/instagram|insta|ig\b/, "INSTAGRAM"],
  [/facebook|fb\b/, "FACEBOOK"],
  [/youtube|yt\b/, "YOUTUBE"],
  [/whatsapp|wa\b/, "WHATSAPP"],
  [/linkedin/, "LINKEDIN"],
  [/website|blog|site/, "WEBSITE"],
  [/google business|gmb|google post/, "GOOGLE_BUSINESS"],
];

/**
 * Which of the shown ideas "number 2" or "wo wala" refers to.
 *
 * A number is unambiguous. Anything else is returned as text for the model to
 * resolve against the list it was shown, rather than being guessed at here.
 */
function reference(text: string): number | string {
  const numbered = text.match(/(?:number|no\.?|#|idea)\s*(\d{1,2})/) ?? text.match(/^(\d{1,2})\b/);
  if (numbered) return Number.parseInt(numbered[1], 10);
  return text;
}

export function parseCommand(input: string): CommandIntent {
  const text = normalizeCommand(input);
  if (!text) return { kind: "unknown", text: "" };

  // "Is hafte kya post karna chahiye?" — the question this box exists for.
  if (/(kya|what).*(post|content|banau|banaye|likhu)/.test(text) && /(hafte|week|aaj|today|kal)/.test(text)) {
    return { kind: "plan_week", detail: text };
  }
  if (/^(kya post|what should i post|suggest)/.test(text)) {
    return { kind: "plan_week", detail: text };
  }

  // "Number 2 chalao" — run the whole pipeline on a listed idea.
  if (/(chalao|chala do|run|start|banao is|isko banao|shuru)/.test(text) && /\d/.test(text)) {
    return { kind: "run_idea", reference: reference(text) };
  }

  // "Next week's content calendar banao."
  if (/(calendar|schedule).*(banao|bana do|make|create|plan)/.test(text) || /(calendar|schedule) chahiye/.test(text)) {
    const days = /month|mahine|mahina/.test(text) ? 30 : /week|hafte|hafta/.test(text) ? 7 : 7;
    return { kind: "calendar", days };
  }

  // "Last month ke winners analyse karo."
  if (/(analyse|analyze|analysis|winner|performance|report|kaisa raha|kaisi rahi)/.test(text)) {
    const period = /month|mahine|mahina/.test(text) ? "month" : /all|sab|total/.test(text) ? "all" : "week";
    return { kind: "analyse", period };
  }

  // "Is post ke 5 better hooks do."
  if (/hook/.test(text)) {
    return { kind: "more_hooks", count: firstNumber(text, 5), reference: text };
  }

  // "Is caption ko aur simple Hindi mein karo."
  if (/(simple|aasan|asaan|easy|chhota|short).*(karo|kar do|banao|bana do|mein)/.test(text) || /simplify/.test(text)) {
    const language = /hindi/.test(text) ? "hindi" : /english/.test(text) ? "english" : "hinglish";
    return { kind: "simplify", reference: text, language };
  }

  // "Is design ko carousel mein convert karo."
  if (/(convert|badal|badlo|change|mein karo|me karo)/.test(text)) {
    const format = FORMAT_WORDS.find(([pattern]) => pattern.test(text))?.[1];
    if (format) return { kind: "convert_format", format, reference: text };
    const platform = PLATFORM_WORDS.find(([pattern]) => pattern.test(text))?.[1];
    if (platform && ALL_PLATFORMS.includes(platform)) {
      return { kind: "platform_version", platform, reference: text };
    }
  }

  // "5 Labour Card ideas do."
  if (/(idea|ideas|topic|topics)/.test(text)) {
    const count = firstNumber(text, 5);
    const topic = input
      .replace(/\b\d{1,2}\b/, " ")
      .replace(/\b(idea|ideas|topic|topics|do|dijiye|chahiye|de do|generate|banao|give me|suggest)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { kind: "generate_ideas", count, topic };
  }

  // "Version for instagram banao."
  const platform = PLATFORM_WORDS.find(([pattern]) => pattern.test(text))?.[1];
  if (platform && /(version|post|banao|bana do|likho)/.test(text)) {
    return { kind: "platform_version", platform, reference: text };
  }

  if (/(status|kahan tak|kya chal raha|pipeline|kitne)/.test(text)) {
    return { kind: "status" };
  }

  return { kind: "unknown", text: input.trim() };
}

/** What the chat box shows as examples, so the syntax is discoverable. */
export const EXAMPLE_COMMANDS = [
  "Is hafte kya post karna chahiye?",
  "Number 2 chalao.",
  "5 Labour Card ideas do.",
  "Is post ke 5 better hooks do.",
  "Is caption ko aur simple Hindi mein karo.",
  "Is design ko carousel mein convert karo.",
  "Last month ke winners analyse karo.",
  "Next week's content calendar banao.",
];
