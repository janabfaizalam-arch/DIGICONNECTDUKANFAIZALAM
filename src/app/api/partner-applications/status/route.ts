import { NextResponse } from "next/server";

import {
  PARTNER_APPLICATION_STATUS_LABELS,
  isPartnerApplicationStatus,
} from "@/lib/partner-applications";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Let an applicant check their own application with the tracking code they
 * were given.
 *
 * Returns only what the applicant already knows plus the decision — no
 * Aadhaar, PAN, reviewer identity or internal notes. The code is random rather
 * than sequential precisely because it is the only credential on this route,
 * and the rate limit keeps it from being brute-forced.
 */
export async function GET(request: Request) {
  const rate = checkRateLimit(`partner-application-status:${getClientIp(request)}`, 20, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase() ?? "";

  if (!code) {
    return NextResponse.json({ ok: false, error: "Enter your tracking code." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Unavailable right now." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("agency_partner_applications")
    .select("full_name, status, partner_code, created_at, reviewed_at")
    .eq("tracking_code", code)
    .maybeSingle();

  if (error) {
    console.error("[partner-applications] status_lookup_failed", { error: error.message });
    return NextResponse.json({ ok: false, error: "Unavailable right now." }, { status: 503 });
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: "No application found for that code." },
      { status: 404 },
    );
  }

  const status = isPartnerApplicationStatus(data.status) ? data.status : "pending";

  return NextResponse.json({
    ok: true,
    application: {
      fullName: String(data.full_name),
      status,
      statusLabel: PARTNER_APPLICATION_STATUS_LABELS[status],
      // Only meaningful once approved; it is how they log in.
      partnerCode: status === "approved" ? (data.partner_code ?? null) : null,
      submittedAt: data.created_at ? String(data.created_at) : null,
      reviewedAt: data.reviewed_at ? String(data.reviewed_at) : null,
    },
  });
}
