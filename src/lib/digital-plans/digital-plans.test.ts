import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildComparison } from "./comparison";
import { DEFAULT_ADDONS, DEFAULT_PLANS } from "./defaults";
import { formatAddonPrice, formatPaise, formatPrice, gstOn, paiseToRupeesInput, quoteTotals, rupeesToPaise } from "./money";
import { enquiryInputSchema, planInputSchema, quoteInputSchema } from "./schema";

const plan = (slug: string) => DEFAULT_PLANS.find((p) => p.slug === slug)!;

describe("shipped package prices", () => {
  it.each([
    ["launch", "Launch", 999, 2999, false],
    ["business-plus", "Business Plus", 1999, 4999, false],
    ["growth-pro", "Growth Pro", 3999, 9999, false],
    ["commerce-pro", "Commerce Pro", 7999, 14999, false],
    ["enterprise-360", "Enterprise 360", 14999, 29999, true],
  ])("%s is ₹%s/month + ₹%s setup", (slug, name, monthly, setup, starting) => {
    const p = plan(slug);
    expect(p.name).toBe(name);
    expect(p.monthlyPricePaise).toBe(monthly * 100);
    expect(p.setupFeePaise).toBe(setup * 100);
    expect(p.priceIsStarting).toBe(starting);
    expect(Number.isInteger(p.monthlyPricePaise) && Number.isInteger(p.setupFeePaise)).toBe(true);
  });

  it("recommends exactly one plan, Growth Pro", () => {
    expect(DEFAULT_PLANS.filter((p) => p.isRecommended).map((p) => p.slug)).toEqual(["growth-pro"]);
  });

  it("features Launch, Growth Pro and Enterprise 360 on the homepage", () => {
    expect(DEFAULT_PLANS.filter((p) => p.featuredOnHomepage).map((p) => p.slug)).toEqual(["launch", "growth-pro", "enterprise-360"]);
  });

  it("puts every website plan on a 12-month minimum commitment", () => {
    for (const p of DEFAULT_PLANS) expect(p.commitmentMonths).toBe(12);
  });

  it("never claims unlimited work", () => {
    expect(JSON.stringify({ DEFAULT_PLANS, DEFAULT_ADDONS })).not.toMatch(/unlimited/i);
  });

  it("passes the admin validation it will be edited with", () => {
    for (const p of DEFAULT_PLANS) {
      const result = planInputSchema.safeParse({ ...p, isActive: true });
      expect(result.success, `${p.slug}: ${result.success ? "" : result.error.issues[0]?.message}`).toBe(true);
    }
  });

  it("links plans only to add-ons that exist", () => {
    const slugs = new Set(DEFAULT_ADDONS.map((a) => a.slug));
    for (const p of DEFAULT_PLANS) for (const s of p.addonSlugs) expect(slugs.has(s), `${p.slug} → ${s}`).toBe(true);
  });
});

describe("add-on prices", () => {
  it.each([
    ["additional-page", 999, "per_page", false, "₹999/page"],
    ["logo-design", 1999, "one_time", true, "₹1,999 onwards"],
    ["meta-pixel-setup", 1499, "one_time", false, "₹1,499"],
    ["google-analytics-setup", 999, "one_time", false, "₹999"],
    ["advanced-seo-setup", 4999, "one_time", true, "₹4,999 onwards"],
    ["blog-management", 1499, "monthly", false, "₹1,499/month"],
    ["social-media-management", 4999, "monthly", false, "₹4,999/month"],
    ["meta-ads-management", 3999, "monthly", false, "₹3,999/month"],
    ["whatsapp-automation", 2999, "one_time", true, "₹2,999 onwards"],
    ["additional-product-upload", 30, "per_product", false, "₹30/product"],
  ])("%s", (slug, rupees, unit, starting, label) => {
    const addon = DEFAULT_ADDONS.find((a) => a.slug === slug)!;
    expect(addon.pricePaise).toBe(Number(rupees) * 100);
    expect(addon.unit).toBe(unit);
    expect(addon.priceIsStarting).toBe(starting);
    expect(formatAddonPrice(addon.pricePaise, addon.unit, addon.priceIsStarting)).toBe(label);
  });

  it("says the Meta ad budget is separate", () => {
    expect(DEFAULT_ADDONS.find((a) => a.slug === "meta-ads-management")!.note).toMatch(/budget is separate/i);
  });
});

