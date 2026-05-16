import { NextResponse } from "next/server";

import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

type ForgotPasswordBody = {
  email?: string;
};

const successMessage = "Password reset link sent. Check Inbox, Spam, Promotions.";
const rateLimitWindowMs = 15 * 60 * 1000;
const maxRequestsPerWindow = 5;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

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

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

function getEmailDomain(email: string) {
  return email.split("@")[1] || "unknown";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = requestBuckets.get(key);

  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return false;
  }

  current.count += 1;
  return current.count > maxRequestsPerWindow;
}

function devInfo(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info(message, details ?? {});
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as ForgotPasswordBody | null;
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return jsonError("Please enter a valid email address.", 400);
    }

    const rateLimitKey = `${getClientIp(request)}:${email}`;

    if (isRateLimited(rateLimitKey)) {
      console.warn("[auth/forgot-password] Rate limit exceeded", {
        emailDomain: getEmailDomain(email),
      });
      return jsonError("Too many reset requests. Please wait a few minutes and try again.", 429);
    }

    const supabase = await getSupabaseRouteHandlerClient();

    if (!supabase) {
      console.error("[auth/forgot-password] Supabase route client missing", {
        hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      });
      return jsonError("Password reset is not configured on the server.", 500);
    }

    const redirectTo = `${getSiteUrl(request)}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    devInfo("[auth/forgot-password] Reset email requested", {
      emailDomain: getEmailDomain(email),
      redirectTo,
      errorCode: error?.code ?? null,
      hasError: Boolean(error),
    });

    return NextResponse.json({ message: successMessage });
  } catch (error) {
    console.error("[auth/forgot-password] Request failed", error);
    return jsonError("Password reset request failed. Please try again.", 500);
  }
}
