import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { currentUserHasCapability } from "@/lib/crm/permissions";
import { generateDailyOperationalSummary, istBusinessDate } from "@/lib/automation/daily-summary";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-summaries:${getClientIp(request)}`, 30, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await currentUserHasCapability("summaries.view");
  if (!allowed.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const generate = url.searchParams.get("generate") === "1";
  const businessDate = url.searchParams.get("date") || istBusinessDate();

  if (generate) {
    const result = await generateDailyOperationalSummary({
      businessDate,
      generatedBy: user.id,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({
      ...result,
      deliveryStatus: "disabled",
      note: "WhatsApp/email delivery of daily summaries remains disabled.",
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { data, error } = await supabase
    .from("crm_daily_summaries")
    .select("id, business_date, timezone, metrics, delivery_status, generated_at")
    .order("business_date", { ascending: false })
    .limit(14);

  if (error) {
    if (/PGRST205|42P01|does not exist/i.test(error.message)) {
      return NextResponse.json({ error: "Database upgrade required." }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not load summaries." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}
