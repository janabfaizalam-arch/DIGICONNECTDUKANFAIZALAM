/**
 * Commission rule shape and validation, with no I/O so it can be tested directly.
 *
 * `calculateCommission` resolves a partner's payout by matching one row in
 * `commission_rules`. When nothing matches it returns zero, and
 * `createCommissionForApplication` then writes no row at all — so an empty or
 * malformed rule set is indistinguishable from "this sale earned nothing".
 * That silence is why partners sold services and never saw a paisa, so the
 * rules that decide whether a rule is usable live here, checked before a row
 * is ever written.
 */

import type { CommissionScopeType, CommissionType, TieredCommissionBracket } from "@/lib/ap-types";

export const COMMISSION_SCOPE_TYPES = ["global", "service", "partner", "tier", "campaign"] as const;
export const COMMISSION_TYPES = ["fixed", "percentage", "tiered"] as const;

/** Scope precedence used by `calculateCommission`, most specific first. */
export const SCOPE_PRIORITY_ORDER: CommissionScopeType[] = [
  "partner",
  "campaign",
  "service",
  "tier",
  "global",
];

/** The scope's own key column — a scoped rule is dead weight without it. */
const SCOPE_KEY: Record<CommissionScopeType, keyof CommissionRuleInput | null> = {
  global: null,
  service: "serviceId",
  partner: "agencyPartnerId",
  tier: "tierId",
  campaign: "campaignCode",
};

export const SCOPE_LABELS: Record<CommissionScopeType, string> = {
  global: "Global fallback",
  service: "Service",
  partner: "Partner",
  tier: "Tier",
  campaign: "Campaign",
};

/** Name given to the rule the backfill migration installs. */
export const DEFAULT_GLOBAL_RULE_NAME = "Default global commission";

export function isCommissionScopeType(value: unknown): value is CommissionScopeType {
  return typeof value === "string" && (COMMISSION_SCOPE_TYPES as readonly string[]).includes(value);
}

export function isCommissionType(value: unknown): value is CommissionType {
  return typeof value === "string" && (COMMISSION_TYPES as readonly string[]).includes(value);
}

export type CommissionRuleInput = {
  name: string;
  description: string | null;
  scopeType: CommissionScopeType;
  serviceId: string | null;
  agencyPartnerId: string | null;
  tierId: string | null;
  campaignCode: string | null;
  commissionType: CommissionType;
  fixedAmount: number;
  percentageRate: number;
  tieredConfig: TieredCommissionBracket[];
  minAmount: number;
  maxAmount: number | null;
  isActive: boolean;
  priority: number;
  validFrom: string | null;
  validUntil: string | null;
};

export type ValidationResult =
  | { ok: true; value: CommissionRuleInput }
  | { ok: false; error: string };

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function trimmedOrNull(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

function parseBrackets(value: unknown): TieredCommissionBracket[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const bracket: TieredCommissionBracket = {
      min: num(row.min),
      max: num(row.max),
      rate: num(row.rate),
    };
    if (row.fixed !== undefined && row.fixed !== null && row.fixed !== "") {
      bracket.fixed = num(row.fixed);
    }
    return bracket;
  });
}

/**
 * Brackets are walked in ascending `min` order and the first containing bracket
 * wins, so a gap silently pays zero for sales that fall in it and an overlap
 * silently pays the lower bracket. Both are rejected rather than saved.
 */
function validateBrackets(brackets: TieredCommissionBracket[]): string | null {
  if (!brackets.length) return "Add at least one slab for a tiered rule.";

  const sorted = [...brackets].sort((a, b) => a.min - b.min);

  for (const [index, bracket] of sorted.entries()) {
    const label = `Slab ${index + 1}`;
    if (bracket.min < 0) return `${label}: minimum cannot be negative.`;
    if (bracket.max <= bracket.min) return `${label}: maximum must be greater than the minimum.`;
    if (bracket.rate < 0 || bracket.rate > 100) return `${label}: rate must be between 0 and 100.`;
    if (bracket.fixed !== undefined && bracket.fixed < 0) return `${label}: fixed amount cannot be negative.`;
    if (bracket.rate <= 0 && !(bracket.fixed && bracket.fixed > 0)) {
      return `${label}: set either a rate above 0 or a fixed amount above 0, otherwise this slab pays nothing.`;
    }

    const previous = sorted[index - 1];
    if (previous && bracket.min <= previous.max) {
      return `${label}: overlaps the previous slab. Start it above ₹${previous.max}.`;
    }
  }

  return null;
}

/**
 * Normalise and validate a rule submitted by an admin.
 *
 * Every rejection here is a rule that would have been saved but silently paid
 * nothing — a zero rate, a scoped rule with no target, a max below the min.
 */
