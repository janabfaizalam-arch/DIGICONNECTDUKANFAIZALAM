import "server-only";

import { describeCommissionRule, hasGlobalFallback, SCOPE_PRIORITY_ORDER } from "@/lib/commission-rules";
import type { CommissionScopeType, CommissionType } from "@/lib/ap-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminCommissionRuleRow = {
  id: string;
  name: string;
  description: string | null;
  scopeType: CommissionScopeType;
  /** Resolved display name of whatever the rule is scoped to. */
  scopeTarget: string | null;
  commissionType: CommissionType;
  payout: string;
  minAmount: number;
  maxAmount: number | null;
  isActive: boolean;
  priority: number;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string | null;
  /** True when a date window has closed, so the row reads as dead not merely inactive. */
  expired: boolean;
};

export type CommissionRuleOptions = {
  services: Array<{ id: string; name: string }>;
  partners: Array<{ id: string; name: string }>;
  tiers: Array<{ id: string; name: string }>;
};

export type AdminCommissionRulesView = {
  rows: AdminCommissionRuleRow[];
  options: CommissionRuleOptions;
  /** No active global rule means unmatched sales silently earn nothing. */
  hasGlobalFallback: boolean;
  activeCount: number;
};

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isExpired(validUntil: unknown): boolean {
  const raw = String(validUntil ?? "").trim();
  if (!raw) return false;
  const until = new Date(raw);
  return Number.isFinite(until.getTime()) && until < new Date();
}

const EMPTY: AdminCommissionRulesView = {
  rows: [],
  options: { services: [], partners: [], tiers: [] },
  hasGlobalFallback: false,
  activeCount: 0,
};

/**
 * Every commission rule, plus the pickers the create form needs.
 *
 * Rows come back in the same precedence order `calculateCommission` walks
 * (partner → campaign → service → tier → global), so the screen reads in the
 * order a sale is actually matched rather than by creation date.
 */
export async function listCommissionRules(): Promise<AdminCommissionRulesView> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return EMPTY;

  const { data, error } = await supabase
    .from("commission_rules")
    .select(
      "id, name, description, scope_type, service_id, agency_partner_id, tier_id, campaign_code, commission_type, fixed_amount, percentage_rate, tiered_config, min_amount, max_amount, is_active, priority, valid_from, valid_until, created_at",
    )
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin-commission-rules] list_failed", { error: error.message });
    return EMPTY;
  }

  const rules = (data ?? []) as Array<Record<string, unknown>>;

  const [servicesResult, partnersResult, tiersResult] = await Promise.all([
    supabase.from("services").select("id, name").order("name", { ascending: true }).limit(500),
    supabase
      .from("agency_partners")
      .select("id, business_name, full_name, partner_code")
      .order("full_name", { ascending: true })
      .limit(500),
    supabase.from("agency_partner_tiers").select("id, name").order("sort_order", { ascending: true }),
  ]);

  if (servicesResult.error) {
    console.error("[admin-commission-rules] service_lookup_failed", { error: servicesResult.error.message });
  }
  if (partnersResult.error) {
    console.error("[admin-commission-rules] partner_lookup_failed", { error: partnersResult.error.message });
  }
  if (tiersResult.error) {
    console.error("[admin-commission-rules] tier_lookup_failed", { error: tiersResult.error.message });
  }

  const services = ((servicesResult.data ?? []) as Array<Record<string, unknown>>).map((s) => ({
    id: String(s.id),
    name: String(s.name ?? "Service"),
  }));
  const partners = ((partnersResult.data ?? []) as Array<Record<string, unknown>>).map((p) => ({
    id: String(p.id),
    name: `${String(p.business_name || p.full_name || "Partner")}${p.partner_code ? ` (${String(p.partner_code)})` : ""}`,
  }));
  const tiers = ((tiersResult.data ?? []) as Array<Record<string, unknown>>).map((t) => ({
    id: String(t.id),
    name: String(t.name ?? "Tier"),
  }));

  const serviceById = new Map(services.map((s) => [s.id, s.name]));
  const partnerById = new Map(partners.map((p) => [p.id, p.name]));
  const tierById = new Map(tiers.map((t) => [t.id, t.name]));

  function scopeTargetFor(rule: Record<string, unknown>): string | null {
    switch (String(rule.scope_type)) {
      case "service":
        return serviceById.get(String(rule.service_id)) ?? "Unknown service";
      case "partner":
        return partnerById.get(String(rule.agency_partner_id)) ?? "Unknown partner";
      case "tier":
        return tierById.get(String(rule.tier_id)) ?? "Unknown tier";
      case "campaign":
        return rule.campaign_code ? String(rule.campaign_code) : "Unknown campaign";
      default:
        return null;
    }
  }

  const rows: AdminCommissionRuleRow[] = rules.map((rule) => ({
    id: String(rule.id),
    name: String(rule.name ?? "Rule"),
    description: rule.description ? String(rule.description) : null,
    scopeType: String(rule.scope_type ?? "global") as CommissionScopeType,
    scopeTarget: scopeTargetFor(rule),
    commissionType: String(rule.commission_type ?? "fixed") as CommissionType,
    payout: describeCommissionRule(rule),
    minAmount: safeNumber(rule.min_amount),
    maxAmount: rule.max_amount === null || rule.max_amount === undefined ? null : safeNumber(rule.max_amount),
    isActive: rule.is_active !== false,
    priority: safeNumber(rule.priority),
    validFrom: rule.valid_from ? String(rule.valid_from) : null,
    validUntil: rule.valid_until ? String(rule.valid_until) : null,
    createdAt: rule.created_at ? String(rule.created_at) : null,
    expired: isExpired(rule.valid_until),
  }));

  rows.sort((a, b) => {
    const scopeDelta =
      SCOPE_PRIORITY_ORDER.indexOf(a.scopeType) - SCOPE_PRIORITY_ORDER.indexOf(b.scopeType);
    if (scopeDelta !== 0) return scopeDelta;
    return b.priority - a.priority;
  });

  return {
    rows,
    options: { services, partners, tiers },
    hasGlobalFallback: hasGlobalFallback(rules),
    activeCount: rows.filter((r) => r.isActive && !r.expired).length,
  };
}
