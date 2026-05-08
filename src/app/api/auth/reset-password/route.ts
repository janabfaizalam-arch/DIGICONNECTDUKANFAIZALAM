import { NextResponse } from "next/server";

import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

type ResetPasswordBody = {
  password?: string;
  confirmPassword?: string;
};

const rateLimitWindowMs = 15 * 60 * 1000;
const maxRequestsPerWindow = 10;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function getPasswordValidationMessage(password: string) {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    return "Password must include at least one special character.";
  }

  return "";
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
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

export async function POST(request: Request) {
  try {
    const rateLimitKey = getClientIp(request);

    if (isRateLimited(rateLimitKey)) {
      console.warn("[auth/reset-password] Rate limit exceeded");
      return jsonError("Too many password update attempts. Please wait a few minutes and try again.", 429);
    }

    const body = (await request.json().catch(() => null)) as ResetPasswordBody | null;
    const password = String(body?.password ?? "");
    const confirmPassword = String(body?.confirmPassword ?? "");

    if (!password || !confirmPassword) {
      return jsonError("New password and confirmation are required.", 400);
    }

    if (password !== confirmPassword) {
      return jsonError("Passwords do not match.", 400);
    }

    const passwordValidationMessage = getPasswordValidationMessage(password);

    if (passwordValidationMessage) {
      return jsonError(passwordValidationMessage, 400);
    }

    const supabase = await getSupabaseRouteHandlerClient();

    if (!supabase) {
      console.error("[auth/reset-password] Supabase route client missing", {
        hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      });
      return jsonError("Password update is not configured on the server.", 500);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn("[auth/reset-password] Missing recovery session", {
        errorCode: userError?.code ?? null,
      });
      return jsonError("Reset link is invalid or expired. Please request a new password reset link.", 401);
    }

    const { error } = await supabase.auth.updateUser({ password });

    console.info("[auth/reset-password] Password update requested", {
      userId: user.id,
      errorCode: error?.code ?? null,
      hasError: Boolean(error),
    });

    if (error) {
      return jsonError("Password could not be updated. Please request a new reset link and try again.", 400);
    }

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("[auth/reset-password] Request failed", error);
    return jsonError("Password update failed. Please try again.", 500);
  }
}
