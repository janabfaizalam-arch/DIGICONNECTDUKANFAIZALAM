import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  COMMISSION_SCOPE_TYPES,
  COMMISSION_TYPES,
  describeCommissionRule,
  hasGlobalFallback,
  SCOPE_PRIORITY_ORDER,
  toCommissionRuleRow,
  validateCommissionRule,
} from "@/lib/commission-rules";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

function baseRule(overrides: Record<string, unknown> = {}) {
  return {
    name: "Global 10%",
    scopeType: "global",
    commissionType: "percentage",
    percentageRate: 10,
    ...overrides,
  };
}

describe("commission rule vocabulary", () => {
  it("matches the commission_rules check constraints", () => {
    // Drift here means the admin form offers a value the database will reject.
    const migration = readSrc("supabase/migrations/20260527140000_agency_partner_ecosystem.sql");
    const block = migration.slice(migration.indexOf("create table if not exists public.commission_rules"));
    for (const scope of COMMISSION_SCOPE_TYPES) {
      expect(block).toContain(`'${scope}'`);
    }
    for (const type of COMMISSION_TYPES) {
      expect(block).toContain(`'${type}'`);
    }
  });

  it("orders scopes the way calculateCommission matches them", () => {
    // The engine tries partner, then campaign, service, tier, and finally
    // global. The admin list sorts by this, so a mismatch would show rules in
    // an order that misrepresents which one actually wins.
    expect(SCOPE_PRIORITY_ORDER).toEqual(["partner", "campaign", "service", "tier", "global"]);

    const engine = readSrc("src/lib/ap-commission-engine.ts");
    const matcher = engine.slice(engine.indexOf("const matchingRule ="), engine.indexOf("if (!matchingRule)"));
    const seen = SCOPE_PRIORITY_ORDER.map((scope) => matcher.indexOf(`"${scope}"`));
    expect(seen.every((index) => index >= 0)).toBe(true);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });
});

describe("validateCommissionRule rejects rules that would pay nothing", () => {
  it("accepts a well-formed percentage rule", () => {
    const result = validateCommissionRule(baseRule());
    expect(result.ok).toBe(true);
  });

  it("requires a name", () => {
    const result = validateCommissionRule(baseRule({ name: "  " }));
    expect(result).toMatchObject({ ok: false });
  });

  it("rejects a zero rate", () => {
    // The whole bug: a rule that exists, looks configured, and prices every
    // sale at zero — which writes no commission row at all.
    expect(validateCommissionRule(baseRule({ percentageRate: 0 })).ok).toBe(false);
    expect(validateCommissionRule(baseRule({ commissionType: "fixed", fixedAmount: 0 })).ok).toBe(false);
  });

  it("rejects a rate above 100%", () => {
    expect(validateCommissionRule(baseRule({ percentageRate: 101 })).ok).toBe(false);
  });

  it("rejects a scoped rule with no target", () => {
    // A partner rule with no partner can never match, so it would sit in the
    // table looking configured while every sale falls straight past it.
    expect(validateCommissionRule(baseRule({ scopeType: "partner" })).ok).toBe(false);
    expect(validateCommissionRule(baseRule({ scopeType: "service" })).ok).toBe(false);
    expect(validateCommissionRule(baseRule({ scopeType: "tier" })).ok).toBe(false);
    expect(validateCommissionRule(baseRule({ scopeType: "campaign" })).ok).toBe(false);

    expect(
      validateCommissionRule(baseRule({ scopeType: "partner", agencyPartnerId: "1a2b" })).ok,
    ).toBe(true);
  });

  it("rejects a max payout below the min", () => {
    expect(validateCommissionRule(baseRule({ minAmount: 500, maxAmount: 100 })).ok).toBe(false);
  });

  it("rejects an inverted validity window", () => {
    expect(
      validateCommissionRule(baseRule({ validFrom: "2026-09-01", validUntil: "2026-08-01" })).ok,
    ).toBe(false);
  });
});

