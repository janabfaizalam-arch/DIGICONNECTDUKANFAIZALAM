import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { listEligibleLeadAssignees } from "@/lib/crm/lead-convert";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const assignees = await listEligibleLeadAssignees();
  return NextResponse.json({ assignees });
}
