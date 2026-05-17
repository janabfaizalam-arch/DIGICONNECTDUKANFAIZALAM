import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { calculateWalletRedeemBreakdown } from "@/lib/reward-rules";
import { createWalletIfMissing } from "@/lib/rewards-wallet";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Please login to preview wallet redemption." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { serviceAmount?: number; requestedAmount?: number } | null;
  const serviceAmount = Math.max(0, Math.round(Number(body?.serviceAmount ?? 0)));
  const requestedAmount = Math.max(0, Math.round(Number(body?.requestedAmount ?? 0)));

  if (!Number.isFinite(serviceAmount)) {
    return NextResponse.json({ message: "Service amount is invalid." }, { status: 400 });
  }

  const wallet = await createWalletIfMissing(user.id);
  const balance = Number(wallet.balance ?? 0);
  const redeem = calculateWalletRedeemBreakdown({
    serviceAmount,
    walletBalance: balance,
    requestedRedeem: requestedAmount || balance,
  });

  return NextResponse.json({
    balance,
    serviceAmount,
    requestedAmount,
    maxRedeem: redeem.maxRedeem,
    redeemAmount: redeem.walletRedeem,
    freshPayableAmount: redeem.freshPayable,
    cashbackEligibleAmount: redeem.cashbackEligibleAmount,
  });
}
