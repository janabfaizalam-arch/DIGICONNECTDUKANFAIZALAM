import { afterAll, beforeAll, describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/whatsapp/aisensy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/whatsapp/aisensy")>("@/lib/whatsapp/aisensy");
  return {
    ...actual,
    sendAisensyCampaign: vi.fn(),
  };
});

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendAisensyCampaign } from "@/lib/whatsapp/aisensy";
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
  // These cases assert the direct-send path. sendApplicationWhatsApp fails closed
  // to `disabled` (queue-only, no provider call) when the mode is unset, so the
  // mode has to be pinned or every case routes away from the code under test.
  const previousDeliveryMode = process.env.CRM_NOTIFICATION_DELIVERY_MODE;

  beforeAll(() => {
    process.env.CRM_NOTIFICATION_DELIVERY_MODE = "direct";
  });

  afterAll(() => {
    if (previousDeliveryMode === undefined) delete process.env.CRM_NOTIFICATION_DELIVERY_MODE;
    else process.env.CRM_NOTIFICATION_DELIVERY_MODE = previousDeliveryMode;
  });

  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(sendAisensyCampaign).not.toHaveBeenCalled();
  });

  it("returns configuration_required without marking sent", async () => {
    mockSupabase(null);
    vi.mocked(sendAisensyCampaign).mockResolvedValue({
      ok: false,
      queued: true,
      sent: false,
      failed: false,
      configuration_required: true,
      providerMessageId: null,
      errorCode: "missing_api_key",
      errorMessage: "AISENSY_API_KEY is not configured.",
      campaignName: "application_update",
      destination: "919876543210",
      requestId: "r1",
    });
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
    vi.mocked(sendAisensyCampaign).mockResolvedValue({
      ok: true,
      queued: false,
      sent: true,
      failed: false,
      configuration_required: false,
      providerMessageId: "prov-1",
      errorCode: null,
      errorMessage: null,
      campaignName: "application_update",
      destination: "919876543210",
      requestId: "r1",
    });

    const result = await sendApplicationWhatsApp({
      applicationId: "app-1",
      eventType: "progress_update",
      recipientMobile: "9876543210",
      customerName: "A",
      serviceName: "ITR",
      notes: "Almost done",
    });
    expect(result.ok).toBe(true);
    expect(sendAisensyCampaign).toHaveBeenCalledOnce();
    const arg = vi.mocked(sendAisensyCampaign).mock.calls[0]?.[0];
    expect(arg?.destination).toBe("919876543210");
    expect(arg?.templateParams).toHaveLength(4);
    expect(arg?.dedupe).toBe(false);
  });

  it("marks failure on provider rejection", async () => {
    mockSupabase(null);
    vi.mocked(sendAisensyCampaign).mockResolvedValue({
      ok: false,
      queued: false,
      sent: false,
      failed: true,
      configuration_required: false,
      providerMessageId: null,
      errorCode: "provider_rejected",
      errorMessage: "WhatsApp delivery failed.",
      campaignName: "application_update",
      destination: "919876543210",
      requestId: "r1",
      httpStatus: 500,
    });

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
    expect(sendAisensyCampaign).not.toHaveBeenCalled();
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

    const result = await sendApplicationWhatsApp({
      applicationId: "app-1",
      eventType: "progress_update",
      recipientMobile: "9876543210",
      customerName: "A",
      serviceName: "ITR",
      notes: "update",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("database_upgrade_required");
      expect(result.upgradeRequired).toBe(true);
    }
    expect(sendAisensyCampaign).not.toHaveBeenCalled();
  });

  it("attaches media for final_document and does not persist signed URL in payload upsert", async () => {
    const { upsert } = mockSupabase(null);
    vi.mocked(sendAisensyCampaign).mockResolvedValue({
      ok: true,
      queued: false,
      sent: true,
      failed: false,
      configuration_required: false,
      providerMessageId: "prov-1",
      errorCode: null,
      errorMessage: null,
      campaignName: "final_doc",
      destination: "919876543210",
      requestId: "r1",
    });

    await sendApplicationWhatsApp({
      applicationId: "app-1",
      eventType: "final_document",
      recipientMobile: "9876543210",
      customerName: "A",
      serviceName: "ITR",
      documentUrl: "https://signed.example/doc.pdf?token=secret",
      documentName: "final.pdf",
    });

    const campaignArg = vi.mocked(sendAisensyCampaign).mock.calls[0]?.[0];
    expect(campaignArg?.media).toEqual({
      url: "https://signed.example/doc.pdf?token=secret",
      filename: "final.pdf",
    });
    const upsertArg = upsert.mock.calls[0]?.[0] as { payload: Record<string, unknown> };
    expect(JSON.stringify(upsertArg.payload)).not.toContain("signed.example");
  });
});
