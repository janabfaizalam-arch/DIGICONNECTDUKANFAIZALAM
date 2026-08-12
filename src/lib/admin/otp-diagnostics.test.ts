import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { flattenAdminNav } from "@/lib/admin/nav";
import {
  assessOtpHealth,
  classifyOtpAttempt,
  summariseOtpAttempts,
} from "@/lib/admin/otp-diagnostics-core";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

const HEALTHY_CONFIG = {
  apiKeyConfigured: true,
  signupCampaignConfigured: true,
  webhookSecretConfigured: true,
};

describe("classifying an OTP attempt", () => {
  it("does not call an accepted submit a delivery", () => {
    // This is the whole point: our DB writes delivery_status "sent" the moment
    // AiSensy accepts, long before WhatsApp has done anything.
    const result = classifyOtpAttempt({ delivery_status: "sent" });
    expect(result.verdict).toBe("accepted_only");
    expect(result.unknownDelivery).toBe(true);
    expect(result.label).not.toMatch(/delivered/i);
  });

  it("trusts the delivery webhook over our own optimistic status", () => {
    const result = classifyOtpAttempt({
      delivery_status: "sent",
      provider_delivery_status: "failed",
      provider_delivery_error_code: "131047",
      provider_delivery_error: "Re-engagement message",
    });
    expect(result.verdict).toBe("failed_at_whatsapp");
    expect(result.unknownDelivery).toBe(false);
    expect(result.detail).toContain("131047");
  });

  it("treats read as delivered", () => {
    expect(classifyOtpAttempt({ provider_delivery_status: "read" }).verdict).toBe("delivered");
    expect(classifyOtpAttempt({ provider_delivery_status: "delivered" }).verdict).toBe("delivered");
  });

  it("separates an AiSensy refusal from a WhatsApp rejection", () => {
    const refused = classifyOtpAttempt({
      delivery_status: "failed",
      provider_code: "provider_rejected",
    });
    expect(refused.verdict).toBe("rejected_by_provider");
    expect(refused.verdict).not.toBe("failed_at_whatsapp");
  });

  it("survives junk metadata", () => {
    expect(classifyOtpAttempt(null).verdict).toBe("in_flight");
    expect(classifyOtpAttempt("nonsense").verdict).toBe("in_flight");
    expect(classifyOtpAttempt([]).verdict).toBe("in_flight");
    expect(classifyOtpAttempt({}).verdict).toBe("in_flight");
  });
});

describe("summarising attempts", () => {
  it("counts each verdict separately", () => {
    const summary = summariseOtpAttempts(
      [
        { delivery_status: "sent" },
        { delivery_status: "sent" },
        { provider_delivery_status: "delivered" },
        { provider_delivery_status: "failed" },
        { delivery_status: "failed" },
      ].map((metadata) => ({ classification: classifyOtpAttempt(metadata) })),
    );

    expect(summary).toEqual({
      total: 5,
      delivered: 1,
      failedAtWhatsapp: 1,
      rejectedByProvider: 1,
      acceptedOnly: 2,
    });
  });
});

