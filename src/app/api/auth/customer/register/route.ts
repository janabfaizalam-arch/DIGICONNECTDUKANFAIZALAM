import { NextResponse } from "next/server";

import {
  describeAuthError,
  validateSignup,
} from "@/lib/auth/customer-account-core";
import { mobileTaken, upsertCustomerProfile } from "@/lib/auth/customer-account";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Email + password signup.
 *
 * Supabase owns the credential and sends the confirmation email; we own the
 * customers row so the rest of the app (applications, documents, invoices)
 * can resolve this person by their auth user id.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`customer-register:${getClientIp(request)}`, 8, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const validated = validateSignup(body as Record<string, string>);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, error: validated.error, field: validated.field },
      { status: 400 },
    );
  }
  const input = validated.value;

  if (await mobileTaken(input.mobile)) {
    return NextResponse.json(
      {
        ok: false,
        field: "mobile",
        error: "This mobile number is already registered. Please sign in instead.",
      },
      { status: 409 },
    );
  }

  const supabase = await getSupabaseRouteHandlerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  const origin = new URL(request.url).origin;
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/customer/dashboard")}`,
      data: {
        role: "customer",
        full_name: input.fullName,
        mobile: input.mobile,
        phone: input.mobile,
        pincode: input.pincode,
        city: input.city,
        district: input.district,
        state: input.state,
      },
    },
  });

  if (error) {
    console.warn("[customer-register] signup_failed", { code: error.status });
    return NextResponse.json(
      { ok: false, error: describeAuthError(error), field: "email" },
      { status: error.status && error.status < 500 ? error.status : 400 },
    );
  }

  const userId = data.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Account could not be created. Please try again." },
      { status: 500 },
    );
  }

  const profile = await upsertCustomerProfile({ userId, ...input });
  if (!profile.ok) {
    // The auth user exists and the confirmation mail is out; the profile can be
    // repaired on first sign-in rather than stranding the customer here.
    console.error("[customer-register] profile_failed_after_signup", { userId });
  }

  // A confirmed session is only returned when email confirmation is disabled.
  const needsConfirmation = !data.session;

  console.info("[customer-register] created", { userId, needsConfirmation });

  return NextResponse.json({
    ok: true,
    needsConfirmation,
    email: input.email,
    redirectTo: needsConfirmation ? null : "/customer/dashboard",
  });
}
