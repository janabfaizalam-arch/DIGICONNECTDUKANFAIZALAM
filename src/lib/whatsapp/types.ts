/**
 * Shared WhatsApp / AiSensy types for DigiConnect Dukan application messaging.
 * OTP auth types remain in `aisensy.ts`.
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

export type AisensyCampaignDeliveryStatus =
  | "sent"
  | "failed"
  | "queued"
  | "configuration_required";

export type AisensyMediaPayload = {
  url: string;
  filename: string;
};

export type AisensyCampaignButton = {
  type: "button";
  sub_type: "url";
  index: number;
  parameters: Array<{ type: "text"; text: string }>;
};

export type SendAisensyCampaignInput = {
  campaignName: string;
  destination: string;
  userName?: string;
  templateParams: string[];
  source?: string;
  media?: AisensyMediaPayload;
  buttons?: AisensyCampaignButton[];
  /** When true (default), apply short in-memory duplicate suppression. */
  dedupe?: boolean;
  fetchImpl?: typeof fetch;
};

export type SendAisensyCampaignResult = {
  ok: boolean;
  queued: boolean;
  sent: boolean;
  failed: boolean;
  configuration_required: boolean;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  campaignName: string | null;
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
