import { NextResponse } from "next/server";

import {
  generateTrackingCode,
  toApplicationRow,
  validatePartnerApplication,
} from "@/lib/partner-applications";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Public "Become a Digi Partner" submission.
 *
 * Writes an application, not a partner: nothing here creates an auth user or an
 * `agency_partners` row, so a submission grants no access until an admin
 * approves it at /admin/partner-applications.
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
        error: "You are already a Digi Partner. Please sign in instead.",
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

  return NextResponse.json({
    ok: true,
    trackingCode: String(data.tracking_code),
    message: "Application received. We will review it and get in touch.",
  });
}
