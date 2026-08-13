import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { PAYOUT_STATUSES } from "@/lib/ap-payout-transitions";
import { processPayout } from "@/lib/ap-payouts";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(PAYOUT_STATUSES),
  paymentReference: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(await getCurrentUserRole(user))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Payout id is required." }, { status: 400 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Provide a valid payout status." }, { status: 400 });
  }

  const result = await processPayout({
    payoutId: id,
    to: body.status,
    paymentReference: body.paymentReference,
    notes: body.notes,
    adminId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: result.status ?? 400 });
  }

  return NextResponse.json({
    ok: true,
    status: result.status,
    refunded: result.refunded,
    message: result.refunded
      ? "Payout rejected and the amount returned to the partner's wallet."
      : `Payout marked ${result.status}.`,
  });
}
