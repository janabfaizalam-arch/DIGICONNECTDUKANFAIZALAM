import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { acknowledgeOpsAlert, resolveOpsAlert } from "@/lib/automation/alerts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-alerts-list:${getClientIp(request)}`, 60, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await currentUserHasCapability("alerts.view");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "open";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = 25;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("crm_ops_alerts")
    .select(
      "id, alert_type, severity, title, safe_summary, related_entity_type, related_entity_id, status, created_at, acknowledged_at, resolved_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (status !== "all") query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) {
    if (/PGRST205|42P01|does not exist/i.test(error.message)) {
      return NextResponse.json({ error: "Database upgrade required." }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not load alerts." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [], total: count ?? 0, page, pageSize });
}

export async function POST(request: Request) {
  const rate = checkRateLimit(`admin-alerts-action:${getClientIp(request)}`, 30, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await currentUserHasCapability("alerts.resolve");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { action?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (body.action === "acknowledge") {
    const result = await acknowledgeOpsAlert({ alertId: id, actorId: user.id });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "resolve") {
    const result = await resolveOpsAlert({ alertId: id, actorId: user.id });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
