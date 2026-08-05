import { describe, expect, it } from "vitest";

import { roleHasCapability } from "@/lib/crm/permissions-core";
import {
  buildLeadIngestionKey,
  classifyDuplicateMatch,
  isFollowUpOverdue,
  isValidLeadMobile,
  mapCrmLeadsPipelineToStage,
  mapLegacyStatusToStage,
  mapStageToCrmLeadsPipeline,
  mapStageToLegacyStatus,
  normalizeLeadMobile,
} from "@/lib/crm/leads-core";

describe("Lead mobile normalization", () => {
  it("normalizes and validates Indian mobiles", () => {
    expect(normalizeLeadMobile("+91 98765-43210")).toBe("9876543210");
    expect(isValidLeadMobile("9876543210")).toBe(true);
    expect(isValidLeadMobile("5876543210")).toBe(false);
  });
});

describe("Pipeline mapping compatibility", () => {
  it("maps legacy statuses and prototype pipeline both ways", () => {
    expect(mapLegacyStatusToStage("converted")).toBe("won");
    expect(mapStageToLegacyStatus("won")).toBe("converted");
    expect(mapStageToCrmLeadsPipeline("qualified")).toBe("negotiation");
    expect(mapCrmLeadsPipelineToStage("opportunity")).toBe("contacted");
  });
});

describe("Duplicate classification (no auto-merge)", () => {
  it("flags exact mobile matches and weaker same-mobile suggestions", () => {
    const exact = classifyDuplicateMatch({
      candidateMobile: "9876543210",
      candidateService: "PAN",
      existingMobile: "9876543210",
      existingService: "PAN",
      existingId: "l1",
      existingName: "A",
      existingStage: "new",
    });
    expect(exact?.kind).toBe("exact_mobile");

    const weak = classifyDuplicateMatch({
      candidateMobile: "9876543210",
      candidateService: "GST",
      existingMobile: "9876543210",
      existingService: "PAN",
      existingId: "l1",
      existingName: "A",
      existingStage: "contacted",
    });
    expect(weak?.kind).toBe("same_mobile_different_service");
  });
});

describe("Ingestion idempotency keys", () => {
  it("scopes by source, mobile, service, and day (or external id)", () => {
    const key = buildLeadIngestionKey({
      source: "website",
      mobile: "9876543210",
      service: "PAN Card",
    });
    expect(key.startsWith("website:9876543210:pan-card:")).toBe(true);

    expect(
      buildLeadIngestionKey({
        source: "whatsapp",
        mobile: "9876543210",
        externalId: "wa-msg-1",
      }),
    ).toBe("whatsapp:ext:wa-msg-1");
  });

  it("scopes agency partner keys per partner so one partner cannot block another", () => {
    const a = buildLeadIngestionKey({
      source: "agency_partner",
      mobile: "9876543210",
      service: "PAN",
      scopeId: "partner-a",
    });
    const b = buildLeadIngestionKey({
      source: "agency_partner",
      mobile: "9876543210",
      service: "PAN",
      scopeId: "partner-b",
    });
    expect(a).not.toBe(b);
    expect(a.includes("partner-a")).toBe(true);
    expect(b.includes("partner-b")).toBe(true);
  });
});

describe("Unknown inbound source normalization", () => {
  it("maps aliases deterministically", async () => {
    const { normalizeInboundLeadSource } = await import("@/lib/crm/leads-core");
    expect(normalizeInboundLeadSource("WA")).toBe("whatsapp");
    expect(normalizeInboundLeadSource("google_sheets")).toBe("manual");
    expect(normalizeInboundLeadSource("something-else")).toBe("manual");
  });
});

describe("Overdue follow-up", () => {
  it("marks past follow-ups overdue except won/lost", () => {
    expect(
      isFollowUpOverdue({
        nextFollowUpAt: "2020-01-01T00:00:00.000Z",
        stage: "contacted",
        now: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      isFollowUpOverdue({
        nextFollowUpAt: "2020-01-01T00:00:00.000Z",
        stage: "won",
        now: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBe(false);
  });
});

describe("Lead authorization matrix", () => {
  it("allows admin convert/view; partners view scoped; customers cannot convert", () => {
    expect(roleHasCapability("admin", "leads.view")).toBe(true);
    expect(roleHasCapability("admin", "leads.convert")).toBe(true);
    expect(roleHasCapability("agency_partner", "leads.view")).toBe(true);
    expect(roleHasCapability("agency_partner", "leads.convert")).toBe(true);
    expect(roleHasCapability("customer", "leads.view")).toBe(false);
    expect(roleHasCapability("agency_partner", "applications.assign")).toBe(false);
  });
});
