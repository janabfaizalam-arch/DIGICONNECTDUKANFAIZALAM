import { createHmac } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { __resetAisensySendDedupeForTests, sendAisensyCampaign } from "@/lib/whatsapp/aisensy";
import {
  buildMetaTemplatePayload,
  interpretMetaResponse,
  loadMetaConfig,
  parseMetaStatusEvents,
  sanitizeMetaTextParam,
  verifyMetaSignature,
} from "@/lib/whatsapp/meta-cloud";

const META_ENV = {
  WHATSAPP_PROVIDER: "meta",
  META_WHATSAPP_PHONE_NUMBER_ID: "123456789012345",
  META_WHATSAPP_ACCESS_TOKEN: "EAAG-test-token-should-never-leak",
};

function setEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => {
  setEnv({
    WHATSAPP_PROVIDER: undefined,
    META_WHATSAPP_PHONE_NUMBER_ID: undefined,
    META_WHATSAPP_ACCESS_TOKEN: undefined,
    META_WHATSAPP_TEMPLATE_LANGUAGE: undefined,
  });
  __resetAisensySendDedupeForTests();
  vi.restoreAllMocks();
});

describe("Meta config", () => {
  it("needs the phone number id and token", () => {
    expect(loadMetaConfig({} as NodeJS.ProcessEnv).ok).toBe(false);
    const loaded = loadMetaConfig({ ...META_ENV, META_WHATSAPP_API_VERSION: "24.0" } as unknown as NodeJS.ProcessEnv);
    expect(loaded.ok && loaded.config.graphVersion).toBe("v24.0");
    expect(loaded.ok && loaded.config.language).toBe("en");
  });
});

describe("Meta template payload", () => {
  it("maps params to the body, media to a document header and OTP to a url button", () => {
    const payload = buildMetaTemplatePayload({
      to: "919876543210",
      templateName: "login_otp",
      language: "en",
      bodyParams: ["482913"],
      buttons: [{ type: "button", sub_type: "copy_code", index: 0, parameters: [{ type: "text", text: "482913" }] }],
      media: { url: "https://x.test/doc.pdf", filename: "doc.pdf" },
    });
    expect(payload.template.components).toEqual([
      { type: "header", parameters: [{ type: "document", document: { link: "https://x.test/doc.pdf", filename: "doc.pdf" } }] },
      { type: "body", parameters: [{ type: "text", text: "482913" }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "482913" }] },
    ]);
  });

  it("flattens text Meta would reject", () => {
    expect(sanitizeMetaTextParam(" a\nb\t c      d ")).toBe("a b c d");
  });
});

describe("Meta responses", () => {
  it("reads the wamid on success", () => {
    expect(interpretMetaResponse(200, { messages: [{ id: "wamid.X" }] })).toEqual({ ok: true, messageId: "wamid.X", httpStatus: 200 });
  });

  it("classifies token, rate-limit and template errors", () => {
    expect(interpretMetaResponse(401, { error: { code: 190, message: "expired" } })).toMatchObject({ ok: false, code: "meta_auth_failed" });
    expect(interpretMetaResponse(400, { error: { code: 131056 } })).toMatchObject({ ok: false, code: "meta_rate_limited" });
    expect(interpretMetaResponse(404, { error: { code: 132001, message: "Template name does not exist" } })).toMatchObject({
      ok: false,
      code: "provider_rejected",
      metaCode: 132001,
    });
  });
});

describe("sendAisensyCampaign with WHATSAPP_PROVIDER=meta", () => {
  it("posts the template to the Graph API with a bearer token", async () => {
    setEnv(META_ENV);
    vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: "wamid.ABC" }] }), { status: 200 }));

    const result = await sendAisensyCampaign({
      campaignName: "application_update",
      destination: "+91 98765 43210",
      templateParams: ["Riya", "PAN Card", "APP-1", "Invoice ready"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toMatchObject({ ok: true, sent: true, providerMessageId: "wamid.ABC", destination: "919876543210" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v23.0/123456789012345/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${META_ENV.META_WHATSAPP_ACCESS_TOKEN}`);
    const body = JSON.parse(String(init.body));
    expect(body.template.name).toBe("application_update");
    expect(body.template.components[0].parameters).toHaveLength(4);
  });

  it("is configuration_required, not failed, without credentials", async () => {
    setEnv({ WHATSAPP_PROVIDER: "meta" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn();
    const result = await sendAisensyCampaign({
      campaignName: "application_update",
      destination: "9876543210",
      templateParams: ["a"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toMatchObject({ ok: false, configuration_required: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports rate limits as 429 so the outbox retries, and never logs the token", async () => {
    setEnv(META_ENV);
    vi.spyOn(console, "info").mockImplementation(() => {});
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: 131056, message: `limit ${META_ENV.META_WHATSAPP_ACCESS_TOKEN}` } }), {
          status: 400,
        }),
    );
    const result = await sendAisensyCampaign({
      campaignName: "application_update",
      destination: "9876543210",
      templateParams: ["a"],
      dedupe: false,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toMatchObject({ ok: false, errorCode: "meta_rate_limited", httpStatus: 429 });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(META_ENV.META_WHATSAPP_ACCESS_TOKEN);
    expect(result.errorMessage).not.toContain(META_ENV.META_WHATSAPP_ACCESS_TOKEN);
  });
});

describe("Meta webhook", () => {
  it("verifies the app-secret signature", async () => {
    const body = '{"object":"whatsapp_business_account"}';
    const sig = `sha256=${createHmac("sha256", "app-secret").update(body).digest("hex")}`;
    expect(await verifyMetaSignature(body, sig, "app-secret")).toBe(true);
    expect(await verifyMetaSignature(`${body} `, sig, "app-secret")).toBe(false);
    expect(await verifyMetaSignature(body, sig, "other")).toBe(false);
    expect(await verifyMetaSignature(body, null, "app-secret")).toBe(false);
  });

  it("extracts delivery statuses and ignores inbound messages", () => {
    const events = parseMetaStatusEvents({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                statuses: [
                  { id: "wamid.1", status: "delivered", timestamp: "1790000000" },
                  { id: "wamid.2", status: "failed", errors: [{ code: 131026, title: "Message undeliverable" }] },
                ],
                messages: [{ id: "wamid.in", text: { body: "hi" } }],
              },
            },
          ],
        },
      ],
    });
    expect(events).toEqual([
      { messageId: "wamid.1", status: "delivered", timestamp: "1790000000", errorCode: null, errorMessage: null },
      { messageId: "wamid.2", status: "failed", timestamp: null, errorCode: "131026", errorMessage: "Message undeliverable" },
    ]);
    expect(parseMetaStatusEvents({ object: "page", entry: [] })).toEqual([]);
  });
});
