/**
 * What each platform will actually accept.
 *
 * The repurpose engine's whole job is that the same idea leaves this system
 * as seven native posts rather than one post pasted seven times, and "native"
 * begins with the mechanical facts: a caption limit, a canvas shape, whether
 * hashtags help or look desperate, whether a link is clickable at all.
 *
 * These are the platform rules as they stand for a small Indian services
 * business posting from a phone. Where a limit is generous the number below
 * is the *useful* limit rather than the technical one — Instagram permits
 * 2,200 characters and nobody reads past four lines.
 */

import type { ContentFormat, ContentPlatform, MediaType } from "@/lib/content-engine/types";

export type PlatformSpec = {
  platform: ContentPlatform;
  label: string;
  /** What a post here is, in one line, for the admin who has to choose. */
  purpose: string;
  formats: ContentFormat[];
  defaultFormat: ContentFormat;
  defaultMedia: MediaType;
  /** Useful caption length, not the technical ceiling. */
  captionLimit: number;
  titleLimit: number;
  hashtags: { min: number; max: number };
  /** False where a link in the body is not clickable, so the CTA must not rely on one. */
  clickableLinks: boolean;
  /** The canvas this platform's design is laid out on. */
  canvas: { width: number; height: number; label: string };
  /** Written into the prompt so the model packages for this platform, not in general. */
  voiceNote: string;
};

export const PLATFORM_SPECS: Record<ContentPlatform, PlatformSpec> = {
  INSTAGRAM: {
    platform: "INSTAGRAM",
    label: "Instagram",
    purpose: "Reach new people who have never heard of the shop.",
    formats: ["REEL", "CAROUSEL", "STATIC_POSTER", "STORY"],
    defaultFormat: "REEL",
    defaultMedia: "VIDEO",
    captionLimit: 900,
    titleLimit: 100,
    hashtags: { min: 5, max: 12 },
    clickableLinks: false,
    canvas: { width: 1080, height: 1350, label: "Instagram post 4:5" },
    voiceNote:
      "First line has to stop a thumb. No link in the caption — say 'link bio mein' or 'WhatsApp kijiye'. Hinglish, short lines.",
  },
  FACEBOOK: {
    platform: "FACEBOOK",
    label: "Facebook",
    purpose: "The local audience that already knows the shop, and shares to family groups.",
    formats: ["FACEBOOK_POST", "STATIC_POSTER", "CAROUSEL", "REEL"],
    defaultFormat: "FACEBOOK_POST",
    defaultMedia: "IMAGE",
    captionLimit: 1200,
    titleLimit: 120,
    hashtags: { min: 0, max: 3 },
    clickableLinks: true,
    canvas: { width: 1200, height: 1200, label: "Facebook square" },
    voiceNote:
      "Slightly longer and warmer than Instagram. Links work here. Hashtags look out of place — three at most.",
  },
  YOUTUBE: {
    platform: "YOUTUBE",
    label: "YouTube",
    purpose: "Searchable explainers people find months later.",
    formats: ["YOUTUBE_SHORT", "REEL"],
    defaultFormat: "YOUTUBE_SHORT",
    defaultMedia: "VIDEO",
    captionLimit: 1500,
    titleLimit: 70,
    hashtags: { min: 2, max: 5 },
    clickableLinks: true,
    canvas: { width: 1280, height: 720, label: "YouTube thumbnail" },
    voiceNote:
      "Title carries the search. Put the question somebody would type into the title. Description repeats it and adds the steps.",
  },
  WHATSAPP: {
    platform: "WHATSAPP",
    label: "WhatsApp",
    purpose: "Existing customers, one to one. The highest-converting and easiest to overdo.",
    formats: ["WHATSAPP"],
    defaultFormat: "WHATSAPP",
    defaultMedia: "TEXT",
    captionLimit: 450,
    titleLimit: 60,
    hashtags: { min: 0, max: 0 },
    clickableLinks: true,
    canvas: { width: 1080, height: 1080, label: "WhatsApp square" },
    voiceNote:
      "Talk to one person, not an audience. No hashtags ever. Simple Hindi. End with something they can reply to.",
  },
  LINKEDIN: {
    platform: "LINKEDIN",
    label: "LinkedIn",
    purpose: "Businesses needing GST, ITR and compliance work.",
    formats: ["THREAD", "STATIC_POSTER", "ARTICLE"],
    defaultFormat: "THREAD",
    defaultMedia: "TEXT",
    captionLimit: 1300,
    titleLimit: 120,
    hashtags: { min: 2, max: 5 },
    clickableLinks: true,
    canvas: { width: 1200, height: 1200, label: "LinkedIn square" },
    voiceNote:
      "English, plain and professional. No emoji walls. Talk about the business problem, not the scheme's romance.",
  },
  WEBSITE: {
    platform: "WEBSITE",
    label: "Website",
    purpose: "The version Google indexes and that outlives every post.",
    formats: ["ARTICLE"],
    defaultFormat: "ARTICLE",
    defaultMedia: "TEXT",
    captionLimit: 12000,
    titleLimit: 65,
    hashtags: { min: 0, max: 0 },
    clickableLinks: true,
    canvas: { width: 1200, height: 630, label: "Open Graph card" },
    voiceNote:
      "Long form with real headings. Answer the question in the first paragraph, then the detail. Internal links to the service page.",
  },
  GOOGLE_BUSINESS: {
    platform: "GOOGLE_BUSINESS",
    label: "Google Business",
    purpose: "People searching for this shop by name or 'near me'.",
    formats: ["STATIC_POSTER", "FACEBOOK_POST"],
    defaultFormat: "STATIC_POSTER",
    defaultMedia: "IMAGE",
    captionLimit: 700,
    titleLimit: 58,
    hashtags: { min: 0, max: 0 },
    clickableLinks: true,
    canvas: { width: 1200, height: 900, label: "Google Business post" },
    voiceNote:
      "Local and factual. Mention the town and the service by its official name. No hashtags. One clear action.",
  },
};

