// ============================================================================
// Agency Partner Commission Engine
// DigiConnect Dukan — AP Ecosystem
// ============================================================================

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CommissionRule, CommissionType, TieredCommissionBracket } from "@/lib/ap-types";

export type CommissionCalculation = {
  amount: number;
  ruleUsed: CommissionRule | null;
  commissionType: CommissionType;
  commissionValue: number;
  commissionRate: number;
  ruleSnapshot: Record<string, unknown> | null;
};

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function calculateTieredAmount(saleAmount: number, tiers: TieredCommissionBracket[]): number {
  const sorted = [...tiers].sort((a, b) => a.min - b.min);

  for (const tier of sorted) {
    if (saleAmount >= tier.min && (tier.max === undefined || tier.max === null || saleAmount <= tier.max)) {
      if (tier.fixed !== undefined && tier.fixed > 0) return tier.fixed;
      return Math.round((saleAmount * safeNumber(tier.rate)) / 100);
    }
  }

  // Fallback: use last tier
  const lastTier = sorted[sorted.length - 1];
  if (lastTier) {
    if (lastTier.fixed !== undefined && lastTier.fixed > 0) return lastTier.fixed;
    return Math.round((saleAmount * safeNumber(lastTier.rate)) / 100);
  }

  return 0;
}

function calculateAmountFromRule(rule: CommissionRule, saleAmount: number): number {
  if (rule.commission_type === "fixed") {
    return safeNumber(rule.fixed_amount);
  }

  if (rule.commission_type === "percentage") {
    const rate = safeNumber(rule.percentage_rate);
    return Math.round((saleAmount * rate) / 100);
  }

  if (rule.commission_type === "tiered") {
    const tiers = (rule.tiered_config ?? []) as TieredCommissionBracket[];
    return calculateTieredAmount(saleAmount, tiers);
  }

  return 0;
}

function clampAmount(amount: number, rule: CommissionRule): number {
  const min = safeNumber(rule.min_amount);
  const max = rule.max_amount !== null && rule.max_amount !== undefined ? safeNumber(rule.max_amount) : Infinity;

  return Math.max(min, Math.min(amount, max));
}

function isRuleValid(rule: CommissionRule): boolean {
  if (!rule.is_active) return false;

  const now = new Date();

  if (rule.valid_from && new Date(rule.valid_from) > now) return false;
  if (rule.valid_until && new Date(rule.valid_until) < now) return false;

  return true;
}

/**
 * Calculate commission for an application.
 *
 * Rule hierarchy (checked in priority order):
 * 1. Partner-specific rule (scope_type = 'partner')
 * 2. Campaign rule (scope_type = 'campaign')
 * 3. Service-specific rule (scope_type = 'service')
 * 4. Tier default rule (scope_type = 'tier')
 * 5. Global fallback (scope_type = 'global')
 */
export async function calculateCommission(params: {
  agencyPartnerId: string;
  tierId: string | null;
  serviceId: string | null;
  saleAmount: number;
  campaignCode?: string | null;
}): Promise<CommissionCalculation> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return {
      amount: 0,
      ruleUsed: null,
      commissionType: "fixed",
      commissionValue: 0,
      commissionRate: 0,
      ruleSnapshot: null,
    };
  }

  const { data, error } = await supabase
    .from("commission_rules")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return {
      amount: 0,
      ruleUsed: null,
      commissionType: "fixed",
      commissionValue: 0,
      commissionRate: 0,
      ruleSnapshot: null,
    };
  }

  const rules = (data as CommissionRule[]).filter(isRuleValid);

  // Priority: partner > campaign > service > tier > global
  const matchingRule =
    rules.find((r) => r.scope_type === "partner" && r.agency_partner_id === params.agencyPartnerId) ??
    (params.campaignCode
      ? rules.find((r) => r.scope_type === "campaign" && r.campaign_code === params.campaignCode)
      : null) ??
    (params.serviceId
      ? rules.find((r) => r.scope_type === "service" && r.service_id === params.serviceId)
      : null) ??
    (params.tierId
      ? rules.find((r) => r.scope_type === "tier" && r.tier_id === params.tierId)
      : null) ??
    rules.find((r) => r.scope_type === "global") ??
    null;

  if (!matchingRule) {
    return {
      amount: 0,
      ruleUsed: null,
      commissionType: "fixed",
      commissionValue: 0,
      commissionRate: 0,
      ruleSnapshot: null,
    };
  }

  const rawAmount = calculateAmountFromRule(matchingRule, params.saleAmount);
  const finalAmount = clampAmount(rawAmount, matchingRule);

  return {
    amount: finalAmount,
    ruleUsed: matchingRule,
    commissionType: matchingRule.commission_type,
    commissionValue: safeNumber(matchingRule.fixed_amount),
    commissionRate: safeNumber(matchingRule.percentage_rate),
    ruleSnapshot: matchingRule as unknown as Record<string, unknown>,
  };
}

