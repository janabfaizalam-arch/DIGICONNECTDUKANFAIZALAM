import "server-only";

import { GoogleGenAI } from "@google/genai";

import { PHOTO_EDITS, type PhotoEditId } from "@/lib/ai/photo-edits";

/**
 * The one place this application talks to Gemini.
 *
 * Everything here runs on the server and only on the server — the
 * `server-only` import above turns any accidental client import into a build
 * error rather than an API key in a JavaScript bundle. Nothing in this file
 * is re-exported through a client component, the key is read from the
 * environment at call time and never returned, logged, or put in a response
 * body.
 *
 * A customer's photograph is the input. That deserves saying plainly: this is
 * the one part of Smart Print where a picture leaves the phone, and it goes to
 * Google. Everything the counter did before this — the card cutout, the
 * on-device backdrop — stays on the device, and the page has to be honest
 * about which is which.
 */

/** Images this endpoint will send. Anything else is refused before Gemini. */
export const AI_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * 8 MB.
 *
 * Well under Gemini's inline-data ceiling, and roughly a 12-megapixel phone
 * photo at full quality. The browser downsizes before it uploads; this is the
 * backstop for a request that did not come from our own page.
 */
export const AI_PHOTO_MAX_BYTES = 8 * 1024 * 1024;

/** Image editing model. Returns the edited picture as inline data. */
const MODEL = "gemini-2.5-flash-image";

/**
 * How long to wait before giving up.
 *
 * A customer is standing at a counter watching a spinner. Ninety seconds is
 * already a long time to stand there; past that, "try again" is a better
 * answer than a request that may never return.
 */
const TIMEOUT_MS = 90_000;

/**
 * The instruction that goes with every edit, whatever else is asked for.
 *
 * A passport photograph that no longer matches the person holding it is a
 * rejected application, and the cost of that lands on the customer — a wasted
 * trip, a wasted fee, sometimes a missed deadline. So identity preservation is
 * not one instruction among several; it is prepended to all of them and
 * repeated in the negative, because "improve this photo" is otherwise an
 * invitation to redraw a face into something more photogenic.
 *
 * This is the strongest practical instruction. It is not a guarantee — no
 * prompt is — which is exactly why the customer is shown the original beside
 * the result and has to choose.
 */
const IDENTITY_RULE = `
Preserve the subject's identity and facial characteristics. Do not redesign,
regenerate, beautify excessively, or alter the person's facial identity. Keep
eyes, nose, mouth, jawline, facial proportions, skin tone, hair and every
recognisable characteristic consistent with the source image. Do not slim,
smooth, lighten, age, or de-age the face. Do not change the person's apparent
age, gender, or ethnicity. Only perform the requested photographic corrections
and permitted editing. If a requested change cannot be made without altering
the person's identity, leave that aspect of the photograph unchanged.
`.trim();

/**
 * What a customer may ask for, in the model's words rather than theirs.
 *
 * The identifiers and the customer-facing labels live in `photo-edits.ts`,
 * which the browser may import. These instructions do not travel there —
 * there is no reason to ship a kilobyte of prompt to every phone that opens
 * the counter page.
 */
const EDITS: Record<PhotoEditId, string> = {
  auto_fix: `
Correct this photograph so it is suitable for use as a passport or ID
photograph. Straighten any small tilt or rotation of the head or camera.
Improve the framing so the head and the top of the shoulders are centred, with
the eyes about two thirds up the frame and a small margin above the head.
Replace the background with a plain, evenly lit, neutral light-grey or white
background with no shadows, patterns, or objects. Correct the exposure and
white balance so the lighting on the face is even and natural, removing harsh
shadows and blown highlights. Keep the result photographic and realistic.
`.trim(),

  background_white: `
Replace only the background of this photograph with a plain, evenly lit, pure
white background with no shadow, gradient, texture or object. Keep the person,
their clothing, their hair outline and the lighting on them exactly as they
are. Do not alter the person in any way.
`.trim(),

  background_blue: `
Replace only the background of this photograph with a plain, evenly lit, light
blue background with no shadow, gradient, texture or object. Keep the person,
their clothing, their hair outline and the lighting on them exactly as they
are. Do not alter the person in any way.
`.trim(),

  formal_clothing: `
Change only the clothing visible in this photograph to plain, professional
formal attire appropriate for an official document photograph. Keep the
person's head, face, hair, neck, skin tone and posture exactly as they are, and
keep the collar line natural where clothing meets the neck. Change nothing
above the neckline. Do not add jewellery, glasses, logos, patterns or
accessories that are not already present.
`.trim(),
};

/**
 * Every edit the customer can pick has something to say to the model.
 *
 * The two lists are in different files so that one can reach the browser and
 * the other cannot, which is exactly the arrangement that lets them drift. A
 * test compares them; this is the runtime half of the same check.
 */
export function hasInstructionForEveryEdit(): boolean {
  return PHOTO_EDITS.every((edit) => typeof EDITS[edit.id] === "string" && EDITS[edit.id].length > 0);
}

