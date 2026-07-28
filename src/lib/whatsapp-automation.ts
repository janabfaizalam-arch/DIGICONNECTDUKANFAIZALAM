import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendApplicationWhatsApp } from "@/lib/whatsapp/application-notify";
import type { ApplicationWhatsAppEvent } from "@/lib/whatsapp/types";

export type WhatsAppEvent =
  | "application_created"
  | "payment_pending"
  | "payment_success"
  | "documents_required"
  | "documents_received"
  | "processing_started"
  | "under_review"
  | "completed"
  | "failed"
  | "rejected";

const EVENT_MAP: Partial<Record<WhatsAppEvent, ApplicationWhatsAppEvent>> = {
  application_created: "application_submitted",
  payment_pending: "payment_pending",
  payment_success: "payment_success",
  documents_required: "documents_required",
  documents_received: "documents_received",
  processing_started: "processing_started",
  under_review: "under_review",
  completed: "completed",
};

/**
 * Server-side application WhatsApp trigger.
 * Delivers via AiSensy (`sendApplicationWhatsApp`) — does not invent browser sends.
 * Failed/rejected events are logged but not auto-messaged (use admin objection/custom).
 */
export async function triggerWhatsAppNotification(
  event: WhatsAppEvent,
  applicationId: string,
  options: {
    paymentId?: string;
    notes?: string;
    amount?: string | number | null;
    forceRetry?: boolean;
  } = {},
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("Supabase admin client not initialized for WhatsApp automation.");
    return { success: false, reason: "supabase_not_initialized" };
  }

  const mapped = EVENT_MAP[event];
  if (!mapped) {
    console.info("[whatsapp-automation] skip_unmapped_event", { event, applicationId });
    return { success: false, reason: "event_not_mapped" };
  }

  try {
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select(
        "id, status, payment_status, service_name, amount, total_amount, customer_mobile, customer_mobile_normalized, customer_name, customer_details, form_data, profiles!applications_user_id_fkey(full_name, mobile, email)",
      )
      .eq("id", applicationId)
      .maybeSingle();

    if (appError || !application) {
      console.error(`WhatsApp Automation: Application ${applicationId} not found:`, appError);
      return { success: false, reason: "application_not_found" };
    }

    const customer = (application as Record<string, unknown>).profiles as
      | { full_name?: string | null; mobile?: string | null }
      | null;
    const details = (application.customer_details ?? {}) as Record<string, unknown>;
    const formData = (application.form_data ?? {}) as Record<string, unknown>;

    const customerMobile = String(
      application.customer_mobile_normalized ||
        application.customer_mobile ||
        customer?.mobile ||
        details.mobile ||
        formData.mobile ||
        "",
    ).trim();
    const customerName =
      String(
        customer?.full_name || application.customer_name || details.name || formData.name || "Customer",
      ).trim() || "Customer";

    if (!customerMobile) {
      console.warn(`WhatsApp Automation: No mobile number found for application ${applicationId}`);
      return { success: false, reason: "mobile_number_missing" };
    }

    const notes = [
      options.notes,
      options.paymentId ? `Payment ID: ${options.paymentId}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const result = await sendApplicationWhatsApp({
      applicationId,
      eventType: mapped,
      recipientMobile: customerMobile,
      customerName,
      serviceName: application.service_name || "Service",
      notes: notes || undefined,
      amount: options.amount ?? application.total_amount ?? application.amount,
      status: application.status,
      forceRetry: options.forceRetry,
    });

    // Best-effort audit trail (non-blocking for delivery).
    await supabase.from("system_events").insert({
      event_name: `whatsapp.notification.${event}`,
      entity_type: "application",
      entity_id: applicationId,
      payload: {
        to_masked: customerMobile.replace(/\d(?=\d{4})/g, "x"),
        event: mapped,
        ok: result.ok,
        code: "code" in result ? result.code : null,
        deduped: result.ok && "deduped" in result ? result.deduped : false,
      },
    });

    if (!result.ok) {
      return {
        success: false,
        reason: result.code,
        error: result.error,
        queued: "queued" in result ? result.queued : false,
      };
    }

    return { success: true, deduped: result.deduped === true, messageId: result.messageId };
  } catch (error) {
    console.error(`WhatsApp Automation error for application ${applicationId}:`, error);
    return { success: false, reason: "exception_occurred", error };
  }
}
