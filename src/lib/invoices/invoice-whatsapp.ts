import "server-only";

import { getInvoiceShareUrl } from "@/lib/invoices/invoice-link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  sendApplicationWhatsApp,
  type SendApplicationWhatsAppResult,
} from "@/lib/whatsapp/application-notify";
import { normalizeAisensyDestination } from "@/lib/whatsapp/aisensy";

export type SendInvoiceWhatsAppResult =
  | SendApplicationWhatsAppResult
  | { ok: false; code: "invoice_not_found" | "invalid_mobile" | "supabase_missing"; error: string; requestId: string };

function firstValidMobile(candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const value = String(candidate ?? "").trim();
    if (!value || /^0+$/.test(value.replace(/\D/g, ""))) continue;
    if (normalizeAisensyDestination(value).ok) return value;
  }
  return null;
}

/**
 * Send an invoice to the customer's WhatsApp: number, amount and a PDF link
 * that opens without a login (see invoice-link.ts).
 *
 * Goes through `sendApplicationWhatsApp`, so it obeys
 * CRM_NOTIFICATION_DELIVERY_MODE like every other application message:
 * queue → outbox, direct → sent now, disabled/unset → recorded, not sent.
 *
 * `manual` (the admin button) gets a fresh idempotency version per minute so
 * an admin can resend a delivered invoice later, while a double click still
 * collapses into one message. The automatic send after payment is version 1,
 * so a retried payment webhook never sends the invoice twice.
 */
export async function sendInvoiceWhatsApp(
  invoiceId: string,
  options: { manual?: boolean; now?: number } = {},
): Promise<SendInvoiceWhatsAppResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, code: "supabase_missing", error: "Database unavailable.", requestId: invoiceId };
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, application_id, customer_id, invoice_number, customer_name, customer_mobile, service_name, amount")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice?.application_id) {
    return { ok: false, code: "invoice_not_found", error: "Invoice not found.", requestId: invoiceId };
  }

  const { data: application } = await supabase
    .from("applications")
    .select("customer_mobile, customer_details, form_data")
    .eq("id", invoice.application_id)
    .maybeSingle();
  const details = (application?.customer_details ?? {}) as Record<string, unknown>;
  const formData = (application?.form_data ?? {}) as Record<string, unknown>;

  const mobile = firstValidMobile([
    invoice.customer_mobile,
    application?.customer_mobile,
    details.mobile,
    formData.mobile,
  ]);
  if (!mobile) {
    return {
      ok: false,
      code: "invalid_mobile",
      error: "No valid WhatsApp number on this invoice or its application.",
      requestId: invoiceId,
    };
  }

  const now = options.now ?? Date.now();
  return sendApplicationWhatsApp({
    applicationId: invoice.application_id,
    eventType: "invoice_generated",
    recipientMobile: mobile,
    customerName: String(invoice.customer_name || details.name || "Customer"),
    serviceName: invoice.service_name,
    customerId: invoice.customer_id ?? null,
    amount: invoice.amount,
    invoiceNumber: invoice.invoice_number,
    invoiceLink: getInvoiceShareUrl(invoice.id, { now }),
    version: options.manual ? Math.floor(now / 60_000) : 1,
  });
}
