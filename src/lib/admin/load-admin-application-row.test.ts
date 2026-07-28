import { describe, expect, it, vi, beforeEach } from "vitest";

import { loadAdminApplicationRow } from "@/lib/admin/load-admin-application-row";
import {
  ADMIN_APPLICATION_SELECT,
  ADMIN_APPLICATION_SELECT_LEGACY,
  ADMIN_APPLICATION_SELECT_MINIMAL,
  normalizeAdminApplicationRow,
} from "@/lib/applications/safe-selects";
import {
  isAuthOrPermissionError,
  isMissingColumnError,
  isMissingRelationError,
} from "@/lib/supabase/schema-compat";

describe("schema-compat missing column detection", () => {
  it("detects postgres 42703 and postgrest PGRST204", () => {
    expect(isMissingColumnError({ code: "42703", message: "column applications.priority does not exist" })).toBe(true);
    expect(isMissingColumnError({ code: "PGRST204", message: "Could not find the 'priority' column of 'applications' in the schema cache" })).toBe(true);
    expect(isMissingColumnError({ message: "column foo does not exist" })).toBe(true);
    expect(isMissingColumnError({ message: "Could not find the 'x' column" })).toBe(true);
  });

  it("does not classify network/auth/generic errors as missing columns", () => {
    expect(isMissingColumnError({ code: "57014", message: "canceling statement due to statement timeout" })).toBe(false);
    expect(isMissingColumnError({ code: "PGRST301", message: "JWT expired" })).toBe(false);
    expect(isMissingColumnError({ message: "fetch failed" })).toBe(false);
    expect(isAuthOrPermissionError({ code: "42501", message: "permission denied" })).toBe(true);
    expect(isMissingRelationError({ code: "PGRST205", message: "Could not find the table" })).toBe(true);
  });
});

describe("normalizeAdminApplicationRow", () => {
  it("fills modern fields with safe defaults for legacy rows", () => {
    const normalized = normalizeAdminApplicationRow({
      id: "app-1",
      status: "submitted",
      final_document_path: "final-documents/x.pdf",
    });
    expect(normalized.final_document_id).toBeNull();
    expect(normalized.priority).toBeNull();
    expect(normalized.due_at).toBeNull();
    expect(normalized.whatsapp_final_delivery_status).toBeNull();
    expect(normalized.final_document_url).toBeNull();
    expect(normalized.status).toBe("submitted");
  });
});

function mockClient(sequence: Array<{ data: unknown; error: { code?: string; message?: string } | null }>) {
  const maybeSingle = vi.fn();
  for (const item of sequence) {
    maybeSingle.mockResolvedValueOnce(item);
  }
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { client: { from } as never, from, select, eq, maybeSingle };
}

describe("loadAdminApplicationRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns modern row when primary select succeeds", async () => {
    const { client, select, eq } = mockClient([
      { data: { id: "app-1", status: "submitted", priority: "normal" }, error: null },
    ]);
    const result = await loadAdminApplicationRow(client, "app-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mode).toBe("modern");
      expect(result.row.id).toBe("app-1");
    }
    expect(select).toHaveBeenCalledWith(ADMIN_APPLICATION_SELECT);
    expect(eq).toHaveBeenCalledWith("id", "app-1");
  });

  it("falls back to legacy when modern columns are missing", async () => {
    const { client, select, eq } = mockClient([
      {
        data: null,
        error: { code: "42703", message: "column applications.final_document_id does not exist" },
      },
      { data: { id: "app-1", status: "submitted", final_document_path: "path" }, error: null },
    ]);
    const result = await loadAdminApplicationRow(client, "app-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mode).toBe("legacy");
      expect(result.row.final_document_id).toBeNull();
      expect(result.row.priority).toBeNull();
    }
    expect(select.mock.calls[0]?.[0]).toBe(ADMIN_APPLICATION_SELECT);
    expect(select.mock.calls[1]?.[0]).toBe(ADMIN_APPLICATION_SELECT_LEGACY);
    expect(eq).toHaveBeenNthCalledWith(1, "id", "app-1");
    expect(eq).toHaveBeenNthCalledWith(2, "id", "app-1");
  });

  it("falls through to minimal then star if needed", async () => {
    const { client, select } = mockClient([
      { data: null, error: { code: "PGRST204", message: "Could not find the 'priority' column of 'applications' in the schema cache" } },
      { data: null, error: { code: "42703", message: "column applications.source_channel does not exist" } },
      { data: null, error: { code: "42703", message: "column applications.payment_status does not exist" } },
      { data: { id: "app-1", status: "submitted" }, error: null },
    ]);
    const result = await loadAdminApplicationRow(client, "app-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mode).toBe("star");
    expect(select.mock.calls.map((c) => c[0])).toEqual([
      ADMIN_APPLICATION_SELECT,
      ADMIN_APPLICATION_SELECT_LEGACY,
      ADMIN_APPLICATION_SELECT_MINIMAL,
      "*",
    ]);
  });

  it("returns not_found only when a successful query has no row", async () => {
    const { client } = mockClient([{ data: null, error: null }]);
    const result = await loadAdminApplicationRow(client, "missing-id");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("does not map database errors to not_found", async () => {
    const { client } = mockClient([
      { data: null, error: { code: "57014", message: "statement timeout" } },
    ]);
    const result = await loadAdminApplicationRow(client, "app-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("error");
      expect(result.message).toMatch(/could not be loaded/i);
    }
  });

  it("handles auth/permission separately", async () => {
    const { client } = mockClient([
      { data: null, error: { code: "42501", message: "permission denied for table applications" } },
    ]);
    const result = await loadAdminApplicationRow(client, "app-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("forbidden");
  });
});
