import crypto from "crypto";
import { NextResponse } from "next/server";

import { getCustomerProfileStatus } from "@/lib/customer-profile";
import { normalizeIndianMobile, verifyMsg91AccessToken } from "@/lib/msg91";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type VerifyBody = {
  mobile?: string;
  accessToken?: string;
  fullName?: string;
  email?: string;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 8;
const OTP_EMAIL_DOMAIN = "otp.rnos.in";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return false;
  }

  current.count += 1;
  return true;
}

function getOtpEmail(mobile: string) {
  return `${mobile}@${OTP_EMAIL_DOMAIN}`;
}

function getOtpPassword(mobile: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.MSG91_AUTH_KEY || "";

  if (!secret) {
    throw new Error("Server auth secret is not configured.");
  }

  return crypto.createHmac("sha256", secret).update(`msg91:${mobile}`).digest("hex");
}

function firstText(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? "";
}

async function findExistingUserId(mobile: string) {
  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) return null;

  const lookups = await Promise.allSettled([
    supabaseAdmin.from("profiles").select("id").eq("mobile", mobile).maybeSingle(),
    supabaseAdmin.from("customer_profiles").select("id").eq("mobile", mobile).maybeSingle(),
    supabaseAdmin.from("customers").select("user_id").eq("mobile", mobile).not("user_id", "is", null).maybeSingle(),
  ]);

  for (const lookup of lookups) {
    if (lookup.status !== "fulfilled" || lookup.value.error) continue;
    const row = lookup.value.data as { id?: string | null; user_id?: string | null } | null;
    const id = row?.id || row?.user_id;
    if (id) return id;
  }

  return null;
}

async function ensureSupabaseOtpUser({
  mobile,
  fullName,
  email,
}: {
  mobile: string;
  fullName: string;
  email: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const password = getOtpPassword(mobile);
  const existingUserId = await findExistingUserId(mobile);
  const otpEmail = getOtpEmail(mobile);
  const now = new Date().toISOString();

  if (existingUserId) {
    const { data: userResult, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(existingUserId);

    if (getUserError || !userResult.user) {
      throw new Error(getUserError?.message || "Existing customer could not be loaded.");
    }

    const signInEmail = userResult.user.email || email || otpEmail;
    const resolvedName = firstText(fullName, String(userResult.user.user_metadata.full_name ?? ""), String(userResult.user.user_metadata.name ?? ""), "Customer");

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUserId, {
      email: signInEmail,
      password,
      phone: `+91${mobile}`,
      phone_confirm: true,
      email_confirm: true,
      user_metadata: {
        ...userResult.user.user_metadata,
        full_name: resolvedName,
        mobile,
        phone: mobile,
        role: "customer",
        auth_provider: "msg91",
      },
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { id: existingUserId, email: signInEmail, fullName: resolvedName, password, isNew: false };
  }

  const resolvedName = firstText(fullName, "Customer");
  const signInEmail = email || otpEmail;
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: signInEmail,
    password,
    phone: `+91${mobile}`,
    phone_confirm: true,
    email_confirm: true,
    user_metadata: {
      full_name: resolvedName,
      mobile,
      phone: mobile,
      role: "customer",
      auth_provider: "msg91",
    },
  });

  if (createError || !created.user) {
    throw new Error(createError?.message || "Customer account could not be created.");
  }

  await supabaseAdmin.from("profiles").upsert(
    {
      id: created.user.id,
      full_name: resolvedName,
      email: signInEmail,
      mobile,
      role: "customer",
      updated_at: now,
    },
    { onConflict: "id" },
  );

  return { id: created.user.id, email: signInEmail, fullName: resolvedName, password, isNew: true };
}

async function syncCustomerTables({
  userId,
  mobile,
  fullName,
  email,
}: {
  userId: string;
  mobile: string;
  fullName: string;
  email: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return;

  const now = new Date().toISOString();
  const safeName = fullName || "Customer";

  await Promise.allSettled([
    supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        full_name: safeName,
        email,
        mobile,
        role: "customer",
        updated_at: now,
      },
      { onConflict: "id" },
    ),
    supabaseAdmin.from("customer_profiles").upsert(
      {
        id: userId,
        full_name: safeName,
        email,
        mobile,
        updated_at: now,
      },
      { onConflict: "id" },
    ),
  ]);

  const { data: existingCustomer } = await supabaseAdmin.from("customers").select("id").eq("user_id", userId).maybeSingle();

  if (existingCustomer?.id) {
    await supabaseAdmin
      .from("customers")
      .update({
        full_name: safeName,
        email,
        mobile,
        source: "online",
        updated_at: now,
      })
      .eq("id", existingCustomer.id);
  } else {
    await supabaseAdmin.from("customers").insert({
      user_id: userId,
      full_name: safeName,
      email,
      mobile,
      source: "online",
    });
  }
}

function getDestination(complete: boolean) {
  return complete ? "/customer/dashboard" : "/customer/profile";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as VerifyBody | null;
    const mobile = normalizeIndianMobile(body?.mobile);
    const accessToken = String(body?.accessToken ?? "").trim();
    const ip = getClientIp(request);

    if (!mobile) {
      return jsonError("A valid 10 digit mobile number is required.", 400);
    }

    if (!checkRateLimit(`${ip}:${mobile}`)) {
      return jsonError("Too many OTP attempts. Please try again after a few minutes.", 429);
    }

    const verified = await verifyMsg91AccessToken(accessToken, mobile);
    const requestedFullName = firstText(body?.fullName, verified.fullName);
    const requestedEmail = firstText(body?.email, verified.email).toLowerCase();
    const account = await ensureSupabaseOtpUser({
      mobile,
      fullName: requestedFullName,
      email: requestedEmail,
    });
    const email = requestedEmail || account.email;

    await syncCustomerTables({
      userId: account.id,
      mobile,
      fullName: account.fullName,
      email,
    });

    const supabase = await getSupabaseRouteHandlerClient();

    if (!supabase) {
      return jsonError("Supabase auth is not configured.", 500);
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

    if (signInError) {
      return jsonError(signInError.message, 401);
    }

    const profileStatus = await getCustomerProfileStatus(account.id);

    return NextResponse.json({
      message: account.isNew ? "Mobile verified. Customer account created." : "Mobile verified. Welcome back.",
      isNew: account.isNew,
      destination: getDestination(profileStatus.complete),
    });
  } catch (error) {
    console.error("[auth/msg91/verify] OTP login failed", error);
    return jsonError(error instanceof Error ? error.message : "OTP login failed. Please try again.", 500);
  }
}
