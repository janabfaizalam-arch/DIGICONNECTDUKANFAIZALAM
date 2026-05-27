// ============================================================================
// Agency Partner Commission Engine
// DigiConnect Dukan — AP Ecosystem
// ============================================================================

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CommissionRule, CommissionType, TieredCommissionBracket } from "@/lib/ap-types";

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

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

  if (calc.amount <= 0) {
    return { ok: true, amount: 0 };
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
    console.error("[ap-commission] Failed to create commission", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, commissionId: data.id as string, amount: calc.amount };
}