export function editInstruction(edit: PhotoEditId): string {
  return `${IDENTITY_RULE}\n\n${EDITS[edit]}`;
}

/* ─────────────────────────────────────────────────────────────────────────
   Failures the customer can be told about
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Every way this can fail, named.
 *
 * The reason a caller gets a code rather than an error object: whatever Gemini
 * or the network puts in a message — a URL with the key in a query string, a
 * request id, a stack — must not reach a response body. The route turns a code
 * into a sentence the customer reads; the detail stays in the server log.
 */
export type GeminiFailure =
  | "not_configured"
  | "bad_key"
  | "rate_limited"
  | "model_unavailable"
  | "timeout"
  | "blocked"
  | "no_image"
  | "upstream";

/**
 * Scrub anything key-shaped out of text that is about to be logged.
 *
 * Google's client puts the request URL into some errors, and the REST
 * transport carries the key as a `?key=` query parameter — so the obvious
 * `console.error(error.message)` is a way to write the API key into a log
 * that ships to a hosting provider and sits there. Two passes: the literal
 * value of the configured key, and anything that looks like a key parameter
 * regardless of which one it is.
 */
export function redactSecrets(text: string): string {
  let clean = text;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.length >= 8) {
    clean = clean.split(apiKey).join("[redacted]");
  }

  return clean
    .replace(/([?&](?:key|api[_-]?key)=)[^&\s"']+/gi, "$1[redacted]")
    .replace(/\bAIza[0-9A-Za-z_-]{10,}/g, "[redacted]");
}

export class GeminiError extends Error {
  readonly failure: GeminiFailure;

  constructor(failure: GeminiFailure, message: string) {
    super(message);
    this.name = "GeminiError";
    this.failure = failure;
  }
}

/** Which failure an unknown thrown value represents. */
export function classify(caught: unknown): GeminiFailure {
  if (caught instanceof GeminiError) return caught.failure;
  if (caught instanceof DOMException && caught.name === "AbortError") return "timeout";

  const status = typeof caught === "object" && caught !== null && "status" in caught
    ? Number((caught as { status?: unknown }).status)
    : Number.NaN;
  const text = caught instanceof Error ? caught.message : String(caught ?? "");

  if (status === 401 || status === 403 || /API[_ ]?key|UNAUTHENTICATED|PERMISSION_DENIED/i.test(text)) {
    return "bad_key";
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(text)) return "rate_limited";
  if (status === 404 || /NOT_FOUND|is not found|not supported/i.test(text)) return "model_unavailable";
  if (status === 503 || status === 500 || /UNAVAILABLE|overloaded|INTERNAL/i.test(text)) {
    return "model_unavailable";
  }
  if (/abort|timed? ?out|ETIMEDOUT/i.test(text)) return "timeout";
  return "upstream";
}

/* ─────────────────────────────────────────────────────────────────────────
   The call
   ───────────────────────────────────────────────────────────────────────── */

export type EditedPhoto = { base64: string; mimeType: string };

/**
 * Send one photograph and one instruction, get one photograph back.
 *
 * The key is read here and nowhere else, and is never part of what this
 * returns or throws.
 */
export async function editPhoto(input: {
  base64: string;
  mimeType: string;
  edit: PhotoEditId;
}): Promise<EditedPhoto> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Deliberately not "GEMINI_API_KEY is unset" in anything a browser sees;
    // the route maps this code to a sentence about the shop, not the server.
    throw new GeminiError("not_configured", "Gemini is not configured on this deployment.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: input.mimeType, data: input.base64 } },
            { text: editInstruction(input.edit) },
          ],
        },
      ],
      config: {
        abortSignal: controller.signal,
        responseModalities: ["IMAGE"],
        // The default filters are the right ones for photographs of people;
        // what matters here is noticing when they fire rather than tuning them.
      },
    });

    const blocked = response.promptFeedback?.blockReason;
    if (blocked) {
      throw new GeminiError("blocked", `Prompt blocked: ${blocked}`);
    }

    const candidate = response.candidates?.[0];
    if (candidate?.finishReason && !["STOP", "FINISH_REASON_UNSPECIFIED"].includes(candidate.finishReason)) {
      const reason = candidate.finishReason;
      throw new GeminiError(
        reason === "SAFETY" || reason === "PROHIBITED_CONTENT" ? "blocked" : "no_image",
        `Generation stopped: ${reason}`,
      );
    }

    /*
      The model may return prose alongside the picture, or prose instead of it
      — "I can't edit this image" is a perfectly ordinary response and arrives
      as a 200. Finding no image part is a failure, not an empty success.
    */
    for (const part of candidate?.content?.parts ?? []) {
      const data = part.inlineData?.data;
      if (data) {
        return { base64: data, mimeType: part.inlineData?.mimeType ?? "image/png" };
      }
    }

    throw new GeminiError("no_image", "Gemini returned no image part.");
  } finally {
    clearTimeout(timer);
  }
}
