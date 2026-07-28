import {
  isPaidPaymentStatus,
  normalizeWorkflowStatus,
  shouldShowPaymentReminder,
} from "@/lib/applications/status-machine";

export type CustomerNextActionKey =
  | "pay_now"
  | "upload_documents"
  | "view_respond"
  | "track_progress"
  | "view_invoice"
  | "view_status"
  | "view_details"
  | "none";

export type CustomerNextAction = {
  key: CustomerNextActionKey;
  label: string;
  href: string;
};

/**
 * Customer-facing next action (labels differ from admin smart-next-action).
 * Never offers final-document download.
 */
export function resolveCustomerNextAction(input: {
  applicationId: string;
  status: unknown;
  paymentStatus?: string | null;
  missingDocuments?: boolean;
  invoiceId?: string | null;
}): CustomerNextAction {
  const status = normalizeWorkflowStatus(input.status);
  const detailHref = `/customer/applications/${input.applicationId}`;
  const paid = isPaidPaymentStatus(input.paymentStatus);

  if (status === "cancelled" || status === "refunded") {
    return { key: "view_details", label: "View Details", href: detailHref };
  }

  if (status === "completed" || status === "delivered") {
    if (input.invoiceId) {
      return { key: "view_invoice", label: "View Invoice", href: `/invoice/${input.invoiceId}` };
    }
    return { key: "view_status", label: "View Status", href: detailHref };
  }

  if (!paid && shouldShowPaymentReminder(input.paymentStatus, status)) {
    return {
      key: "pay_now",
      label: "Pay Now",
      href: `/pay/application/${input.applicationId}`,
    };
  }

  if (
    input.missingDocuments ||
    status === "documents_required" ||
    status === "document_pending"
  ) {
    return {
      key: "upload_documents",
      label: "Upload Documents",
      href: `${detailHref}#documents`,
    };
  }

  if (status === "objection") {
    return { key: "view_respond", label: "View & Respond", href: detailHref };
  }

  if (
    status === "submitted" ||
    status === "in_progress" ||
    status === "payment_success" ||
    status === "documents_verified" ||
    status === "assigned_to_agent" ||
    status === "payment_pending" ||
    status === "draft"
  ) {
    return { key: "track_progress", label: "Track Progress", href: detailHref };
  }

  return { key: "view_details", label: "View Details", href: detailHref };
}

/** True when customer Pay Now CTA should be hidden. */
export function isCustomerPaymentSettled(paymentStatus: string | null | undefined) {
  return isPaidPaymentStatus(paymentStatus);
}
