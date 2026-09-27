/**
 * Template parameters for application notifications (Meta template
 * `application_update` by default — see template-registry.ts).
 *
 * Body parameter order ({{1}}…{{4}}) must match the approved template:
 *   [0] customerName
 *   [1] serviceName
 *   [2] applicationNumber
 *   [3] detail (status / amount / documents / objection / progress / custom)
 *
 * Final document messages may attach a document header; params never carry signed URLs.
 */

import { resolveTemplate } from "@/lib/whatsapp/template-registry";
import type {
  ApplicationTemplateContext,
  ApplicationWhatsAppEvent,
} from "@/lib/whatsapp/types";

const DEFAULT_SUPPORT =
  "DigiConnect Dukan Support — WhatsApp help available in your dashboard.";

/**
 * Meta template for an application event. Every event uses the registry's
 * `application_update` template unless WHATSAPP_TEMPLATE_<EVENT> names a
 * separately approved one (e.g. WHATSAPP_TEMPLATE_FINAL_DOCUMENT for a
 * template with a document header).
 */
export function getApplicationTemplateName(
  eventType: ApplicationWhatsAppEvent,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const override = env[`WHATSAPP_TEMPLATE_${eventType.toUpperCase()}`]?.trim();
  return override || resolveTemplate("application_update", env).name;
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
    case "invoice_generated":
      // The invoice link is the point of this message, so it is never truncated away.
      detail = [
        truncate(
          [
            ctx.invoiceNumber ? `Invoice ${ctx.invoiceNumber}` : "Your invoice is ready",
            amount ? `Amount ${amount}` : null,
            ctx.notes || null,
          ]
            .filter(Boolean)
            .join(" · "),
          140,
        ),
        ctx.invoiceLink?.trim() ? `Download: ${ctx.invoiceLink.trim()}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      break;
    case "renewal_reminder":
      detail = truncate(
        [
          ctx.renewalReference ? `Ref ${ctx.renewalReference}` : null,
          ctx.renewalDue ? `Renewal due ${ctx.renewalDue}` : "Renewal is due soon",
          ctx.notes || "Reply here or visit DigiConnect Dukan to renew on time.",
        ]
          .filter(Boolean)
          .join(" · "),
      );
      break;
    case "custom_message":
      detail = truncate(ctx.customMessage || ctx.notes || "Update from DigiConnect Dukan.");
      break;
    default:
      detail = truncate(ctx.notes || clean(ctx.status, "updated"));
  }

  const actionHint =
    eventType !== "final_document" && eventType !== "invoice_generated" && ctx.actionLink?.trim()
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
 * Event / template matrix (for docs + operators).
 * Media only for final_document.
 */
export const APPLICATION_TEMPLATE_MATRIX: Array<{
  event: ApplicationWhatsAppEvent;
  envVariable: string;
  parameters: string[];
  media: boolean;
}> = [
  {
    event: "application_submitted",
    envVariable: "WHATSAPP_TEMPLATE_APPLICATION_SUBMITTED",
    parameters: ["customerName", "serviceName", "applicationNumber", "statusDetail"],
    media: false,
  },
  {
    event: "payment_pending",
    envVariable: "WHATSAPP_TEMPLATE_PAYMENT_PENDING",
    parameters: ["customerName", "serviceName", "applicationNumber", "amountOrNote"],
    media: false,
  },
  {
    event: "payment_reminder",
    envVariable: "WHATSAPP_TEMPLATE_PAYMENT_REMINDER",
    parameters: ["customerName", "serviceName", "applicationNumber", "amountOrNote"],
    media: false,
  },
  {
    event: "payment_success",
    envVariable: "WHATSAPP_TEMPLATE_PAYMENT_SUCCESS",
    parameters: ["customerName", "serviceName", "applicationNumber", "amountOrNote"],
    media: false,
  },
  {
    event: "documents_required",
    envVariable: "WHATSAPP_TEMPLATE_DOCUMENTS_REQUIRED",
    parameters: ["customerName", "serviceName", "applicationNumber", "requiredDocuments"],
    media: false,
  },
  {
    event: "documents_received",
    envVariable: "WHATSAPP_TEMPLATE_DOCUMENTS_RECEIVED",
    parameters: ["customerName", "serviceName", "applicationNumber", "note"],
    media: false,
  },
  {
    event: "under_review",
    envVariable: "WHATSAPP_TEMPLATE_UNDER_REVIEW",
    parameters: ["customerName", "serviceName", "applicationNumber", "statusDetail"],
    media: false,
  },
  {
    event: "processing_started",
    envVariable: "WHATSAPP_TEMPLATE_PROCESSING_STARTED",
    parameters: ["customerName", "serviceName", "applicationNumber", "progressMessage"],
    media: false,
  },
  {
    event: "progress_update",
    envVariable: "WHATSAPP_TEMPLATE_PROGRESS_UPDATE",
    parameters: ["customerName", "serviceName", "applicationNumber", "progressMessage"],
    media: false,
  },
  {
    event: "objection",
    envVariable: "WHATSAPP_TEMPLATE_OBJECTION",
    parameters: ["customerName", "serviceName", "applicationNumber", "objectionMessage"],
    media: false,
  },
  {
    event: "objection_resolved",
    envVariable: "WHATSAPP_TEMPLATE_OBJECTION_RESOLVED",
    parameters: ["customerName", "serviceName", "applicationNumber", "note"],
    media: false,
  },
  {
    event: "completed",
    envVariable: "WHATSAPP_TEMPLATE_COMPLETED",
    parameters: ["customerName", "serviceName", "applicationNumber", "note"],
    media: false,
  },
  {
    event: "final_document",
    envVariable: "WHATSAPP_TEMPLATE_FINAL_DOCUMENT",
    parameters: ["customerName", "serviceName", "applicationNumber", "note"],
    media: true,
  },
  {
    event: "invoice_generated",
    envVariable: "WHATSAPP_TEMPLATE_INVOICE_GENERATED",
    parameters: ["customerName", "serviceName", "applicationNumber", "invoiceNumberAmountAndLink"],
    media: false,
  },
  {
    event: "renewal_reminder",
    envVariable: "WHATSAPP_TEMPLATE_RENEWAL_REMINDER",
    parameters: ["customerName", "serviceName", "applicationNumber", "renewalDueDate"],
    media: false,
  },
  {
    event: "custom_message",
    envVariable: "WHATSAPP_TEMPLATE_CUSTOM_MESSAGE",
    parameters: ["customerName", "serviceName", "applicationNumber", "customMessage"],
    media: false,
  },
];
