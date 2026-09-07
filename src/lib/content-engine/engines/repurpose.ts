import "server-only";

import { generateJson } from "@/lib/content-engine/ai/generate";
import { voicePrompt } from "@/lib/content-engine/brand-voice";
import { fitHashtags, fitToLimit, specFor } from "@/lib/content-engine/platforms";
import type {
  BrandSettings,
  ContentPlatform,
  ContentVersion,
  MediaType,
} from "@/lib/content-engine/types";

/**
 * Stage 06 — the same idea, seven times, natively.
 *
 * The failure mode this stage exists to prevent is the one every small
 * business commits: the identical caption on Instagram, Facebook, LinkedIn
 * and WhatsApp, hashtags and all. It reads as a broadcast rather than as
 * somebody talking, and on WhatsApp it reads as spam.
 *
 * So each version is generated against that platform's own rules — length,
 * whether a link is clickable, whether hashtags belong, who is on the other
 * end — and each is generated independently, which is also what lets the
 * admin redo the Instagram caption without disturbing the six they liked.
 */

const SYSTEM = `You adapt one piece of content for one specific platform.
The core message must stay identical. The packaging must be native to the platform: its length, its
rhythm, its conventions. Never produce a version that reads like a copy of another platform's post.
Never add a fact, figure, date or eligibility rule that is not in the master content.
Return JSON only.`;

export type MasterContent = {
  topic: string;
  hook: string;
  body: string;
  cta: string;
  government: boolean;
};

type RawVersion = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const MEDIA_BY_PLATFORM: Record<ContentPlatform, MediaType> = {
  INSTAGRAM: "VIDEO",
  FACEBOOK: "IMAGE",
  YOUTUBE: "VIDEO",
  WHATSAPP: "TEXT",
  LINKEDIN: "TEXT",
  WEBSITE: "TEXT",
  GOOGLE_BUSINESS: "IMAGE",
};

/**
 * One platform, one call.
 *
 * Deliberately not "generate all seven in one request". A single response
 * holding seven versions is where the copy-paste creeps back in — the model
 * writes one good version and six near-copies of it — and it makes
 * regenerating one platform impossible without redoing them all.
 */
export async function repurposeFor(input: {
  brand: BrandSettings;
  master: MasterContent;
  platform: ContentPlatform;
}): Promise<Omit<ContentVersion, "id" | "contentPostId" | "createdAt">> {
  const spec = specFor(input.platform);

  const prompt = [
    voicePrompt(input.brand),
    "",
    `PLATFORM: ${spec.label}`,
    `What a post here is for: ${spec.purpose}`,
    `How to write for it: ${spec.voiceNote}`,
    `Caption length: at most ${spec.captionLimit} characters. Title: at most ${spec.titleLimit}.`,
    spec.hashtags.max === 0
      ? "Hashtags: none. Never use a hashtag on this platform."
      : `Hashtags: between ${spec.hashtags.min} and ${spec.hashtags.max}.`,
    spec.clickableLinks
      ? "Links are clickable here, so the call to action may include one."
      : "Links are NOT clickable here. Do not write 'click the link'; say what to do instead.",
    "",
    "MASTER CONTENT — keep this message, change only the packaging:",
    `Topic: ${input.master.topic}`,
    `Hook: ${input.master.hook}`,
    `Body: ${input.master.body}`,
    `Call to action: ${input.master.cta}`,
    "",
    input.master.government
      ? "This is government information. Do not introduce any amount, date, document or eligibility rule that is not already in the master content above."
      : "",
    "",
    "Return one JSON object with: title, hook, body, caption, hashtags (array, without #), cta.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const raw = await generateJson<RawVersion>({
    task: "repurpose_version",
    system: SYSTEM,
    prompt,
    parse: (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Expected one version object.");
      }
      return value as RawVersion;
    },
    fresh: true,
    temperature: 0.7,
  });

  const hashtags = fitHashtags(
    (Array.isArray(raw.hashtags) ? raw.hashtags : []).map((tag) => String(tag)),
    input.platform,
  );

  return {
    platform: input.platform,
    title: fitToLimit(text(raw.title) || input.master.topic, spec.titleLimit),
    hook: fitToLimit(text(raw.hook) || input.master.hook, 200),
    body: fitToLimit(text(raw.body) || input.master.body, spec.captionLimit),
    caption: fitToLimit(text(raw.caption) || text(raw.body), spec.captionLimit),
    hashtags,
    cta: fitToLimit(text(raw.cta) || input.master.cta, 200),
    mediaType: MEDIA_BY_PLATFORM[input.platform],
    status: "READY",
  };
}

/**
 * Every platform asked for, one at a time, and a failure on one does not lose
 * the rest.
 *
 * Sequential rather than parallel on purpose: seven simultaneous calls are the
 * fastest way to hit a rate limit, and this runs in the background where
 * nobody is watching a spinner.
 */
export async function repurposeAll(input: {
  brand: BrandSettings;
  master: MasterContent;
  platforms: ContentPlatform[];
}): Promise<{
  versions: Omit<ContentVersion, "id" | "contentPostId" | "createdAt">[];
  failures: { platform: ContentPlatform; message: string }[];
}> {
  const versions: Omit<ContentVersion, "id" | "contentPostId" | "createdAt">[] = [];
  const failures: { platform: ContentPlatform; message: string }[] = [];

  for (const platform of input.platforms) {
    try {
      versions.push(await repurposeFor({ ...input, platform }));
    } catch (caught) {
      failures.push({
        platform,
        message: caught instanceof Error ? caught.message : "That platform's version could not be written.",
      });
    }
  }

  return { versions, failures };
}
