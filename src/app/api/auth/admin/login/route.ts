import { NextResponse } from "next/server";
import { z } from "zod";

import { createPrimaryAdminPinSession } from "@/lib/auth/admin-session";
import { mobileLookupVariants, normalizeStoredMobile } from "@/lib/auth/customer-lookup";
import {
  isAllowlistedAdminEmail,
  isDemotedAdminEmail,
  isPrimaryAdminEmail,
  PRIMARY_ADMIN,
} from "@/lib/auth/primary-admin";
import { normalizeIndianPhone } from "@/lib/auth/phone";
import { isValidPinFormat } from "@/lib/auth/pin";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";
import { signInWithPasswordCookies } from "@/lib/auth/session-cookies";
import { verifyPin } from "@/lib/auth-v2/password";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

async function assertAdminProfile(userId: string, email: string | null | undefined) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, error: "Service unavailable", status: 503 };

  if (isDemotedAdminEmail(email)) {
    return { ok: false as const, error: "Admin access revoked for this account.", status: 403 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, email, mobile, full_name, active, is_active")
    .eq("id", userId)
    .maybeSingle();

  const role = String(profile?.role ?? "").toLowerCase();
  const allowlisted = isAllowlistedAdminEmail(email) || isAllowlistedAdminEmail(profile?.email as string | null);
  const isAdmin = role === "admin" || role === "super_admin" || allowlisted;

  if (!isAdmin) {
    return { ok: false as const, error: "Not an admin account.", status: 403 };
  }

  if (profile?.active === false || profile?.is_active === false) {
    return { ok: false as const, error: "Admin account is inactive.", status: 403 };
  }

  return { ok: true as const, profile };
}

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);

    // ── Email + password ───────────────────────────────────────────────
    if (!json || json.method !== "pin") {
      const body = emailSchema.parse(json);
      const email = body.email.trim().toLowerCase();

      if (isDemotedAdminEmail(email)) {
        return NextResponse.json({ error: "Admin access revoked for this account." }, { status: 403 });
      }

      if (!isAllowlistedAdminEmail(email) && !isPrimaryAdminEmail(email)) {
        // Still attempt sign-in only if profile role is admin — checked after auth
      }

      const session = await signInWithPasswordCookies(email, body.password);
      if (session.error || !session.data?.user) {
        await logAuthSecurityEvent({
          phone: null,
          eventType: "admin_login_failed_password",
          details: { email },
          ip,
          userAgent,
        });
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      const user = session.data.user;
      const access = await assertAdminProfile(user.id, user.email);
      if (!access.ok) {
        const { signOutCookies } = await import("@/lib/auth/session-cookies");
        await signOutCookies();
        return NextResponse.json({ error: access.error }, { status: access.status });
      }

      // Ensure primary admin metadata stays correct
      const supabase = getSupabaseAdmin();
      if (supabase && isPrimaryAdminEmail(user.email)) {
        await supabase
          .from("profiles")
          .update({
            role: "admin",
            full_name: PRIMARY_ADMIN.fullName,
            email: PRIMARY_ADMIN.email,
            mobile: PRIMARY_ADMIN.mobile,
            active: true,
            is_active: true,
          })
          .eq("id", user.id);
      }

      await logAuthSecurityEvent({
        userId: user.id,
        eventType: "admin_login_success_password",
        details: { email },
        ip,
        userAgent,
      });

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

    if (phone.local !== PRIMARY_ADMIN.mobile) {
      // Only primary admin mobile is allowed for admin PIN login
      return NextResponse.json({ error: "Invalid mobile or PIN." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const variants = mobileLookupVariants(phone.local);

    const [{ data: byEmail }, { data: byMobile }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, role, email, mobile, phone, full_name, active, is_active")
        .eq("email", PRIMARY_ADMIN.email)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id, role, email, mobile, phone, full_name, active, is_active")
        .in("mobile", variants),
    ]);

    const matchedProfiles = [
      ...(byEmail ? [byEmail] : []),
      ...((byMobile ?? []) as Array<Record<string, unknown>>),
    ].filter((row, index, arr) => arr.findIndex((item) => item.id === row.id) === index);

    const adminProfile =
      matchedProfiles.find((row) => String(row.role).toLowerCase() === "admin") ??
      matchedProfiles.find((row) => isPrimaryAdminEmail(row.email as string | null)) ??
      matchedProfiles.find(
        (row) =>
          normalizeStoredMobile(row.mobile as string | null) === phone.local ||
          normalizeStoredMobile(row.phone as string | null) === phone.local,
      ) ??
      null;

    if (!adminProfile) {
      return NextResponse.json({ error: "Invalid mobile or PIN." }, { status: 401 });
    }

    const access = await assertAdminProfile(String(adminProfile.id), adminProfile.email as string | null);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: customers } = await supabase
      .from("customers")
      .select("id, mobile, hashed_pin, is_active, name")
      .in("mobile", variants);

    const customer = (customers ?? []).find(
      (row) => normalizeStoredMobile(row.mobile as string | null) === phone.local,
    );

    if (!customer?.hashed_pin) {
      return NextResponse.json(
        { error: "Admin PIN is not set yet. Use email + password login." },
        { status: 403 },
      );
    }

    if (customer.is_active === false) {
      return NextResponse.json({ error: "Account is disabled. Please contact support." }, { status: 403 });
    }

    const valid = await verifyPin(body.pin, String(customer.hashed_pin));
    if (!valid) {
      await logAuthSecurityEvent({
        userId: String(adminProfile.id),
        phone: phone.local,
        eventType: "admin_login_failed_pin",
        ip,
        userAgent,
      });
      return NextResponse.json({ error: "Invalid mobile or PIN." }, { status: 401 });
    }

    await createPrimaryAdminPinSession({
      userId: String(adminProfile.id),
      email: String(adminProfile.email ?? PRIMARY_ADMIN.email),
      mobile: phone.local,
      fullName: String(adminProfile.full_name ?? PRIMARY_ADMIN.fullName),
    });

    await logAuthSecurityEvent({
      userId: String(adminProfile.id),
      phone: phone.local,
      eventType: "admin_login_success_pin",
      details: { customerId: customer.id },
      ip,
      userAgent,
    });

    return NextResponse.json({ ok: true, redirectTo: "/admin", method: "pin" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid login payload" }, { status: 400 });
    }
    console.error("[admin-login]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
