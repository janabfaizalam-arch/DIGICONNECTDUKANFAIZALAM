import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
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
      return jsonError("AP access required.", 403);
    }

    const ap = await getAgencyPartnerByUserId(user.id);
    if (!ap) {
      return jsonError("AP record not found.", 404);
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
      return jsonError("AP access required.", 403);
    }

    const ap = await getAgencyPartnerByUserId(user.id);
    if (!ap) {
      return jsonError("AP record not found.", 404);
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
      description: `AP Requested payout to bank`,
      createdBy: user.id,
    });

    if (!debitResult.ok) {
      return jsonError(debitResult.error || "Failed to initiate payout request due to insufficient balance.", 400);
    }

    return NextResponse.json({
      message: "Payout request submitted successfully.",
      payoutId: debitResult.payoutId,
      balance: debitResult.newBalance,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Error requesting payout.", 500);
  }
}
