import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { listEligibleLeadAssignees } from "@/lib/crm/lead-convert";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-inbox-assignees:${getClientIp(request)}`, 120, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rawAssignees = await listEligibleLeadAssignees();
    // Return admin and staff assignees
    const assignees = rawAssignees.map((a) => ({
      id: a.id,
      label: a.label,
      kind: a.kind,
    }));

    return NextResponse.json({ ok: true, assignees });
  } catch {
    return NextResponse.json({ error: "Failed to load assignees" }, { status: 500 });
  }
}
