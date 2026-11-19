import { NextResponse } from "next/server";

import { createAndSendOtp } from "@/lib/auth/otp-store";
import { PARTNER_LOGIN_OTP_PURPOSE, findPartnerForLogin } from "@/lib/auth/partner-otp";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { normalizeWhatsAppDestination } from "@/lib/whatsapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send a DC Partner a WhatsApp sign-in code.
 *
 * The answer is the same whether or not the number belongs to a partner. A
 * form that says "no partner with this number" is a form anyone can use to
 * find out who sells for us, one number at a time, and the rest of this
 * codebase already answers that way — /api/auth/customer/signin returns the
 * same failure for an unknown number as for a wrong password.
 *
 * It costs the partner who mistyped their number a minute of waiting. The
 * message says what to do about that rather than leaving them staring at a
 * screen that claims a code is on its way.
 *
 * Everything that makes an OTP safe — the hash, the five-minute expiry, the
 * attempt ceiling, the hourly limits per number and per network, the resend
 * cooldown — is `createAndSendOtp`'s, not this route's.
 */

const SENT_MESSAGE =
  "Agar ye number DC Partner ke roop mein registered hai to WhatsApp par 6 digit ka code aa jayega. " +
  "2 minute mein na aaye to number dobara check kijiye.";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  /*
    A limit of this route's own, on top of the per-number and per-network
    ceilings inside the OTP store. Those count codes that were actually sent;
    this one also covers the requests that are turned away, so a script cannot
    walk the number range for free.
  */
  const rate = checkRateLimit(`ap-otp-send:${ip}`, 10, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  let body: { mobile?: unknown };
  try {
    body = (await request.json()) as { mobile?: unknown };
  } catch {
    return json({ ok: false, error: "Expected a JSON body." }, 400);
  }

  const phone = normalizeWhatsAppDestination(String(body.mobile ?? ""));
  if (!phone.ok) {
    // A malformed number is not an enumeration signal; say so plainly.
    return json({ ok: false, error: "10 digit ka sahi mobile number daaliye." }, 400);
  }

  const partner = await findPartnerForLogin(phone.local);

  if (!partner) {
    // Deliberately indistinguishable from success, including the shape.
    return json({ ok: true, message: SENT_MESSAGE });
  }

  const result = await createAndSendOtp({
    phoneE164: phone.destination,
    phoneLocal: phone.local,
    purpose: PARTNER_LOGIN_OTP_PURPOSE,
    ip,
    userAgent: getUserAgent(request),
    metadata: { partner_id: partner.id },
  });

  if (!result.ok) {
    /*
      A rate limit or a cooldown is the partner's own doing and is worth
      saying. A provider failure is not something they can act on, and
      `createAndSendOtp` has already redacted it for logs.
    */
    return json({ ok: false, error: result.error }, result.status);
  }

  return json({ ok: true, message: SENT_MESSAGE });
}
