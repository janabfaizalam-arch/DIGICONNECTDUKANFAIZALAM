import { NextResponse } from "next/server";

import { reconcilePaymentAction } from "@/lib/admin-payment-reconciliation";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

type ActionBody = {
  action?: "link_to_application" | "mark_application_paid" | "create_missing_payment_row" | "mark_stale_pending_failed";
  razorpayPaymentId?: string;
  applicationId?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) return jsonError("Please login.", 401);
  if (!isAdminRole(role)) return jsonError("Admin access required.", 403);

  const body = (await request.json().catch(() => null)) as ActionBody | null;

  if (!body?.action) {
    return jsonError("Action is required.", 400);
  }

  try {
    const result = await reconcilePaymentAction({
      action: body.action,
      adminUserId: user.id,
      razorpayPaymentId: body.razorpayPaymentId ?? null,
      applicationId: body.applicationId ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/payment-reconciliation/action] Action failed", error);
    return jsonError(error instanceof Error ? error.message : "Reconciliation action failed.", 500);
  }
}