/**
 * Create a commission record when an application is completed.
 */
export async function createCommissionForApplication(params: {
  agencyPartnerId: string;
  applicationId: string;
  serviceSlug: string;
  serviceName: string;
  saleAmount: number;
  tierId: string | null;
  serviceId: string | null;
}): Promise<{ ok: boolean; commissionId?: string; amount?: number; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Missing server config" };

  // Check if commission already exists
  const { data: existing } = await supabase
    .from("ap_commissions")
    .select("id")
    .eq("agency_partner_id", params.agencyPartnerId)
    .eq("application_id", params.applicationId)
    .maybeSingle();

  if (existing) {
    return { ok: true, commissionId: existing.id as string, amount: 0 };
  }

  const calc = await calculateCommission({
    agencyPartnerId: params.agencyPartnerId,
    tierId: params.tierId,
    serviceId: params.serviceId,
    saleAmount: params.saleAmount,
  });

  // A sale that prices at zero writes no commission row at all, so the partner
  // sees nothing in their panel and nothing ever reaches their wallet. That is
  // almost always a missing or misconfigured rule rather than a genuinely
  // unpaid sale, and returning a bare `ok: true` made it indistinguishable from
  // success in the logs. Say which it was, loudly.
  if (calc.amount <= 0) {
    const reason = calc.ruleUsed
      ? `rule "${calc.ruleUsed.name}" (${calc.ruleUsed.id}) priced this sale at 0`
      : "no commission rule matched — check /admin/commission-rules for an active global fallback";
    console.warn("[ap-commission] zero_commission_not_recorded", {
      applicationId: params.applicationId,
      agencyPartnerId: params.agencyPartnerId,
      serviceSlug: params.serviceSlug,
      saleAmount: params.saleAmount,
      reason,
    });
    return { ok: true, amount: 0, error: reason };
  }

  const { data, error } = await supabase
    .from("ap_commissions")
    .insert({
      agency_partner_id: params.agencyPartnerId,
      application_id: params.applicationId,
      commission_rule_id: calc.ruleUsed?.id ?? null,
      service_slug: params.serviceSlug,
      service_name: params.serviceName,
      sale_amount: params.saleAmount,
      commission_type: calc.commissionType,
      commission_value: calc.commissionValue,
      commission_rate: calc.commissionRate,
      calculated_amount: calc.amount,
      rule_snapshot: calc.ruleSnapshot,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      console.log(`[ap-commission] Commission for application ${params.applicationId} already exists (idempotent duplicate, 23505).`);
      const { data: existingComm } = await supabase
        .from("ap_commissions")
        .select("id, calculated_amount")
        .eq("application_id", params.applicationId)
        .maybeSingle();
      if (existingComm) {
        return { ok: true, commissionId: existingComm.id as string, amount: existingComm.calculated_amount };
      }
      return { ok: true, amount: 0 };
    }
    console.error("[ap-commission] Failed to create commission", error);
    return { ok: false, error: error.message };
  }

  // Record audit log entry
  try {
    await logCommissionStatusChange(data.id, null, "pending", null, "Initial commission reservation");
  } catch (auditErr) {
    console.error("[ap-commission] Failed to log status change:", auditErr);
  }

  return { ok: true, commissionId: data.id as string, amount: calc.amount };
}

