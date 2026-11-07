import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminNotification } from "@/lib/admin-notifications";
import { readJson } from "@/lib/digital-plans/admin-auth";
import { approvalSchema, firstIssue } from "@/lib/digital-plans/schema";
import { respondToQuote } from "@/lib/digital-plans/store";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * The customer's answer to their quotation.
 *
 * Public: the unguessable token in the link is the credential, as with the
 * insurance quotations. Approving records consent to the quoted figures and
 * tells the team; it does not activate a subscription or take a payment.
 */
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), name: z.string(), agree: z.boolean() }),
  z.object({ action: z.literal("decline") }),
]);

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const rate = checkRateLimit(`digital-quote:${getClientIp(request)}`, 10, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const { token } = await context.params;
  const body = bodySchema.safeParse(await readJson(request));
  if (!body.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  let response: { approve: true; name: string } | { approve: false } = { approve: false };
  if (body.data.action === "approve") {
    const approval = approvalSchema.safeParse({ name: body.data.name, agree: body.data.agree });
    if (!approval.success) return NextResponse.json({ error: firstIssue(approval.error) }, { status: 400 });
    response = { approve: true, name: approval.data.name };
  }

  const result = await respondToQuote(token, response);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const enquiry = result.value;
  const supabase = getSupabaseAdmin();
  if (supabase) {
    await createAdminNotification(supabase, {
      type: "digital_enquiry",
      title: response.approve ? `Quotation approved — ${enquiry.planName}` : `Quotation declined — ${enquiry.planName}`,
      message: `${enquiry.name} ${response.approve ? "approved" : "declined"} quotation ${enquiry.reference}.`,
      relatedType: "digital_enquiry",
      relatedId: enquiry.id,
    }).catch(() => undefined);
  }
  revalidatePath(`/packages/quote/${token}`);
  return NextResponse.json({ ok: true, status: enquiry.status });
}
