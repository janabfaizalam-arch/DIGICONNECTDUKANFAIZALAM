import "server-only";

import { generateJson } from "@/lib/content-engine/ai/generate";
import { voicePrompt } from "@/lib/content-engine/brand-voice";
import { buildDesignSpec, trimHeadline, type DesignCopy } from "@/lib/content-engine/design-spec";
import { ExternalError } from "@/lib/content-engine/errors";
import type {
  BrandSettings,
  ContentFormat,
  ContentPlatform,
  DesignSpec,
} from "@/lib/content-engine/types";

/**
 * Stage 05 — a brief a person or a machine can build from.
 *
 * The model is asked for four short strings: a headline, a subheadline, up to
 * three body lines and a visual suggestion. Everything else in the
 * specification — canvas, margins, colours, fonts, logo placement — is a fact
 * about the brand and the platform and is computed, not generated. Asking a
 * model what colour DigiConnect's brand is would be paying for a worse answer
 * than the one already in the settings table.
 *
 * When Canva is not connected this stage still finishes. The specification is
 * the deliverable; a Canva design is an optional rendering of it.
 */

const SYSTEM = `You write the words that appear ON a design, not a caption.
Design copy is short. A headline is read in one glance from arm's length. Never write a sentence
where a phrase will do. Never put a government amount, date or eligibility rule on a design unless
it appears in the approved content you were given.
Return JSON only.`;

export async function generateDesignCopy(input: {
  brand: BrandSettings;
  platform: ContentPlatform;
  format: ContentFormat;
  hook: string;
  body: string;
  cta: string;
}): Promise<DesignCopy> {
  const prompt = [
    voicePrompt(input.brand),
    "",
    `This is design copy for a ${input.format} on ${input.platform}.`,
    "",
    "APPROVED CONTENT:",
    `Hook: ${input.hook}`,
    `Body: ${input.body}`,
    `Call to action: ${input.cta}`,
    "",
    "Return one JSON object:",
    "- headline: at most 7 words, readable at thumbnail size",
    "- subheadline: at most 12 words, or empty",
    "- body: an array of at most 3 lines, each under 10 words",
    "- cta: at most 5 words",
    "- visual_suggestion: one sentence describing the photograph or illustration behind the text",
  ].join("\n");

  const raw = await generateJson<Record<string, unknown>>({
    task: "design_copy",
    system: SYSTEM,
    prompt,
    parse: (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Expected one design copy object.");
      }
      return value as Record<string, unknown>;
    },
    temperature: 0.5,
  });

  const line = (value: unknown) => (typeof value === "string" ? value.trim() : "");

  return {
    headline: trimHeadline(line(raw.headline) || input.hook),
    subheadline: line(raw.subheadline),
    body: (Array.isArray(raw.body) ? raw.body : [])
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 3),
    cta: line(raw.cta) || input.cta,
    visualSuggestion: line(raw.visual_suggestion ?? raw.visualSuggestion),
  };
}

export async function buildDesign(input: {
  brand: BrandSettings;
  platform: ContentPlatform;
  format: ContentFormat;
  hook: string;
  body: string;
  cta: string;
}): Promise<DesignSpec> {
  const copy = await generateDesignCopy(input);
  return buildDesignSpec({
    platform: input.platform,
    format: input.format,
    hook: input.hook,
    copy,
    brand: input.brand,
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Canva
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Whether Canva is connected on this deployment.
 *
 * Canva Connect is an OAuth integration and needs a client id, a secret and a
 * user having authorised it. None of those are in this repository and none of
 * them should be. Until they are configured, `renderWithCanva` reports
 * CONFIGURATION_REQUIRED and the specification stands on its own — which is
 * the difference between an integration being unavailable and this feature
 * being unavailable.
 */
export function isCanvaConfigured(): boolean {
  return Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET);
}

export type CanvaRender = {
  status: "READY" | "CONFIGURATION_REQUIRED";
  designId: string | null;
  previewUrl: string | null;
  exportUrl: string | null;
  message: string;
};

/**
 * Hand a filled specification to Canva's autofill API.
 *
 * Not implemented against a live account here, and deliberately not faked. An
 * autofill call needs a brand template id created inside the shop's own Canva
 * account and an access token from that account's OAuth grant; inventing
 * either would produce a function that returns a plausible URL pointing at
 * nothing. The honest state is reported instead, and the design screen offers
 * the downloadable brief.
 */
export async function renderWithCanva(spec: DesignSpec, templateId: string): Promise<CanvaRender> {
  if (!isCanvaConfigured()) {
    return {
      status: "CONFIGURATION_REQUIRED",
      designId: null,
      previewUrl: null,
      exportUrl: null,
      message:
        "CONFIGURATION REQUIRED — Canva is not connected. Set CANVA_CLIENT_ID and CANVA_CLIENT_SECRET, " +
        "then connect the shop's Canva account in Settings. The design brief below is complete and can " +
        "be built by hand in the meantime.",
    };
  }

  if (!templateId) {
    throw new ExternalError(
      "canva",
      "not_configured",
      "No Canva brand template has been chosen for this platform yet.",
    );
  }

  /*
    The remaining work, written down so the next person does not have to
    rediscover it: exchange the stored refresh token for an access token,
    POST the spec.variables to /v1/autofills against `templateId`, poll the
    returned job until it completes, then create an export job for a PNG and
    store both URLs. It is a contained piece of work and it needs a real Canva
    account to develop against, which is why the interface exists and the call
    does not.
  */
  return {
    status: "CONFIGURATION_REQUIRED",
    designId: null,
    previewUrl: null,
    exportUrl: null,
    message:
      "CONFIGURATION REQUIRED — Canva credentials are set but no account has been authorised for " +
      "autofill yet. Connect the account in Settings.",
  };
}
