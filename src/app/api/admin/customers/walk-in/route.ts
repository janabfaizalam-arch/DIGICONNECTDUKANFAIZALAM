import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import { createWalkInCustomer } from "@/lib/crm/walk-in";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(10).max(20),
  alternateMobile: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().min(3).max(400),
  pincode: z.string().trim().regex(/^\d{6}$/),
  city: z.string().trim().min(2).max(120),
  district: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  referralSource: z.string().trim().max(120).optional().nullable(),
});

/**
 * Phone-first walk-in customer create (PIN-compatible identity).
 * Returns temporaryPin once for private staff sharing — never logged.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`admin-walk-in:${getClientIp(request)}`, 20, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await currentUserHasCapability("walk_in.create");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid customer details." }, { status: 400 });
  }

  const result = await createWalkInCustomer({
    ...body,
    createdByUserId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Never log temporaryPin, derived password, or internal email.
  console.info("[walk-in] customer_created", {
    customerId: result.customerId,
    mobileMasked: `${result.mobile.slice(0, 2)}******${result.mobile.slice(-2)}`,
    createdBy: user.id,
    messaging: result.messaging,
  });

  return NextResponse.json({
    ok: true,
    customerId: result.customerId,
    userId: result.userId,
    mobile: result.mobile,
    mobileMasked: `${result.mobile.slice(0, 2)}******${result.mobile.slice(-2)}`,
    // One-time display for counter staff only — clients must not persist.
    temporaryPin: result.temporaryPin,
    temporaryPinShownOnce: true,
    messaging: result.messaging,
    next: {
      // Continue workflow without putting PIN in the URL.
      selectServiceHref: `/admin/customers/walk-in?customerId=${encodeURIComponent(result.customerId)}&step=service`,
      customerHref: `/admin/customers/${encodeURIComponent(result.customerId)}`,
      applicationsHref: `/admin/applications`,
    },
  });
}
