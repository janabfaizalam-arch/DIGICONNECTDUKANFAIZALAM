import { afterEach, describe, expect, it } from "vitest";

import {
  APPLICATION_TEMPLATE_MATRIX,
  buildApplicationTemplateParams,
  getApplicationTemplateName,
} from "@/lib/whatsapp/templates";
import {
  WHATSAPP_TEMPLATES,
  compareWithMetaTemplates,
  resolveTemplate,
  resolveTemplateLanguage,
} from "@/lib/whatsapp/template-registry";

const TOUCHED = [
  "WHATSAPP_TEMPLATE_PAYMENT_REMINDER",
  "WHATSAPP_TEMPLATE_APPLICATION_UPDATE",
  "WHATSAPP_TEMPLATE_LOGIN_OTP",
  "WHATSAPP_TEMPLATE_LOGIN_OTP_LANGUAGE",
  "META_WHATSAPP_TEMPLATE_LANGUAGE",
];
const saved = Object.fromEntries(TOUCHED.map((key) => [key, process.env[key]]));
afterEach(() => {
  for (const key of TOUCHED) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
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
    expect(APPLICATION_TEMPLATE_MATRIX.find((row) => row.event === "final_document")?.media).toBe(true);
  });

  it("carries the invoice number, amount and full download link", () => {
    const link = `https://www.rnos.in/api/invoices/abc/pdf?t=1790000000.${"s".repeat(43)}`;
    const params = buildApplicationTemplateParams("invoice_generated", {
      customerName: "Riya",
      serviceName: "PAN Card",
      applicationId: "app-9",
      amount: 199,
      invoiceNumber: "INV-2026-0042",
      invoiceLink: link,
    });
    expect(params[3]).toBe(`Invoice INV-2026-0042 · Amount ₹199 · Download: ${link}`);
    expect(getApplicationTemplateName("invoice_generated")).toBe("application_status");
  });

  it("builds the renewal reminder line", () => {
    const params = buildApplicationTemplateParams("renewal_reminder", {
      customerName: "Riya",
      serviceName: "Bike Insurance",
      applicationId: "app-9",
      renewalReference: "POL-123",
      renewalDue: "26 Oct 2026 (7 days left)",
    });
    expect(params[3]).toBe(
      "Ref POL-123 · Renewal due 26 Oct 2026 (7 days left) · Reply here or visit DigiConnect Dukan to renew on time.",
    );
  });

  it("uses the approved application_status template for every event unless one is overridden", () => {
    expect(getApplicationTemplateName("payment_reminder")).toBe("application_status");
    process.env.WHATSAPP_TEMPLATE_PAYMENT_REMINDER = "payment_reminder_v1";
    expect(getApplicationTemplateName("payment_reminder")).toBe("payment_reminder_v1");
    process.env.WHATSAPP_TEMPLATE_APPLICATION_UPDATE = "application_update_v2";
    expect(getApplicationTemplateName("completed")).toBe("application_update_v2");
    expect(APPLICATION_TEMPLATE_MATRIX.find((row) => row.event === "invoice_generated")?.envVariable).toBe(
      "WHATSAPP_TEMPLATE_INVOICE_GENERATED",
    );
  });
});

describe("template registry", () => {
  it("lists the four business templates with their Meta categories", () => {
    expect(Object.keys(WHATSAPP_TEMPLATES).sort()).toEqual(
      ["application_update", "login_otp", "password_reset", "signup_otp"].sort(),
    );
    expect(WHATSAPP_TEMPLATES.application_update.category).toBe("UTILITY");
    expect(WHATSAPP_TEMPLATES.application_update.bodyParams).toHaveLength(4);
    expect(WHATSAPP_TEMPLATES.login_otp.category).toBe("AUTHENTICATION");
    expect(WHATSAPP_TEMPLATES.login_otp.otpButton).toBe(true);
  });

  it("takes name and language from the environment when set", () => {
    expect(resolveTemplate("login_otp")).toMatchObject({ name: "login_otp", language: "en", nameSource: "default" });
    process.env.META_WHATSAPP_TEMPLATE_LANGUAGE = "en_US";
    process.env.WHATSAPP_TEMPLATE_LOGIN_OTP = "login_code";
    process.env.WHATSAPP_TEMPLATE_LOGIN_OTP_LANGUAGE = "hi";
    expect(resolveTemplate("login_otp")).toMatchObject({
      name: "login_code",
      language: "hi",
      nameSource: "WHATSAPP_TEMPLATE_LOGIN_OTP",
    });
    expect(resolveTemplate("signup_otp").language).toBe("en_US");
    // The application template was approved in Hindi; the global default does not override that.
    expect(resolveTemplate("application_update")).toMatchObject({ name: "application_status", language: "hi" });
    expect(resolveTemplateLanguage("login_code")).toBe("hi");
    expect(resolveTemplateLanguage("something_else")).toBe("en_US");
  });

  it("never calls a template sendable unless Meta reports it APPROVED", () => {
    const report = compareWithMetaTemplates([
      { name: "application_status", language: "hi", status: "APPROVED", category: "UTILITY" },
      { name: "login_otp", language: "en", status: "PENDING", category: "AUTHENTICATION" },
      // Same name, other language — not the template we send.
      { name: "signup_otp", language: "en_US", status: "APPROVED", category: "AUTHENTICATION" },
    ]);
    const byKey = Object.fromEntries(report.map((row) => [row.key, row]));
    expect(byKey.application_update).toMatchObject({ status: "APPROVED", sendable: true });
    expect(byKey.login_otp).toMatchObject({ status: "PENDING", sendable: false });
    expect(byKey.signup_otp).toMatchObject({ status: "MISSING", sendable: false });
    expect(byKey.password_reset).toMatchObject({ status: "MISSING", sendable: false });
  });
});
