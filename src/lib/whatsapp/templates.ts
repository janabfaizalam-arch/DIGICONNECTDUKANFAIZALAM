/**
 * AiSensy campaign + template parameter contracts for application notifications.
 *
 * Parameter order must match AiSensy-approved templates:
 *   [0] customerName
 *   [1] serviceName
 *   [2] applicationNumber
 *   [3] detail (status / amount / documents / objection / progress / custom)
 *   [4] supportInfo (optional — omitted when empty so 4-param templates still work)
 *
 * Final document campaigns may attach media; template params still exclude signed URLs.
 */

import type {
  ApplicationTemplateContext,
  ApplicationWhatsAppEvent,
} from "@/lib/whatsapp/types";

const DEFAULT_APPLICATION_CAMPAIGN = "application_update";
const DEFAULT_SUPPORT =
  "DigiConnect Dukan Support — WhatsApp help available in your dashboard.";

type CampaignEnvKey =
  | "AISENSY_APPLICATION_SUBMITTED_CAMPAIGN"
  | "AISENSY_PAYMENT_PENDING_CAMPAIGN"
  | "AISENSY_PAYMENT_SUCCESS_CAMPAIGN"
  | "AISENSY_DOCUMENT_REQUIRED_CAMPAIGN"
  | "AISENSY_DOCUMENT_RECEIVED_CAMPAIGN"
  | "AISENSY_UNDER_REVIEW_CAMPAIGN"
  | "AISENSY_PROCESSING_CAMPAIGN"
  | "AISENSY_PROGRESS_UPDATE_CAMPAIGN"
  | "AISENSY_OBJECTION_CAMPAIGN"
  | "AISENSY_OBJECTION_RESOLVED_CAMPAIGN"
  | "AISENSY_APPLICATION_COMPLETED_CAMPAIGN"
  | "AISENSY_FINAL_DOCUMENT_CAMPAIGN"
  | "AISENSY_PAYMENT_REMINDER_CAMPAIGN"
  | "AISENSY_APPLICATION_CAMPAIGN";

const EVENT_CAMPAIGN_ENV: Record<ApplicationWhatsAppEvent, CampaignEnvKey[]> = {
  application_submitted: ["AISENSY_APPLICATION_SUBMITTED_CAMPAIGN", "AISENSY_APPLICATION_CAMPAIGN"],
  payment_pending: ["AISENSY_PAYMENT_PENDING_CAMPAIGN", "AISENSY_APPLICATION_CAMPAIGN"],
  payment_reminder: [
    "AISENSY_PAYMENT_REMINDER_CAMPAIGN",
    "AISENSY_PAYMENT_PENDING_CAMPAIGN",
    "AISENSY_APPLICATION_CAMPAIGN",
  ],
  payment_success: ["AISENSY_PAYMENT_SUCCESS_CAMPAIGN", "AISENSY_APPLICATION_CAMPAIGN"],
  documents_required: ["AISENSY_DOCUMENT_REQUIRED_CAMPAIGN", "AISENSY_APPLICATION_CAMPAIGN"],
  documents_received: ["AISENSY_DOCUMENT_RECEIVED_CAMPAIGN", "AISENSY_APPLICATION_CAMPAIGN"],
  under_review: ["AISENSY_UNDER_REVIEW_CAMPAIGN", "AISENSY_APPLICATION_CAMPAIGN"],
  processing_started: ["AISENSY_PROCESSING_CAMPAIGN", "AISENSY_APPLICATION_CAMPAIGN"],
  progress_update: ["AISENSY_PROGRESS_UPDATE_CAMPAIGN", "AISENSY_APPLICATION_CAMPAIGN"],
  objection: ["AISENSY_OBJECTION_CAMPAIGN", "AISENSY_APPLICATION_CAMPAIGN"],
  objection_resolved: ["AISENSY_OBJECTION_RESOLVED_CAMPAIGN", "AISENSY_APPLICATION_CAMPAIGN"],
  completed: ["AISENSY_APPLICATION_COMPLETED_CAMPAIGN", "AISENSY_APPLICATION_CAMPAIGN"],
  final_document: ["AISENSY_FINAL_DOCUMENT_CAMPAIGN", "AISENSY_APPLICATION_CAMPAIGN"],
  custom_message: ["AISENSY_APPLICATION_CAMPAIGN"],
};

