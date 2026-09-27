import { NextResponse } from "next/server";

import { classify, redactSecrets, type GeminiFailure } from "@/lib/ai/gemini";
import { draftServiceCopy } from "@/lib/ai/service-copy";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Draft the wording for one partner service.
 *
 * A service name goes in, a filled-in catalogue entry comes back, and nothing
 * is written: the admin gets it in the form, edits it, and presses save like
 * any other draft. Keeping the write out of here is what makes the button safe
 * to press on a service that already has copy -- the worst case is that the
 * admin does not like the suggestion.
 *
 * Admin only, and rate limited per admin rather than per IP: a shop behind one
 * office connection is one IP, and the limit is there to stop a stuck button
 * from spending the model quota, not to ration the staff.
 */

export const runtime = "nodejs";
/** Comfortably past the 30s the drafting call gives up at. */
export const maxDuration = 60;

/** Twelve drafts a minute is faster than anyone fills the form. */
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;

/** What the admin reads. Never what the server saw. */
const MESSAGES: Record<GeminiFailure, string> = {
  not_configured: "AI drafting is not switched on for this deployment yet. Fields haath se bhar lijiye.",
  bad_key: "AI drafting is not working right now. Fields haath se bhar lijiye.",
  rate_limited: "Abhi AI busy hai. Ek minute baad dobara try kijiye.",
  model_unavailable: "AI service abhi available nahi hai. Thodi der baad try kijiye.",
  timeout: "AI ne bahut time liya. Dobara try kijiye.",
  blocked: "Is service ke liye AI draft nahi bana. Naam thoda saaf likh kar dobara try kijiye.",
  no_image: "AI draft nahi bana. Dobara try kijiye.",
  upstream: "AI draft nahi bana. Dobara try kijiye.",
};

/** So the browser can tell "try again" from "give up". */
const STATUS: Record<GeminiFailure, number> = {
  not_configured: 503,
  bad_key: 503,
  rate_limited: 429,
  model_unavailable: 503,
  timeout: 504,
  blocked: 422,
  no_image: 502,
  upstream: 502,
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Not allowed." }, { status: 403 });
  }

  const limit = checkRateLimit(`ai-service-copy:${user.id ?? getClientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Expected a JSON body." }, { status: 400 });
  }

  const input = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const title = String(input.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ message: "Pehle service ka naam likhiye." }, { status: 400 });
  }

  const fee = Number(input.customer_fee);

  try {
    const draft = await draftServiceCopy({
      title,
      category: typeof input.category === "string" ? input.category : null,
      customerFee: Number.isFinite(fee) ? fee : null,
    });
    return NextResponse.json({ draft });
  } catch (caught) {
    const failure = classify(caught);
    // The code and the redacted detail go to the server log; the response
    // carries the sentence and the code, and nothing from upstream.
    console.error(
      "[ai-draft] service copy failed:",
      failure,
      redactSecrets(caught instanceof Error ? caught.message : String(caught)),
    );
    return NextResponse.json({ message: MESSAGES[failure], failure }, { status: STATUS[failure] });
  }
}
