import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
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

/**
 * Update a rule, or flip it on/off.
 *
 * A body carrying only `isActive` toggles activation and leaves the payout
 * config untouched — the list screen's switch uses that. Anything more is
 * treated as a full edit and re-validated, so a rule can never be saved into a
 * state that pays nothing.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rate = checkRateLimit(`admin-commission-rules:${getClientIp(request)}`, 40, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await requireAdmin();
  if (!user) return jsonError("Admin access required.", 403);

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError("Provide the fields to update.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Supabase service role key is missing.", 500);

  const keys = Object.keys(body);
  const toggleOnly = keys.length === 1 && keys[0] === "isActive";

  const updates: Record<string, unknown> = toggleOnly
    ? { is_active: body.isActive === true }
    : (() => {
        const validated = validateCommissionRule(body);
        return validated.ok ? toCommissionRuleRow(validated.value) : { __invalid: validated.error };
      })();

  if (typeof updates.__invalid === "string") {
    return jsonError(updates.__invalid, 400);
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase.from("commission_rules").update(updates).eq("id", id);

  if (error) {
    console.error("[admin-commission-rules] update_failed", { id, error: error.message });
    return jsonError("Commission rule could not be updated.", 500);
  }

  return NextResponse.json({ success: true, message: "Commission rule updated." });
}

/**
 * Delete a rule that has never priced a commission.
 *
 * `ap_commissions.commission_rule_id` is ON DELETE SET NULL, so removing a rule
 * that has already paid someone would quietly detach the row that explains what
 * they were paid and why. Those are deactivated instead, which stops future
 * matches while leaving the history readable.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rate = checkRateLimit(`admin-commission-rules:${getClientIp(request)}`, 20, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await requireAdmin();
  if (!user) return jsonError("Admin access required.", 403);

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Supabase service role key is missing.", 500);

  const { count, error: countError } = await supabase
    .from("ap_commissions")
    .select("id", { count: "exact", head: true })
    .eq("commission_rule_id", id);

  if (countError) {
    console.error("[admin-commission-rules] usage_check_failed", { id, error: countError.message });
    return jsonError("Could not check whether this rule has been used.", 500);
  }

  if ((count ?? 0) > 0) {
    return jsonError(
      `This rule has priced ${count} commission${count === 1 ? "" : "s"}. Deactivate it instead so the payout history stays intact.`,
      409,
    );
  }

  const { error } = await supabase.from("commission_rules").delete().eq("id", id);

  if (error) {
    console.error("[admin-commission-rules] delete_failed", { id, error: error.message });
    return jsonError("Commission rule could not be deleted.", 500);
  }

  return NextResponse.json({ success: true, message: "Commission rule deleted." });
}
