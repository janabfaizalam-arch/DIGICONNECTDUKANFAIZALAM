import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { provisionPartnerAccount } from "@/lib/ap/provision-partner";
import {
  canTransitionApplication,
  generateTemporaryPassword,
  isPartnerApplicationStatus,
  type PartnerApplicationStatus,
} from "@/lib/partner-applications";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message, error: message }, { status });
}

/**
 * Review a Digi Partner signup.
 *
 * Approving is the step that actually creates the partner: the auth user,
 * `agency_partners`, `profiles` and `users` rows are provisioned here, and the
 * temporary password is returned to the reviewing admin exactly once so they
 * can pass it on. We never store it.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rate = checkRateLimit(`admin-partner-application:${getClientIp(request)}`, 30, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return jsonError("Admin access required.", 403);

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { status?: string; notes?: string }
    | null;

  const nextStatus = String(body?.status ?? "").trim();
  if (!isPartnerApplicationStatus(nextStatus)) {
    return jsonError("Invalid application status.", 400);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Supabase service role key is missing.", 500);

  const { data: application, error: loadError } = await supabase
    .from("agency_partner_applications")
    .select(
      "id, full_name, business_name, partner_type, mobile, whatsapp, email, address, state, district, pin, aadhaar_number, pan_number, gstin, referral_source, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError) return jsonError("Could not load the application.", 500);
  if (!application) return jsonError("Application not found.", 404);

  const fromStatus = String(application.status ?? "pending") as PartnerApplicationStatus;

  if (fromStatus === nextStatus) {
    return NextResponse.json({ ok: true, status: fromStatus, message: "No change." });
  }

  if (!canTransitionApplication(fromStatus, nextStatus)) {
    // approved and rejected are terminal — re-approving would provision a
    // second partner account for the same person.
    return jsonError(`An application that is already ${fromStatus.replace("_", " ")} cannot be changed.`, 409);
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: nextStatus,
    reviewed_by: user.id,
    reviewed_at: now,
    review_notes: body?.notes?.trim() || null,
  };

  let temporaryPassword: string | null = null;
  let partnerCode: string | null = null;
  let username: string | null = null;

  if (nextStatus === "approved") {
    temporaryPassword = generateTemporaryPassword();

    // Provision before recording the decision, so a failure here leaves the
    // application reviewable rather than marked approved with no account
    // behind it.
    const provisioned = await provisionPartnerAccount({
      fullName: String(application.full_name),
      email: (application.email as string | null) ?? null,
      password: temporaryPassword,
      mobile: String(application.mobile),
      partnerType: String(application.partner_type),
      businessName: application.business_name as string | null,
      whatsapp: application.whatsapp as string | null,
      address: application.address as string | null,
      state: application.state as string | null,
      district: application.district as string | null,
      pin: application.pin as string | null,
      aadhaarNumber: application.aadhaar_number as string | null,
      panNumber: application.pan_number as string | null,
      gstin: application.gstin as string | null,
      referralSource: application.referral_source as string | null,
      // Self-signup identity has not been verified against documents yet, so
      // they can work but cannot withdraw until KYC is approved.
      kycStatus: "pending",
    });

    if (!provisioned.ok) {
      return jsonError(provisioned.error, provisioned.status);
    }

    partnerCode = provisioned.partnerCode;
    username = provisioned.username;
    updates.created_partner_id = provisioned.partnerId;
    updates.partner_code = provisioned.partnerCode;
  }

  const { error: updateError } = await supabase
    .from("agency_partner_applications")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    console.error("[admin-partner-applications] update_failed", { id, error: updateError.message });
    return jsonError(
      nextStatus === "approved"
        ? "The partner account was created but the application could not be marked approved. Check /admin/agency-partners before retrying."
        : "The application could not be updated.",
      500,
    );
  }

  return NextResponse.json({
    ok: true,
    status: nextStatus,
    partnerCode,
    // What the partner actually types at /ap/login. The screen used to hand
    // out a partner code and a password, and a partner code is not a login.
    username,
    // Shown once, then gone — the admin passes it to the partner.
    temporaryPassword,
    message:
      nextStatus === "approved"
        ? "Partner approved and account created."
        : "Application updated.",
  });
}
