import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { calculateMaxRedeem } from "@/lib/rewards-wallet";
import { getWalletSnapshot } from "@/lib/wallet";

function getServiceAmount(request: Request) {
  const url = new URL(request.url);
  const amount = Math.max(0, Math.round(Number(url.searchParams.get("serviceAmount") ?? url.searchParams.get("amount") ?? 0)));

  return Number.isFinite(amount) ? amount : 0;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Please login to view DigiWallet." }, { status: 401 });
  }

  const snapshot = await getWalletSnapshot(user.id, 20);
  const balance = Number(snapshot.wallet?.balance_points ?? snapshot.wallet?.balance ?? 0);
  const serviceAmount = getServiceAmount(request);

  return NextResponse.json({
    ...snapshot,
    balance,
    lifetime_earned: Number(snapshot.wallet?.total_reward_earned ?? snapshot.wallet?.total_cashback_earned ?? 0),
    lifetime_redeemed: Number(snapshot.wallet?.total_reward_redeemed ?? snapshot.wallet?.total_cashback_used ?? 0),
    maxRedeemPreview: serviceAmount > 0
      ? {
          serviceAmount,
          maxRedeem: calculateMaxRedeem(serviceAmount, balance),
          freshPayableAmount: serviceAmount - calculateMaxRedeem(serviceAmount, balance),
        }
      : null,
  });
}
