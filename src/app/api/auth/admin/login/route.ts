import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isSupabaseAuthCookieName,
  pickAdminProfile,
  TimeoutError,
  withTimeout,
  type AdminProfileRow,
} from "@/lib/auth/admin-login-core";
import { createPrimaryAdminPinSession } from "@/lib/auth/admin-session";
import { mobileLookupVariants, normalizeStoredMobile } from "@/lib/auth/customer-lookup";
import { maskPhone, normalizeIndianPhone } from "@/lib/auth/phone";
import {
  isAllowlistedAdminEmail,
  isDemotedAdminEmail,
  isPrimaryAdminEmail,
  PRIMARY_ADMIN,
} from "@/lib/auth/primary-admin";
import { isValidPinFormat } from "@/lib/auth/pin";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";
import { signInWithPasswordCookies } from "@/lib/auth/session-cookies";
import { clearAuthCookies } from "@/lib/auth-v2/session";
import { verifyPin } from "@/lib/auth-v2/password";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Hard budgets so one slow/unreachable dependency can never hang the login.
const AUTH_TIMEOUT_MS = 10_000;
const DB_TIMEOUT_MS = 8_000;
const LOG_TIMEOUT_MS = 3_000;

const TIMEOUT_MESSAGE = "Login request timed out. Please try again.";

const emailSchema = z.object({
  method: z.literal("email").optional(),
  email: z.string().email(),
  password: z.string().min(6),
});

const pinSchema = z.object({
  method: z.literal("pin"),
  phone: z.string().trim().min(10).max(20),
  pin: z.string(),
});

function maskEmail(email: string | null | undefined): string {
  const value = String(email ?? "");
  const at = value.indexOf("@");
  if (at < 1) return "***";
  return `${value.slice(0, 2)}***${value.slice(at)}`;
}

/** Structured server log — never receives passwords or PINs. */
function logAdminLogin(event: string, details: Record<string, unknown> = {}) {
  console.info(`[admin-login] ${event}`, JSON.stringify(details));
}

/** Best-effort DB audit log: time-boxed, never throws, never blocks login. */
function auditLog(input: Parameters<typeof logAuthSecurityEvent>[0]): Promise<void> {
  return withTimeout(logAuthSecurityEvent(input), LOG_TIMEOUT_MS, "security_log").catch(() => {});
}

/** Remove stale customer cookies so they cannot override the new admin session. */
async function clearStaleCustomerSessions(options: { dropSupabaseCookies: boolean }) {
  await clearAuthCookies().catch(() => {});
  if (options.dropSupabaseCookies) {
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (isSupabaseAuthCookieName(cookie.name)) {
        cookieStore.delete(cookie.name);
      }
    }
  }
}

type AdminAccess =
  | { ok: true; profile: AdminProfileRow | null }
  | { ok: false; error: string; status: number };

/**
 * Verify the authenticated user maps to an active admin profile.
 * Duplicate-tolerant: profiles are looked up by primary key, never `.single()`.
 */