describe("tiered slabs", () => {
  const tiered = (config: unknown) =>
    validateCommissionRule(baseRule({ commissionType: "tiered", tieredConfig: config }));

  it("accepts non-overlapping slabs", () => {
    expect(
      tiered([
        { min: 0, max: 10000, rate: 8 },
        { min: 10001, max: 50000, rate: 12 },
      ]).ok,
    ).toBe(true);
  });

  it("rejects an empty slab list", () => {
    expect(tiered([]).ok).toBe(false);
  });

  it("rejects overlapping slabs", () => {
    // calculateTieredAmount takes the first containing slab, so an overlap
    // silently pays the lower rate.
    expect(
      tiered([
        { min: 0, max: 10000, rate: 8 },
        { min: 5000, max: 50000, rate: 12 },
      ]).ok,
    ).toBe(false);
  });

  it("rejects a slab that pays nothing", () => {
    expect(tiered([{ min: 0, max: 10000, rate: 0 }]).ok).toBe(false);
    expect(tiered([{ min: 0, max: 10000, rate: 0, fixed: 250 }]).ok).toBe(true);
  });

  it("rejects a slab whose max is not above its min", () => {
    expect(tiered([{ min: 5000, max: 5000, rate: 10 }]).ok).toBe(false);
  });
});

describe("toCommissionRuleRow", () => {
  it("clears the scope keys that do not belong to the chosen scope", () => {
    // Otherwise a rule edited from partner to global keeps its old partner id
    // and the row misreports what it applies to.
    const result = validateCommissionRule(
      baseRule({ scopeType: "global", agencyPartnerId: "stale", serviceId: "stale", tierId: "stale" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const row = toCommissionRuleRow(result.value);
    expect(row.agency_partner_id).toBeNull();
    expect(row.service_id).toBeNull();
    expect(row.tier_id).toBeNull();
    expect(row.campaign_code).toBeNull();
  });

  it("zeroes the amount fields of the other commission types", () => {
    const result = validateCommissionRule(baseRule({ commissionType: "fixed", fixedAmount: 500 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const row = toCommissionRuleRow(result.value);
    expect(row.fixed_amount).toBe(500);
    expect(row.percentage_rate).toBe(0);
    expect(row.tiered_config).toEqual([]);
  });
});

describe("hasGlobalFallback", () => {
  it("is false for an empty rule set", () => {
    // The state the table shipped in — and the reason every sale paid zero.
    expect(hasGlobalFallback([])).toBe(false);
  });

  it("ignores an inactive global rule", () => {
    expect(hasGlobalFallback([{ scope_type: "global", is_active: false }])).toBe(false);
  });

  it("does not count scoped rules as cover", () => {
    expect(hasGlobalFallback([{ scope_type: "partner", is_active: true }])).toBe(false);
    expect(hasGlobalFallback([{ scope_type: "global", is_active: true }])).toBe(true);
  });
});

describe("describeCommissionRule", () => {
  it("summarises each commission type", () => {
    expect(describeCommissionRule({ commission_type: "percentage", percentage_rate: 12 })).toBe("12% of sale");
    expect(describeCommissionRule({ commission_type: "fixed", fixed_amount: 500 })).toContain("500");
    expect(
      describeCommissionRule({ commission_type: "tiered", tiered_config: [{}, {}] }),
    ).toBe("2 slabs");
  });
});

describe("the payout chain is reachable from the admin UI", () => {
  it("exposes a screen that can write commission_rules", () => {
    // Before this, commission_rules was read-only in the app: the engine and
    // the AP transition route both read it, nothing wrote it, and no migration
    // seeded it, so no sale could ever price above zero.
    const route = readSrc("src/app/api/admin/commission-rules/route.ts");
    expect(route).toContain("from(\"commission_rules\")");
    expect(route).toContain(".insert(");

    const nav = readSrc("src/lib/admin/nav.ts");
    expect(nav).toContain("/admin/commission-rules");
  });

  it("points the dashboard's partner-commission tile at the wallet-crediting screen", () => {
    // /admin/commissions drives the legacy `commissions` table and never
    // touches a partner wallet, so approving there moved no money.
    const dashboard = readSrc("src/lib/admin/dashboard-data.ts");
    const tile = dashboard.slice(dashboard.indexOf('metric("partner_commission"'));
    expect(tile.slice(0, 300)).toContain("/admin/ap-commissions");
  });

  it("warns instead of silently skipping a zero-priced commission", () => {
    const engine = readSrc("src/lib/ap-commission-engine.ts");
    const block = engine.slice(engine.indexOf("if (calc.amount <= 0)"));
    expect(block.slice(0, 800)).toContain("zero_commission_not_recorded");
  });

  it("backfills the rules table from the config the admin already entered", () => {
    const migration = readSrc("supabase/migrations/20260818120000_commission_rules_backfill.sql");
    expect(migration).toContain("public.agency_partners");
    expect(migration).toContain("public.agency_partner_tiers");
    expect(migration).toContain("'global'");
    // Re-running a money migration must not double-insert.
    expect(migration).toContain("not exists");
  });
});
