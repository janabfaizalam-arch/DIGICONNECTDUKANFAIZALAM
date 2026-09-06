/**
 * Turning approved copy into something a designer — or Canva — can execute.
 *
 * The specification is built here, in code, from the post and the brand
 * settings. A model is asked only for the two things that are genuinely
 * writing: a headline short enough to read at thumbnail size, and a visual
 * suggestion. Canvas size, margins, colours, fonts and logo placement are
 * facts about the brand and the platform, and paying a model to restate them
 * is money spent to get a worse answer.
 *
 * The result stands on its own. If Canva is not connected, this specification
 * plus the template variables is still a complete brief that a person can
 * build from in ten minutes, which is the difference between an integration
 * being unavailable and the feature being unavailable.
 */

import { canvasFor, specFor } from "@/lib/content-engine/platforms";
import type {
  BrandSettings,
  ContentFormat,
  ContentPlatform,
  DesignSpec,
} from "@/lib/content-engine/types";

/**
 * The variables a template exposes.
 *
 * Named exactly as the brief specifies, because these strings appear in Canva
 * brand-template fields and in any local template, and a rename here silently
 * empties a design rather than failing loudly.
 */
export const TEMPLATE_VARIABLES = [
  "{{HOOK}}",
  "{{HEADLINE}}",
  "{{SUBHEAD}}",
  "{{BODY}}",
  "{{CTA}}",
  "{{LOGO}}",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

/**
 * Safe margins as a share of the shorter side.
 *
 * Instagram covers the bottom of a story with the profile row and the top
 * with the status bar, so a story gets a much deeper vertical margin than a
 * square post. Text inside these bounds survives every crop the platforms
 * apply.
 */
function marginsFor(canvasHeight: number, canvasWidth: number, format: ContentFormat) {
  const short = Math.min(canvasWidth, canvasHeight);
  const base = Math.round(short * 0.07);
  const tall = format === "STORY" || format === "REEL";
  return {
    top: tall ? Math.round(canvasHeight * 0.14) : base,
    right: base,
    bottom: tall ? Math.round(canvasHeight * 0.18) : base,
    left: base,
  };
}

export type DesignCopy = {
  headline: string;
  subheadline: string;
  /** One line per bullet on the design. Three at most; a poster is not a page. */
  body: string[];
  cta: string;
  visualSuggestion: string;
};

/** Keep a headline to seven words, as the brand's visual rules require. */
export function trimHeadline(text: string, maxWords = 7): string {
  const words = (text ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

export function buildDesignSpec(input: {
  platform: ContentPlatform;
  format: ContentFormat;
  hook: string;
  copy: DesignCopy;
  brand: BrandSettings;
}): DesignSpec {
  const canvas = canvasFor(input.platform, input.format);
  const spec = specFor(input.platform);
  const [primary, accent] = [
    input.brand.primaryColors[0] ?? "#075bbb",
    input.brand.primaryColors[1] ?? input.brand.secondaryColors[0] ?? "#ff6800",
  ];

  const headline = trimHeadline(input.copy.headline || input.hook);
  const body = (input.copy.body ?? []).map((line) => line.trim()).filter(Boolean).slice(0, 3);

  return {
    canvas,
    headline,
    subheadline: input.copy.subheadline.trim(),
    body,
    cta: input.copy.cta.trim(),
    visualSuggestion: input.copy.visualSuggestion.trim(),
    logoPlacement:
      input.brand.visualRules.find((rule) => rule.toLowerCase().includes("logo")) ??
      "Logo bottom-right, inside the safe margin, never over a face.",
    colors: {
      primary,
      secondary: accent,
      background: input.brand.secondaryColors[1] ?? "#ffffff",
      text: input.brand.secondaryColors[0] ?? "#10213d",
    },
    font: input.brand.fonts,
    safeMargins: marginsFor(canvas.height, canvas.width, input.format),
    variables: {
      "{{HOOK}}": input.hook.trim(),
      "{{HEADLINE}}": headline,
      "{{SUBHEAD}}": input.copy.subheadline.trim(),
      "{{BODY}}": body.join("\n"),
      "{{CTA}}": input.copy.cta.trim() || spec.voiceNote.slice(0, 0),
      "{{LOGO}}": input.brand.logoUrl ?? "",
    },
  };
}

/**
 * The specification as a brief somebody can work from without this software.
 *
 * Downloaded from the Designs screen. It exists because "Canva is not
 * connected" should cost the shop ten minutes of layout work, not a post.
 */
export function specToBrief(spec: DesignSpec, brand: BrandSettings): string {
  return [
    `${brand.brandName} — design brief`,
    "",
    `Canvas: ${spec.canvas.label} (${spec.canvas.width} × ${spec.canvas.height} px)`,
    `Safe margins: top ${spec.safeMargins.top}px, right ${spec.safeMargins.right}px, ` +
      `bottom ${spec.safeMargins.bottom}px, left ${spec.safeMargins.left}px`,
    "",
    `Headline: ${spec.headline}`,
    spec.subheadline ? `Subheadline: ${spec.subheadline}` : "",
    spec.body.length ? "Body:" : "",
    ...spec.body.map((line) => `  • ${line}`),
    `Call to action: ${spec.cta}`,
    "",
    `Visual: ${spec.visualSuggestion}`,
    `Logo: ${spec.logoPlacement}`,
    `Colours: primary ${spec.colors.primary}, accent ${spec.colors.secondary}, ` +
      `background ${spec.colors.background}, text ${spec.colors.text}`,
    `Fonts: ${spec.font.heading} for headings, ${spec.font.body} for body`,
    "",
    "Rules:",
    ...brand.visualRules.map((rule) => `  • ${rule}`),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** Fill a template string. Unknown placeholders are left alone, not blanked. */
export function fillTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{[A-Z_]+\}\}/g, (match) => variables[match] ?? match);
}
