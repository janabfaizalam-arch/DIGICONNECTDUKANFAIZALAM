import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { processRewardsOnApplicationCompleted } from "@/lib/rewards-wallet";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const result = await processRewardsOnApplicationCompleted(id, user.id);

  return NextResponse.json({
    message: result.processed ? "Rewards reprocessed safely." : `Rewards not processed: ${result.reason ?? "not eligible"}.`,
    result,
  });
}
