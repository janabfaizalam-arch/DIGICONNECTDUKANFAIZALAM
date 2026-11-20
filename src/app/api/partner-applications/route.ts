import { NextResponse } from "next/server";

import {
  generateTrackingCode,
  toApplicationRow,
  validatePartnerApplication,
} from "@/lib/partner-applications";
import { findAuthUserByEmail, isEmailTakenError } from "@/lib/ap/provision-partner";
import { agencyInternalEmail } from "@/lib/auth/phone";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Public "Become a DC Partner" submission.
 *
 * Writes an application, not a partner: no `agency_partners` row is made, so a
 * submission grants no access until an admin approves it at
 * /admin/partner-applications.
 *
 * The password the applicant chose is not stored with the application. It is
 * set on the Supabase Auth user their login will use (<mobile>@agency.rnos.internal),
 * flagged `partner_applicant` / `self_password`. That user cannot get into
 * anything (every partner door checks for an active `agency_partners` row);
 * approval adopts it and keeps the password, so the partner signs in with the
 * mobile number and the password they chose, and is not asked to replace it.
 *
 * The password is set only after the application row was inserted, i.e. when
 * this is the one open application for the mobile. Somebody else submitting
 * the same number while it is open hits the "already applied" answer and never
 * touches the password.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`partner-application:${getClientIp(request)}`, 5, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const body = await request.json().catch(() => null);
  const validated = validatePartnerApplication(body);

  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, error: validated.error, field: validated.field },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Applications are unavailable right now. Please try again shortly." },
      { status: 503 },
    );
  }

  const input = validated.value;

  /*
    Someone who already partners with us should sign in, not re-apply.

    Matched on mobile first, and on email only when one was given. The old
    filter interpolated the email straight into the `or` string; now that
    email is optional that would have become `email.eq.` and matched
    everything or nothing depending on how PostgREST felt about it.
  */
  const identityFilter = input.email
    ? `mobile.eq.${input.mobile},email.eq.${input.email}`
    : `mobile.eq.${input.mobile}`;

  const { data: existingPartner } = await supabase
    .from("agency_partners")
    .select("id")
    .or(identityFilter)
    .maybeSingle();

  if (existingPartner) {
    return NextResponse.json(
      {
        ok: false,
        field: "mobile",
        error: "You are already a DC Partner. Please sign in instead.",
      },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("agency_partner_applications")
    .insert(toApplicationRow(input, generateTrackingCode()))
    .select("tracking_code")
    .single();

  if (error) {
    // The partial unique index on (mobile) WHERE status IN (pending,
    // under_review) is what makes "one open application" true regardless of
    // how many times the form is submitted.
    if (error.code === "23505") {
      const { data: open } = await supabase
        .from("agency_partner_applications")
        .select("tracking_code, status")
        .eq("mobile", input.mobile)
        .in("status", ["pending", "under_review"])
        .maybeSingle();

      return NextResponse.json(
        {
          ok: false,
          field: "mobile",
          error: "You already have an application under review.",
          trackingCode: open?.tracking_code ?? null,
        },
        { status: 409 },
      );
    }

    console.error("[partner-applications] insert_failed", { error: error.message });
    return NextResponse.json(
      { ok: false, error: "Your application could not be submitted. Please try again." },
      { status: 500 },
    );
  }

  const passwordSet = await setApplicantPassword(supabase, input);
  if (!passwordSet.ok) {
    // Take the application back, so they can fix the password and send again.
    await supabase.from("agency_partner_applications").delete().eq("tracking_code", data.tracking_code);
    return NextResponse.json({ ok: false, field: "password", error: passwordSet.error }, { status: passwordSet.status });
  }

  return NextResponse.json({
    ok: true,
    trackingCode: String(data.tracking_code),
    message: "Application received. We will review it and get in touch.",
  });
}

type Admin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

async function setApplicantPassword(
  supabase: Admin,
  input: { fullName: string; mobile: string; password: string },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const loginEmail = agencyInternalEmail(input.mobile);
  const attributes = {
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, username: input.mobile },
    app_metadata: { role: "partner_applicant", self_password: true },
  };

  const { error } = await supabase.auth.admin.createUser({ email: loginEmail, ...attributes });
  if (!error) return { ok: true };

  if (!isEmailTakenError(error)) return refused(error);

  // Left from an earlier application (rejected, or abandoned): reuse it,
  // unless it already belongs to a partner.
  const holder = await findAuthUserByEmail(supabase, loginEmail);
  if (!holder) return { ok: false, error: "Could not set your password. Please try again.", status: 500 };

  const { data: partner } = await supabase.from("agency_partners").select("id").eq("user_id", holder.id).maybeSingle();
  if (partner) return { ok: false, error: "You are already a DC Partner. Please sign in instead.", status: 409 };

  const { error: updateError } = await supabase.auth.admin.updateUserById(holder.id, attributes);
  return updateError ? refused(updateError) : { ok: true };
}

/** Supabase's password rules are the ones that count; pass its reason on. */
function refused(error: { message?: string }) {
  const message = (error.message ?? "").trim();
  if (/password/i.test(message)) {
    return { ok: false as const, error: `Choose a stronger password: ${message}`, status: 400 };
  }
  console.error("[partner-applications] applicant_auth_failed", { message });
  return { ok: false as const, error: "Could not set your password. Please try again.", status: 500 };
}