describe("assessing overall health", () => {
  const empty = summariseOtpAttempts([]);

  it("reports missing configuration ahead of anything else", () => {
    const verdict = assessOtpHealth({
      ...HEALTHY_CONFIG,
      apiKeyConfigured: false,
      summary: empty,
    });
    expect(verdict.severity).toBe("misconfigured");
    expect(verdict.nextSteps.length).toBeGreaterThan(0);
  });

  it("names the blind spot when nothing can confirm delivery", () => {
    // Symptom the operator actually reports: "OTP nahi aa rahi", while every
    // internal signal says "sent". Without the webhook that cannot be resolved.
    const verdict = assessOtpHealth({
      ...HEALTHY_CONFIG,
      webhookSecretConfigured: false,
      summary: summariseOtpAttempts(
        [{ delivery_status: "sent" }, { delivery_status: "sent" }].map((metadata) => ({
          classification: classifyOtpAttempt(metadata),
        })),
      ),
    });

    expect(verdict.severity).toBe("blind");
    expect(verdict.explanation).toContain("AISENSY_WEBHOOK_SECRET");
    expect(verdict.nextSteps.some((step) => /wallet balance/i.test(step))).toBe(true);
    // Template status leads: a Rejected template is accepted by AiSensy and
    // silently discarded by WhatsApp, which is exactly this symptom.
    expect(verdict.nextSteps[0]).toMatch(/template/i);
  });

  it("calls out WhatsApp rejections as the top problem", () => {
    const verdict = assessOtpHealth({
      ...HEALTHY_CONFIG,
      summary: summariseOtpAttempts(
        [{ provider_delivery_status: "failed" }, { delivery_status: "sent" }].map((metadata) => ({
          classification: classifyOtpAttempt(metadata),
        })),
      ),
    });
    expect(verdict.severity).toBe("broken");
    // The message reached WhatsApp, so wallet balance cannot be the cause —
    // template status is what to check first.
    expect(verdict.nextSteps[0]).toMatch(/template/i);
    expect(verdict.nextSteps[0]).not.toMatch(/wallet/i);
  });

  it("only reports healthy when a delivery was actually confirmed", () => {
    const verdict = assessOtpHealth({
      ...HEALTHY_CONFIG,
      summary: summariseOtpAttempts(
        [{ provider_delivery_status: "delivered" }].map((metadata) => ({
          classification: classifyOtpAttempt(metadata),
        })),
      ),
    });
    expect(verdict.severity).toBe("ok");
    expect(verdict.nextSteps).toEqual([]);
  });

  it("never reports healthy from accepted submits alone", () => {
    const verdict = assessOtpHealth({
      ...HEALTHY_CONFIG,
      summary: summariseOtpAttempts(
        [{ delivery_status: "sent" }].map((metadata) => ({
          classification: classifyOtpAttempt(metadata),
        })),
      ),
    });
    expect(verdict.severity).not.toBe("ok");
  });
});

describe("admin OTP diagnostics screen", () => {
  it("is reachable from the admin nav", () => {
    expect(flattenAdminNav().map((item) => item.href)).toContain("/admin/diagnostics/otp");
  });

  it("is admin-guarded", () => {
    const page = readSrc("src/app/admin/diagnostics/otp/page.tsx");
    expect(page).toContain("isAdminRole");
    expect(page).toContain('redirect("/dashboard")');
  });

  it("judges signup health on signup attempts only", () => {
    // A working password_reset campaign must not make a dead signup campaign
    // look healthy — they can be different AiSensy campaigns.
    const data = readSrc("src/lib/admin/otp-diagnostics-data.ts");
    expect(data).toContain('attempt.purpose === "customer_signup"');
  });

  it("never selects the OTP hash or verification token", () => {
    const data = readSrc("src/lib/admin/otp-diagnostics-data.ts");
    expect(data).not.toContain("otp_hash");
    expect(data).not.toContain("verification_token_hash");
  });
});

describe("admin test send", () => {
  const route = readSrc("src/app/api/admin/diagnostics/otp-test-send/route.ts");

  it("refuses to cancel a customer's in-progress signup OTP", () => {
    // createAndSendOtp invalidates every live OTP for the same phone+purpose,
    // so an unguarded test send breaks the customer it is meant to diagnose.
    expect(route).toContain("hasLiveOtpRequest");
    expect(route).toContain("LIVE_OTP_IN_PROGRESS");
    expect(route).toMatch(/status: 409/);
  });

  it("checks before sending, not after", () => {
    expect(route.indexOf("hasLiveOtpRequest")).toBeLessThan(route.indexOf("createAndSendOtp({"));
  });

  it("fails closed when the liveness check itself errors", () => {
    const store = readSrc("src/lib/auth/otp-store.ts");
    const fn = store.slice(store.indexOf("export async function hasLiveOtpRequest"));
    expect(fn.slice(0, 1200)).toMatch(/Fail closed[\s\S]{0,80}return true/);
  });
});
