import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  evaluateCoupon,
  messageForCouponFailure,
  reasonFromRedeemError,
  type CouponRules,
} from "@/lib/coupons-core";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

const NOW = new Date("2026-08-13T00:00:00Z").getTime();

const coupon = (over: Partial<CouponRules> = {}): CouponRules => ({
  code: "SAVE100",
  discountType: "fixed",
  discountValue: 100,
  applicableService: "All",
  active: true,
  usedCount: 0,
  ...over,
});

describe("discount calculation", () => {
  it("applies a fixed discount", () => {
    expect(evaluateCoupon({ coupon: coupon(), amount: 500, now: NOW }).discountAmount).toBe(100);
  });

  it("applies a percentage discount", () => {
    const result = evaluateCoupon({
      coupon: coupon({ discountType: "percentage", discountValue: 10 }),
      amount: 850,
      now: NOW,
    });
    expect(result.discountAmount).toBe(85);
  });

  it("caps at maxDiscount", () => {
    const result = evaluateCoupon({
      coupon: coupon({ discountType: "percentage", discountValue: 50, maxDiscount: 200 }),
      amount: 1000,
      now: NOW,
    });
    expect(result.discountAmount).toBe(200);
  });

  it("never discounts more than the order is worth", () => {
    // Otherwise a ₹5000 coupon on a ₹500 order produces a negative payable.
    const result = evaluateCoupon({ coupon: coupon({ discountValue: 5000 }), amount: 500, now: NOW });
    expect(result.discountAmount).toBe(500);
  });

  it("never returns a negative discount", () => {
    const result = evaluateCoupon({ coupon: coupon({ maxDiscount: -50 }), amount: 500, now: NOW });
    expect(result.discountAmount).toBe(0);
  });
});

describe("eligibility", () => {
  it("rejects an unknown or inactive coupon", () => {
    expect(evaluateCoupon({ coupon: null, amount: 500, now: NOW }).reason).toBe("coupon_not_found");
    expect(evaluateCoupon({ coupon: coupon({ active: false }), amount: 500, now: NOW }).reason).toBe(
      "coupon_inactive",
    );
  });

  it("honours start and expiry dates", () => {
    expect(
      evaluateCoupon({ coupon: coupon({ startDate: "2026-09-01" }), amount: 500, now: NOW }).reason,
    ).toBe("coupon_not_started");
    expect(
      evaluateCoupon({ coupon: coupon({ expiryDate: "2026-08-01" }), amount: 500, now: NOW }).reason,
    ).toBe("coupon_expired");
  });

  it("treats an unparseable expiry as expired, not as no expiry", () => {
    // Failing open on a malformed date would hand out an unbounded discount.
    expect(
      evaluateCoupon({ coupon: coupon({ expiryDate: "not-a-date" }), amount: 500, now: NOW }).reason,
    ).toBe("coupon_expired");
  });

  it("restricts a service-specific coupon to that service", () => {
    const gstOnly = coupon({ applicableService: "gst-registration" });
    expect(evaluateCoupon({ coupon: gstOnly, amount: 500, serviceSlug: "itr-filing", now: NOW }).reason).toBe(
      "coupon_wrong_service",
    );
    expect(
      evaluateCoupon({ coupon: gstOnly, amount: 500, serviceSlug: "gst-registration", now: NOW }).valid,
    ).toBe(true);
    // No service supplied is not a free pass.
    expect(evaluateCoupon({ coupon: gstOnly, amount: 500, now: NOW }).valid).toBe(false);
  });

  it("lets an All coupon through regardless of service", () => {
    expect(evaluateCoupon({ coupon: coupon(), amount: 500, serviceSlug: "anything", now: NOW }).valid).toBe(
      true,
    );
  });

  it("enforces the minimum order amount", () => {
    const result = evaluateCoupon({ coupon: coupon({ minOrderAmount: 1000 }), amount: 500, now: NOW });
    expect(result.reason).toBe("coupon_min_order");
    expect(result.message).toContain("1000");
  });

  it("enforces the total usage limit", () => {
    expect(
      evaluateCoupon({ coupon: coupon({ usageLimit: 100, usedCount: 100 }), amount: 500, now: NOW }).reason,
    ).toBe("coupon_usage_limit_reached");
    expect(
      evaluateCoupon({ coupon: coupon({ usageLimit: 100, usedCount: 99 }), amount: 500, now: NOW }).valid,
    ).toBe(true);
  });

  it("enforces the per-user limit that was previously ignored", () => {
    // This value was collected in the admin form and shown in the table, but
    // no code read it — one customer could reuse a coupon on every order.
    const once = coupon({ perUserUsageLimit: 1 });
    expect(evaluateCoupon({ coupon: once, amount: 500, userUses: 1, now: NOW }).reason).toBe(
      "coupon_user_limit_reached",
    );
    expect(evaluateCoupon({ coupon: once, amount: 500, userUses: 0, now: NOW }).valid).toBe(true);
  });
});