function envCampaign(keys: CampaignEnvKey[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

/** Resolve AiSensy campaign name for an application event. */
export function getApplicationCampaignName(eventType: ApplicationWhatsAppEvent): string {
  return envCampaign(EVENT_CAMPAIGN_ENV[eventType]) || DEFAULT_APPLICATION_CAMPAIGN;
}

function clean(value: string | number | null | undefined, fallback = "—"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function truncate(value: string, max = 200): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/** Build ordered template params — never include signed URLs or raw DB objects. */
export function buildApplicationTemplateParams(
  eventType: ApplicationWhatsAppEvent,
  ctx: ApplicationTemplateContext,
): string[] {
  const customerName = clean(ctx.customerName, "Customer");
  const serviceName = clean(ctx.serviceName, "your service");
  const applicationNumber = clean(ctx.applicationNumber || ctx.applicationId);
  const supportInfo = clean(ctx.supportInfo, DEFAULT_SUPPORT);
  const amount =
    ctx.amount == null || ctx.amount === ""
      ? null
      : `₹${String(ctx.amount).replace(/[^\d.]/g, "") || ctx.amount}`;

  let detail: string;
  switch (eventType) {
    case "application_submitted":
      detail = truncate(ctx.notes || `Status: ${clean(ctx.status, "submitted")}`);
      break;
    case "payment_pending":
    case "payment_reminder":
      detail = truncate(
        [amount ? `Amount due: ${amount}` : null, ctx.notes || "Please complete payment to continue."]
          .filter(Boolean)
          .join(" · "),
      );
      break;
    case "payment_success":
      detail = truncate(
        [amount ? `Amount paid: ${amount}` : null, ctx.notes || "Payment received. Processing started."]
          .filter(Boolean)
          .join(" · "),
      );
      break;
    case "documents_required":
      detail = truncate(
        ctx.requiredDocuments ||
          ctx.notes ||
          "Additional documents are required. Please check DigiConnect Dukan.",
      );
      break;
    case "documents_received":
      detail = truncate(ctx.notes || "Documents received. We are reviewing your application.");
      break;
    case "under_review":
      detail = truncate(ctx.notes || `Status: ${clean(ctx.status, "under review")}`);
      break;
    case "processing_started":
      detail = truncate(ctx.progressMessage || ctx.notes || "Processing has started on your application.");
      break;
    case "progress_update":
      detail = truncate(
        ctx.progressMessage || ctx.notes || "Your application progress was updated. Please check DigiConnect Dukan.",
      );
      break;
    case "objection":
      detail = truncate(
        ctx.objectionMessage || ctx.notes || "Action needed on your application. Please respond soon.",
      );
      break;
    case "objection_resolved":
      detail = truncate(ctx.notes || "Objection resolved. Processing continues.");
      break;
    case "completed":
      detail = truncate(ctx.notes || "Your application is completed.");
      break;
    case "final_document":
      detail = truncate(
        ctx.notes || "Final document delivered on WhatsApp. Link is temporary and secure.",
      );
      break;
    case "custom_message":
      detail = truncate(ctx.customMessage || ctx.notes || "Update from DigiConnect Dukan.");
      break;
    default:
      detail = truncate(ctx.notes || clean(ctx.status, "updated"));
  }

  const actionHint =
    eventType !== "final_document" && ctx.actionLink?.trim()
      ? truncate(`Open: ${ctx.actionLink.trim()}`, 120)
      : "";

  const fourth = actionHint ? `${detail} · ${actionHint}` : detail;

  // Keep a stable 4-param contract matching existing application_update templates.
  return [customerName, serviceName, applicationNumber, fourth || supportInfo];
}

export function eventRequiresNotes(eventType: ApplicationWhatsAppEvent): boolean {
  return (
    eventType === "progress_update" ||
    eventType === "objection" ||
    eventType === "custom_message" ||
    eventType === "documents_required"
  );
}

/**
 * Campaign / template matrix (for docs + operators).
 * Media only for final_document.
 */
export const APPLICATION_CAMPAIGN_MATRIX: Array<{
  event: ApplicationWhatsAppEvent;
  envVariable: string;
  parameters: string[];
  media: boolean;
}> = [
  {
    event: "application_submitted",
    envVariable: "AISENSY_APPLICATION_SUBMITTED_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "statusDetail"],
    media: false,
  },
  {
    event: "payment_pending",
    envVariable: "AISENSY_PAYMENT_PENDING_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "amountOrNote"],
    media: false,
  },
  {
    event: "payment_reminder",
    envVariable: "AISENSY_PAYMENT_REMINDER_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "amountOrNote"],
    media: false,
  },
  {
    event: "payment_success",
    envVariable: "AISENSY_PAYMENT_SUCCESS_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "amountOrNote"],
    media: false,
  },
  {
    event: "documents_required",
    envVariable: "AISENSY_DOCUMENT_REQUIRED_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "requiredDocuments"],
    media: false,
  },
  {
    event: "documents_received",
    envVariable: "AISENSY_DOCUMENT_RECEIVED_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "note"],
    media: false,
  },
  {
    event: "under_review",
    envVariable: "AISENSY_UNDER_REVIEW_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "statusDetail"],
    media: false,
  },
  {
    event: "processing_started",
    envVariable: "AISENSY_PROCESSING_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "progressMessage"],
    media: false,
  },
  {
    event: "progress_update",
    envVariable: "AISENSY_PROGRESS_UPDATE_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "progressMessage"],
    media: false,
  },
  {
    event: "objection",
    envVariable: "AISENSY_OBJECTION_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "objectionMessage"],
    media: false,
  },
  {
    event: "objection_resolved",
    envVariable: "AISENSY_OBJECTION_RESOLVED_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "note"],
    media: false,
  },
  {
    event: "completed",
    envVariable: "AISENSY_APPLICATION_COMPLETED_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "note"],
    media: false,
  },
  {
    event: "final_document",
    envVariable: "AISENSY_FINAL_DOCUMENT_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "note"],
    media: true,
  },
  {
    event: "custom_message",
    envVariable: "AISENSY_APPLICATION_CAMPAIGN",
    parameters: ["customerName", "serviceName", "applicationNumber", "customMessage"],
    media: false,
  },
];
