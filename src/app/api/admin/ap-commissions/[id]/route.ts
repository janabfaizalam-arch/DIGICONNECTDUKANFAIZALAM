import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { isApCommissionStatus, setApCommissionStatus } from "@/lib/ap-commission-engine";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

/**
 * Admin transitions for partner commissions (`ap_commissions`).
 *
 * Distinct from /api/admin/commissions/[id], which drives the legacy
 * `commissions` table and never touched the partner wallet. Approving here
 * credits `ap_wallet_ledger`, which is what makes a partner's balance grow and
 * a payout possible.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rate = checkRateLimit(`admin-ap-commission:${getClientIp(request)}`, 40, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return jsonError("Admin access required.", 403);
  }

  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { status?: string; notes?: string } | null;
  const status = String(body?.status ?? "").trim();

  if (!isApCommissionStatus(status)) {
    return jsonError("Invalid commission status.", 400);
  }

  const result = await setApCommissionStatus({
    commissionId: id,
    toStatus: status,
    actorId: user.id,
    notes: body?.notes?.trim() || null,
  });

  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return NextResponse.json({
    message: "Commission updated.",
    status: result.status,
    walletChanged: result.walletChanged,
  });
}
