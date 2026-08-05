import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import { listCanonicalLeads } from "@/lib/crm/leads";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-crm-leads-list:${getClientIp(request)}`, 60, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await currentUserHasCapability("leads.view");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const role = await getCurrentUserRole(user);
  const followUpParam = url.searchParams.get("followUp");
  const followUp =
    followUpParam === "today" || followUpParam === "upcoming" || followUpParam === "overdue"
      ? followUpParam
      : url.searchParams.get("overdue") === "1"
        ? "overdue"
        : "all";
  const result = await listCanonicalLeads({
    actorId: user.id,
    actorRole: role,
    q: url.searchParams.get("q") ?? undefined,
    stage: url.searchParams.get("stage") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
    assignee: (url.searchParams.get("assignee") as "all" | "unassigned" | "me" | string | null) ?? "all",
    followUpQueue: followUp,
    page: Number(url.searchParams.get("page") ?? 1),
    pageSize: Number(url.searchParams.get("pageSize") ?? 25),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
