/**
 * Shared WhatsApp types for DigiConnect Dukan messaging (Meta WhatsApp Cloud API).
 */

export type ApplicationWhatsAppEvent =
  | "application_submitted"
  | "payment_pending"
  | "payment_reminder"
  | "payment_success"
  | "documents_required"
  | "documents_received"
  | "under_review"
  | "processing_started"
  | "progress_update"
  | "objection"
  | "objection_resolved"
  | "completed"
  | "final_document"
  | "invoice_generated"
  | "renewal_reminder"
  | "custom_message";

/** Admin Communication tab / API action names (mapped server-side to events). */
export type AdminWhatsAppAction =
  | "payment_reminder"
  | "document_request"
  | "progress_update"
  | "objection"
  | "objection_resolved"
  | "processing_update"
  | "completion_message"
  | "custom_message";

export type WhatsAppMediaPayload = {
  url: string;
  filename: string;
};

/** OTP code on an Authentication template's button 0 (Meta sends it as a url button). */
export type WhatsAppOtpButton = {
  type: "button";
  sub_type: "url";
  index: number;
  parameters: Array<{ type: "text"; text: string }>;
};

export type SendWhatsAppTemplateInput = {
  /** Meta template name (resolve it through template-registry, never from the browser). */
  templateName: string;
  /** Template language; defaults to the registry's language for this name. */
  language?: string;
  destination: string;
  templateParams: string[];
  source?: string;
  media?: WhatsAppMediaPayload;
  buttons?: WhatsAppOtpButton[];
  /** When true (default), apply short in-memory duplicate suppression. */
  dedupe?: boolean;
  fetchImpl?: typeof fetch;
};

export type SendWhatsAppResult = {
  ok: boolean;
  queued: boolean;
  sent: boolean;
  failed: boolean;
  configuration_required: boolean;
  /** Meta wamid — correlates delivery webhooks. */
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  templateName: string | null;
  destination: string | null;
  requestId: string;
  /** HTTP status when a provider response was received */
  httpStatus?: number | null;
};

export type ApplicationTemplateContext = {
  customerName: string;
  serviceName: string;
  applicationId: string;
  applicationNumber?: string;
  status?: string;
  amount?: string | number | null;
  requiredDocuments?: string;
  objectionMessage?: string;
  progressMessage?: string;
  actionLink?: string;
  supportInfo?: string;
  notes?: string;
  customMessage?: string;
  /** invoice_generated */
  invoiceNumber?: string;
  invoiceLink?: string;
  /** renewal_reminder — already human-readable, e.g. "12 Oct 2026 (7 days left)" */
  renewalDue?: string;
  renewalReference?: string;
};

export const ADMIN_WHATSAPP_ACTIONS: readonly AdminWhatsAppAction[] = [
  "payment_reminder",
  "document_request",
  "progress_update",
  "objection",
  "objection_resolved",
  "processing_update",
  "completion_message",
  "custom_message",
] as const;

export const WHATSAPP_MOBILE_REQUIRED_ERROR = "Valid WhatsApp mobile number required";
