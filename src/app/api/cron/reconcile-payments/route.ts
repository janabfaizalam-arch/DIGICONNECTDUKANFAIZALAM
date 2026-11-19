import { NextResponse } from "next/server";

import { syncRazorpayPayments } from "@/lib/admin-payment-reconciliation";

/**
 * Nightly Razorpay reconciliation.
 *
 * The webhook is the primary safety net, but a webhook can be missed outright:
 * a bad deploy, a rotated secret, a delivery Razorpay gave up on. Until now the
 * only backstop was an admin remembering to press Sync in the panel, so a
 * captured payment could sit unrecorded indefinitely. This sweeps the last two
 * days every night and records whatever both other paths missed.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ message: "CRON_SECRET is not configured." }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const to = new Date();
  const from = new Date(to.getTime() - 2 * 24 * 60 * 60 * 1000);

  try {
    const result = await syncRazorpayPayments({
      from: from.toISOString(),
      to: to.toISOString(),
      adminUserId: null,
    });

    console.info("[cron/reconcile-payments] Razorpay reconciliation finished", JSON.stringify(result));

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("[cron/reconcile-payments] Razorpay reconciliation failed", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Razorpay reconciliation failed." },
      { status: 500 },
    );
  }
}
