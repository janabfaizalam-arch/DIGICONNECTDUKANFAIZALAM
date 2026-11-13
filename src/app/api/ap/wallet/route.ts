import { NextResponse } from "next/server";

import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getAgencyPartnerByUserId, getAPWalletBalance } from "@/lib/ap-data";

/**
 * The partner's wallet balance.
 *
 * `POST` used to start a bank withdrawal. It no longer does: the wallet is what
 * the partner buys services with, so what the platform pays back is spent here
 * and does not leave for a bank account. Payouts already requested are still
 * finished by the admin payout screen -- this only stops new ones being made,
 * and it refuses them on the server rather than only hiding the button, because
 * the old form is still out there in open tabs.
 */

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

export async function POST() {
  return jsonError(
    "Wallet ka paisa bank mein transfer nahi hota. Isse seedha nayi service apply karne mein use kijiye.",
    410,
  );
}
