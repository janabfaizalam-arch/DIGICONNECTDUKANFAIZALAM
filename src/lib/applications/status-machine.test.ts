import { describe, expect, it } from "vitest";

import {
  canTransitionStatus,
  shouldShowCompleteAction,
  shouldShowPaymentReminder,
  normalizeWorkflowStatus,
  isWorkflowEditable,
  whatsappEventForStatusChange,
} from "@/lib/applications/status-machine";
import { resolveApplicationOrigin, resolveApplicationSourceInfo } from "@/lib/applications/source";
import { resolveSmartNextAction } from "@/lib/applications/smart-next-action";
import {
  isCustomerVisibleDocument,
  isPartnerVisibleDocument,
  isFinalApplicationDocument,
} from "@/lib/applications/document-visibility";
import type { ApplicationDocument } from "@/lib/portal-types";

describe("application status machine", () => {
  it("normalizes legacy aliases", () => {
    expect(normalizeWorkflowStatus("in_process")).toBe("in_progress");
    expect(normalizeWorkflowStatus("processing")).toBe("in_progress");
    expect(normalizeWorkflowStatus("awaiting_documents")).toBe("documents_required");
    expect(normalizeWorkflowStatus("complete")).toBe("completed");
  });

  it("blocks payment_pending → completed", () => {
    const result = canTransitionStatus("payment_pending", "completed", {
      hasFinalDocument: true,
      paymentStatus: "pending",
    });
    expect(result.ok).toBe(false);
  });

  it("blocks completed without final document", () => {
    const result = canTransitionStatus("in_progress", "completed", { hasFinalDocument: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/final document/i);
  });

  it("blocks completion when required documents missing", () => {
    const result = canTransitionStatus("in_progress", "completed", {
      hasFinalDocument: true,
      missingRequiredDocuments: true,
      paymentStatus: "paid",
    });
    expect(result.ok).toBe(false);
  });

  it("allows in_progress → completed with final document", () => {
    const result = canTransitionStatus("in_progress", "completed", {
      hasFinalDocument: true,
      paymentStatus: "paid",
    });
    expect(result.ok).toBe(true);
  });

  it("locks completed except refund", () => {
    expect(canTransitionStatus("completed", "in_progress", { hasFinalDocument: true }).ok).toBe(false);
    expect(canTransitionStatus("completed", "refunded", { hasFinalDocument: true }).ok).toBe(true);
    expect(isWorkflowEditable("completed")).toBe(false);
    expect(isWorkflowEditable("cancelled")).toBe(false);
  });

  it("hides payment reminder when paid", () => {
    expect(shouldShowPaymentReminder("paid", "submitted")).toBe(false);
    expect(shouldShowPaymentReminder("pending", "submitted")).toBe(true);
  });

  it("hides complete action when already completed", () => {
    expect(shouldShowCompleteAction("completed")).toBe(false);
    expect(shouldShowCompleteAction("in_progress")).toBe(true);
  });

  it("does not emit WhatsApp event for same-status change", () => {
    expect(whatsappEventForStatusChange("in_progress", "in_progress")).toBeNull();
  });

  it("emits customer-relevant WhatsApp events only", () => {
    expect(whatsappEventForStatusChange("submitted", "documents_required")).toBe("documents_required");
    expect(whatsappEventForStatusChange("in_progress", "objection")).toBe("objection");
    expect(whatsappEventForStatusChange("objection", "in_progress")).toBe("objection_resolved");
    expect(whatsappEventForStatusChange("submitted", "assigned_to_agent")).toBeNull();
    expect(whatsappEventForStatusChange("in_progress", "completed")).toBeNull();
  });
});

describe("application source", () => {
  it("prioritizes agency_partner_id", () => {
    expect(resolveApplicationOrigin({ agency_partner_id: "x", application_source: "customer" })).toBe("agency_partner");
    expect(resolveApplicationSourceInfo({ agency_partner_id: "x" }).label).toBe("Digi Partner");
  });

  it("detects explicit partner source text", () => {
    expect(resolveApplicationOrigin({ application_source: "agency_partner" })).toBe("agency_partner");
  });

  it("detects admin-created without treating offline payment as admin", () => {
    expect(resolveApplicationOrigin({ application_source: "admin" })).toBe("admin");
    expect(resolveApplicationOrigin({ submitted_by_role: "admin" })).toBe("admin");
    expect(resolveApplicationOrigin({ source: "offline" })).toBe("customer");
  });

  it("defaults null/unknown to customer", () => {
    expect(resolveApplicationOrigin({})).toBe("customer");
    expect(resolveApplicationOrigin({ application_source: null, source: "online" })).toBe("customer");
  });
});

describe("smart next action", () => {
  it("suggests request documents when missing", () => {
    expect(
      resolveSmartNextAction({
        status: "documents_required",
        paymentStatus: "paid",
        missingDocuments: true,
      }).key,
    ).toBe("request_documents");
  });

  it("suggests retry whatsapp when delivery failed", () => {
    expect(
      resolveSmartNextAction({
        status: "completed",
        hasFinalDocument: true,
        whatsappFinalDeliveryStatus: "failed",
      }).key,
    ).toBe("retry_whatsapp");
  });
});

describe("document visibility", () => {
  const base: ApplicationDocument = {
    id: "1",
    application_id: "a",
    file_name: "x.pdf",
    file_url: "https://example.com/x.pdf",
    file_type: "application/pdf",
    document_type: "aadhaar",
    created_at: new Date().toISOString(),
  };

  it("hides final documents from customer and partner", () => {
    const finalDoc = { ...base, is_final: true, document_type: "final_document" };
    expect(isFinalApplicationDocument(finalDoc)).toBe(true);
    expect(isCustomerVisibleDocument(finalDoc)).toBe(false);
    expect(isPartnerVisibleDocument(finalDoc)).toBe(false);
  });

  it("keeps legacy customer docs visible by default", () => {
    expect(isCustomerVisibleDocument(base)).toBe(true);
    expect(isPartnerVisibleDocument(base)).toBe(true);
  });

  it("respects visibility flags", () => {
    expect(isCustomerVisibleDocument({ ...base, customer_visible: false })).toBe(false);
    expect(isPartnerVisibleDocument({ ...base, partner_visible: false })).toBe(false);
  });
});
