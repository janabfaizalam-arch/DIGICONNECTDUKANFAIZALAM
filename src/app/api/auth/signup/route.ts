import { NextResponse } from "next/server";

import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { attachReferralOnSignup, validateReferralCode } from "@/lib/referrals";
import {
  assertCustomerIdentityAvailable,
  completeCustomerAccount,
  CUSTOMER_EXISTS_MESSAGE,
  findAuthUserByEmailOrMobile,
  getSupabaseErrorDebug,
} from "@/lib/customer-identity";
import { creditSignupBonus } from "@/lib/wallet-ledger";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
  debug?: Record<string, unknown>,
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
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
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
    emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/customer/dashboard")}`,
  };
}

function devInfo(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info(message, details ?? {});
  }
}

function logSignupFailure({
  step,
  email,
  mobile,
  userId,
  error,
}: {
  step: string;
  email: string;
  mobile: string;
  userId?: string | null;
  error: unknown;
}) {
  const supabaseError = error as { message?: string; code?: string; details?: string; hint?: string } | null;
  console.error("[auth/signup] Step failed", {
    step,
    email,
    mobile,
    userId: userId ?? null,
    errorMessage: error instanceof Error ? error.message : supabaseError?.message ?? String(error),
    errorCode: supabaseError?.code ?? null,
    errorDetails: supabaseError?.details ?? null,
    errorHint: supabaseError?.hint ?? null,
  });
}

function logSignupStepFailed({
  label = "SIGNUP_STEP_FAILED",
  step,
  email,
  mobile,
  userId,
  error,
}: {
  label?: "SIGNUP_STEP_FAILED" | "SIGNUP_AUTH_CREATE_FAILED" | "SIGNUP_CUSTOMER_SYNC_FAILED";
  step: string;
  email: string;
  mobile: string;
  userId?: string | null;
  error: unknown;
}) {
  const debug = getSupabaseErrorDebug(error);
  const log = label === "SIGNUP_CUSTOMER_SYNC_FAILED" ? console.warn : console.error;
  log(label, {
    step,
    email,
    mobile,
    userId: userId ?? null,
    errorCode: debug.code,
    errorMessage: debug.message,
    errorDetails: debug.details,
    errorHint: debug.hint,
  });
}

function signupStepErrorResponse({
  message,
  status,
  step,
  email,
  mobile,
  userId,
  error,
  envDebug,
}: {
  message: string;
  status: number;
  step: string;
  email: string;
  mobile: string;
  userId?: string | null;
  error: unknown;
  envDebug: Record<string, unknown>;
}) {
  const errorDebug = getSupabaseErrorDebug(error);

  return jsonSignupError(message, status, {
    ...envDebug,
    step,
    email,
    mobile,
    userId: userId ?? null,
    supabaseErrorCode: errorDebug.code,
    supabaseErrorMessage: errorDebug.message,
    supabaseErrorDetails: errorDebug.details,
    supabaseErrorHint: errorDebug.hint,
  });
}

