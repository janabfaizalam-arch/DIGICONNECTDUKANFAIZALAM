import { describe, expect, it } from "vitest";

import {
  assessPaymentHealth,
  isLiveKey,
  isTestKey,
  type PaymentDiagnosticsInput,
} from "@/lib/admin/payment-diagnostics-core";

const now = new Date("2026-11-19T12:00:00Z");

const healthy: PaymentDiagnosticsInput = {
  keyId: "rzp_live_U1aPkH55qAEZZ6",
  keySecretConfigured: true,
  webhookSecretConfigured: true,
  lastWebhookAt: "2026-11-19T11:44:00Z",
  stuckAuthorized: 0,
  recentOrdersStarted: 6,
  recentPaymentsCaptured: 4,
  paidMissingInvoice: 0,
  paidMissingWalletDebit: 0,
  paidMissingCashback: 0,
  now,
};

describe("key recognition", () => {
  it("tells a live key from a test key", () => {
    expect(isLiveKey("rzp_live_U1aPkH55qAEZZ6")).toBe(true);
    expect(isTestKey("rzp_live_U1aPkH55qAEZZ6")).toBe(false);
    expect(isTestKey("rzp_test_abc123")).toBe(true);
    expect(isLiveKey(null)).toBe(false);
  });
});

describe("assessPaymentHealth", () => {
  it("is happy when money flows and settles", () => {
    expect(assessPaymentHealth(healthy).severity).toBe("ok");
  });

  it("calls out a missing key pair before anything else", () => {
    const verdict = assessPaymentHealth({ ...healthy, keyId: null, keySecretConfigured: false });
    expect(verdict.severity).toBe("misconfigured");
    expect(verdict.headline).toContain("not configured");
  });

  it("calls out a test key, which takes no real money", () => {
    const verdict = assessPaymentHealth({ ...healthy, keyId: "rzp_test_abc123" });
    expect(verdict.severity).toBe("misconfigured");
    expect(verdict.headline).toContain("test payments");
  });

  it("calls out a missing webhook secret, which rejects every delivery", () => {
    const verdict = assessPaymentHealth({ ...healthy, webhookSecretConfigured: false });
    expect(verdict.severity).toBe("misconfigured");
    expect(verdict.headline).toContain("webhook secret");
  });

  it("notices orders happening while no webhook has arrived in over a week", () => {
    const verdict = assessPaymentHealth({ ...healthy, lastWebhookAt: "2026-11-01T10:00:00Z" });
    expect(verdict.severity).toBe("blind");
    // This is the shape of a key and webhook belonging to different accounts.
    expect(verdict.nextSteps.join(" ")).toContain("same Razorpay account");
  });

  it("does not cry about a quiet webhook when nothing was ordered", () => {
    const verdict = assessPaymentHealth({
      ...healthy,
      lastWebhookAt: null,
      recentOrdersStarted: 0,
      recentPaymentsCaptured: 0,
    });
    expect(verdict.severity).toBe("idle");
  });

  it("flags payments left on hold rather than captured", () => {
    const verdict = assessPaymentHealth({ ...healthy, stuckAuthorized: 1 });
    expect(verdict.severity).toBe("warn");
    expect(verdict.headline).toContain("1 payment authorized");
    expect(verdict.nextSteps.join(" ")).toContain("Automatic");
  });

  it("uses plural wording for several held payments", () => {
    expect(assessPaymentHealth({ ...healthy, stuckAuthorized: 3 }).headline).toContain("3 payments authorized");
  });

  it("reports settlement gaps once the config itself is sound", () => {
    const verdict = assessPaymentHealth({ ...healthy, paidMissingInvoice: 6 });
    expect(verdict.severity).toBe("warn");
    expect(verdict.headline).toContain("never finished settling");
  });

  it("ranks a broken config above a settlement gap", () => {
    // Both are true; the one that stops money arriving has to be said first.
    const verdict = assessPaymentHealth({
      ...healthy,
      keyId: "rzp_test_abc123",
      paidMissingInvoice: 6,
    });
    expect(verdict.headline).toContain("test payments");
  });
});
