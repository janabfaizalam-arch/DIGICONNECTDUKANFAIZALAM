import { NextResponse } from "next/server";

import { createAdminNotification } from "@/lib/admin-notifications";
import { ingestLead } from "@/lib/crm/leads";
import { readJson } from "@/lib/digital-plans/admin-auth";
import { formatPrice } from "@/lib/digital-plans/money";
import { enquiryInputSchema, firstIssue } from "@/lib/digital-plans/schema";
import { createEnquiry, getActivePlanBySlug } from "@/lib/digital-plans/store";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * A customer asking about an RNOS Digital package.
 *
 * Public and unauthenticated. It records an enquiry — with the plan's prices
 * as they stand now, read from the database, never from the request — and
 * the same person as a lead in the existing CRM. It does not start a
 * subscription or take any payment: a quotation and the customer's approval
 * come first.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`digital-enquiry:${getClientIp(request)}`, 6, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const parsed = enquiryInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const input = parsed.data;

  const plan = await getActivePlanBySlug(input.planSlug);
  if (!plan) return NextResponse.json({ error: "This plan is not available right now. Please contact us on WhatsApp." }, { status: 404 });

  const summary = [
    `Plan: ${plan.name} — ${formatPrice(plan.monthlyPricePaise, plan.priceIsStarting)}/month + ${formatPrice(plan.setupFeePaise, plan.priceIsStarting)} setup (GST extra)`,
    input.businessName ? `Business: ${input.businessName}` : null,
    input.addonSlugs.length ? `Add-ons of interest: ${input.addonSlugs.join(", ")}` : null,
    input.requirements ? `Requirements: ${input.requirements}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // The CRM lead. A failure here must not lose the enquiry itself.
  const lead = await ingestLead({
    source: "website",
    name: input.name,
    mobile: input.mobile,
    email: input.email,
    service: `RNOS Digital — ${plan.name}`,
    message: summary,
    campaignAttribution: "rnos-digital-packages",
  }).catch(() => null);
  if (lead && !lead.ok && lead.status === 400) return NextResponse.json({ error: lead.error }, { status: 400 });
  const leadId = lead && lead.ok ? lead.leadId : null;

  const created = await createEnquiry(input, leadId);
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status });

  const supabase = getSupabaseAdmin();
  if (supabase) {
    await createAdminNotification(supabase, {
      type: "digital_enquiry",
      title: `New ${plan.name} enquiry`,
      message: `${input.name}${input.businessName ? ` (${input.businessName})` : ""} asked about ${plan.name}. Ref ${created.value.reference}.`,
      relatedType: "digital_enquiry",
      relatedId: created.value.id,
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, reference: created.value.reference });
}
