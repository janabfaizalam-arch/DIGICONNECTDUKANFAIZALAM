import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createAdminNotification } from "@/lib/admin-notifications";
import { acceptInsuranceQuotation, getPublicInsuranceQuotation } from "@/lib/insurance-quotations";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * The customer accepting their quotation.
 *
 * Public and unauthenticated by design: the customer has no account, and the
 * unguessable token in the URL is the credential. It is the only thing that
 * identifies the row — the id is never accepted here — and the only field it
 * can change is the status, to one value.
 *
 * The status change is idempotent, but every call also notifies the shop, so
 * it is rate-limited to keep a flood from burying the admin notifications.
 */
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const rate = checkRateLimit(`insurance-accept:${getClientIp(request)}`, 10, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const { token } = await context.params;

  const result = await acceptInsuranceQuotation(token);

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Could not accept this quotation." }, { status: 400 });
  }

  /*
    Tell the shop. An acceptance nobody sees is the same as no acceptance —
    somebody has to act on it while the quoted premium is still valid.
  */
  const supabase = getSupabaseAdmin();
  const quote = await getPublicInsuranceQuotation(token);
  if (supabase && quote) {
    await createAdminNotification(supabase, {
      type: "insurance_quotation",
      title: "Insurance quotation accepted",
      message: `${quote.customer_name} accepted quote ${quote.quote_number} — ${quote.vehicle_number}.`,
      relatedType: "insurance_quotation",
      relatedId: quote.id,
    });
    revalidatePath("/admin/insurance-quotations");
    revalidatePath(`/insurance-quotation/${token}`);
  }

  return NextResponse.json({ ok: true, status: result.status });
}
