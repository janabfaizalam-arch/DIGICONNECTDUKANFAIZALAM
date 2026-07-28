import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import {
  adminRepairCustomerPinIdentity,
  getCustomerIdentityHealth,
} from "@/lib/auth/customer-identity-health";

export const dynamic = "force-dynamic";

const schema = z.object({
  mobile: z.string().trim().min(10).max(20),
  dryRun: z.boolean().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const before = await getCustomerIdentityHealth({ mobile: body.mobile });

    if (body.dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, before });
    }

    if (before.duplicateIdentityWarning || before.status === "blocked") {
      return NextResponse.json(
        {
          error: "Identity is ambiguous or blocked. Manual review required.",
          before,
        },
        { status: 409 },
      );
    }

    const repaired = await adminRepairCustomerPinIdentity(body.mobile);
    const after = await getCustomerIdentityHealth({ mobile: body.mobile });

    if (!repaired.ok) {
      return NextResponse.json({ error: repaired.error, before, after }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      customerId: repaired.customerId,
      repaired: repaired.repaired,
      lookupSource: repaired.lookupSource,
      before,
      after,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[admin/repair-pin-identity]", error);
    return NextResponse.json({ error: "Repair failed" }, { status: 500 });
  }
}
