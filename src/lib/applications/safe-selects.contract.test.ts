import { describe, expect, it } from "vitest";

import {
  DATABASE_UPGRADE_REQUIRED_MESSAGE,
  isMissingColumnError,
  isMissingRelationError,
  isMissingStorageBucketError,
  upgradeRequiredFromDbError,
  upgradeRequiredFromStorageError,
} from "@/lib/supabase/schema-compat";
import {
  ADMIN_APPLICATION_SELECT,
  ADMIN_APPLICATION_SELECT_LEGACY,
  CUSTOMER_APPLICATION_SELECT,
  PARTNER_APPLICATION_SELECT,
  stripSensitiveApplicationFields,
} from "@/lib/applications/safe-selects";
import {
  isCustomerVisibleDocument,
  isPartnerVisibleDocument,
} from "@/lib/applications/document-visibility";

describe("schema compatibility", () => {
  it("detects missing relation / column / bucket", () => {
    expect(isMissingRelationError({ code: "PGRST205", message: "schema cache" })).toBe(true);
    expect(isMissingColumnError({ code: "42703", message: "column x does not exist" })).toBe(true);
    expect(isMissingStorageBucketError({ message: "Bucket not found" })).toBe(true);
    expect(upgradeRequiredFromDbError({ code: "42703", message: "column missing" })).toBe(
      DATABASE_UPGRADE_REQUIRED_MESSAGE,
    );
    expect(upgradeRequiredFromStorageError({ message: "Bucket not found" })).toBe(
      DATABASE_UPGRADE_REQUIRED_MESSAGE,
    );
  });
});

describe("safe selects contracts", () => {
  it("admin selects never use star and include status", () => {
    expect(ADMIN_APPLICATION_SELECT.includes("*")).toBe(false);
    expect(ADMIN_APPLICATION_SELECT_LEGACY.includes("*")).toBe(false);
    expect(ADMIN_APPLICATION_SELECT.includes("status")).toBe(true);
    expect(ADMIN_APPLICATION_SELECT_LEGACY.includes("final_document_path")).toBe(true);
  });

  it("customer and partner selects exclude sensitive fields", () => {
    expect(CUSTOMER_APPLICATION_SELECT.includes("final_document_path")).toBe(false);
    expect(CUSTOMER_APPLICATION_SELECT.includes("final_document_id")).toBe(false);
    expect(CUSTOMER_APPLICATION_SELECT.includes("commission_amount")).toBe(false);
    expect(CUSTOMER_APPLICATION_SELECT.includes("internal_notes")).toBe(false);
    expect(PARTNER_APPLICATION_SELECT.includes("internal_notes")).toBe(false);
    expect(PARTNER_APPLICATION_SELECT.includes("whatsapp_final_delivery_status")).toBe(false);
  });

  it("strip helper clears signed URL fields", () => {
    const cleaned = stripSensitiveApplicationFields({
      id: "1",
      final_document_url: "https://signed.example/x",
      completed_document_url: "https://signed.example/y",
      final_document_path: "path",
      status: "completed",
    });
    expect(cleaned.final_document_url).toBeNull();
    expect(cleaned.completed_document_url).toBeNull();
    expect(cleaned.final_document_path).toBeUndefined();
    expect(cleaned.status).toBe("completed");
  });
});

describe("document visibility", () => {
  it("hides finals from customer and partner", () => {
    const finalDoc = {
      id: "1",
      application_id: "a",
      document_type: "final_document",
      file_name: "x.pdf",
      file_url: "",
      is_final: true,
      uploaded_at: "",
      created_at: "",
    };
    expect(isCustomerVisibleDocument(finalDoc)).toBe(false);
    expect(isPartnerVisibleDocument(finalDoc)).toBe(false);
  });

  it("respects visibility flags on non-final docs", () => {
    const hidden = {
      id: "1",
      application_id: "a",
      document_type: "aadhaar",
      file_name: "x.pdf",
      file_url: "",
      is_final: false,
      customer_visible: false,
      partner_visible: false,
      uploaded_at: "",
      created_at: "",
    };
    expect(isCustomerVisibleDocument(hidden)).toBe(false);
    expect(isPartnerVisibleDocument(hidden)).toBe(false);
  });
});
