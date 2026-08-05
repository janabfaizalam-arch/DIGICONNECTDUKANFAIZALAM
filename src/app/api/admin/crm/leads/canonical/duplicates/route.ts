import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import { findLeadDuplicates } from "@/lib/crm/leads";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rate = checkRateLimit(`crm-lead-duplicates:${getClientIp(request)}`, 40, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await currentUserHasCapability("leads.view");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const mobile = url.searchParams.get("mobile") ?? "";
  const service = url.searchParams.get("service");
  const role = await getCurrentUserRole(user);
  const isPartner =
    String(role ?? "").toLowerCase() === "agency_partner" || String(role ?? "").toLowerCase() === "agent";

  const duplicates = await findLeadDuplicates({
    mobileInput: mobile,
    service,
    scopePartnerId: isPartner ? user.id : null,
    allowGlobal: !isPartner,
  });

  return NextResponse.json({
    duplicates: duplicates.map((row) => ({
      id: row.leadId,
      name: row.name,
      mobile: row.mobile,
      matchType: row.kind,
    })),
  });
}
