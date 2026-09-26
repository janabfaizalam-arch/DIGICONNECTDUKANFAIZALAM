import { describe, expect, it } from "vitest";

import {
  INVOICE_LINK_TTL_DAYS,
  createInvoiceLinkToken,
  getInvoiceShareUrl,
  verifyInvoiceLinkToken,
} from "@/lib/invoices/invoice-link";

const env = {
  AUTH_HMAC_SECRET: "x".repeat(40),
  NEXT_PUBLIC_SITE_URL: "https://www.rnos.in/",
} as unknown as NodeJS.ProcessEnv;
const id = "11111111-2222-3333-4444-555555555555";
const now = Date.parse("2026-09-26T10:00:00Z");

describe("invoice WhatsApp link", () => {
  it("verifies its own token for the same invoice only", () => {
    const token = createInvoiceLinkToken(id, { env, now })!;
    expect(verifyInvoiceLinkToken(id, token, { env, now })).toBe(true);
    expect(verifyInvoiceLinkToken("11111111-2222-3333-4444-000000000000", token, { env, now })).toBe(false);
    expect(verifyInvoiceLinkToken(id, `${token}x`, { env, now })).toBe(false);
    expect(verifyInvoiceLinkToken(id, null, { env, now })).toBe(false);
  });

  it("expires", () => {
    const token = createInvoiceLinkToken(id, { env, now })!;
    const later = now + (INVOICE_LINK_TTL_DAYS + 1) * 86_400_000;
    expect(verifyInvoiceLinkToken(id, token, { env, now: later })).toBe(false);
  });

  it("rejects a token whose expiry was edited", () => {
    const token = createInvoiceLinkToken(id, { env, now })!;
    const [exp, sig] = token.split(".");
    expect(verifyInvoiceLinkToken(id, `${Number(exp) + 999999}.${sig}`, { env, now })).toBe(false);
  });

  it("links the PDF when it can sign, the login page when it cannot", () => {
    expect(getInvoiceShareUrl(id, { env, now })).toMatch(
      new RegExp(`^https://www\\.rnos\\.in/api/invoices/${id}/pdf\\?t=\\d+\\.`),
    );
    const noSecret = { NEXT_PUBLIC_SITE_URL: "https://www.rnos.in" } as unknown as NodeJS.ProcessEnv;
    expect(getInvoiceShareUrl(id, { env: noSecret, now })).toBe(`https://www.rnos.in/invoice/${id}`);
    expect(verifyInvoiceLinkToken(id, createInvoiceLinkToken(id, { env, now }), { env: noSecret, now })).toBe(false);
  });
});
