import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  sendApplicationWhatsApp,
  type ApplicationWhatsAppEvent,
} from "@/lib/whatsapp/application-notify";

const ALLOWED_EVENTS = new Set<ApplicationWhatsAppEvent>([
  "application_submitted",
  "payment_pending",
  "payment_success",
  "documents_required",
  "documents_received",
  "processing_started",
  "progress_update",
  "objection",
  "objection_resolved",
  "completed",
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    eventType?: string;
    notes?: string;
    forceRetry?: boolean;
  };

  const eventType = String(body.eventType ?? "") as ApplicationWhatsAppEvent;
  if (!ALLOWED_EVENTS.has(eventType)) {
    return NextResponse.json({ message: "Invalid WhatsApp event type." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Database unavailable." }, { status: 500 });
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, service_name, status, customer_mobile, customer_details, form_data")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json({ message: "Application not found." }, { status: 404 });
  }

  const details = (application.customer_details ?? {}) as Record<string, unknown>;
  const formData = (application.form_data ?? {}) as Record<string, unknown>;
  const mobile = String(application.customer_mobile ?? details.mobile ?? formData.mobile ?? "").trim();
  const customerName = String(details.name ?? formData.name ?? "Customer").trim() || "Customer";

  if (!mobile) {
    return NextResponse.json({ message: "Customer mobile required for WhatsApp." }, { status: 400 });
  }

  const result = await sendApplicationWhatsApp({
    applicationId: id,
    eventType,
    recipientMobile: mobile,
    customerName,
    serviceName: application.service_name,
    notes: body.notes?.trim() || undefined,
    forceRetry: Boolean(body.forceRetry),
  });

  revalidatePath(`/admin/applications/${id}`);

  if (!result.ok) {
    return NextResponse.json(
      {
        message: result.error,
        code: "code" in result ? result.code : undefined,
        whatsappOk: false,
        queued: "queued" in result ? result.queued : false,
        upgradeRequired: "upgradeRequired" in result ? result.upgradeRequired : false,
      },
      { status: "code" in result && result.code === "invalid_mobile" ? 400 : 200 },
    );
  }

  return NextResponse.json({
    message: result.deduped ? "WhatsApp already sent (idempotent)." : "WhatsApp sent.",
    whatsappOk: true,
    messageId: result.messageId,
  });
}