async function resendCustomerVerification(request: Request, email: string) {
  const supabase = await getSupabaseRouteHandlerClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${getSiteUrl(request)}/auth/callback?next=${encodeURIComponent("/customer/dashboard")}`,
    },
  });

  if (error) {
    logSignupFailure({ step: "resend_verification", email, mobile: "", error });
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(`signup:${getClientIp(request)}`, 5, 60_000);

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    devInfo("[auth/signup] Request received");
    const envDebug = getSignupEnvDebug(request);

    devInfo("[auth/signup] Environment check", {
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

    devInfo("[auth/signup] Request details", {
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

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      console.warn("[auth/signup] Validation failed", { field: "mobile", length: mobile.length });
      return jsonSignupError("Enter a valid Indian 10 digit mobile number.", 400, envDebug);
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

    if (referredBy) {
      const referralValidation = await validateReferralCode(referredBy);

      if (!referralValidation.ok) {
        return jsonSignupError(referralValidation.message || "Referral code is invalid. Clear it to continue without referral.", 400, envDebug);
      }
    }

    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      console.error("[auth/signup] Supabase admin client missing", {
        hasSupabaseUrl: envDebug.hasSupabaseUrl,
        hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      });
      return jsonSignupError("Signup is not configured on the server.", 500, envDebug);
    }

    const existingAuthUser = await findAuthUserByEmailOrMobile(supabaseAdmin, email, mobile);

    if (existingAuthUser) {
      console.info("DUPLICATE_SIGNUP_DETECTED", {
        step: "existing_auth_lookup",
        email,
        mobile,
        authUserId: existingAuthUser.id,
      });
      await completeCustomerAccount(supabaseAdmin, {
        userId: existingAuthUser.id,
        fullName,
        email,
        mobile,
        pincode,
        city,
        state,
        source: "online",
        avatarUrl: String(existingAuthUser.user_metadata.avatar_url ?? existingAuthUser.user_metadata.picture ?? ""),
        skipCustomers: true,
      }).catch((repairError) => {
        logSignupStepFailed({
          label: "SIGNUP_CUSTOMER_SYNC_FAILED",
          step: "optional_repair_existing_auth_user",
          email,
          mobile,
          userId: existingAuthUser.id,
          error: repairError,
        });
      });
      await resendCustomerVerification(request, email);

      return jsonSignupError(CUSTOMER_EXISTS_MESSAGE, 409, envDebug);
    }

    const duplicateCheck = await assertCustomerIdentityAvailable(supabaseAdmin, { email, mobile });

    if (duplicateCheck?.ok === false) {
      console.info("DUPLICATE_SIGNUP_DETECTED", {
        step: "public_identity_duplicate",
        email,
        mobile,
      });
      return jsonSignupError(duplicateCheck.message, 409, envDebug);
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
        emailRedirectTo: `${getSiteUrl(request)}/auth/callback?next=${encodeURIComponent("/customer/dashboard")}`,
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

    devInfo("[auth/signup] Supabase signup response", {
      emailDomain: getEmailDomain(email),
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null,
      hasUser: Boolean(data.user),
      userId: data.user?.id ?? null,
      hasSession: Boolean(data.session),
      emailConfirmed: Boolean(data.user?.email_confirmed_at),
    });

    if (error) {
      const alreadyExists = error.message.toLowerCase().includes("already") || error.message.toLowerCase().includes("registered");
      if (alreadyExists) {
        console.info("DUPLICATE_SIGNUP_DETECTED", {
          step: "auth_signup",
          email,
          mobile,
          errorCode: error.code ?? null,
        });
      } else {
        logSignupStepFailed({ label: "SIGNUP_AUTH_CREATE_FAILED", step: "auth_signup", email, mobile, error });
        logSignupFailure({ step: "auth_signup", email, mobile, error });
      }
      return signupStepErrorResponse({
        message: alreadyExists ? CUSTOMER_EXISTS_MESSAGE : error.message,
        status: alreadyExists ? 409 : 400,
        step: "auth_signup",
        email,
        mobile,
        error,
        envDebug,
      });
    }

    if (data.user) {
      try {
        await completeCustomerAccount(supabaseAdmin, {
          userId: data.user.id,
          fullName,
          email,
          mobile,
          pincode,
          city,
          state,
          source: "online",
          avatarUrl: String(data.user.user_metadata.avatar_url ?? data.user.user_metadata.picture ?? ""),
          skipCustomers: true,
        });
      } catch (syncError) {
        logSignupStepFailed({
          label: "SIGNUP_CUSTOMER_SYNC_FAILED",
          step: "complete_customer_account_after_auth_signup",
          email,
          mobile,
          userId: data.user.id,
          error: syncError,
        });
      }

      await creditSignupBonus(data.user.id).catch((rewardError) => {
        logSignupStepFailed({ step: "optional_credit_signup_bonus", email, mobile, userId: data.user?.id, error: rewardError });
      });
    }

    if (data.user?.id && referredBy) {
      try {
        console.info("REFERRAL_SYNC_START", {
          step: "optional_attach_referral_on_signup",
          email,
          mobile,
          userId: data.user.id,
          referralCode: referredBy,
        });
        await attachReferralOnSignup(data.user.id, referredBy, getClientIp(request), request.headers.get("user-agent"));
        console.info("REFERRAL_SYNC_OK", {
          step: "optional_attach_referral_on_signup",
          email,
          mobile,
          userId: data.user.id,
          referralCode: referredBy,
        });
      } catch (rewardError) {
        const debug = getSupabaseErrorDebug(rewardError);
        console.error("REFERRAL_SYNC_FAIL", {
          step: "optional_attach_referral_on_signup",
          email,
          mobile,
          userId: data.user.id,
          referralCode: referredBy,
          errorCode: debug.code,
          errorMessage: debug.message,
          errorDetails: debug.details,
          errorHint: debug.hint,
          stack: rewardError instanceof Error ? rewardError.stack : null,
        });
        console.warn("REFERRAL_SIGNUP_ATTACHMENT_FAILED", {
          step: "optional_attach_referral_on_signup",
          email,
          mobile,
          userId: data.user.id,
          referralCode: referredBy,
          errorCode: debug.code,
          errorMessage: debug.message,
          errorDetails: debug.details,
          errorHint: debug.hint,
        });
      }
    }

    return NextResponse.json({
      message: data.session
        ? "Account created successfully."
        : "Please verify your email. Check Inbox, Spam, and Promotions folder.",
      userId: data.user?.id ?? null,
      hasSession: Boolean(data.session),
      destination: "/customer/dashboard",
      ...(process.env.NODE_ENV === "development" ? { debug: envDebug } : {}),
    });
  } catch (error) {
    const debug = getSupabaseErrorDebug(error);
    console.error("SIGNUP_FATAL_DEBUG", {
      step: "signup_route_outer_catch",
      errorCode: debug.code,
      errorMessage: debug.message,
      errorDetails: debug.details,
      errorHint: debug.hint,
      stack: error instanceof Error ? error.stack : null,
    });
    console.error("[auth/signup] Signup failed", error);
    return jsonSignupError("Signup failed. Please try again.", 500);
  }
}
