import { describe, expect, it } from "vitest";

import { mapPaymentStatus, safeRazorpayId } from "@/lib/payments/razorpay-events";

describe("mapPaymentStatus", () => {
  it("marks a captured payment verified", () => {
    expect(mapPaymentStatus("payment.captured", "captured")).toBe("verified");
    expect(mapPaymentStatus(undefined, "captured")).toBe("verified");
  });

  it("never treats an authorized payment as verified", () => {
    // An authorization is a hold that lapses if it is never captured, so on its
    // own it must not mark anything paid.
    expect(mapPaymentStatus("payment.authorized", "authorized")).toBe("pending");
    expect(mapPaymentStatus(undefined, "authorized")).toBe("pending");
  });

  it("marks failures failed, even on a captured-looking status", () => {
    expect(mapPaymentStatus("payment.failed", "failed")).toBe("failed");
    expect(mapPaymentStatus("payment.failed", "captured")).toBe("failed");
  });

  it("falls back to pending for anything unknown", () => {
    expect(mapPaymentStatus("order.paid", "created")).toBe("pending");
    expect(mapPaymentStatus(undefined, undefined)).toBe("pending");
  });
});

describe("safeRazorpayId", () => {
  it("accepts real Razorpay ids", () => {
    expect(safeRazorpayId("pay_MkJ8s9TzQ1aBcD")).toBe("pay_MkJ8s9TzQ1aBcD");
    expect(safeRazorpayId("  order_MkJ8s9TzQ1aBcD  ")).toBe("order_MkJ8s9TzQ1aBcD");
  });

  it("rejects anything that could alter a query filter", () => {
    expect(safeRazorpayId("pay_1,razorpay_order_id.eq.x")).toBeNull();
    expect(safeRazorpayId("pay_1)")).toBeNull();
    expect(safeRazorpayId("pay 1")).toBeNull();
    expect(safeRazorpayId("")).toBeNull();
    expect(safeRazorpayId(null)).toBeNull();
    expect(safeRazorpayId("p".repeat(65))).toBeNull();
  });
});
