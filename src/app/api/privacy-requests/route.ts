import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createAdminNotification } from "@/lib/admin-notifications";
import { newPrivacyReference, privacyRequestInputSchema, redactIdentifiers, PRIVACY_REQUEST_TYPE_LABELS } from "@/lib/privacy/requests";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Record a privacy / data-rights request.
 *
 * Public, because people exercise these rights without an account. It stores
 * only what the request needs, attaches the signed-in user when there is one,
 * and returns a reference — never anything about existing records, so it
 * cannot be used to check whether a number is a customer.
 *
 * Recording a request changes no other data. Staff verify identity and act on
 * it from /admin/privacy-requests.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const perIp = checkRateLimit(`privacy-request:${ip}`, 5, 60 * 60_000);
  if (!perIp.ok) return rateLimitResponse(perIp.retryAfter);

  const body = await request.json().catch(() => null);
  const parsed = privacyRequestInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const perMobile = checkRateLimit(`privacy-request-mobile:${input.mobile}`, 3, 24 * 60 * 60_000);
  if (!perMobile.ok) return rateLimitResponse(perMobile.retryAfter);

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Requests cannot be recorded right now. Please email us instead." }, { status: 503 });
  }

  const user = await getCurrentUser().catch(() => null);
  const reference = newPrivacyReference();

  const { data: created, error } = await supabase.from("privacy_requests").insert({
    reference,
    request_type: input.requestType,
    requester_name: input.name,
    requester_mobile: input.mobile,
    details: redactIdentifiers(input.details),
    user_id: user?.id ?? null,
  }).select("id").single();

  if (error || !created) {
    console.error("[privacy-requests] insert_failed", { code: error?.code });
    return NextResponse.json({ ok: false, error: "Requests cannot be recorded right now. Please email us instead." }, { status: 500 });
  }

  await createAdminNotification(supabase, {
    type: "privacy_request",
    title: "New privacy request",
    // No name or number in the notification: it is shown in lists and toasts.
    message: `${PRIVACY_REQUEST_TYPE_LABELS[input.requestType]} — ${reference}`,
    relatedType: "privacy_request",
    relatedId: String(created.id),
  }).catch(() => {});

  return NextResponse.json({ ok: true, reference });
}
