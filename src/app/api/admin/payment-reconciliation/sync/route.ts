import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { syncRazorpayPayments } from "@/lib/admin-payment-reconciliation";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) return jsonError("Please login.", 401);
  if (!isAdminRole(role)) return jsonError("Admin access required.", 403);

  const body = (await request.json().catch(() => null)) as { from?: string; to?: string } | null;

  try {
    const result = await syncRazorpayPayments({
      from: body?.from ?? null,
      to: body?.to ?? null,
      adminUserId: user.id,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("[admin/payment-reconciliation/sync] Sync failed", error);
    return jsonError(error instanceof Error ? error.message : "Razorpay reconciliation failed.", 500);
  }
}
