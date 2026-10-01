import { NextResponse } from "next/server";

import { outcomeForRazorpayStatus, verifyPayoutWebhook } from "@/lib/payouts/razorpayx";
import { reverseEntry } from "@/lib/ap-wallet";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * What RazorpayX says happened to a payout.
 *
 * Its own route and its own secret. RazorpayX webhooks are configured in the X
 * dashboard, separately from the payments webhooks, and are signed with a
 * different secret -- sharing `/api/razorpay/webhook` would mean one secret
 * verifying two sources, so a leak of either would forge both.
 *
 * This is the only place a payout is refunded. `dispatchPayout` deliberately
 * does not refund on error: a timeout says nothing about whether Razorpay
 * accepted the payout, and two code paths refunding the same failure is how a
 * partner gets paid back twice. The refund itself is idempotent as well, so a
 * webhook redelivery -- which Razorpay does -- cannot double-credit either.
 */

export const runtime = "nodejs";

type PayoutEntity = {
  id?: string;
  status?: string;
  failure_reason?: string;
  status_details?: { description?: string; reason?: string };
  utr?: string;
};

type PayoutWebhook = {
  event?: string;
  payload?: { payout?: { entity?: PayoutEntity } };
};

export async function POST(request: Request) {
  const secret = process.env.RAZORPAYX_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[razorpayx-webhook] missing RAZORPAYX_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyPayoutWebhook(body, signature, secret)) {
    // Never say which part failed; an attacker tuning a forgery is the only
    // audience for that detail.
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let parsed: PayoutWebhook;
  try {
    parsed = JSON.parse(body) as PayoutWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const entity = parsed.payload?.payout?.entity;
  const razorpayPayoutId = String(entity?.id ?? "");
  if (!razorpayPayoutId) {
    // Acknowledge anything that is not a payout event, so Razorpay stops
    // retrying something this endpoint will never act on.
    return NextResponse.json({ received: true, ignored: "no payout entity" });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  const { data: payout, error } = await supabase
    .from("ap_payouts")
    .select("id, agency_partner_id, amount, status")
    .eq("razorpayx_payout_id", razorpayPayoutId)
    .maybeSingle();

  if (error) {
    console.error("[razorpayx-webhook] lookup_failed", { razorpayPayoutId, error: error.message });
    // A 500 asks Razorpay to retry, which is what we want for a database blip.
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }

  if (!payout) {
    // A payout made from the Razorpay dashboard by hand, or from another
    // environment sharing the account. Not ours to act on, and retrying will
    // not change that.
    return NextResponse.json({ received: true, ignored: "unknown payout" });
  }

  const outcome = outcomeForRazorpayStatus(entity?.status);
  const reason =
    entity?.failure_reason ??
    entity?.status_details?.description ??
    entity?.status_details?.reason ??
    null;

  const patch: Record<string, unknown> = {
    razorpayx_status: String(entity?.status ?? ""),
    updated_at: new Date().toISOString(),
  };

  if (outcome === "paid") {
    // Terminal already: a later webhook for the same payout changes nothing.
    if (payout.status === "paid") return NextResponse.json({ received: true, ignored: "already paid" });

    patch.status = "paid";
    patch.paid_at = new Date().toISOString();
    // The UTR is what the partner quotes to their bank when they say it has
    // not arrived, so it is the reference worth keeping.
    if (entity?.utr) patch.payment_reference = String(entity.utr);
  } else if (outcome === "failed") {
    if (payout.status === "failed" || payout.status === "rejected") {
      return NextResponse.json({ received: true, ignored: "already failed" });
    }

    /*
      Refund before marking failed. If the refund works and this update does
      not, the next delivery refunds nothing (it dedupes on the payout id) and
      sets the status -- whereas marking it failed first and then failing to
      refund would leave the partner's money nowhere at all.
    */
    const refund = await reverseEntry({
      agencyPartnerId: String(payout.agency_partner_id),
      amount: Number(payout.amount) || 0,
      originalEntryId: String(payout.id),
      description: `Payout failed at bank — amount returned to wallet${reason ? ` (${reason})` : ""}`,
      createdBy: "razorpayx-webhook",
    });

    if (!refund.ok) {
      console.error("[razorpayx-webhook] refund_failed", { payoutId: payout.id, error: refund.error });
      return NextResponse.json({ error: "Refund failed." }, { status: 500 });
    }

    patch.status = "failed";
    if (reason) patch.failure_reason = String(reason).slice(0, 500);
  }
  // `pending` -- queued, processing -- only records the Razorpay status.

  const { error: updateError } = await supabase.from("ap_payouts").update(patch).eq("id", payout.id);

  if (updateError) {
    console.error("[razorpayx-webhook] update_failed", { payoutId: payout.id, error: updateError.message });
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  console.info("[razorpayx-webhook] applied", {
    payoutId: payout.id,
    razorpayPayoutId,
    event: parsed.event,
    outcome,
  });

  return NextResponse.json({ received: true, outcome });
}
