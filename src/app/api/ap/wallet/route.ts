import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { dispatchPayout } from "@/lib/payouts/dispatch";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getAgencyPartnerByUserId, getAPWalletBalance } from "@/lib/ap-data";
import { debitPayout } from "@/lib/ap-wallet";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !(await isActiveAgent(user))) {
      return jsonError("DC Partner access required.", 403);
    }

    const ap = await getAgencyPartnerByUserId(user.id);
    if (!ap) {
      return jsonError("DC Partner record not found.", 404);
    }

    const balance = await getAPWalletBalance(ap.id);
    return NextResponse.json({ balance });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Error reading wallet balance.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(`ap-wallet-payout:${getClientIp(request)}`, 5, 60_000);
    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const user = await getCurrentUser();
    if (!user || !(await isActiveAgent(user))) {
      return jsonError("DC Partner access required.", 403);
    }

    const ap = await getAgencyPartnerByUserId(user.id);
    if (!ap) {
      return jsonError("DC Partner record not found.", 404);
    }

    if (ap.status !== "active" || ap.kyc_status !== "approved") {
      return jsonError("Profile must be active and KYC approved to request payouts.", 403);
    }

    const body = await request.json();
    const amount = Number(body.amount);

    if (!amount || amount <= 0 || !Number.isFinite(amount)) {
      return jsonError("Provide a valid payout amount.", 400);
    }

    if (amount < 500) {
      return jsonError("Minimum payout request amount is ₹500.", 400);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return jsonError("Server database connection error.", 500);
    }

    // Check for duplicate pending requests
    const { data: pendingRequests } = await supabase
      .from("ap_payouts")
      .select("id")
      .eq("agency_partner_id", ap.id)
      .in("status", ["requested", "processing"])
      .limit(1);

    if (pendingRequests?.length) {
      return jsonError("You already have an active payout request under process.", 400);
    }

    // Debit payout creates ledger entry and payout request atomically
    const debitResult = await debitPayout({
      agencyPartnerId: ap.id,
      amount,
      description: `DC Partner requested payout to bank`,
      createdBy: user.id,
    });

    if (!debitResult.ok) {
      return jsonError(debitResult.error || "Failed to initiate payout request due to insufficient balance.", 400);
    }

    /*
      The wallet is already debited and the payout row exists, so the partner's
      request is safe whatever happens next. Sending it to RazorpayX is the
      part that can fail, and a failure here must not fail the request: the
      payout simply stays in the admin queue to be sent by hand, exactly as it
      did before automatic payouts existed.
    */
    const dispatch = await dispatchPayout({
      payoutId: String(debitResult.payoutId),
      agencyPartnerId: ap.id,
      amount,
    });

    const automatic = dispatch.ok && dispatch.dispatched;

    return NextResponse.json({
      message: automatic
        ? "Payout request submitted. Bank transfer start ho gaya hai."
        : "Payout request submitted successfully.",
      payoutId: debitResult.payoutId,
      balance: debitResult.newBalance,
      automatic,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Error requesting payout.", 500);
  }
}