async function assertAdminProfile(userId: string, email: string | null | undefined): Promise<AdminAccess> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Server configuration error. Please contact support.", status: 503 };

  if (isDemotedAdminEmail(email)) {
    return { ok: false, error: "Admin access revoked for this account.", status: 403 };
  }

  logAdminLogin("admin_profile_lookup_started", { userId, email: maskEmail(email) });

  const { data: rows, error } = await withTimeout(
    supabase
      .from("profiles")
      .select("id, role, email, mobile, phone, full_name, active, is_active")
      .eq("id", userId)
      .limit(2),
    DB_TIMEOUT_MS,
    "profile_lookup",
  );

  if (error) {
    logAdminLogin("admin_profile_lookup_failed", { userId, message: error.message });
    return { ok: false, error: "Login failed. Please try again.", status: 500 };
  }

  const profile = ((rows ?? [])[0] as AdminProfileRow | undefined) ?? null;

  const role = String(profile?.role ?? "").toLowerCase();
  const allowlisted = isAllowlistedAdminEmail(email) || isAllowlistedAdminEmail(profile?.email);
  const isAdmin = role === "admin" || role === "super_admin" || allowlisted;

  if (!isAdmin) {
    logAdminLogin("admin_profile_lookup_failed", { userId, reason: "not_admin", role });
    return { ok: false, error: "Admin access denied for this account.", status: 403 };
  }

  if (profile?.active === false || profile?.is_active === false) {
    logAdminLogin("admin_profile_lookup_failed", { userId, reason: "inactive" });
    return { ok: false, error: "Admin account is inactive.", status: 403 };
  }

  logAdminLogin("admin_profile_lookup_success", { userId, role: role || "allowlisted" });
  return { ok: true, profile };
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  try {
    const json = await request.json().catch(() => null);
    const method = json?.method === "pin" ? "pin" : "email";
    logAdminLogin("admin_login_started", { method, ip });

    // ── Email + password ───────────────────────────────────────────────
    if (method === "email") {
      const body = emailSchema.parse(json);
      const email = body.email.trim().toLowerCase();

      if (isDemotedAdminEmail(email)) {
        logAdminLogin("admin_login_auth_failed", { method, reason: "demoted", email: maskEmail(email) });
        return NextResponse.json({ error: "Admin access revoked for this account." }, { status: 403 });
      }

      const session = await withTimeout(
        signInWithPasswordCookies(email, body.password),
        AUTH_TIMEOUT_MS,
        "supabase_password_auth",
      );

      if (session.error === "Auth not configured") {
        logAdminLogin("admin_login_auth_failed", { method, reason: "auth_not_configured" });
        return NextResponse.json(
          { error: "Server configuration error. Please contact support." },
          { status: 503 },
        );
      }

      if (session.error || !session.data?.user) {
        logAdminLogin("admin_login_auth_failed", { method, email: maskEmail(email) });
        await auditLog({
          phone: null,
          eventType: "admin_login_failed_password",
          details: { email },
          ip,
          userAgent,
        });
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      const user = session.data.user;
      logAdminLogin("admin_login_auth_success", { method, userId: user.id });

      const access = await assertAdminProfile(user.id, user.email);
      if (!access.ok) {
        const { signOutCookies } = await import("@/lib/auth/session-cookies");
        await withTimeout(signOutCookies(), AUTH_TIMEOUT_MS, "supabase_sign_out").catch(() => {});
        return NextResponse.json({ error: access.error }, { status: access.status });
      }

      // Keep primary admin metadata correct (best effort, time-boxed)
      const supabase = getSupabaseAdmin();
      if (supabase && isPrimaryAdminEmail(user.email)) {
        await withTimeout(
          supabase
            .from("profiles")
            .update({
              role: "admin",
              full_name: PRIMARY_ADMIN.fullName,
              email: PRIMARY_ADMIN.email,
              mobile: PRIMARY_ADMIN.mobile,
              active: true,
              is_active: true,
            })
            .eq("id", user.id),
          DB_TIMEOUT_MS,
          "primary_admin_profile_sync",
        ).catch(() => {});
      }

      // Stale customer PIN cookies must not override the fresh admin session.
      // Supabase cookies are preserved — they ARE the new admin session.
      await clearStaleCustomerSessions({ dropSupabaseCookies: false });

      logAdminLogin("admin_session_created", { method, userId: user.id, sessionType: "supabase" });
      await auditLog({
        userId: user.id,
        eventType: "admin_login_success_password",
        details: { email },
        ip,
        userAgent,
      });

      logAdminLogin("admin_login_redirect", { method, redirectTo: "/admin" });
      return NextResponse.json({ ok: true, redirectTo: "/admin", method: "email" });
    }

    // ── Mobile + PIN ───────────────────────────────────────────────────
    const body = pinSchema.parse(json);
    const phone = normalizeIndianPhone(body.phone);
    if (!phone.ok) {
      return NextResponse.json({ error: phone.error }, { status: 400 });
    }
    if (!isValidPinFormat(body.pin)) {
      return NextResponse.json({ error: "PIN exactly 6 digits hona chahiye." }, { status: 400 });
    }

    // Only the primary admin mobile may use PIN login — role is decided
    // server-side here, never trusted from the browser payload.
    if (phone.local !== PRIMARY_ADMIN.mobile) {
      logAdminLogin("admin_login_auth_failed", { method, reason: "mobile_not_primary_admin", phone: maskPhone(phone.local) });
      return NextResponse.json({ error: "Invalid mobile or PIN." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logAdminLogin("admin_login_auth_failed", { method, reason: "service_unavailable" });
      return NextResponse.json(
        { error: "Server configuration error. Please contact support." },
        { status: 503 },
      );
    }

    const variants = mobileLookupVariants(phone.local);

    logAdminLogin("admin_profile_lookup_started", { method, phone: maskPhone(phone.local) });

    // No .single()/.maybeSingle(): production may hold duplicate rows for
    // this email/mobile. Fetch all candidates and pick deterministically.
    const [emailResult, mobileResult] = await withTimeout(
      Promise.all([
        supabase
          .from("profiles")
          .select("id, role, email, mobile, phone, full_name, active, is_active")
          .eq("email", PRIMARY_ADMIN.email),
        supabase
          .from("profiles")
          .select("id, role, email, mobile, phone, full_name, active, is_active")
          .in("mobile", variants),
      ]),
      DB_TIMEOUT_MS,
      "admin_profile_lookup",
    );

    if (emailResult.error && mobileResult.error) {
      logAdminLogin("admin_profile_lookup_failed", {
        method,
        message: emailResult.error.message,
      });
      return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
    }

    const candidateRows = [
      ...((emailResult.data ?? []) as AdminProfileRow[]),
      ...((mobileResult.data ?? []) as AdminProfileRow[]),
    ];

    const { profile: adminProfile, duplicates } = pickAdminProfile(candidateRows, {
      primaryEmail: PRIMARY_ADMIN.email,
      localMobile: phone.local,
    });

    if (duplicates > 0) {
      // Log only — duplicate rows are never deleted at runtime.
      logAdminLogin("admin_profile_duplicates_detected", {
        method,
        count: duplicates + 1,
        pickedId: adminProfile?.id ?? null,
      });
    }

    if (!adminProfile) {
      logAdminLogin("admin_profile_lookup_failed", { method, reason: "no_profile" });
      return NextResponse.json({ error: "Invalid mobile or PIN." }, { status: 401 });
    }

    const access = await assertAdminProfile(String(adminProfile.id), adminProfile.email);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: customers } = await withTimeout(
      supabase.from("customers").select("id, mobile, hashed_pin, is_active, name").in("mobile", variants),
      DB_TIMEOUT_MS,
      "admin_customer_lookup",
    );

    const customer = (customers ?? []).find(
      (row) => normalizeStoredMobile(row.mobile as string | null) === phone.local,
    );

    if (!customer?.hashed_pin) {
      logAdminLogin("admin_login_auth_failed", { method, reason: "pin_not_set" });
      return NextResponse.json(
        { error: "Admin PIN is not set yet. Use email + password login." },
        { status: 403 },
      );
    }

    if (customer.is_active === false) {
      logAdminLogin("admin_login_auth_failed", { method, reason: "inactive" });
      return NextResponse.json({ error: "Account is inactive. Please contact support." }, { status: 403 });
    }

    const valid = await verifyPin(body.pin, String(customer.hashed_pin));
    if (!valid) {
      logAdminLogin("admin_login_auth_failed", { method, phone: maskPhone(phone.local) });
      await auditLog({
        userId: String(adminProfile.id),
        phone: phone.local,
        eventType: "admin_login_failed_pin",
        ip,
        userAgent,
      });
      return NextResponse.json({ error: "Invalid mobile or PIN." }, { status: 401 });
    }

    logAdminLogin("admin_login_auth_success", { method, userId: String(adminProfile.id) });

    // Drop stale customer PIN cookies AND stale Supabase session cookies
    // (an old customer Supabase session must not override the admin JWT),
    // then set the fresh admin cookie last so it is never clobbered.
    await clearStaleCustomerSessions({ dropSupabaseCookies: true });

    await createPrimaryAdminPinSession({
      userId: String(adminProfile.id),
      email: String(adminProfile.email ?? PRIMARY_ADMIN.email),
      mobile: phone.local,
      fullName: String(adminProfile.full_name ?? PRIMARY_ADMIN.fullName),
    });

    logAdminLogin("admin_session_created", {
      method,
      userId: String(adminProfile.id),
      sessionType: "admin_jwt",
    });

    await auditLog({
      userId: String(adminProfile.id),
      phone: phone.local,
      eventType: "admin_login_success_pin",
      details: { customerId: customer.id },
      ip,
      userAgent,
    });

    logAdminLogin("admin_login_redirect", { method, redirectTo: "/admin" });
    return NextResponse.json({ ok: true, redirectTo: "/admin", method: "pin" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid login payload" }, { status: 400 });
    }
    if (error instanceof TimeoutError) {
      logAdminLogin("admin_login_timeout", { step: error.message });
      return NextResponse.json({ error: TIMEOUT_MESSAGE }, { status: 504 });
    }
    console.error("[admin-login] admin_login_unhandled_error", error);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
