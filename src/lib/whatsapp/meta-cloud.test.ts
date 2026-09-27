import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";

import {
  buildMetaTemplatePayload,
  buildMetaTextPayload,
  fetchMetaTemplates,
  interpretMetaResponse,
  loadMetaConfig,
  parseMetaInboundMessages,
  parseMetaStatusEvents,
  sanitizeMetaTextParam,
  verifyMetaSignature,
} from "@/lib/whatsapp/meta-cloud";

const ENV = {
  META_WHATSAPP_PHONE_NUMBER_ID: "1303931342795977",
  META_WHATSAPP_ACCESS_TOKEN: "EAAG-test-token-should-never-leak",
  META_WHATSAPP_WABA_ID: "1422131553084116",
} as unknown as NodeJS.ProcessEnv;

describe("Meta config", () => {
  it("needs the phone number id and token", () => {
    expect(loadMetaConfig({} as NodeJS.ProcessEnv).ok).toBe(false);
    expect(loadMetaConfig({ ...ENV, META_WHATSAPP_PHONE_NUMBER_ID: "abc" }).ok).toBe(false);
    const loaded = loadMetaConfig({ ...ENV, META_WHATSAPP_API_VERSION: "24.0" });
    expect(loaded.ok && loaded.config).toMatchObject({
      phoneNumberId: "1303931342795977",
      graphVersion: "v24.0",
      wabaId: "1422131553084116",
    });
  });
});

describe("Meta payloads", () => {
  it("maps params to the body, media to a document header and OTP to a url button", () => {
    const payload = buildMetaTemplatePayload({
      to: "919876543210",
      templateName: "login_otp",
      language: "en",
      bodyParams: ["482913"],
      buttons: [{ type: "button", sub_type: "url", index: 0, parameters: [{ type: "text", text: "482913" }] }],
      media: { url: "https://x.test/doc.pdf", filename: "doc.pdf" },
    });
    expect(payload).toMatchObject({ messaging_product: "whatsapp", to: "919876543210", type: "template" });
    expect(payload.template.components).toEqual([
      { type: "header", parameters: [{ type: "document", document: { link: "https://x.test/doc.pdf", filename: "doc.pdf" } }] },
      { type: "body", parameters: [{ type: "text", text: "482913" }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "482913" }] },
    ]);
  });

  it("builds a plain text message", () => {
    expect(buildMetaTextPayload({ to: "919876543210", body: "Namaste" })).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "919876543210",
      type: "text",
      text: { body: "Namaste", preview_url: false },
    });
  });

  it("flattens text Meta would reject", () => {
    expect(sanitizeMetaTextParam(" a\nb\t c      d ")).toBe("a b c d");
  });
});

describe("Meta responses", () => {
  it("reads the wamid on success", () => {
    expect(interpretMetaResponse(200, { messages: [{ id: "wamid.X" }] })).toEqual({ ok: true, messageId: "wamid.X", httpStatus: 200 });
  });

  it("classifies token, rate-limit, window and template errors", () => {
    expect(interpretMetaResponse(401, { error: { code: 190, message: "expired" } })).toMatchObject({ code: "meta_auth_failed" });
    expect(interpretMetaResponse(400, { error: { code: 131056 } })).toMatchObject({ code: "meta_rate_limited" });
    expect(interpretMetaResponse(400, { error: { code: 131047 } })).toMatchObject({ code: "outside_service_window" });
    expect(interpretMetaResponse(404, { error: { code: 132001, message: "Template name does not exist" } })).toMatchObject({
      code: "template_not_approved",
      metaCode: 132001,
    });
    expect(interpretMetaResponse(400, { error: { code: 131026 } })).toMatchObject({ code: "provider_rejected" });
  });
});

describe("template status lookup", () => {
  it("reads the WABA's templates with the bearer token", async () => {
    const loaded = loadMetaConfig(ENV);
    if (!loaded.ok) throw new Error("config");
    let calledUrl = "";
    const fetchImpl = (async (url: string) => {
      calledUrl = url;
      return new Response(JSON.stringify({ data: [{ name: "login_otp", language: "en", status: "APPROVED" }] }));
    }) as unknown as typeof fetch;
    const result = await fetchMetaTemplates(loaded.config, { fetchImpl });
    expect(calledUrl).toContain("/v23.0/1422131553084116/message_templates");
    expect(result).toEqual({ ok: true, templates: [{ name: "login_otp", language: "en", status: "APPROVED" }] });
  });

  it("needs the WABA id", async () => {
    const loaded = loadMetaConfig({ ...ENV, META_WHATSAPP_WABA_ID: "" });
    if (!loaded.ok) throw new Error("config");
    expect(await fetchMetaTemplates(loaded.config)).toMatchObject({ ok: false });
  });
});

describe("Meta webhook parsing", () => {
  it("verifies the app-secret signature", async () => {
    const body = '{"object":"whatsapp_business_account"}';
    const sig = `sha256=${createHmac("sha256", "app-secret").update(body).digest("hex")}`;
    expect(await verifyMetaSignature(body, sig, "app-secret")).toBe(true);
    expect(await verifyMetaSignature(`${body} `, sig, "app-secret")).toBe(false);
    expect(await verifyMetaSignature(body, sig, "other")).toBe(false);
    expect(await verifyMetaSignature(body, null, "app-secret")).toBe(false);
  });

  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "1422131553084116",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "1303931342795977" },
              contacts: [{ wa_id: "919876543210", profile: { name: "Riya" } }],
              statuses: [
                { id: "wamid.1", status: "delivered", timestamp: "1790000000" },
                { id: "wamid.2", status: "failed", errors: [{ code: 131026, title: "Message undeliverable" }] },
              ],
              messages: [
                { id: "wamid.in1", from: "919876543210", type: "text", timestamp: "1790000001", text: { body: "PAN card kab tak?" } },
                { id: "wamid.in2", from: "919876543210", type: "image", image: { caption: "Aadhaar photo" } },
                { id: "wamid.in3", from: "919876543210", type: "button", button: { text: "Yes" } },
              ],
            },
          },
        ],
      },
    ],
  };

  it("extracts delivery statuses", () => {
    expect(parseMetaStatusEvents(payload)).toEqual([
      { messageId: "wamid.1", status: "delivered", timestamp: "1790000000", errorCode: null, errorMessage: null },
      { messageId: "wamid.2", status: "failed", timestamp: null, errorCode: "131026", errorMessage: "Message undeliverable" },
    ]);
    expect(parseMetaStatusEvents({ object: "page", entry: [] })).toEqual([]);
  });

  it("extracts inbound messages with sender, name and readable text", () => {
    const messages = parseMetaInboundMessages(payload);
    expect(messages.map((m) => [m.messageId, m.type, m.text])).toEqual([
      ["wamid.in1", "text", "PAN card kab tak?"],
      ["wamid.in2", "image", "Aadhaar photo"],
      ["wamid.in3", "button", "Yes"],
    ]);
    expect(messages[0]).toMatchObject({ from: "919876543210", profileName: "Riya", toPhoneNumberId: "1303931342795977" });
  });
});
