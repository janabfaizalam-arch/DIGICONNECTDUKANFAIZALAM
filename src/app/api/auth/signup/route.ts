import { NextResponse } from "next/server";

import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

type SignupBody = {
  fullName?: string;
  name?: string;
  email?: string;
  password?: string;
  pincode?: string;
  city?: string;
  state?: string;
  referred_by?: string;
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

function getEmailDomain(email: string) {
  return email.split("@")[1] || "unknown";
}

export async function POST(request: Request) {
  try {
    console.info("[auth/signup] Request received");

    const body = (await request.json().catch(() => null)) as SignupBody | null;
    const fullName = String(body?.fullName ?? body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const pincode = String(body?.pincode ?? "").trim();
    const city = String(body?.city ?? "").trim();
    const state = String(body?.state ?? "").trim();
    const referredBy = String(body?.referred_by ?? body?.referralCode ?? "").trim().toUpperCase();

    console.info("[auth/signup] Request details", {
      emailDomain: email ? getEmailDomain(email) : "missing",
      hasPincode: Boolean(pincode),
      hasCity: Boolean(city),
      hasState: Boolean(state),
    });

    if (!fullName) {
      console.warn("[auth/signup] Validation failed", { field: "fullName" });
      return jsonError("Full name is required.", 400);
    }

    if (!isValidEmail(email)) {
      console.warn("[auth/signup] Validation failed", {
        field: "email",
        emailDomain: email ? getEmailDomain(email) : "missing",
      });
      return jsonError("Please enter a valid email address.", 400);
    }

    if (password.length < 6) {
      console.warn("[auth/signup] Validation failed", { field: "password" });
      return jsonError("Password must be at least 6 characters.", 400);
    }

    if (!/^\d{6}$/.test(pincode)) {
      console.warn("[auth/signup] Validation failed", { field: "pincode", hasPincode: Boolean(pincode) });
      return jsonError("A valid 6 digit PIN code is required.", 400);
    }

    if (!city || !state) {
      console.warn("[auth/signup] Validation failed", {
        field: "city/state",
        hasCity: Boolean(city),
        hasState: Boolean(state),
      });
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
        emailRedirectTo: `${getSiteUrl(request)}/auth/callback`,
        data: {
          full_name: fullName,
          pincode,
          city,
          state,
          referred_by: referredBy || undefined,
        },
      },
    });

    console.info("[auth/signup] Supabase signup response", {
      emailDomain: getEmailDomain(email),
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null,
      hasUser: Boolean(data.user),
      userId: data.user?.id ?? null,
      hasSession: Boolean(data.session),
      emailConfirmed: Boolean(data.user?.email_confirmed_at),
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
