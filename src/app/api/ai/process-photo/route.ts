import { NextResponse } from "next/server";

import {
  AI_PHOTO_MAX_BYTES,
  AI_PHOTO_MIME_TYPES,
  classify,
  editPhoto,
  redactSecrets,
  type GeminiFailure,
} from "@/lib/ai/gemini";
import { isPhotoEdit } from "@/lib/ai/photo-edits";
import { validateFileSignature } from "@/lib/file-validation";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

/**
 * One photograph in, one photograph out.
 *
 * The whole point of this route existing is that the browser never holds the
 * API key: the customer's phone posts an image here, this runs on the server,
 * and Gemini is reached from here with a key that is only ever read inside
 * `@/lib/ai/gemini`. There is no client path to Gemini and no environment
 * variable with a NEXT_PUBLIC_ prefix anywhere near it.
 *
 * Everything a customer could send is checked before a single byte reaches
 * Google — extension, declared type, real type by signature, and size — partly
 * because an image model call costs money and partly because "it failed" is a
 * worse answer than "that file is not a photo".
 */

export const runtime = "nodejs";
/** Long enough for the model, and shorter than the customer's patience. */
export const maxDuration = 120;

/** What the customer reads. Never what the server saw. */
const MESSAGES: Record<GeminiFailure, string> = {
  not_configured: "AI photo editing is not switched on for this counter yet. Aap normal print kar sakte hain.",
  bad_key: "AI photo editing is not working right now. Aapki photo waisi hi print ho sakti hai.",
  rate_limited: "Abhi bahut log AI use kar rahe hain. Ek minute baad dobara try kijiye.",
  model_unavailable: "AI service abhi available nahi hai. Thodi der baad try kijiye.",
  timeout: "AI ne bahut time liya. Dobara try kijiye — ya photo jaisi hai waisi print kar lijiye.",
  blocked: "Is photo par AI edit nahi ho saka. Koi doosri photo try kijiye.",
  no_image: "AI is photo ko edit nahi kar paya. Dobara try kijiye ya original hi print kar lijiye.",
  upstream: "AI edit nahi ho saka. Dobara try kijiye.",
};

/** HTTP status per failure, so a client can tell "retry" from "give up". */
const STATUS: Record<GeminiFailure, number> = {
  not_configured: 503,
  bad_key: 503,
  rate_limited: 429,
  model_unavailable: 503,
  timeout: 504,
  blocked: 422,
  no_image: 422,
  upstream: 502,
};

export async function POST(request: Request) {
  const ip = getClientIp(request);
  /*
    Tighter than the upload route's ten a minute.

    Every call here costs the platform money at Google, and a passport photo
    is a thing somebody edits two or three times, not thirty.
  */
  const limit = checkRateLimit(`ai-photo:${ip}`, 6, 60_000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }

  const file = form.get("file");
  const edit = form.get("edit");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo was sent." }, { status: 400 });
  }
  if (!isPhotoEdit(edit)) {
    // A closed list: an open prompt on our key is somebody else's image
    // generator, paid for by this shop.
    return NextResponse.json({ error: "That edit is not available." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That photo is empty." }, { status: 400 });
  }
  if (file.size > AI_PHOTO_MAX_BYTES) {
    return NextResponse.json(
      { error: "Ye photo bahut badi hai. 8 MB se choti photo bhejiye." },
      { status: 413 },
    );
  }
  if (!(AI_PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: "Sirf JPG, PNG ya WEBP photo AI se theek ho sakti hai." },
      { status: 415 },
    );
  }

  /*
    The declared type is a claim, not a fact.

    A .jpg header on a PDF passes every check above; the signature check is
    what makes the type real, and it is the same validator the print upload
    has used since a customer's WebP failed at a shop's printer.
  */
  const signature = await validateFileSignature(file, [...AI_PHOTO_MIME_TYPES]);
  if (!signature.valid) {
    return NextResponse.json({ error: "Ye file photo nahi lag rahi." }, { status: 415 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const edited = await editPhoto({
      base64: bytes.toString("base64"),
      mimeType: file.type,
      edit,
    });

    return NextResponse.json({
      /*
        Returned inline rather than stored.

        The photograph is already in the browser that sent it, and writing an
        AI-edited face into storage would create a second copy of somebody's
        likeness with its own deletion problem. The customer keeps it or
        discards it; nothing here outlives the response.
      */
      image: `data:${edited.mimeType};base64,${edited.base64}`,
      edit,
    });
  } catch (caught) {
    const failure = classify(caught);
    /*
      The detail stays here.

      Server logs are the right place for a status code and a model's own
      words; a response body is not, because whatever an upstream error
      happens to contain — a request URL, a key in a query string — would be
      handed straight to the browser.
    */
    console.error("[ai/process-photo] failed", {
      failure,
      edit,
      bytes: file.size,
      detail: redactSecrets(caught instanceof Error ? caught.message : String(caught)),
    });

    return NextResponse.json({ error: MESSAGES[failure], retryable: failure !== "not_configured" }, {
      status: STATUS[failure],
    });
  }
}
