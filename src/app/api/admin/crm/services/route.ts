import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import { listActiveCrmServices } from "@/lib/crm/walk-in-application";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Active agent_services catalogue for CRM walk-in (reuses canonical fee source). */
export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-crm-services:${getClientIp(request)}`, 60, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await currentUserHasCapability("applications.create");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const services = await listActiveCrmServices();
  const filtered = q
    ? services.filter(
        (service) =>
          service.title.toLowerCase().includes(q) ||
          service.slug.toLowerCase().includes(q) ||
          String(service.category ?? "")
            .toLowerCase()
            .includes(q),
      )
    : services;

  return NextResponse.json({
    ok: true,
    services: filtered,
    count: filtered.length,
  });
}