describe("money", () => {
  it("formats paise in Indian grouping", () => {
    expect(formatPaise(99900)).toBe("₹999");
    expect(formatPaise(1499900)).toBe("₹14,999");
    expect(formatPaise(10000000)).toBe("₹1,00,000");
    expect(formatPaise(12345)).toBe("₹123.45");
    expect(formatPrice(1499900, true)).toBe("₹14,999 onwards");
  });

  it("parses rupee input to paise without floats", () => {
    expect(rupeesToPaise("1,999")).toBe(199900);
    expect(rupeesToPaise("₹ 999.5")).toBe(99950);
    expect(rupeesToPaise("0.10")).toBe(10);
    expect(rupeesToPaise(30)).toBe(3000);
    expect(rupeesToPaise("-5")).toBeNull();
    expect(rupeesToPaise("12.345")).toBeNull();
    expect(rupeesToPaise("abc")).toBeNull();
    expect(paiseToRupeesInput(99950)).toBe("999.50");
    expect(paiseToRupeesInput(99900)).toBe("999");
  });

  it("works out GST and the first payment of a quotation", () => {
    expect(gstOn(99900, 18)).toBe(17982);
    const totals = quoteTotals({
      monthlyPaise: 399900,
      setupPaise: 999900,
      lines: [
        { label: "Logo", amountPaise: 199900, unit: "one_time" },
        { label: "Blog", amountPaise: 149900, unit: "monthly" },
      ],
      gstPercent: 18,
      commitmentMonths: 12,
    });
    expect(totals.oneTimePaise).toBe(1199800);
    expect(totals.monthlyPaise).toBe(549800);
    expect(totals.oneTimeGstPaise).toBe(215964);
    expect(totals.monthlyGstPaise).toBe(98964);
    expect(totals.firstPaymentPaise).toBe(1199800 + 215964 + 549800 + 98964);
    expect(totals.commitmentValuePaise).toBe(1199800 + 549800 * 12);
  });

  it("setup + first month for every shipped plan", () => {
    const expected: Record<string, number> = {
      launch: 2999 + 999,
      "business-plus": 4999 + 1999,
      "growth-pro": 9999 + 3999,
      "commerce-pro": 14999 + 7999,
      "enterprise-360": 29999 + 14999,
    };
    for (const p of DEFAULT_PLANS) {
      const t = quoteTotals({ monthlyPaise: p.monthlyPricePaise, setupPaise: p.setupFeePaise, gstPercent: 0, commitmentMonths: 12 });
      expect(t.firstPaymentPaise).toBe(expected[p.slug] * 100);
    }
  });
});

describe("comparison table", () => {
  const plans = DEFAULT_PLANS.map((p) => ({ features: p.features }));
  const groups = buildComparison(plans);
  const row = (key: string) => groups.flatMap((g) => g.rows).find((r) => r.key === key)!;

  it("has one column per plan in every row", () => {
    for (const g of groups) for (const r of g.rows) expect(r.cells).toHaveLength(DEFAULT_PLANS.length);
  });

  it("shows page limits per plan", () => {
    expect(row("pages").cells.map((c) => (c.included ? c.value : null))).toEqual(["Up to 5", "Up to 10", "Up to 20", "Store pages", "As scoped"]);
  });

  it("only marks e-commerce on Commerce Pro", () => {
    expect(row("ecommerce").cells.map((c) => c.included)).toEqual([false, false, false, true, false]);
  });

  it("marks a feature as missing rather than inventing it", () => {
    expect(row("crm").cells.map((c) => c.included)).toEqual([false, false, false, false, true]);
    expect(row("social_creatives").cells.map((c) => (c.included ? c.value : "—"))).toEqual(["—", "—", "Up to 8 / month", "—", "Up to 12 / month"]);
  });

  it("gives SSL to every plan", () => {
    expect(row("ssl").cells.every((c) => c.included)).toBe(true);
  });
});

describe("validation", () => {
  it("normalises an Indian mobile and rejects bad ones", () => {
    const base = { planSlug: "launch", name: "Asha", email: "", businessName: "", requirements: "" };
    const ok = enquiryInputSchema.safeParse({ ...base, mobile: "+91 98765 43210" });
    expect(ok.success && ok.data.mobile).toBe("9876543210");
    expect(enquiryInputSchema.safeParse({ ...base, mobile: "12345" }).success).toBe(false);
    expect(enquiryInputSchema.safeParse({ ...base, mobile: "9876543210", website: "spam" }).success).toBe(false);
    expect(enquiryInputSchema.safeParse({ ...base, mobile: "9876543210", email: "not-an-email" }).success).toBe(false);
  });

  it("rejects duplicate feature keys and fractional paise", () => {
    const p = { ...plan("launch"), isActive: true };
    expect(planInputSchema.safeParse({ ...p, features: [p.features[0], p.features[0]] }).success).toBe(false);
    expect(planInputSchema.safeParse({ ...p, monthlyPricePaise: 999.5 }).success).toBe(false);
    expect(planInputSchema.safeParse({ ...p, monthlyPricePaise: -1 }).success).toBe(false);
  });

  it("requires a valid quotation", () => {
    const q = { monthlyPaise: 399900, setupPaise: 999900, lines: [], gstPercent: 18, commitmentMonths: 12, notes: "", validUntil: "2026-12-31" };
    expect(quoteInputSchema.safeParse(q).success).toBe(true);
    expect(quoteInputSchema.safeParse({ ...q, gstPercent: 40 }).success).toBe(false);
    expect(quoteInputSchema.safeParse({ ...q, validUntil: "31/12/2026" }).success).toBe(false);
  });
});

describe("seed migration matches the shipped defaults", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261107120100_digital_plans_seed.sql"), "utf8");

  it("inserts every plan at its shipped price", () => {
    for (const p of DEFAULT_PLANS) {
      expect(sql).toContain(`values ('${p.slug}', '${p.name}'`);
      expect(sql).toMatch(new RegExp(`'${p.slug}'[^\\n]*, ${p.monthlyPricePaise}, ${p.setupFeePaise}, ${p.priceIsStarting}`));
      for (const f of p.features) expect(sql).toContain(`'${f.key}'`);
    }
  });

  it("inserts every add-on at its shipped price", () => {
    for (const a of DEFAULT_ADDONS) expect(sql).toContain(`('${a.slug}', '${a.name}'`);
    for (const a of DEFAULT_ADDONS) expect(sql).toMatch(new RegExp(`'${a.slug}'[^\\n]*, ${a.pricePaise}, '${a.unit}'`));
  });

  it("never overwrites prices an admin has edited", () => {
    const inserts = sql.split("\n").filter((line) => line.startsWith("insert"));
    expect(inserts.every((line) => /on conflict .*do nothing;$/.test(line))).toBe(true);
  });
});
