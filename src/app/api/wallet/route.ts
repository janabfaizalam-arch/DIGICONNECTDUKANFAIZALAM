import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getWalletSnapshot } from "@/lib/wallet";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Please login to view DigiWallet." }, { status: 401 });
  }

  const snapshot = await getWalletSnapshot(user.id, 20);

  return NextResponse.json(snapshot);
}
