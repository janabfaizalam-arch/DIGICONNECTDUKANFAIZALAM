import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { listCommissionRules } from "@/lib/admin/commission-rules-data";
import { toCommissionRuleRow, validateCommissionRule } from "@/lib/commission-rules";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return jsonError("Admin access required.", 403);

  const view = await listCommissionRules();
  return NextResponse.json({ success: true, ...view });
}

/**
 * Create a commission rule.
 *
 * These rows are the only thing standing between a completed sale and a
 * partner earning nothing: `calculateCommission` matches one rule and, when it
 * finds none, writes no commission at all. Until this route existed the table
 * was read-only in the app and never seeded, so no sale could ever pay.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`admin-commission-rules:${getClientIp(request)}`, 30, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await requireAdmin();
  if (!user) return jsonError("Admin access required.", 403);

  const body = await request.json().catch(() => null);
  const validated = validateCommissionRule(body);
  if (!validated.ok) return jsonError(validated.error, 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Supabase service role key is missing.", 500);

  const { data, error } = await supabase
    .from("commission_rules")
    .insert(toCommissionRuleRow(validated.value))
    .select("id")
    .single();

  if (error) {
    console.error("[admin-commission-rules] create_failed", { error: error.message });
    return jsonError("Commission rule could not be created.", 500);
  }

  return NextResponse.json({
    success: true,
    message: "Commission rule created.",
    id: String(data.id),
  });
}
