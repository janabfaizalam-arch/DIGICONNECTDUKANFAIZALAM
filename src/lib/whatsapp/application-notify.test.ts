import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/whatsapp/aisensy", () => ({
  loadAisensyConfig: vi.fn(),
  normalizeAisensyDestination: vi.fn((input: string) => {
    const digits = String(input).replace(/\D/g, "");
    const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
    if (!/^[6-9]\d{9}$/.test(local)) return { ok: false, error: "Invalid mobile" };
    return { ok: true, destination: `91${local}`, local };
  }),
  isAisensySuccessResponse: vi.fn((status: number) => status >= 200 && status < 300),
}));

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { loadAisensyConfig } from "@/lib/whatsapp/aisensy";
import { sendApplicationWhatsApp } from "@/lib/whatsapp/application-notify";

function mockSupabase(existing: { id: string; status: string; attempt_count?: number } | null = null) {
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const upsertSelect = vi.fn().mockResolvedValue({ data: { id: existing?.id ?? "msg-1" }, error: null });
  const upsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle: upsertSelect }) });
  const maybeSingle = vi.fn().mockResolvedValue({ data: existing, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select, upsert, update });
  vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
  return { from, update, upsert };
}

describe("sendApplicationWhatsApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("rejects invalid mobile", async () => {
    mockSupabase();
    const result = await sendApplicationWhatsApp({
      applicationId: "app-1",
      eventType: "final_document",
      recipientMobile: "123",
      customerName: "A",
      serviceName: "ITR",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_mobile");
  });

  it("dedupes successful prior send", async () => {
    mockSupabase({ id: "m1", status: "sent", attempt_count: 1 });
    const result = await sendApplicationWhatsApp({
      applicationId: "app-1",
      eventType: "final_document",
      recipientMobile: "9876543210",
      customerName: "A",
      serviceName: "ITR",
      forceRetry: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.deduped).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns configuration_required without marking sent", async () => {
    mockSupabase(null);
    vi.mocked(loadAisensyConfig).mockReturnValue({ ok: false, error: "missing" } as never);
    const result = await sendApplicationWhatsApp({
      applicationId: "app-1",
      eventType: "final_document",
      recipientMobile: "9876543210",
      customerName: "A",
      serviceName: "ITR",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("configuration_required");
      expect(result.queued).toBe(true);
    }
  });

  it("sends via AiSensy when configured", async () => {
    mockSupabase(null);
    vi.mocked(loadAisensyConfig).mockReturnValue({
      ok: true,
      config: { apiKey: "k", apiUrl: "https://example.test/send" },
    } as never);
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ success: true }),
    } as Response);

    const result = await sendApplicationWhatsApp({
      applicationId: "app-1",
      eventType: "progress_update",
      recipientMobile: "9876543210",
      customerName: "A",
      serviceName: "ITR",
    });
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    const body = JSON.parse(String((vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit)?.body));
    expect(body.apiKey).toBe("k");
    expect(body.destination).toBe("919876543210");
  });

  it("marks failure on non-2xx", async () => {
    mockSupabase(null);
    vi.mocked(loadAisensyConfig).mockReturnValue({
      ok: true,
      config: { apiKey: "k", apiUrl: "https://example.test/send" },
    } as never);
    vi.mocked(fetch).mockResolvedValue({
      status: 500,
      ok: false,
      text: async () => "fail",
    } as Response);

    const result = await sendApplicationWhatsApp({
      applicationId: "app-1",
      eventType: "final_document",
      recipientMobile: "9876543210",
      customerName: "A",
      serviceName: "ITR",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("send_failed");
  });

  it("enforces retry limit", async () => {
    mockSupabase({ id: "m1", status: "failed", attempt_count: 5 });
    const result = await sendApplicationWhatsApp({
      applicationId: "app-1",
      eventType: "final_document",
      recipientMobile: "9876543210",
      customerName: "A",
      serviceName: "ITR",
      forceRetry: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("retry_limit");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns database_upgrade_required when whatsapp_messages table is missing", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST205", message: "Could not find the table 'public.whatsapp_messages' in the schema cache" },
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select, upsert: vi.fn(), update: vi.fn() });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    vi.mocked(loadAisensyConfig).mockReturnValue({ ok: true, config: { apiKey: "k", apiUrl: "https://x" } } as never);

    const result = await sendApplicationWhatsApp({
      applicationId: "app-1",
      eventType: "progress_update",
      recipientMobile: "9876543210",
      customerName: "A",
      serviceName: "ITR",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("database_upgrade_required");
      expect(result.upgradeRequired).toBe(true);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
