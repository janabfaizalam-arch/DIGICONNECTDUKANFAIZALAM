import { NextResponse } from "next/server";
import { z } from "zod";

import {
  PARTNER_PASSWORD_MAX_LENGTH,
  PARTNER_PASSWORD_RESET_MESSAGES,
  validatePartnerPasswordInput,
} from "@/lib/admin/partner-password-reset";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  /** auth.users.id — never agency_partners.id */
  userId: z.string().uuid("userId must be the Supabase Auth user UUID"),
  temporaryPassword: z.string().min(1).max(PARTNER_PASSWORD_MAX_LENGTH),
  confirmPassword: z.string().min(1).max(PARTNER_PASSWORD_MAX_LENGTH),
});

/**
 * Admin Digi Partner password reset.
 * Uses Supabase Auth Admin updateUserById(auth.users.id) with the service role.
 */
export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin) {
    return NextResponse.json(
      { error: PARTNER_PASSWORD_RESET_MESSAGES.unauthorized, code: "unauthorized" },
      { status: 401 },
    );
  }
  if (!isAdminRole(await getCurrentUserRole(admin))) {
    return NextResponse.json(
      { error: PARTNER_PASSWORD_RESET_MESSAGES.unauthorized, code: "forbidden" },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "invalid_body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid request.",
        code: "invalid_body",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const passwordCheck = validatePartnerPasswordInput(
    parsed.data.temporaryPassword,
    parsed.data.confirmPassword,
  );
  if (!passwordCheck.ok) {
    return NextResponse.json(
      { error: passwordCheck.message, code: passwordCheck.code },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[admin-ap-reset-password] SUPABASE_SERVICE_ROLE_KEY or URL missing.");
    return NextResponse.json(
      { error: PARTNER_PASSWORD_RESET_MESSAGES.service_unavailable, code: "service_unavailable" },
      { status: 503 },
    );
  }

  const userId = parsed.data.userId;

  // Confirm the Auth UUID is linked to an agency partner row
  const { data: partner, error: partnerError } = await supabase
    .from("agency_partners")
    .select("id, user_id, partner_code")
    .eq("user_id", userId)
    .maybeSingle();

  if (partnerError) {
    console.error("[admin-ap-reset-password] partner lookup failed", {
      code: partnerError.code,
      message: partnerError.message,
      details: partnerError.details,
      hint: partnerError.hint,
      userId,
    });
    return NextResponse.json(
      { error: "Could not verify partner linkage.", code: "partner_lookup_failed" },
      { status: 500 },
    );
  }

  if (!partner?.user_id) {
    return NextResponse.json(
      { error: PARTNER_PASSWORD_RESET_MESSAGES.missing_user_id, code: "missing_user_id" },
      { status: 404 },
    );
  }

  const { data: authUserResult, error: authLookupError } = await supabase.auth.admin.getUserById(userId);
  if (authLookupError) {
    console.error("[admin-ap-reset-password] auth user lookup failed", {
      status: authLookupError.status,
      code: authLookupError.code,
      message: authLookupError.message,
      userId,
    });
  }

  if (!authUserResult?.user) {
    return NextResponse.json(
      { error: PARTNER_PASSWORD_RESET_MESSAGES.auth_user_missing, code: "auth_user_missing" },
      { status: 404 },
    );
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password: passwordCheck.password,
  });

  if (updateError) {
    console.error("[admin-ap-reset-password] updateUserById failed", {
      status: updateError.status,
      code: updateError.code,
      message: updateError.message,
      userId,
      partnerId: partner.id,
    });

    const policy =
      /password|weak|short|long|invalid/i.test(updateError.message) ||
      updateError.status === 422;

    return NextResponse.json(
      {
        error: policy
          ? `Password policy violation: ${updateError.message}`
          : `${PARTNER_PASSWORD_RESET_MESSAGES.supabase_rejected} (${updateError.message})`,
        code: policy ? "password_policy" : "supabase_rejected",
        supabase: {
          status: updateError.status,
          code: updateError.code,
          message: updateError.message,
        },
      },
      { status: policy ? 400 : 500 },
    );
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ must_change_password: true, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (profileError) {
    console.error("[admin-ap-reset-password] profiles flag update failed", {
      code: profileError.code,
      message: profileError.message,
      userId,
    });
  }

  const { error: apFlagError } = await supabase
    .from("agency_partners")
    .update({ must_change_password: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (apFlagError) {
    console.error("[admin-ap-reset-password] agency_partners flag update failed", {
      code: apFlagError.code,
      message: apFlagError.message,
      userId,
    });
  }

  // Password update via Admin API is enough; must_change_password forces change on next login.
  // Do not call auth.admin.signOut(userId) — that API expects a session JWT, not a user UUID.

  return NextResponse.json({
    ok: true,
    message: PARTNER_PASSWORD_RESET_MESSAGES.success,
    partnerId: partner.id,
    partnerCode: partner.partner_code,
  });
}
