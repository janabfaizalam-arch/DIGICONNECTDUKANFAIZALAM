import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAutomationRuleCatalogue } from "@/lib/automation/rules";
import { resolveCrmNotificationDeliveryModeDetailed } from "@/lib/automation/delivery-mode";
import { retryAutomationEvent } from "@/lib/automation/retry-event";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-automation-list:${getClientIp(request)}`, 60, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await currentUserHasCapability("automation.view");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") ?? 25)));
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("crm_automation_events")
    .select(
      "id, event_type, entity_type, entity_id, status, attempt_count, max_attempts, failure_code, failure_summary, next_attempt_at, created_at, correlation_id, safe_metadata",
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
    return NextResponse.json({ error: "Could not load events." }, { status: 500 });
  }

  const { data: statusRows } = await supabase.from("crm_automation_events").select("status");
  const counts: Record<string, number> = {};
  for (const row of statusRows ?? []) {
    const s = String((row as { status?: string }).status ?? "unknown");
    counts[s] = (counts[s] ?? 0) + 1;
  }

  const delivery = resolveCrmNotificationDeliveryModeDetailed();
  const aisensyConfigured = Boolean(String(process.env.AISENSY_API_KEY ?? "").trim());

  return NextResponse.json({
    ok: true,
    deliveryMode: delivery.mode,
    deliveryReady: {
      effectiveMode: delivery.mode,
      failClosed: delivery.failClosed,
      reason: delivery.reason,
      /** OTP does not use CRM_NOTIFICATION_DELIVERY_MODE */
      otpUsesDeliveryMode: false,
      outboxMaySend: delivery.mode === "queue",
      aisensyKeyConfigured: aisensyConfigured,
      note:
        delivery.mode === "disabled"
          ? "No non-OTP CRM WhatsApp send until mode is explicitly queue or direct."
          : delivery.mode === "direct"
            ? "Temporary compatibility — prefer queue after processor verified."
            : "Queue mode — processor owns AiSensy sends.",
    },
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    counts,
    rules: getAutomationRuleCatalogue().map((r) => ({
      key: r.key,
      name: r.name,
      enabled: r.enabled,
      eventType: r.eventType,
      actionType: r.actionType,
      readiness: r.readiness,
      version: r.version,
    })),
  });
}

export async function POST(request: Request) {
  const rate = checkRateLimit(`admin-automation-retry:${getClientIp(request)}`, 20, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await currentUserHasCapability("automation.retry");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { action?: string; id?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "retry") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Browser cannot change event type / entity / recipient / rule — only id + reason.
  const result = await retryAutomationEvent({
    eventId: id,
    actorId: user.id,
    reason: String(body.reason ?? ""),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, deduped: result.deduped, status: result.status });
}