export async function logCommissionStatusChange(
  commissionId: string,
  oldStatus: string | null,
  newStatus: string,
  changedBy: string | null,
  notes?: string
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("commission_audit_logs")
    .insert({
      commission_id: commissionId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      notes: notes || `Status updated from ${oldStatus ?? "NULL"} to ${newStatus}`
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[ap-commission-engine] Log status change failed:", error);
  }

  return data;
}


// ── Commission lifecycle ────────────────────────────────────────────────────

export const AP_COMMISSION_STATUSES = [
  "pending",
  "earned",
  "approved",
  "paid",
  "cancelled",
  "reversed",
  "adjusted",
] as const;

export type ApCommissionStatus = (typeof AP_COMMISSION_STATUSES)[number];

/** Statuses at which the commission amount is sitting in the partner's wallet. */
const CREDITED_STATUSES = new Set<ApCommissionStatus>(["approved", "paid"]);
/** Statuses that revoke a commission — any credit must be clawed back. */
const REVOKED_STATUSES = new Set<ApCommissionStatus>(["cancelled", "reversed"]);

export function isApCommissionStatus(value: unknown): value is ApCommissionStatus {
  return AP_COMMISSION_STATUSES.includes(String(value ?? "") as ApCommissionStatus);
}

/**
 * Move an `ap_commissions` row to a new status, keeping the partner's wallet in
 * step.
 *
 * This is the link that made the earn → wallet → payout chain work: commissions
 * were reserved as `pending` and shown to the partner, but nothing ever credited
 * `ap_wallet_ledger`, so a partner's balance never grew and they could never
 * reach the payout minimum. Approving now credits the wallet exactly once, and
 * cancelling or reversing an already-credited commission takes it back out.
 */
export async function setApCommissionStatus(params: {
  commissionId: string;
  toStatus: ApCommissionStatus;
  actorId: string;
  notes?: string | null;
}): Promise<
  | { ok: true; status: ApCommissionStatus; walletEntryId?: string | null; walletChanged: boolean }
  | { ok: false; error: string; status: number }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Missing server config", status: 503 };

  const { data: commission, error: loadError } = await supabase
    .from("ap_commissions")
    .select("id, agency_partner_id, calculated_amount, status, service_name")
    .eq("id", params.commissionId)
    .maybeSingle();

  if (loadError) return { ok: false, error: "Could not load commission.", status: 500 };
  if (!commission) return { ok: false, error: "Commission not found.", status: 404 };

  const fromStatus = String(commission.status ?? "pending") as ApCommissionStatus;
  const amount = safeNumber(commission.calculated_amount);
  const partnerId = String(commission.agency_partner_id);

  if (fromStatus === params.toStatus) {
    return { ok: true, status: fromStatus, walletChanged: false };
  }

  const { creditCommission, reverseCommissionCredit } = await import("@/lib/ap-wallet");

  let walletEntryId: string | null = null;
  let walletChanged = false;

  // Settle the wallet before recording the status, so a failure here leaves the
  // commission in its old state rather than marking it paid with no money moved.
  if (CREDITED_STATUSES.has(params.toStatus) && !CREDITED_STATUSES.has(fromStatus)) {
    if (amount > 0) {
      const credited = await creditCommission({
        agencyPartnerId: partnerId,
        commissionId: params.commissionId,
        amount,
        serviceName: commission.service_name ? String(commission.service_name) : undefined,
      });
      if (!credited.ok) {
        return { ok: false, error: credited.error || "Wallet credit failed.", status: 500 };
      }
      walletEntryId = credited.entryId ?? null;
      walletChanged = !credited.deduped;
    }
  } else if (REVOKED_STATUSES.has(params.toStatus) && CREDITED_STATUSES.has(fromStatus)) {
    const reversed = await reverseCommissionCredit({
      agencyPartnerId: partnerId,
      commissionId: params.commissionId,
      amount,
      createdBy: params.actorId,
      reason: params.notes ?? `Commission ${params.toStatus}`,
    });
    if (!reversed.ok) {
      return { ok: false, error: reversed.error || "Wallet reversal failed.", status: 500 };
    }
    walletEntryId = reversed.entryId ?? null;
    walletChanged = !reversed.deduped;
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { status: params.toStatus, updated_at: now };
  if (params.toStatus === "approved") {
    updates.approved_by = params.actorId;
    updates.approved_at = now;
  }
  if (params.toStatus === "paid") {
    updates.paid_at = now;
  }

  const { error: updateError } = await supabase
    .from("ap_commissions")
    .update(updates)
    .eq("id", params.commissionId);

  if (updateError) {
    console.error("[ap-commission] status_update_failed", {
      commissionId: params.commissionId,
      error: updateError.message,
    });
    return { ok: false, error: "Commission status could not be updated.", status: 500 };
  }

  try {
    await logCommissionStatusChange(
      params.commissionId,
      fromStatus,
      params.toStatus,
      params.actorId,
      params.notes ?? undefined,
    );
  } catch (auditError) {
    console.error("[ap-commission] audit_log_failed", auditError);
  }

  return { ok: true, status: params.toStatus, walletEntryId, walletChanged };
}
