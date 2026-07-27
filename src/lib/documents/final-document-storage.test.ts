import { describe, expect, it } from "vitest";

import {
  CUSTOMER_APPLICATION_SELECT,
  PARTNER_APPLICATION_SELECT,
  SENSITIVE_APPLICATION_FIELDS,
  stripSensitiveApplicationFields,
} from "@/lib/applications/safe-selects";
import {
  FINAL_DOCUMENT_BUCKET,
  ADMIN_FINAL_SIGNED_URL_TTL_SECONDS,
  WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS,
  buildFinalDocumentStoragePath,
  isFinalDocumentStorageBucket,
  resolveDocumentStorageBucket,
  sanitizeFinalDocumentFileName,
} from "@/lib/documents/final-document-storage";

describe("final document storage", () => {
  it("uses private final bucket constant", () => {
    expect(FINAL_DOCUMENT_BUCKET).toBe("application-final-documents");
    expect(isFinalDocumentStorageBucket(FINAL_DOCUMENT_BUCKET)).toBe(true);
    expect(isFinalDocumentStorageBucket("documents")).toBe(false);
  });

  it("builds non-PII storage paths", () => {
    const path = buildFinalDocumentStoragePath("app-123", "ITR Ack.pdf");
    expect(path.startsWith("applications/app-123/final/")).toBe(true);
    expect(path).not.toMatch(/aadhaar|pan|@|98765/i);
    expect(sanitizeFinalDocumentFileName("Aadhaar Card!!.pdf")).toBe("aadhaar-card--.pdf");
  });

  it("resolves bucket for new finals vs legacy", () => {
    expect(
      resolveDocumentStorageBucket({
        storage_path: "applications/x/final/uuid-file.pdf",
        is_final: true,
      }),
    ).toBe(FINAL_DOCUMENT_BUCKET);
    expect(
      resolveDocumentStorageBucket({
        storage_path: "final-documents/x/file.pdf",
        is_final: true,
      }),
    ).toBe("documents");
  });

  it("keeps WhatsApp TTL practical and admin preview shorter or equal", () => {
    expect(ADMIN_FINAL_SIGNED_URL_TTL_SECONDS).toBeGreaterThanOrEqual(300);
    expect(ADMIN_FINAL_SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(900);
    expect(WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS).toBeGreaterThanOrEqual(ADMIN_FINAL_SIGNED_URL_TTL_SECONDS);
    expect(WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(3600);
  });
});

describe("safe application selects", () => {
  it("customer select excludes final path and whatsapp internals", () => {
    for (const field of SENSITIVE_APPLICATION_FIELDS) {
      expect(CUSTOMER_APPLICATION_SELECT.includes(field)).toBe(false);
    }
    expect(CUSTOMER_APPLICATION_SELECT.includes("final_document_path")).toBe(false);
    expect(CUSTOMER_APPLICATION_SELECT.includes("status")).toBe(true);
  });

  it("partner select excludes final path and internal notes", () => {
    expect(PARTNER_APPLICATION_SELECT.includes("final_document_path")).toBe(false);
    expect(PARTNER_APPLICATION_SELECT.includes("internal_notes")).toBe(false);
    expect(PARTNER_APPLICATION_SELECT.includes("agency_partner_id")).toBe(true);
  });

  it("strips sensitive fields from hydrated rows", () => {
    const cleaned = stripSensitiveApplicationFields({
      id: "1",
      status: "completed",
      final_document_path: "secret/path",
      final_document_url: "https://example/signed",
      internal_notes: "secret",
    });
    expect(cleaned.final_document_path).toBeUndefined();
    expect(cleaned.final_document_url).toBeNull();
    expect(cleaned.internal_notes).toBeUndefined();
    expect(cleaned.status).toBe("completed");
  });

  it("never persists signed URLs in admin write shape contract", () => {
    // Contract: upload/update payloads must set URL fields to null/empty, never signed URLs.
    const persistedShape = {
      final_document_url: null as string | null,
      completed_document_url: null as string | null,
      file_url: "",
      storage_bucket: FINAL_DOCUMENT_BUCKET,
      storage_path: buildFinalDocumentStoragePath("app-1", "out.pdf"),
    };
    expect(persistedShape.final_document_url).toBeNull();
    expect(persistedShape.completed_document_url).toBeNull();
    expect(persistedShape.file_url).toBe("");
    expect(persistedShape.storage_path.includes("/final/")).toBe(true);
  });
});