describe("redeem errors", () => {
  it("maps a Postgres exception back to a customer message", () => {
    expect(reasonFromRedeemError({ message: 'P0001: coupon_usage_limit_reached' })).toBe(
      "coupon_usage_limit_reached",
    );
    expect(reasonFromRedeemError({ message: "coupon_user_limit_reached" })).toBe("coupon_user_limit_reached");
    expect(reasonFromRedeemError({ message: "some unrelated failure" })).toBeNull();
    expect(reasonFromRedeemError(null)).toBeNull();
  });

  it("has a message for every reason", () => {
    for (const reason of [
      "coupon_not_found",
      "coupon_inactive",
      "coupon_not_started",
      "coupon_expired",
      "coupon_min_order",
      "coupon_wrong_service",
      "coupon_usage_limit_reached",
      "coupon_user_limit_reached",
    ] as const) {
      expect(messageForCouponFailure(reason).length).toBeGreaterThan(10);
    }
  });
});

describe("redemption is atomic in the database", () => {
  const migration = readSrc("supabase/migrations/20260813060000_coupons_store.sql");

  it("locks the coupon row before re-checking limits", () => {
    // Checking in application code and then writing is a race: two concurrent
    // checkouts both read used_count = 99 against a limit of 100.
    expect(migration).toMatch(/select \* into v_coupon from public\.coupons where code = p_code for update/);
    expect(migration).toMatch(/v_coupon\.used_count >= v_coupon\.usage_limit/);
  });

  it("increments used_count in the same transaction", () => {
    expect(migration).toMatch(/set used_count = used_count \+ 1/);
  });

  it("cannot consume a coupon twice for the same order", () => {
    // Payment callbacks retry.
    expect(migration).toMatch(/coupon_redemptions_code_order_idx/);
    expect(migration).toMatch(/when unique_violation then/);
  });

  it("keeps coupon codes unreadable by customers", () => {
    // A public read policy would let anyone enumerate unused codes.
    expect(migration).toMatch(/coupons_deny_all[\s\S]{0,120}using \(false\)/);
  });
});

describe("checkout wiring", () => {
  const applications = readSrc("src/app/api/applications/route.ts");
  const createOrder = readSrc("src/app/api/create-order/route.ts");
  const validate = readSrc("src/app/api/coupons/validate/route.ts");

  it("checks coupons against the database, not the JSON file", () => {
    for (const [name, source] of [
      ["applications", applications],
      ["create-order", createOrder],
      ["validate", validate],
    ] as const) {
      expect(source, name).toContain("coupons-store");
      expect(source, name).not.toMatch(/from "@\/lib\/coupons"/);
    }
  });

  it("consumes the coupon only once the applications exist", () => {
    // Redeeming when the Razorpay order is created would spend the coupon on
    // checkouts the customer abandons.
    expect(applications).toContain("redeemCoupon");
    expect(createOrder).not.toContain("redeemCoupon");
    // Compare the call site, not the import at the top of the file.
    expect(applications.indexOf("await redeemCoupon({")).toBeGreaterThan(
      applications.indexOf(".insert(applicationsToInsert)"),
    );
  });

  it("does not strand a paid customer when redemption fails", () => {
    // The money has moved and the applications exist by this point.
    const block = applications.slice(applications.indexOf("if (!redemption.ok)"));
    expect(block.slice(0, 400)).toContain("coupon_redeem_failed");
    expect(block.slice(0, 400)).not.toMatch(/return jsonError/);
  });

  it("takes the customer identity from the session, not the request", () => {
    // The endpoint used to read userId from the body, so anyone could pass a
    // stranger's id — or omit it — to dodge the per-customer limit.
    expect(validate).toContain("getCurrentUser");
    expect(validate).not.toMatch(/body\?\.userId/);
    expect(validate).not.toMatch(/searchParams\.get\("userId"\)/);
  });
});
