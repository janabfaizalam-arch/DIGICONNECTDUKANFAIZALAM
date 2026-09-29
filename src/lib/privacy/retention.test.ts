import { describe, expect, it } from "vitest";

import { planRetention, RETENTION_CATEGORIES } from "@/lib/privacy/retention";

const now = new Date("2026-09-27T00:00:00Z");

describe("retention plan", () => {
  it("deletes nothing unless a period is configured", () => {
    expect(planRetention({}, now).every((item) => item.status === "disabled")).toBe(true);
  });

  it("enables only the categories with a valid whole-day period", () => {
    const plan = planRetention({ RETENTION_OTP_DAYS: "7", RETENTION_SITE_VISITS_DAYS: "abc" }, now);
    const otp = plan.find((p) => p.id === "otp_requests")!;
    expect(otp).toEqual({ id: "otp_requests", status: "enabled", days: 7, cutoff: "2026-09-20T00:00:00.000Z" });
    expect(plan.find((p) => p.id === "site_visits")!.status).toBe("disabled");
    expect(plan.find((p) => p.id === "customer_sessions")!.status).toBe("disabled");
  });

  it("refuses periods below a category's safety floor", () => {
    const plan = planRetention({ RETENTION_AUTH_EVENTS_DAYS: "1" }, now);
    expect(plan.find((p) => p.id === "auth_security_events")).toMatchObject({ status: "disabled" });
  });

  it("never touches business, financial or legal records", () => {
    const ids = RETENTION_CATEGORIES.map((c) => c.id);
    for (const forbidden of ["applications", "payments", "invoices", "application_documents", "credit_reports", "leads", "privacy_requests"]) {
      expect(ids).not.toContain(forbidden);
    }
  });
});
