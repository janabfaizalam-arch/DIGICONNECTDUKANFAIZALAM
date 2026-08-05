import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import { lookupCustomerByMobile } from "@/lib/crm/walk-in";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Admin walk-in / CRM customer lookup by normalized Indian mobile.
 * Does not reveal privileged-user status beyond customer CRM records.
 */
export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-customer-lookup:${getClientIp(request)}`, 60, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await currentUserHasCapability("customers.view");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const mobile = new URL(request.url).searchParams.get("mobile") || "";
  const result = await lookupCustomerByMobile(mobile);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    mobile: result.mobile,
    found: Boolean(result.customer),
    customer: result.customer,
    recentApplications: result.recentApplications,
  });
}
