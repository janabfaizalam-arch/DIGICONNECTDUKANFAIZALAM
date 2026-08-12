import { NextResponse } from "next/server";

import { resolveIdentifier } from "@/lib/auth/customer-account-core";
import { emailForMobile } from "@/lib/auth/customer-account";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Start a password reset.
 *
 * Always answers "if that account exists, we've sent a link" — a different
 * response for unknown addresses would turn this into an account-existence
 * oracle that needs no password to query.
 */
const ALWAYS = {
  ok: true,
  message: "If that account exists, a password reset link is on its way. Check your inbox and spam folder.",
};

export async function POST(request: Request) {
  const rate = checkRateLimit(`customer-forgot:${getClientIp(request)}`, 5, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  let body: { identifier?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const identifier = resolveIdentifier(body.identifier);
  if (identifier.kind === "invalid") {
    return NextResponse.json(
      { ok: false, error: "Enter your registered email address or mobile number." },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseRouteHandlerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  const email =
    identifier.kind === "email" ? identifier.email : await emailForMobile(identifier.mobile);

  if (email) {
    const origin = new URL(request.url).origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/customer/reset-password")}`,
    });
    // Logged, never returned — the caller gets the same answer either way.
    if (error) console.warn("[customer-forgot] send_failed", { status: error.status });
  }

  return NextResponse.json(ALWAYS);
}
