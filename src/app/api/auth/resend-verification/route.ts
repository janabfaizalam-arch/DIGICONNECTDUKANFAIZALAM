import { NextResponse } from "next/server";

import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

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

function devInfo(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info(message, details ?? {});
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { email?: string } | null;
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return jsonError("Please enter a valid email address before resending verification.", 400);
    }

    const supabase = await getSupabaseRouteHandlerClient();

    if (!supabase) {
      return jsonError("Verification email resend is not configured on the server.", 500);
    }

    const emailRedirectTo = `${getSiteUrl(request)}/auth/callback?next=${encodeURIComponent("/customer/dashboard")}`;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo,
      },
    });

    devInfo("[auth/resend-verification] Supabase resend response", {
      emailDomain: email.split("@")[1] ?? "unknown",
      error: error?.message ?? null,
    });

    if (error) {
      return jsonError(error.message, 400);
    }

    return NextResponse.json({
      message: "Verification email sent. Please check Inbox, Spam, and Promotions folder.",
    });
  } catch (error) {
    console.error("[auth/resend-verification] Resend failed", error);
    return jsonError("Verification email could not be resent. Please try again.", 500);
  }
}
