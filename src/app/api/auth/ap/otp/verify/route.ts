import { NextResponse } from "next/server";

import { getAgentAccessStatus } from "@/lib/auth";
import { PORTAL_CONTEXT_COOKIE, partnerAccessPublicMessage } from "@/lib/auth/memberships";
import { verifyOtpRequest } from "@/lib/auth/otp-store";
import { PARTNER_LOGIN_OTP_PURPOSE, findPartnerForLogin, mintSessionToken } from "@/lib/auth/partner-otp";
import { getClientIp } from "@/lib/auth/request-meta";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { normalizeWhatsAppDestination } from "@/lib/whatsapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Turn a verified WhatsApp code into a DC Partner session.
 *
 * The partner proved who they are with the code, not with a secret we hold, so
 * there is no password to hand to `signInWithPassword`. The session comes from
 * a magic-link token minted for the account and redeemed in this same request:
 * the link itself is never sent anywhere and only its token hash is used.
 *
 * Order matters here. The code is checked first — `verifyOtpRequest` burns the
 * request whether or not what follows succeeds, so a code cannot be replayed
 * against a later attempt. The access check then runs before the session is
 * handed back, and a partner who fails it is signed straight out again, the
 * same way /api/auth/agent-login does it. A suspended partner must not get in
 * through a side door just because the door uses WhatsApp.
 */

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function setPortalCookie(response: NextResponse) {
  response.cookies.set(PORTAL_CONTEXT_COOKIE, "ap", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const rate = checkRateLimit(`ap-otp-verify:${ip}`, 15, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  let body: { mobile?: unknown; otp?: unknown };
  try {
    body = (await request.json()) as { mobile?: unknown; otp?: unknown };
  } catch {
    return json({ ok: false, error: "Expected a JSON body." }, 400);
  }

  const phone = normalizeWhatsAppDestination(String(body.mobile ?? ""));
  const otp = String(body.otp ?? "").replace(/\D/g, "");

  if (!phone.ok || otp.length < 4) {
    return json({ ok: false, error: "Number aur 6 digit ka code daaliye." }, 400);
  }

  // The code first: this burns the request, so it cannot be tried again.
  const verified = await verifyOtpRequest({
    phoneLocal: phone.local,
    purpose: PARTNER_LOGIN_OTP_PURPOSE,
    otp,
  });

  if (!verified.ok) {
    return json({ ok: false, error: verified.error }, verified.status);
  }

  const partner = await findPartnerForLogin(phone.local);
  if (!partner) {
    /*
      The partner existed when the code was sent. Reaching here means the
      record changed in between — removed, or its number given to another
      record — so there is nothing to sign in to.
    */
    console.warn("[ap-otp-verify] partner_missing_after_verify");
    return json({ ok: false, error: "Is number par koi DC Partner account nahi mila." }, 404);
  }

  const supabase = await getSupabaseRouteHandlerClient();
  if (!supabase) {
    console.error("[ap-otp-verify] route_client_missing");
    return json({ ok: false, error: "Login is not available right now." }, 500);
  }

  const token = await mintSessionToken(partner.authEmail);
  if (!token.ok) {
    return json({ ok: false, error: token.error }, 500);
  }

  const { data: session, error: sessionError } = await supabase.auth.verifyOtp({
    token_hash: token.tokenHash,
    type: "magiclink",
  });

  if (sessionError || !session.user) {
    console.error("[ap-otp-verify] session_exchange_failed", { message: sessionError?.message });
    return json({ ok: false, error: "Login could not be completed. Please try again." }, 500);
  }

  const access = await getAgentAccessStatus(session.user);
  if (!access.ok) {
    // Let nobody in through this door who could not come through the other.
    await supabase.auth.signOut();
    return json({ ok: false, error: partnerAccessPublicMessage(access.reason) }, 403);
  }

  const admin = getSupabaseAdmin();
  if (admin) {
    const { error: stampError } = await admin
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", session.user.id);

    // Logged and no more: a failed stamp must not cost the partner their login.
    if (stampError) {
      console.error("[ap-otp-verify] last_login_stamp_failed", { message: stampError.message });
    }
  }

  // `ok: true` is what postJson requires to read this as a success.
  return setPortalCookie(
    json({
      ok: true,
      message: "DC Partner login successful.",
      destination: "/ap/dashboard",
      redirectTo: "/ap/dashboard",
    }),
  );
}