export const ALL_PLATFORMS = Object.keys(PLATFORM_SPECS) as ContentPlatform[];

export function isPlatform(value: unknown): value is ContentPlatform {
  return typeof value === "string" && value in PLATFORM_SPECS;
}

export function specFor(platform: ContentPlatform): PlatformSpec {
  return PLATFORM_SPECS[platform];
}

/**
 * The design canvases, keyed by what somebody would ask for.
 *
 * A platform has one default canvas but several legitimate ones — an
 * Instagram story is not an Instagram post — so the design engine takes a
 * canvas name rather than a platform where the two differ.
 */
export const CANVASES = {
  instagram_post: { width: 1080, height: 1350, label: "Instagram post 4:5" },
  instagram_story: { width: 1080, height: 1920, label: "Instagram story / reel cover" },
  instagram_carousel: { width: 1080, height: 1350, label: "Instagram carousel slide" },
  facebook_post: { width: 1200, height: 1200, label: "Facebook square" },
  youtube_thumbnail: { width: 1280, height: 720, label: "YouTube thumbnail" },
  whatsapp_square: { width: 1080, height: 1080, label: "WhatsApp square" },
  google_business: { width: 1200, height: 900, label: "Google Business post" },
  website_og: { width: 1200, height: 630, label: "Open Graph card" },
} as const;

export type CanvasId = keyof typeof CANVASES;

export function canvasFor(platform: ContentPlatform, format: ContentFormat): (typeof CANVASES)[CanvasId] {
  if (platform === "INSTAGRAM") {
    if (format === "STORY" || format === "REEL") return CANVASES.instagram_story;
    if (format === "CAROUSEL") return CANVASES.instagram_carousel;
    return CANVASES.instagram_post;
  }
  if (platform === "YOUTUBE") return CANVASES.youtube_thumbnail;
  if (platform === "FACEBOOK") return CANVASES.facebook_post;
  if (platform === "WHATSAPP") return CANVASES.whatsapp_square;
  if (platform === "GOOGLE_BUSINESS") return CANVASES.google_business;
  return CANVASES.website_og;
}

/**
 * Trim to a platform's useful length without cutting a word in half.
 *
 * A caption that ends mid-word reads as broken software, and the model does
 * overshoot: this is the backstop, not the plan.
 */
export function fitToLimit(text: string, limit: number): string {
  const clean = (text ?? "").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastBreak = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return (lastBreak > limit * 0.6 ? cut.slice(0, lastBreak) : cut).trimEnd();
}

/** Hashtags a platform will tolerate, cleaned and capped. */
export function fitHashtags(tags: string[], platform: ContentPlatform): string[] {
  const spec = specFor(platform);
  if (spec.hashtags.max === 0) return [];
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const raw of tags ?? []) {
    const tag = String(raw ?? "").trim().replace(/^#+/, "").replace(/\s+/g, "");
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(`#${tag}`);
    if (clean.length >= spec.hashtags.max) break;
  }
  return clean;
}
