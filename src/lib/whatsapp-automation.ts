import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type WhatsAppEvent =
  | "application_created"
  | "payment_success"
  | "documents_required"
  | "processing_started"
  | "completed"
  | "failed"
  | "rejected";

export async function triggerWhatsAppNotification(
  event: WhatsAppEvent,
  applicationId: string,
  options: {
    paymentId?: string;
    notes?: string;
  } = {}
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("Supabase admin client not initialized for WhatsApp automation.");
    return { success: false, reason: "supabase_not_initialized" };
  }

  try {
    // 1. Fetch application details and customer profile details
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("*, profiles!applications_user_id_fkey(full_name, mobile, email)")
      .eq("id", applicationId)
      .maybeSingle();

    if (appError || !application) {
      console.error(`WhatsApp Automation: Application ${applicationId} not found:`, appError);
      return { success: false, reason: "application_not_found" };
    }

    const customer = (application as Record<string, unknown>).profiles as { full_name?: string | null; mobile?: string | null; email?: string | null } | null;
    const customerMobile = application.customer_mobile_normalized || customer?.mobile || application.customer_mobile || "";
    const customerName = customer?.full_name || application.customer_name || "Valued Customer";
    const serviceName = application.service_name;

    if (!customerMobile) {
      console.warn(`WhatsApp Automation: No mobile number found for application ${applicationId}`);
      return { success: false, reason: "mobile_number_missing" };
    }

    // 2. Format message template based on event type
    let messageText = "";
    switch (event) {
      case "application_created":
        messageText = `Hello ${customerName},\n\nYour application for "${serviceName}" has been successfully created on DigiConnect Dukan.\n\nApplication ID: ${applicationId}\nStatus: ${application.status}\n\nWe will update you on the next steps shortly. Thank you!`;
        break;
      case "payment_success":
        messageText = `Hello ${customerName},\n\nPayment verified successfully for your "${serviceName}" application on DigiConnect Dukan.\n\nApplication ID: ${applicationId}\nPayment ID: ${options.paymentId || "N/A"}\nAmount Paid: Rs ${application.amount}\n\nWe are processing your application. Thank you!`;
        break;
      case "documents_required":
        messageText = `Hello ${customerName},\n\nWe require additional documents to process your "${serviceName}" application.\n\nApplication ID: ${applicationId}\nRequested Details/Files: ${options.notes || "Please check dashboard for required documents."}\n\nPlease upload them on your dashboard as soon as possible. Thank you!`;
        break;
      case "processing_started":
        messageText = `Hello ${customerName},\n\nYour "${serviceName}" application is now under review by our specialist CA experts.\n\nApplication ID: ${applicationId}\nStatus: Processing\n\nWe will notify you once completed. Thank you!`;
        break;
      case "completed":
        messageText = `Hello ${customerName},\n\nCongratulations! Your application for "${serviceName}" has been completed/delivered.\n\nApplication ID: ${applicationId}\n\nYou can now log in to your DigiConnect Dukan dashboard to download the final certificate. Thank you!`;
        break;
      case "failed":
        messageText = `Hello ${customerName},\n\nWe encountered an issue processing your "${serviceName}" application on DigiConnect Dukan.\n\nApplication ID: ${applicationId}\nStatus: Failed\n\nReason/Notes: ${options.notes || "Please contact support for details."}\n\nOur team is looking into it. Thank you!`;
        break;
      case "rejected":
        messageText = `Hello ${customerName},\n\nYour "${serviceName}" application has been rejected on DigiConnect Dukan.\n\nApplication ID: ${applicationId}\nStatus: Rejected\n\nReason: ${options.notes || "Please log in to your dashboard to review the rejection reasons."}\n\nThank you!`;
        break;
      default:
        messageText = `Hello ${customerName},\n\nUpdate regarding your application for "${serviceName}".\n\nApplication ID: ${applicationId}\nStatus: ${application.status}`;
    }

    // 3. Log to console / pino logs
    console.info(`[WhatsApp Notification Sandbox Triggered]`, {
      to: customerMobile,
      event: `whatsapp.notification.${event}`,
      applicationId,
      message: messageText,
      payload: {
        customerName,
        serviceName,
        paymentId: options.paymentId,
        notes: options.notes,
      },
    });

    // 4. Record the notification event in public.system_events table (which triggers DB enqueuing trigger)
    const { error: eventError } = await supabase
      .from("system_events")
      .insert({
        event_name: `whatsapp.notification.${event}`,
        entity_type: "application",
        entity_id: applicationId,
        payload: {
          to: customerMobile,
          customer_name: customerName,
          service_name: serviceName,
          message: messageText,
          payment_id: options.paymentId,
          notes: options.notes,
        },
      });

    if (eventError) {
      console.error(`WhatsApp Automation: Failed to insert system event:`, eventError);
      return { success: false, reason: "event_logging_failed" };
    }

    // 5. Asynchronously trigger background queue worker (fire-and-forget)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/cron/process-notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    }).catch((err) => {
      console.error("Failed to invoke background process-notifications worker:", err);
    });

    return { success: true };
  } catch (error) {
    console.error(`WhatsApp Automation error for application ${applicationId}:`, error);
    return { success: false, reason: "exception_occurred", error };
  }
}
