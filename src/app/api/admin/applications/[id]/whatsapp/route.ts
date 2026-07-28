import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendApplicationWhatsApp } from "@/lib/whatsapp/application-notify";
import { eventRequiresNotes } from "@/lib/whatsapp/templates";
import {
  type AdminWhatsAppAction,
  type ApplicationWhatsAppEvent,
} from "@/lib/whatsapp/types";
import { normalizeAisensyDestination } from "@/lib/whatsapp/aisensy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z
    .enum([
      "payment_reminder",
      "document_request",
      "progress_update",
      "objection",
      "objection_resolved",
      "processing_update",
      "completion_message",
      "custom_message",
    ])
    .optional(),
  /** @deprecated prefer `action` — kept for existing admin UI buttons */
  eventType: z.string().trim().optional(),
  notes: z.string().trim().max(500).optional(),
  message: z.string().trim().max(500).optional(),
  forceRetry: z.boolean().optional(),
});

const ACTION_TO_EVENT: Record<AdminWhatsAppAction, ApplicationWhatsAppEvent> = {
  payment_reminder: "payment_reminder",
  document_request: "documents_required",
  progress_update: "progress_update",
  objection: "objection",
  objection_resolved: "objection_resolved",
  processing_update: "processing_started",
  completion_message: "completed",
  custom_message: "custom_message",
};

const LEGACY_EVENT_TO_ACTION: Partial<Record<ApplicationWhatsAppEvent, AdminWhatsAppAction>> = {
  payment_pending: "payment_reminder",
  payment_reminder: "payment_reminder",
  documents_required: "document_request",
  progress_update: "progress_update",
  objection: "objection",
  objection_resolved: "objection_resolved",
  processing_started: "processing_update",
  completed: "completion_message",
  custom_message: "custom_message",
};

function isPaid(paymentStatus: unknown, status: unknown) {
  const pay = String(paymentStatus ?? "").toLowerCase();
  const st = String(status ?? "").toLowerCase();
  return ["verified", "paid"].includes(pay) || ["submitted", "in_progress", "in_process", "completed"].includes(st);
}

function isTerminal(status: unknown) {
  const st = String(status ?? "").toLowerCase();
  return ["completed", "cancelled", "canceled", "rejected", "failed"].includes(st);
}

function resolveAction(parsed: z.infer<typeof bodySchema>): AdminWhatsAppAction | null {
  if (parsed.action) return parsed.action;
  const legacy = String(parsed.eventType ?? "") as ApplicationWhatsAppEvent;
  return LEGACY_EVENT_TO_ACTION[legacy] ?? null;
}

function validateActionAllowed(input: {
  action: AdminWhatsAppAction;
  status: unknown;
  paymentStatus: unknown;
  notes: string;
}): { ok: true } | { ok: false; message: string } {
  const { action, status, paymentStatus, notes } = input;
  const terminal = isTerminal(status);
  const paid = isPaid(paymentStatus, status);

  if (action === "payment_reminder" && paid) {
    return { ok: false, message: "Payment reminder is not allowed for paid applications." };
  }

  if (terminal) {
    const allowedOnTerminal: AdminWhatsAppAction[] = ["completion_message", "custom_message"];
    if (String(status).toLowerCase() === "completed" && action === "completion_message") {
      // ok
    } else if (!allowedOnTerminal.includes(action)) {
      return { ok: false, message: "This WhatsApp action is not allowed for completed/cancelled applications." };
    }
  }

  const event = ACTION_TO_EVENT[action];
  if (eventRequiresNotes(event) && !notes) {
    return { ok: false, message: "Message text is required for this WhatsApp action." };
  }

  return { ok: true };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid WhatsApp request." }, { status: 400 });
  }

  const action = resolveAction(parsed.data);
  if (!action) {
    return NextResponse.json({ message: "Invalid WhatsApp action." }, { status: 400 });
  }

  const notes = (parsed.data.message || parsed.data.notes || "").trim();
  // Never accept client-chosen campaign names — campaign is resolved server-side from action/event.

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Database unavailable." }, { status: 500 });
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, service_name, status, payment_status, customer_mobile, customer_details, form_data, amount, total_amount")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json({ message: "Application not found." }, { status: 404 });
  }

  const allowed = validateActionAllowed({
    action,
    status: application.status,
    paymentStatus: application.payment_status,
    notes,
  });
  if (!allowed.ok) {
    return NextResponse.json({ message: allowed.message, whatsappOk: false }, { status: 400 });
  }

  const details = (application.customer_details ?? {}) as Record<string, unknown>;
  const formData = (application.form_data ?? {}) as Record<string, unknown>;
  const mobile = String(application.customer_mobile ?? details.mobile ?? formData.mobile ?? "").trim();
  const customerName = String(details.name ?? formData.name ?? "Customer").trim() || "Customer";

  const phone = normalizeAisensyDestination(mobile);
  if (!phone.ok) {
    return NextResponse.json(
      { message: phone.error, code: "invalid_mobile", whatsappOk: false },
      { status: 400 },
    );
  }

  const eventType = ACTION_TO_EVENT[action];
  const result = await sendApplicationWhatsApp({
    applicationId: id,
    eventType,
    recipientMobile: mobile,
    customerName,
    serviceName: application.service_name,
    notes: notes || undefined,
    customMessage: action === "custom_message" ? notes : undefined,
    objectionMessage: action === "objection" ? notes : undefined,
    progressMessage: action === "progress_update" || action === "processing_update" ? notes : undefined,
    requiredDocuments: action === "document_request" ? notes : undefined,
    amount: application.total_amount ?? application.amount,
    status: application.status,
    forceRetry: Boolean(parsed.data.forceRetry),
  });

  revalidatePath(`/admin/applications/${id}`);

  if (!result.ok) {
    return NextResponse.json(
      {
        message: result.error,
        code: result.code,
        whatsappOk: false,
        queued: result.queued ?? false,
        upgradeRequired: result.upgradeRequired ?? false,
      },
      { status: result.code === "invalid_mobile" ? 400 : 200 },
    );
  }

  return NextResponse.json({
    message: result.deduped ? "WhatsApp already sent (idempotent)." : "WhatsApp sent.",
    whatsappOk: true,
    messageId: result.messageId,
  });
}
