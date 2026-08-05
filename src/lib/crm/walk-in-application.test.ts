import { describe, expect, it } from "vitest";

import {
  assertOverrideAllowed,
  isValidIndianMobile,
  mapWhatsAppResultToUiState,
  maskIndianMobile,
  normalizeIndianMobileDigits,
  resolveAuthoritativePrice,
  resolveWalkInAssignment,
} from "@/lib/crm/walk-in-application-core";
import { roleHasCapability } from "@/lib/crm/permissions-core";

describe("Indian mobile normalization", () => {
  it("normalizes +91 / spaces to 10 digits", () => {
    expect(normalizeIndianMobileDigits("+91 98765 43210")).toBe("9876543210");
    expect(normalizeIndianMobileDigits("09876543210")).toBe("9876543210");
  });

  it("validates Indian mobile ranges", () => {
    expect(isValidIndianMobile("9876543210")).toBe(true);
    expect(isValidIndianMobile("5876543210")).toBe(false);
    expect(isValidIndianMobile("98765")).toBe(false);
  });

  it("masks mobile for authorized UI", () => {
    expect(maskIndianMobile("9876543210")).toBe("98******10");
  });
});

describe("Server-authoritative pricing", () => {
  it("ignores client price when equal / absent", () => {
    expect(resolveAuthoritativePrice(499, null)).toEqual({
      amount: 499,
      original: 499,
      overridden: false,
    });
    expect(resolveAuthoritativePrice(499, 499)).toEqual({
      amount: 499,
      original: 499,
      overridden: false,
    });
  });

  it("flags override and requires reason + capability", () => {
    const pricing = resolveAuthoritativePrice(499, 399);
    expect(pricing.overridden).toBe(true);
    expect(pricing.amount).toBe(399);
    expect(
      assertOverrideAllowed({
        overridden: true,
        overrideReason: "",
        actorCanOverride: true,
      }).ok,
    ).toBe(false);
    expect(
      assertOverrideAllowed({
        overridden: true,
        overrideReason: "Counter discount",
        actorCanOverride: false,
      }).ok,
    ).toBe(false);
    expect(
      assertOverrideAllowed({
        overridden: true,
        overrideReason: "Counter discount",
        actorCanOverride: roleHasCapability("admin", "payments.edit"),
      }).ok,
    ).toBe(true);
  });
});

describe("Assignment resolution", () => {
  it("prefers explicit assignee, then service, then branch, else unassigned", () => {
    expect(
      resolveWalkInAssignment({
        explicitAssigneeId: "u1",
        serviceDefaultAssigneeId: "u2",
        branchOwnerId: "u3",
      }).reason,
    ).toBe("explicit_admin_selection");

    expect(
      resolveWalkInAssignment({
        serviceDefaultAssigneeId: "u2",
        branchOwnerId: "u3",
      }),
    ).toEqual({
      assigneeId: "u2",
      reason: "service_eligible_assignee",
      bySystem: true,
    });

    expect(resolveWalkInAssignment({})).toEqual({
      assigneeId: null,
      reason: "unassigned_queue",
      bySystem: true,
    });
  });

  it("does not silently invent an assignee", () => {
    expect(resolveWalkInAssignment({ explicitAssigneeId: "  " }).assigneeId).toBeNull();
  });
});

describe("WhatsApp outbox UI mapping", () => {
  it("maps configuration / queued / failed without exposing provider payloads", () => {
    expect(mapWhatsAppResultToUiState({ ok: true })).toBe("sent");
    expect(mapWhatsAppResultToUiState({ ok: false, code: "configuration_required" })).toBe(
      "configuration_required",
    );
    expect(mapWhatsAppResultToUiState({ ok: false, code: "queued", queued: true })).toBe("queued");
    expect(mapWhatsAppResultToUiState({ ok: false, code: "send_failed" })).toBe("failed");
  });
});

describe("Authorization matrix for walk-in application path", () => {
  it("allows admin create/assign/resend; partners cannot assign or resend", () => {
    expect(roleHasCapability("admin", "applications.create")).toBe(true);
    expect(roleHasCapability("admin", "applications.assign")).toBe(true);
    expect(roleHasCapability("admin", "messaging.resend")).toBe(true);
    expect(roleHasCapability("agency_partner", "applications.create")).toBe(true);
    expect(roleHasCapability("agency_partner", "applications.assign")).toBe(false);
    expect(roleHasCapability("agency_partner", "messaging.resend")).toBe(false);
    expect(roleHasCapability("customer", "applications.create")).toBe(true);
    expect(roleHasCapability("customer", "walk_in.create")).toBe(false);
  });
});
