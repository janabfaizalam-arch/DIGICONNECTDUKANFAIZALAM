import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { failureResponse, badRequest, readJson, requireAdmin } from "@/lib/content-engine/api";
import { generateJson } from "@/lib/content-engine/ai/generate";
import { mergeVoice } from "@/lib/content-engine/brand-voice";
import * as repo from "@/lib/content-engine/repository";
import type { BrandVoiceGuide } from "@/lib/content-engine/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Brand settings, and the voice guide derived from real posts.
 *
 * "Analyze My Posts" is the important half. A voice guide written by a model
 * that has never read this shop's posts is a guess dressed as a description;
 * one derived from ten posts that actually worked is the difference between
 * generated content that sounds like DigiConnect and generated content that
 * sounds like every agency in India.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin(request, "read");
  if (!guard.ok) return guard.response;

  try {
    const [brand, samples] = await Promise.all([repo.getBrand(), repo.getSamplePosts()]);
    return NextResponse.json({ brand, samples });
  } catch (caught) {
    return failureResponse(caught);
  }
}

export async function PATCH(request: Request) {
  const guard = await requireAdmin(request, "write");
  if (!guard.ok) return guard.response;

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return badRequest("That request could not be read.");

  const strings = (value: unknown) =>
    Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 50) : undefined;

  try {
    const brand = await repo.saveBrand({
      brandName: typeof body.brandName === "string" ? body.brandName.slice(0, 120) : undefined,
      logoUrl: typeof body.logoUrl === "string" ? body.logoUrl.slice(0, 500) : undefined,
      primaryColors: strings(body.primaryColors),
      secondaryColors: strings(body.secondaryColors),
      fonts: body.fonts as { heading: string; body: string } | undefined,
      tone: typeof body.tone === "string" ? body.tone.slice(0, 600) : undefined,
      preferredLanguage: typeof body.preferredLanguage === "string" ? body.preferredLanguage.slice(0, 200) : undefined,
      wordsToAvoid: strings(body.wordsToAvoid),
      ctaRules: strings(body.ctaRules),
      audience: typeof body.audience === "string" ? body.audience.slice(0, 800) : undefined,
      businessCategories: strings(body.businessCategories),
      visualRules: strings(body.visualRules),
      samplePosts: strings(body.samplePosts),
    });

    await logActivity({
      entity: "settings",
      entityId: null,
      action: "brand:saved",
      actor: guard.actor,
      detail: Object.keys(body).join(", "),
    });

    return NextResponse.json({ brand });
  } catch (caught) {
    return failureResponse(caught);
  }
}

const VOICE_SYSTEM = `You analyse writing samples and describe how they are written.
You are describing what IS there, not prescribing what should be. If the samples are short or few,
say so rather than inventing a confident style guide. Never invent a phrase the samples do not use.
Return JSON only.`;

/** Analyze My Posts: read the shop's own posts, describe how they are written. */
export async function POST(request: Request) {
  const guard = await requireAdmin(request, "generate");
  if (!guard.ok) return guard.response;

  const body = await readJson<{ samples?: string[] }>(request);
  const samples = (body?.samples ?? [])
    .map((sample) => String(sample).trim())
    .filter(Boolean)
    .slice(0, 30);

  if (samples.length < 3) {
    return badRequest("Kam se kam 3 purane post daaliye, tabhi voice guide banaya ja sakta hai.");
  }

  try {
    const analysis = await generateJson<Partial<BrandVoiceGuide>>({
      task: "voice_analysis",
      system: VOICE_SYSTEM,
      prompt: [
        `Here are ${samples.length} social posts written by a small-town Indian digital services shop.`,
        "Describe how they are written, so another writer could match them.",
        "",
        ...samples.map((sample, index) => `--- POST ${index + 1} ---\n${sample}`),
        "",
        "Return one JSON object with these keys, each a short description in English:",
        "- sentenceStyle, vocabulary, tone, hookStyle, ctaStyle, paragraphLength, punctuation",
        "- commonPhrases: an array of phrases that actually appear in these posts",
        "- wordsToAvoid: an array of words or phrases that clearly do NOT belong in this voice",
      ].join("\n"),
      parse: (value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new Error("Expected one voice guide object.");
        }
        return value as Partial<BrandVoiceGuide>;
      },
      fresh: true,
      temperature: 0.3,
    });

    const current = await repo.getBrand();
    const voice: BrandVoiceGuide = {
      ...mergeVoice(current.voice, analysis),
      /*
        Provenance is the server's to state. A guide claiming it was derived
        from forty posts when it saw three is worse than no guide, because
        everything downstream trusts it.
      */
      analyzedAt: new Date().toISOString(),
      sampleCount: samples.length,
    };

    const brand = await repo.saveBrand({ voice, samplePosts: samples });

    await logActivity({
      entity: "settings",
      entityId: null,
      action: "brand:voice-analyzed",
      actor: guard.actor,
      detail: `${samples.length} sample posts.`,
    });

    return NextResponse.json({ brand });
  } catch (caught) {
    return failureResponse(caught);
  }
}
