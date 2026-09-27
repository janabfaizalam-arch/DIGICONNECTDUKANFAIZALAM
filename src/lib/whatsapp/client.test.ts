import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetWhatsAppSendDedupeForTests,
  maskTemplateParamForLog,
  normalizeWhatsAppDestination,
  redactSecrets,
  resolveOtpTemplate,
  sendWhatsAppOtp,
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from "@/lib/whatsapp/client";

const TOKEN = "EAAGtesttokenshouldneverleak1234567890";
const META_ENV: Record<string, string> = {
  META_WHATSAPP_PHONE_NUMBER_ID: "1303931342795977",
  META_WHATSAPP_ACCESS_TOKEN: TOKEN,
  META_APP_SECRET: "app-secret-value-1234",
  META_WHATSAPP_WEBHOOK_VERIFY_TOKEN: "rnos_whatsapp_verify_test",
};
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const [key, value] of Object.entries(META_ENV)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }
  __resetWhatsAppSendDedupeForTests();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  for (const key of Object.keys(META_ENV)) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.restoreAllMocks();
});

function graph(status: number, body: unknown) {
  return vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => new Response(JSON.stringify(body), { status }),
  );
}

function sentBody(fetchImpl: ReturnType<typeof graph>) {
  const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
  return { url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
}

describe("numbers and redaction", () => {
  it("normalizes Indian numbers to Meta's 91XXXXXXXXXX", () => {
    expect(normalizeWhatsAppDestination("+91 98765 43210")).toMatchObject({ ok: true, destination: "919876543210" });
    expect(normalizeWhatsAppDestination("09876543210")).toMatchObject({ ok: true, destination: "919876543210" });
    expect(normalizeWhatsAppDestination("12345").ok).toBe(false);
    expect(normalizeWhatsAppDestination("5876543210").ok).toBe(false);
  });

  it("removes every Meta secret and OTP digits from log text", () => {
    const leaked = `token ${TOKEN} secret app-secret-value-1234 verify rnos_whatsapp_verify_test Bearer ${TOKEN} "text":"482913"`;
    const clean = redactSecrets(leaked);
    expect(clean).not.toContain(TOKEN);
    expect(clean).not.toContain("app-secret-value-1234");
    expect(clean).not.toContain("rnos_whatsapp_verify_test");
    expect(clean).not.toContain("482913");
    expect(maskTemplateParamForLog("482913")).toBe("[OTP_6]");
  });
});

describe("outgoing template", () => {
  it("posts to /{phone-number-id}/messages with the bearer token and ordered params", async () => {
    const fetchImpl = graph(200, { messages: [{ id: "wamid.ABC" }] });
    const result = await sendWhatsAppTemplate({
      templateName: "application_update",
      destination: "+91 98765 43210",
      templateParams: ["Riya", "PAN Card", "APP-1", "Processing started"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toMatchObject({ ok: true, sent: true, providerMessageId: "wamid.ABC", destination: "919876543210" });
    const sent = sentBody(fetchImpl);
    expect(sent.url).toBe("https://graph.facebook.com/v23.0/1303931342795977/messages");
    expect(sent.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(sent.body.template).toEqual({
      name: "application_update",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: ["Riya", "PAN Card", "APP-1", "Processing started"].map((text) => ({ type: "text", text })),
        },
      ],
    });
  });

  it("is configuration_required, not a send, without credentials", async () => {
    delete process.env.META_WHATSAPP_ACCESS_TOKEN;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = graph(200, {});
    const result = await sendWhatsAppTemplate({
      templateName: "application_update",
      destination: "9876543210",
      templateParams: ["a"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toMatchObject({ ok: false, configuration_required: true, errorCode: "missing_meta_config" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports rate limits as 429 so the outbox retries, and never leaks the token", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = graph(400, { error: { code: 131056, message: `limit ${TOKEN}` } });
    const result = await sendWhatsAppTemplate({
      templateName: "application_update",
      destination: "9876543210",
      templateParams: ["a"],
      dedupe: false,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toMatchObject({ ok: false, errorCode: "meta_rate_limited", httpStatus: 429 });
    expect(result.errorMessage).not.toContain(TOKEN);
    expect(JSON.stringify(errors.mock.calls)).not.toContain(TOKEN);
  });

  it("names an unapproved template instead of a generic failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = graph(404, { error: { code: 132001, message: "Template name does not exist in the translation" } });
    const result = await sendWhatsAppTemplate({
      templateName: "application_update",
      destination: "9876543210",
      templateParams: ["a"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toMatchObject({ ok: false, errorCode: "template_not_approved" });
  });

  it("blocks an identical send within a few seconds (double click)", async () => {
    const fetchImpl = graph(200, { messages: [{ id: "wamid.1" }] });
    const input = {
      templateName: "application_update",
      destination: "9876543210",
      templateParams: ["a"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    };
    expect((await sendWhatsAppTemplate(input)).ok).toBe(true);
    expect(await sendWhatsAppTemplate(input)).toMatchObject({ ok: false, errorCode: "duplicate_send" });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

describe("outgoing text", () => {
  it("sends free-form text", async () => {
    const fetchImpl = graph(200, { messages: [{ id: "wamid.T" }] });
    const result = await sendWhatsAppText({
      destination: "9876543210",
      body: "Aapka document ready hai.",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toMatchObject({ ok: true, providerMessageId: "wamid.T" });
    expect(sentBody(fetchImpl).body).toMatchObject({ type: "text", text: { body: "Aapka document ready hai." } });
  });

  it("reports the 24-hour window instead of pretending it sent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = graph(400, { error: { code: 131047, message: "Re-engagement message" } });
    const result = await sendWhatsAppText({
      destination: "9876543210",
      body: "Hello",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toMatchObject({ ok: false, errorCode: "outside_service_window" });
  });
});

describe("OTP", () => {
  it("maps each purpose to its Authentication template; signup never falls back", () => {
    const name = (purpose: string) => {
      const r = resolveOtpTemplate(purpose);
      return r.ok ? r.templateName : r.code;
    };
    expect(name("customer_signup")).toBe("signup_otp");
    expect(name("login")).toBe("login_otp");
    expect(name("forgot_pin")).toBe("password_reset");
    expect(name("create_pin")).toBe("password_reset");
    expect(name("nonsense")).toBe("OTP_PROVIDER_CONFIG_MISSING");
  });

  it("puts the code in {{1}} and on the copy-code button", async () => {
    const fetchImpl = graph(200, { messages: [{ id: "wamid.OTP" }] });
    const result = await sendWhatsAppOtp({
      phone: "9876543210",
      otp: "482913",
      purpose: "customer_signup",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toMatchObject({ ok: true, provider: "meta", templateName: "signup_otp", providerMessageId: "wamid.OTP" });
    expect(sentBody(fetchImpl).body.template.components).toEqual([
      { type: "body", parameters: [{ type: "text", text: "482913" }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "482913" }] },
    ]);
  });

  it("returns a generic customer-facing error when Meta refuses", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = graph(400, { error: { code: 132001, message: "no template" } });
    const result = await sendWhatsAppOtp({
      phone: "9876543210",
      otp: "482913",
      purpose: "login",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Unable to send OTP. Please try again in a few minutes.");
      expect(result.code).toBe("template_not_approved");
    }
  });

  it("rejects a malformed code before calling Meta", async () => {
    const fetchImpl = graph(200, {});
    const result = await sendWhatsAppOtp({
      phone: "9876543210",
      otp: "12",
      purpose: "login",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toMatchObject({ ok: false, code: "invalid_otp" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
