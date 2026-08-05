import { describe, expect, it } from "vitest";

import {
  assertLostReason,
  canTransitionLeadStage,
  classifyFollowUp,
  formatFollowUpForDisplay,
  getAsiaKolkataDayRange,
} from "@/lib/crm/lead-workflow-core";
import { buildLeadIngestionKey } from "@/lib/crm/leads-core";
import { roleHasCapability } from "@/lib/crm/permissions-core";

describe("Lead stage transitions", () => {
  it("allows valid paths and blocks invalid / terminal without reopen", () => {
    expect(canTransitionLeadStage({ from: "new", to: "contacted" }).ok).toBe(true);
    expect(canTransitionLeadStage({ from: "new", to: "won" }).ok).toBe(false);
    expect(canTransitionLeadStage({ from: "lost", to: "new" }).ok).toBe(false);
    expect(canTransitionLeadStage({ from: "lost", to: "new", allowReopen: true }).ok).toBe(true);
  });

  it("requires lost reason", () => {
    expect(assertLostReason("lost", "").ok).toBe(false);
    expect(assertLostReason("lost", "Not interested").ok).toBe(true);
    expect(assertLostReason("contacted", "").ok).toBe(true);
  });
});

describe("Follow-up buckets (Asia/Kolkata display helper)", () => {
  it("classifies overdue / today / upcoming", () => {
    const now = new Date("2026-08-05T12:00:00+05:30");
    expect(
      classifyFollowUp({
        nextFollowUpAt: "2026-08-01T10:00:00+05:30",
        stage: "contacted",
        now,
      }),
    ).toBe("overdue");
    expect(
      classifyFollowUp({
        nextFollowUpAt: "2026-08-05T18:00:00+05:30",
        stage: "contacted",
        now,
      }),
    ).toBe("today");
    expect(
      classifyFollowUp({
        nextFollowUpAt: "2026-08-10T10:00:00+05:30",
        stage: "contacted",
        now,
      }),
    ).toBe("upcoming");
    expect(formatFollowUpForDisplay("2026-08-05T10:00:00+05:30")).toBeTruthy();
  });

  it("builds Asia/Kolkata day range for queue filters", () => {
    const range = getAsiaKolkataDayRange(new Date("2026-08-05T12:00:00+05:30"));
    expect(range.day).toBe("2026-08-05");
    expect(Date.parse(range.startIso)).toBeLessThan(Date.parse(range.endIso));
  });
});

describe("Partner isolation rules", () => {
  it("denies customer role lead convert and reassign capabilities", () => {
    expect(roleHasCapability("customer", "leads.convert")).toBe(false);
    expect(roleHasCapability("customer", "leads.view")).toBe(false);
    expect(roleHasCapability("agency_partner", "applications.assign")).toBe(false);
  });
});

describe("Won vs application_created semantics", () => {
  it("treats application_created as pre-won and won as terminal convert", () => {
    expect(canTransitionLeadStage({ from: "application_created", to: "won" }).ok).toBe(true);
    expect(canTransitionLeadStage({ from: "won", to: "application_created" }).ok).toBe(false);
    expect(canTransitionLeadStage({ from: "service_selected", to: "application_created" }).ok).toBe(true);
  });
});

describe("Inbound idempotency readiness", () => {
  it("builds distinct keys for website, partner, whatsapp external, sheets external", () => {
    expect(
      buildLeadIngestionKey({ source: "website", mobile: "9876543210", service: "GST" }).startsWith(
        "website:",
      ),
    ).toBe(true);
    expect(
      buildLeadIngestionKey({
        source: "agency_partner",
        mobile: "9876543210",
        service: "GST",
        scopeId: "p1",
      }),
    ).toContain("p1");
    expect(
      buildLeadIngestionKey({
        source: "whatsapp",
        mobile: "9876543210",
        externalId: "wa-1",
      }),
    ).toBe("whatsapp:ext:wa-1");
    expect(
      buildLeadIngestionKey({
        source: "manual",
        mobile: "9876543210",
        externalId: "sheets:row-9",
      }),
    ).toBe("manual:ext:sheets:row-9");
  });
});

describe("Conversion authorization", () => {
  it("gates convert capability", () => {
    expect(roleHasCapability("admin", "leads.convert")).toBe(true);
    expect(roleHasCapability("agency_partner", "leads.convert")).toBe(true);
    expect(roleHasCapability("customer", "leads.convert")).toBe(false);
  });
});
