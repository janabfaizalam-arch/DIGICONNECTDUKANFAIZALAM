import { NextResponse } from "next/server";

import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

type SignupBody = {
  name?: string;
  email?: string;
  password?: string;
  pincode?: string;
  city?: string;
  state?: string;
  referralCode?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getSiteUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  return new URL(request.url).origin;
}

function getEmailRedirectTo(request: Request) {
  const siteUrl = getSiteUrl(request);
  return `${siteUrl}/auth/callback?next=${encodeURIComponent("/customer/dashboard")}`;
}

function logSignupResult(result: {
  email: string;
  userId?: string | null;
  hasSession?: boolean;
  emailConfirmedAt?: string | null;
  error?: string | null;
}) {
  const [, domain = "unknown"] = result.email.split("@");

  console.info("[auth/signup] Supabase signup response", {
    emailDomain: domain,
    userId: result.userId ?? null,
    hasSession: Boolean(result.hasSession),
    emailConfirmed: Boolean(result.emailConfirmedAt),
    error: result.error ?? null,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as SignupBody | null;
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const pincode = String(body?.pincode ?? "").trim();
    const city = String(body?.city ?? "").trim();
    const state = String(body?.state ?? "").trim();
    const referralCode = String(body?.referralCode ?? "").trim().toUpperCase();

    if (!name) {
      return jsonError("Full name is required.", 400);
    }

    if (!isValidEmail(email)) {
      return jsonError("Please enter a valid email address.", 400);
    }

    if (password.length < 6) {
      return jsonError("Password must be at least 6 characters.", 400);
    }

    if (!/^\d{6}$/.test(pincode)) {
      return jsonError("A valid 6 digit PIN code is required.", 400);
    }

    if (!city || !state) {
      return jsonError("City and state are required. Enter them manually if PIN lookup failed.", 400);
    }

    const supabase = await getSupabaseRouteHandlerClient();

    if (!supabase) {
      return jsonError("Signup is not configured on the server.", 500);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getEmailRedirectTo(request),
        data: {
          full_name: name,
          pincode,
          city,
          state,
          referral_code: referralCode || undefined,
        },
      },
    });

    logSignupResult({
      email,
      userId: data.user?.id,
      hasSession: Boolean(data.session),
      emailConfirmedAt: data.user?.email_confirmed_at ?? null,
      error: error?.message ?? null,
    });

    if (error) {
      return jsonError(error.message, 400);
    }

    if (data.session) {
      await supabase.auth.signOut();
    }

    return NextResponse.json({
      message: "Verification email sent. Please check Inbox, Spam, and Promotions folder.",
      userId: data.user?.id ?? null,
      hasSession: Boolean(data.session),
    });
  } catch (error) {
    console.error("[auth/signup] Signup failed", error);
    return jsonError("Signup failed. Please try again.", 500);
  }
}