export function validateCommissionRule(raw: unknown): ValidationResult {
  const body = (raw ?? {}) as Record<string, unknown>;

  const name = String(body.name ?? "").trim();
  if (!name) return { ok: false, error: "Give the rule a name." };
  if (name.length > 120) return { ok: false, error: "Rule name must be 120 characters or fewer." };

  const scopeType = body.scopeType ?? body.scope_type ?? "global";
  if (!isCommissionScopeType(scopeType)) {
    return { ok: false, error: "Choose a valid scope." };
  }

  const commissionType = body.commissionType ?? body.commission_type ?? "fixed";
  if (!isCommissionType(commissionType)) {
    return { ok: false, error: "Choose a valid commission type." };
  }

  const input: CommissionRuleInput = {
    name,
    description: trimmedOrNull(body.description),
    scopeType,
    serviceId: trimmedOrNull(body.serviceId ?? body.service_id),
    agencyPartnerId: trimmedOrNull(body.agencyPartnerId ?? body.agency_partner_id),
    tierId: trimmedOrNull(body.tierId ?? body.tier_id),
    campaignCode: trimmedOrNull(body.campaignCode ?? body.campaign_code),
    commissionType,
    fixedAmount: num(body.fixedAmount ?? body.fixed_amount),
    percentageRate: num(body.percentageRate ?? body.percentage_rate),
    tieredConfig: parseBrackets(body.tieredConfig ?? body.tiered_config),
    minAmount: num(body.minAmount ?? body.min_amount),
    maxAmount:
      body.maxAmount === undefined || body.maxAmount === null || body.maxAmount === ""
        ? null
        : num(body.maxAmount),
    isActive: body.isActive !== false && body.is_active !== false,
    priority: Math.trunc(num(body.priority)),
    validFrom: trimmedOrNull(body.validFrom ?? body.valid_from),
    validUntil: trimmedOrNull(body.validUntil ?? body.valid_until),
  };

  // A scoped rule whose target is missing can never match anything, so it would
  // sit in the table looking configured while every sale falls through it.
  const scopeKey = SCOPE_KEY[input.scopeType];
  if (scopeKey && !input[scopeKey]) {
    return { ok: false, error: `A ${SCOPE_LABELS[input.scopeType].toLowerCase()} rule needs a ${input.scopeType} selected.` };
  }

  if (input.commissionType === "fixed") {
    if (input.fixedAmount <= 0) return { ok: false, error: "Fixed amount must be greater than 0." };
  } else if (input.commissionType === "percentage") {
    if (input.percentageRate <= 0) return { ok: false, error: "Percentage rate must be greater than 0." };
    if (input.percentageRate > 100) return { ok: false, error: "Percentage rate cannot exceed 100." };
  } else {
    const bracketError = validateBrackets(input.tieredConfig);
    if (bracketError) return { ok: false, error: bracketError };
  }

  if (input.minAmount < 0) return { ok: false, error: "Minimum payout cannot be negative." };
  if (input.maxAmount !== null) {
    if (input.maxAmount <= 0) return { ok: false, error: "Maximum payout must be greater than 0." };
    if (input.maxAmount < input.minAmount) {
      return { ok: false, error: "Maximum payout cannot be below the minimum payout." };
    }
  }

  if (input.validFrom && input.validUntil && new Date(input.validFrom) > new Date(input.validUntil)) {
    return { ok: false, error: "Valid-from date must be before valid-until." };
  }

  return { ok: true, value: input };
}

/** Map a validated rule onto the `commission_rules` column names. */
export function toCommissionRuleRow(input: CommissionRuleInput): Record<string, unknown> {
  return {
    name: input.name,
    description: input.description,
    scope_type: input.scopeType,
    service_id: input.scopeType === "service" ? input.serviceId : null,
    agency_partner_id: input.scopeType === "partner" ? input.agencyPartnerId : null,
    tier_id: input.scopeType === "tier" ? input.tierId : null,
    campaign_code: input.scopeType === "campaign" ? input.campaignCode : null,
    commission_type: input.commissionType,
    fixed_amount: input.commissionType === "fixed" ? input.fixedAmount : 0,
    percentage_rate: input.commissionType === "percentage" ? input.percentageRate : 0,
    tiered_config: input.commissionType === "tiered" ? input.tieredConfig : [],
    min_amount: input.minAmount,
    max_amount: input.maxAmount,
    is_active: input.isActive,
    priority: input.priority,
    valid_from: input.validFrom,
    valid_until: input.validUntil,
  };
}

/**
 * Human summary of what a rule pays, for the admin list.
 */
export function describeCommissionRule(rule: {
  commission_type?: unknown;
  fixed_amount?: unknown;
  percentage_rate?: unknown;
  tiered_config?: unknown;
}): string {
  const type = String(rule.commission_type ?? "fixed");
  if (type === "percentage") return `${num(rule.percentage_rate)}% of sale`;
  if (type === "tiered") {
    const slabs = Array.isArray(rule.tiered_config) ? rule.tiered_config.length : 0;
    return `${slabs} slab${slabs === 1 ? "" : "s"}`;
  }
  return `₹${num(rule.fixed_amount).toLocaleString("en-IN")} flat`;
}

/**
 * Whether the rule set can pay anything at all.
 *
 * Without an active global rule, any sale that misses every scoped rule earns
 * nothing and writes no commission row — the exact failure that left partners
 * unpaid — so the admin screen warns on it rather than looking healthy.
 */
export function hasGlobalFallback(
  rules: Array<{ scope_type?: unknown; is_active?: unknown }>,
): boolean {
  return rules.some((rule) => String(rule.scope_type) === "global" && rule.is_active !== false);
}
