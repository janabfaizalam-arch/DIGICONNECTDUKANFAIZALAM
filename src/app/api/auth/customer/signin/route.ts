import { NextResponse } from "next/server";

import { describeAuthError, resolveIdentifier } from "@/lib/auth/customer-account-core";
import { emailForMobile } from "@/lib/auth/customer-account";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Same wording for every credential failure — see below. */
const GENERIC_FAILURE = "Email/mobile or password is incorrect.";

/**
 * Sign in with either an email address or a mobile number, plus password.
 *
 * A mobile number is translated to its account email before authenticating.
 * Every credential-shaped failure returns the identical message and status so
 * this endpoint cannot be used to enumerate which emails or numbers exist.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`customer-signin:${ip}`, 10, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  let body: { identifier?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const identifier = resolveIdentifier(body.identifier);

  if (identifier.kind === "invalid" || !password) {
    return NextResponse.json({ ok: false, error: GENERIC_FAILURE }, { status: 401 });
  }

  const supabase = await getSupabaseRouteHandlerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  let email: string | null;
  if (identifier.kind === "email") {
    email = identifier.email;
  } else {
    email = await emailForMobile(identifier.mobile);
    if (!email) {
      // Unknown number — answer exactly as for a wrong password.
      return NextResponse.json({ ok: false, error: GENERIC_FAILURE }, { status: 401 });
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const message = describeAuthError(error);
    // "Email not confirmed" is safe to surface: the customer just signed up and
    // needs to be told to check their inbox, and it leaks nothing a signup
    // attempt would not already reveal.
    const unconfirmed = /confirm your email/i.test(message);
    console.info("[customer-signin] failed", { via: identifier.kind, unconfirmed });
    return NextResponse.json(
      { ok: false, error: unconfirmed ? message : GENERIC_FAILURE, needsConfirmation: unconfirmed },
      { status: 401 },
    );
  }

  console.info("[customer-signin] ok", { userId: data.user.id, via: identifier.kind });

  return NextResponse.json({ ok: true, redirectTo: "/customer/dashboard" });
}
