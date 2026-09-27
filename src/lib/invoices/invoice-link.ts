import { createHmac, timingSafeEqual } from "crypto";

/**
 * The invoice link a customer gets on WhatsApp.
 *
 * `/invoice/[id]` needs a login, and a customer who bought over the counter
 * may never have set a password. So the WhatsApp link points at the PDF with
 * a signed token instead: it opens without a login, only for that invoice,
 * and stops working after `INVOICE_LINK_TTL_DAYS`.
 *
 * Signed with AUTH_HMAC_SECRET under its own label, so a token minted here
 * can never be replayed as anything else that secret signs. Without the
 * secret no token is minted and the link falls back to the login page.
 */

export const INVOICE_LINK_TTL_DAYS = 30;
const LABEL = "invoice-pdf-link:v1";

function secret(env: NodeJS.ProcessEnv = process.env): string | null {
  const value = env.AUTH_HMAC_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

function sign(key: string, invoiceId: string, expiresAt: number): string {
  return createHmac("sha256", key).update(`${LABEL}:${invoiceId}:${expiresAt}`).digest("base64url");
}

export function createInvoiceLinkToken(
  invoiceId: string,
  options: { now?: number; env?: NodeJS.ProcessEnv } = {},
): string | null {
  const key = secret(options.env);
  if (!key) return null;
  const now = options.now ?? Date.now();
  const expiresAt = Math.floor(now / 1000) + INVOICE_LINK_TTL_DAYS * 24 * 60 * 60;
  return `${expiresAt}.${sign(key, invoiceId, expiresAt)}`;
}

export function verifyInvoiceLinkToken(
  invoiceId: string,
  token: string | null | undefined,
  options: { now?: number; env?: NodeJS.ProcessEnv } = {},
): boolean {
  const key = secret(options.env);
  if (!key || !token) return false;
  const [expiresRaw, signature] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isSafeInteger(expiresAt) || !signature) return false;
  if (expiresAt * 1000 < (options.now ?? Date.now())) return false;

  const expected = Buffer.from(sign(key, invoiceId, expiresAt));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function siteUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in").replace(/\/$/, "");
}

/** Public PDF link when a token can be minted, otherwise the login-gated invoice page. */
export function getInvoiceShareUrl(
  invoiceId: string,
  options: { now?: number; env?: NodeJS.ProcessEnv } = {},
): string {
  const token = createInvoiceLinkToken(invoiceId, options);
  const base = siteUrl(options.env);
  if (!token) return `${base}/invoice/${invoiceId}`;
  return `${base}/api/invoices/${invoiceId}/pdf?t=${encodeURIComponent(token)}`;
}
