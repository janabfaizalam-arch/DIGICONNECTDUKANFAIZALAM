import { NextResponse } from "next/server";

import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { creditReferralRewardForSignup } from "@/lib/wallet";

type SignupBody = {
  fullName?: string;
  name?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  password?: string;
  pincode?: string;
  city?: string;
  state?: string;
  referred_by?: string;
  referralCode?: string;
};

function jsonSignupError(
  message: string,
  status: number,
  debug?: Record<string, boolean | string | null>,
) {
  return NextResponse.json(
    {
      error: message,
      message,
      ...(process.env.NODE_ENV === "development" && debug ? { debug } : {}),
    },
    { status },
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getPasswordValidationMessage(password: string) {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
    return "Password must include uppercase, lowercase, number, and special character.";
  }

  return "";
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

function getSignupEnvDebug(request: Request) {
  const siteUrl = getSiteUrl(request);

  return {
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    siteUrl,
    siteUrlIsRnos: siteUrl === "https://rnos.in",
    emailRedirectTo: `${siteUrl}/auth/callback`,
  };
}

export async function POST(request: Request) {
  try {
    console.info("[auth/signup] Request received");
    const envDebug = getSignupEnvDebug(request);

    console.info("[auth/signup] Environment check", {
      hasSupabaseUrl: envDebug.hasSupabaseUrl,
      hasSupabaseAnonKey: envDebug.hasSupabaseAnonKey,
      siteUrl: envDebug.siteUrl,
      emailRedirectTo: envDebug.emailRedirectTo,
    });

    const body = (await request.json().catch(() => null)) as SignupBody | null;
    const fullName = String(body?.fullName ?? body?.name ?? "").trim();
    const mobile = String(body?.mobile ?? body?.phone ?? "").replace(/\D/g, "").trim();
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
      return jsonSignupError("Full name is required.", 400, envDebug);
    }

    if (!mobile) {
      console.warn("[auth/signup] Validation failed", { field: "mobile" });
      return jsonSignupError("Mobile number is required", 400, envDebug);
    }

    if (!/^\d{10}$/.test(mobile)) {
      console.warn("[auth/signup] Validation failed", { field: "mobile", length: mobile.length });
      return jsonSignupError("Enter a valid 10 digit mobile number.", 400, envDebug);
    }

    if (!isValidEmail(email)) {
      console.warn("[auth/signup] Validation failed", {
        field: "email",
        emailDomain: email ? getEmailDomain(email) : "missing",
      });
      return jsonSignupError("Please enter a valid email address.", 400, envDebug);
    }

    const passwordValidationMessage = getPasswordValidationMessage(password);

    if (passwordValidationMessage) {
      console.warn("[auth/signup] Validation failed", { field: "password", reason: passwordValidationMessage });
      return jsonSignupError(passwordValidationMessage, 400, envDebug);
    }

    if (!/^\d{6}$/.test(pincode)) {
      console.warn("[auth/signup] Validation failed", { field: "pincode", hasPincode: Boolean(pincode) });
      return jsonSignupError("A valid 6 digit PIN code is required.", 400, envDebug);
    }

    if (!city || !state) {
      console.warn("[auth/signup] Validation failed", {
        field: "city/state",
        hasCity: Boolean(city),
        hasState: Boolean(state),
      });
      return jsonSignupError("City and state are required. Enter them manually if PIN lookup failed.", 400, envDebug);
    }

    const supabase = await getSupabaseRouteHandlerClient();

    if (!supabase) {
      console.error("[auth/signup] Supabase route client missing", {
        hasSupabaseUrl: envDebug.hasSupabaseUrl,
        hasSupabaseAnonKey: envDebug.hasSupabaseAnonKey,
      });
      return jsonSignupError("Signup is not configured on the server.", 500, envDebug);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getSiteUrl(request)}/auth/callback`,
        data: {
          full_name: fullName,
          mobile,
          phone: mobile,
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
      return jsonSignupError(error.message, 400, {
        ...envDebug,
        supabaseErrorCode: error.code ?? null,
      });
    }

    if (data.session) {
      await supabase.auth.signOut();
    }

    if (data.user?.id && referredBy) {
      try {
        await creditReferralRewardForSignup({
          referralCode: referredBy,
          referredUserId: data.user.id,
          createdBy: data.user.id,
        });
      } catch (rewardError) {
        console.error("[auth/signup] Referral reward credit failed", rewardError);
      }
    }

    return NextResponse.json({
      message: "Verification email sent. Please check Inbox, Spam, and Promotions folder.",
      userId: data.user?.id ?? null,
      hasSession: Boolean(data.session),
      ...(process.env.NODE_ENV === "development" ? { debug: envDebug } : {}),
    });
  } catch (error) {
    console.error("[auth/signup] Signup failed", error);
    return jsonSignupError("Signup failed. Please try again.", 500);
  }
}
