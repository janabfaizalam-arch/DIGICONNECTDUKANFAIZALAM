import {
  isPaidPaymentStatus,
  normalizeWorkflowStatus,
  shouldShowCompleteAction,
  shouldShowPaymentReminder,
} from "@/lib/applications/status-machine";

export type SmartNextAction =
  | { key: "verify_payment"; label: "Verify payment" }
  | { key: "request_documents"; label: "Request documents" }
  | { key: "start_processing"; label: "Start processing" }
  | { key: "resolve_objection"; label: "Resolve objection" }
  | { key: "upload_final"; label: "Upload final document" }
  | { key: "complete_send"; label: "Complete & Send on WhatsApp" }
  | { key: "retry_whatsapp"; label: "Retry WhatsApp" }
  | { key: "none"; label: "No action required" };

export function resolveSmartNextAction(input: {
  status: unknown;
  paymentStatus?: string | null;
  hasFinalDocument?: boolean;
  missingDocuments?: boolean;
  whatsappFinalDeliveryStatus?: string | null;
}): SmartNextAction {
  const status = normalizeWorkflowStatus(input.status);
  const paid = isPaidPaymentStatus(input.paymentStatus);
  const delivery = String(input.whatsappFinalDeliveryStatus ?? "").toLowerCase();

  if (status === "completed" || status === "delivered") {
    if (delivery === "failed" || delivery === "queued") return { key: "retry_whatsapp", label: "Retry WhatsApp" };
    return { key: "none", label: "No action required" };
  }

  if (status === "cancelled" || status === "refunded") {
    return { key: "none", label: "No action required" };
  }

  if (!paid && shouldShowPaymentReminder(input.paymentStatus, status)) {
    return { key: "verify_payment", label: "Verify payment" };
  }

  if (input.missingDocuments || status === "documents_required" || status === "document_pending") {
    return { key: "request_documents", label: "Request documents" };
  }

  if (status === "objection") {
    return { key: "resolve_objection", label: "Resolve objection" };
  }

  if (!input.hasFinalDocument && shouldShowCompleteAction(status)) {
    if (status === "in_progress" || status === "documents_verified" || status === "assigned_to_agent") {
      return { key: "upload_final", label: "Upload final document" };
    }
    return { key: "start_processing", label: "Start processing" };
  }

  if (input.hasFinalDocument && shouldShowCompleteAction(status)) {
    return { key: "complete_send", label: "Complete & Send on WhatsApp" };
  }

  return { key: "start_processing", label: "Start processing" };
}
