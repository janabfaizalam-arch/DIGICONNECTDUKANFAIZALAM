import type { ApplicationDocument } from "@/lib/portal-types";

export function isFinalApplicationDocument(document: Pick<ApplicationDocument, "is_final" | "document_type">) {
  return Boolean(document.is_final) || document.document_type === "final_document";
}

/** Customer dashboard / tracking — final docs are WhatsApp-only. */
export function isCustomerVisibleDocument(document: ApplicationDocument) {
  if (isFinalApplicationDocument(document)) return false;
  if (document.customer_visible === false) return false;
  return true;
}

/** Digi Partner dashboard — final docs and partner-hidden docs stay out. */
export function isPartnerVisibleDocument(document: ApplicationDocument) {
  if (isFinalApplicationDocument(document)) return false;
  if (document.partner_visible === false) return false;
  return true;
}
