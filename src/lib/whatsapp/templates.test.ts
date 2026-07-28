import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  APPLICATION_CAMPAIGN_MATRIX,
  buildApplicationTemplateParams,
  getApplicationCampaignName,
} from "@/lib/whatsapp/templates";
import { WHATSAPP_MOBILE_REQUIRED_ERROR } from "@/lib/whatsapp/types";
import {
  __resetAisensySendDedupeForTests,
  normalizeAisensyDestination,
  sendAisensyCampaign,
} from "@/lib/whatsapp/aisensy";

const ENV_KEYS = [
  "WHATSAPP_PROVIDER",
  "AISENSY_API_KEY",
  "AISENSY_API_URL",
  "AISENSY_APPLICATION_CAMPAIGN",
  "AISENSY_PAYMENT_REMINDER_CAMPAIGN",
  "AISENSY_FINAL_DOCUMENT_CAMPAIGN",
] as const;

const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  for (const key of Object.keys(values) as Array<(typeof ENV_KEYS)[number]>) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function mockFetch(options: { status: number; body: unknown }) {
  return vi.fn(async () => {
    return {
      status: options.status,
      ok: options.status >= 200 && options.status < 300,
      text: async () => (typeof options.body === "string" ? options.body : JSON.stringify(options.body)),
    } as Response;
  });
}

beforeEach(() => {
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  __resetAisensySendDedupeForTests();
  setEnv({
    WHATSAPP_PROVIDER: "aisensy",
    AISENSY_API_KEY: "test-api-key-abcdef123456",
    AISENSY_API_URL: "https://backend.aisensy.com/campaign/t1/api/v2",
    AISENSY_APPLICATION_CAMPAIGN: "application_update",
    AISENSY_PAYMENT_REMINDER_CAMPAIGN: undefined,
    AISENSY_FINAL_DOCUMENT_CAMPAIGN: "final_doc_campaign",
  });
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  __resetAisensySendDedupeForTests();
});

describe("normalizeAisensyDestination", () => {
  it("accepts common Indian formats", () => {
    for (const input of ["9876543210", "919876543210", "+919876543210", "98765 43210", "98765-43210"]) {
      const result = normalizeAisensyDestination(input);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.destination).toBe("919876543210");
    }
  });

  it("rejects invalid numbers with admin-facing message", () => {
    for (const input of ["", "123", "5123456789", "abcdefghij"]) {
      const result = normalizeAisensyDestination(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe(WHATSAPP_MOBILE_REQUIRED_ERROR);
    }
  });
});

describe("template contracts", () => {
  it("keeps stable 4-parameter ordering", () => {
    const params = buildApplicationTemplateParams("objection", {
      customerName: "Riya",
      serviceName: "ITR",
      applicationId: "app-9",
      objectionMessage: "PAN mismatch",
    });
    expect(params).toEqual(["Riya", "ITR", "app-9", "PAN mismatch"]);
  });

  it("never puts signed URLs into template params for final_document", () => {
    const params = buildApplicationTemplateParams("final_document", {
      customerName: "Riya",
      serviceName: "ITR",
      applicationId: "app-9",
      notes: "Final ready",
      actionLink: "https://signed.example/secret",
    });
    expect(params.join(" ")).not.toContain("signed.example");
    expect(APPLICATION_CAMPAIGN_MATRIX.find((row) => row.event === "final_document")?.media).toBe(true);
  });

  it("resolves campaign env with fallback", () => {
    expect(getApplicationCampaignName("payment_reminder")).toBe("application_update");
    setEnv({ AISENSY_PAYMENT_REMINDER_CAMPAIGN: "pay_reminder_live" });
    expect(getApplicationCampaignName("payment_reminder")).toBe("pay_reminder_live");
    expect(getApplicationCampaignName("final_document")).toBe("final_doc_campaign");
  });
});

describe("sendAisensyCampaign", () => {
  it("returns configuration_required when API key missing", async () => {
    setEnv({ AISENSY_API_KEY: undefined });
    const result = await sendAisensyCampaign({
      campaignName: "application_update",
      destination: "9876543210",
      templateParams: ["A", "B", "C", "D"],
      dedupe: false,
    });
    expect(result.ok).toBe(false);
    expect(result.configuration_required).toBe(true);
    expect(result.queued).toBe(true);
    expect(result.sent).toBe(false);
  });

  it("posts exact payload and treats success correctly", async () => {
    const fetchImpl = mockFetch({
      status: 200,
      body: { success: true, submitted_message_id: "msg-99" },
    });
    const result = await sendAisensyCampaign({
      campaignName: "application_update",
      destination: "9876543210",
      userName: "Riya",
      templateParams: ["Riya", "ITR", "app-1", "Update"],
      source: "digiconnect-application:progress_update",
      media: { url: "https://signed.example/a.pdf", filename: "a.pdf" },
      dedupe: false,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    expect(result.sent).toBe(true);
    expect(result.providerMessageId).toBe("msg-99");
    const body = JSON.parse(String((fetchImpl.mock.calls[0]?.[1] as RequestInit).body));
    expect(body).toMatchObject({
      campaignName: "application_update",
      destination: "919876543210",
      userName: "Riya",
      templateParams: ["Riya", "ITR", "app-1", "Update"],
      source: "digiconnect-application:progress_update",
      media: { url: "https://signed.example/a.pdf", filename: "a.pdf" },
    });
    expect(body.apiKey).toBe("test-api-key-abcdef123456");
  });

  it("fails on non-2xx and empty success body", async () => {
    const fail = await sendAisensyCampaign({
      campaignName: "application_update",
      destination: "9876543210",
      templateParams: ["A", "B", "C", "D"],
      dedupe: false,
      fetchImpl: mockFetch({ status: 500, body: "error" }) as unknown as typeof fetch,
    });
    expect(fail.ok).toBe(false);
    expect(fail.errorCode).toBe("provider_rejected");

    const empty = await sendAisensyCampaign({
      campaignName: "application_update",
      destination: "9876543210",
      templateParams: ["A", "B", "C", "D"],
      dedupe: false,
      fetchImpl: mockFetch({ status: 200, body: {} }) as unknown as typeof fetch,
    });
    expect(empty.ok).toBe(false);
  });

  it("times out safely", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    const result = await sendAisensyCampaign({
      campaignName: "application_update",
      destination: "9876543210",
      templateParams: ["A", "B", "C", "D"],
      dedupe: false,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("timeout");
  }, 20_000);

  it("does not log API key in network error path", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendAisensyCampaign({
      campaignName: "application_update",
      destination: "9876543210",
      templateParams: ["A", "B", "C", "D"],
      dedupe: false,
      fetchImpl: vi.fn(async () => {
        throw new Error("upstream failed apiKey=test-api-key-abcdef123456");
      }) as unknown as typeof fetch,
    });
    const dumped = JSON.stringify(spy.mock.calls);
    expect(dumped).not.toContain("test-api-key-abcdef123456");
    spy.mockRestore();
  });
});
