import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createAdminNotification } from "@/lib/admin-notifications";
import { isApplicationStatus } from "@/lib/application-status";
import { canTransitionStatus, whatsappEventForStatusChange } from "@/lib/applications/status-machine";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminApplicationDetail } from "@/lib/admin-crm";
import { createInvoiceForApplication } from "@/lib/crm";
import {
  removeFinalDocumentObject,
  uploadFinalDocumentObject,
} from "@/lib/documents/final-document-storage";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { creditCashbackForApplication } from "@/lib/wallet";
import { validateFileSignature } from "@/lib/file-validation";
import { sendApplicationWhatsApp } from "@/lib/whatsapp/application-notify";

function isCashbackCompletionStatus(status: unknown) {
  return ["completed", "delivered", "approved", "done"].includes(String(status ?? "").toLowerCase());
}

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxFileSize = 8 * 1024 * 1024;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const detail = await getAdminApplicationDetail(id);

  if (!detail) {
    return NextResponse.json({ message: "Application not found." }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const role = await getCurrentUserRole(user);

    if (!user || !isAdminRole(role)) {
      return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";
    let status = "";
    let assignedTo = "";
    let assignedAgentId = "";
    let internalNotes = "";
    let customerNote = "";
    let note = "";
    let finalTitle = "";
    let finalDocument = null;
    let customFormData = null;

    if (contentType.includes("application/json")) {
      const jsonBody = await request.json().catch(() => ({}));
      status = jsonBody.status || "";
      assignedTo = jsonBody.assignedTo || "";
      assignedAgentId = jsonBody.assignedAgentId || "";
      internalNotes = jsonBody.internalNotes || "";
      customerNote = jsonBody.customerNote || "";
      note = jsonBody.note || "";
      finalTitle = jsonBody.finalDocumentTitle || "";
      customFormData = jsonBody.formData || null;
    } else {
      const formData = await request.formData();
      status = String(formData.get("status") ?? "");
      assignedTo = String(formData.get("assignedTo") ?? "").trim();
      assignedAgentId = String(formData.get("assignedAgentId") ?? "").trim();
      internalNotes = String(formData.get("internalNotes") ?? "").trim();
      customerNote = String(formData.get("customerNote") ?? "").trim();
      note = String(formData.get("note") ?? "").trim();
      finalTitle = String(formData.get("finalDocumentTitle") ?? "Final completed document").trim();
      finalDocument = formData.get("finalDocument");
      const rawForm = formData.get("formData");
      if (typeof rawForm === "string") {
        try {
          customFormData = JSON.parse(rawForm);
        } catch {
          // ignore parsing error
        }
      }
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
    }

    const { data: application } = await supabase
      .from("applications")
      .select("id, user_id, customer_id, service_id, service_slug, service_name, amount, total_amount, status, payment_status, agent_id, assigned_agent_id, commission_amount, cashback_enabled, cashback_amount, cashback_expiry_days, cashback_credited_at, final_document_url, final_document_path, completed_document_storage_path, form_data, customer_details, customer_mobile")
      .eq("id", id)
      .single();

    if (!application) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      cashback_enabled: true,
      cashback_amount: null,
    };

    if (customFormData) {
      updates.form_data = {
        ...((application.form_data as Record<string, unknown>) || {}),
        ...customFormData,
      };
    }

    const uploadingFinal = finalDocument instanceof File && finalDocument.size > 0;
    const hasFinalDocument = Boolean(
      uploadingFinal ||
        application.final_document_path ||
        application.completed_document_storage_path ||
        application.final_document_url,
    );

    if (status) {
      if (!isApplicationStatus(status)) {
        return NextResponse.json({ message: "Invalid application status." }, { status: 400 });
      }

      const transition = canTransitionStatus(application.status, status, {
        hasFinalDocument,
        paymentStatus: application.payment_status,
      });
      if (!transition.ok) {
        return NextResponse.json({ message: transition.message }, { status: 400 });
      }

      updates.status = status;
    }

    if (assignedTo) {
      updates.assigned_to = assignedTo;
    }

    if (assignedAgentId) {
      updates.assigned_agent_id = assignedAgentId === "none" ? null : assignedAgentId;
    }

    if (internalNotes) {
      updates.internal_notes = internalNotes;
      updates.admin_note = internalNotes;
    }

    if (customerNote) {
      updates.customer_message = customerNote;
      updates.customer_note = customerNote;
    }

    if (finalDocument instanceof File && finalDocument.size > 0) {
      const validationResult = await validateFileSignature(finalDocument, allowedFileTypes);
      if (!validationResult.valid) {
        return NextResponse.json({ message: validationResult.error || "Final document must be PDF, JPG, PNG, or WebP." }, { status: 400 });
      }

      if (finalDocument.size > maxFileSize) {
        return NextResponse.json({ message: "Final document must be smaller than 8MB." }, { status: 400 });
      }

      const uploaded = await uploadFinalDocumentObject({
        applicationId: id,
        fileName: finalDocument.name,
        bytes: await finalDocument.arrayBuffer(),
        contentType: finalDocument.type || "application/octet-stream",
      });
      if (!uploaded.ok) {
        return NextResponse.json(
          {
            message: uploaded.error,
            code: "code" in uploaded ? uploaded.code : undefined,
          },
          { status: "code" in uploaded && uploaded.code === "database_upgrade_required" ? 503 : 500 },
        );
      }

      const path = uploaded.storagePath;
      const bucket = uploaded.bucket;

      // Path-only on applications row — signed URLs are admin/WhatsApp ephemeral.
      updates.final_document_url = null;
      updates.final_document_path = path;
      updates.completed_document_url = null;
      updates.completed_document_storage_path = path;
      updates.final_document_name = finalDocument.name;
      updates.completed_at = new Date().toISOString();

      const docRow = {
        application_id: id,
        user_id: application.user_id,
        customer_id: application.customer_id,
        uploaded_by: user?.id,
        uploaded_by_role: "admin",
        document_type: "final_document",
        document_name: finalTitle || "Final completed document",
        file_name: finalDocument.name,
        file_url: "",
        file_type: finalDocument.type || "application/octet-stream",
        storage_path: path,
        storage_bucket: bucket,
        status: "approved",
        review_status: "approved",
        is_final: true,
        customer_visible: false,
        partner_visible: false,
        delivery_channel: "whatsapp",
        delivery_status: "pending",
        uploaded_at: new Date().toISOString(),
        metadata: { title: finalTitle, note: customerNote || note || null, whatsapp_only: true, storage_bucket: bucket },
      };
      const { data: insertedDoc, error: docInsertError } = await supabase
        .from("application_documents")
        .insert(docRow)
        .select("id")
        .maybeSingle();
      if (docInsertError) {
        const legacyRow = {
          application_id: docRow.application_id,
          user_id: docRow.user_id,
          customer_id: docRow.customer_id,
          uploaded_by: docRow.uploaded_by,
          uploaded_by_role: docRow.uploaded_by_role,
          document_type: docRow.document_type,
          document_name: docRow.document_name,
          file_name: docRow.file_name,
          file_url: docRow.file_url,
          file_type: docRow.file_type,
          storage_path: docRow.storage_path,
          status: docRow.status,
          review_status: docRow.review_status,
          is_final: docRow.is_final,
          uploaded_at: docRow.uploaded_at,
          metadata: { ...docRow.metadata, customer_visible: false, partner_visible: false },
        };
        const { data: legacyDoc, error: legacyError } = await supabase
          .from("application_documents")
          .insert(legacyRow)
          .select("id")
          .maybeSingle();
        if (legacyError) {
          await removeFinalDocumentObject(bucket, path);
          return NextResponse.json({ message: "Final document could not be saved." }, { status: 500 });
        }
        updates.final_document_id = legacyDoc?.id ?? null;
      } else {
        updates.final_document_id = insertedDoc?.id ?? null;
      }
    }

    const { error } = await supabase.from("applications").update(updates).eq("id", id);

    if (error) {
      return NextResponse.json({ message: "Application could not be updated." }, { status: 500 });
    }

    const nextStatus = String(updates.status ?? application.status);
    const nextAgentId = assignedAgentId && assignedAgentId !== "none" ? assignedAgentId : application.assigned_agent_id ?? application.agent_id;
    const paymentVerified = ["verified", "paid"].includes(String(application.payment_status ?? "").toLowerCase());

    if (nextAgentId && nextStatus === "completed" && paymentVerified) {
      await supabase.from("commissions").upsert(
        {
          application_id: id,
          agent_id: nextAgentId,
          service_id: application.service_id,
          amount: application.commission_amount ?? 0,
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "application_id,agent_id" },
      );
    }

    if (assignedAgentId && assignedAgentId !== "none") {
      await supabase.from("assignments").upsert(
        {
          application_id: id,
          agent_id: assignedAgentId,
          assigned_by: user?.id,
          active: true,
          note: note || "Assigned by admin.",
        },
        { onConflict: "application_id,agent_id" },
      );
    }

    if (note) {
      await supabase.from("admin_notes").insert({
        application_id: id,
        admin_id: user?.id,
        note,
        assigned_to: assignedTo || null,
      });
    }

    if (customerNote && application.user_id) {
      await supabase.from("notifications").insert({
        user_id: application.user_id,
        application_id: id,
        title: "Application note",
        message: customerNote,
      });
    }

    if (updates.status && String(updates.status) !== String(application.status)) {
      await supabase.from("status_logs").insert({
        application_id: id,
        changed_by: user?.id,
        old_status: application.status,
        new_status: updates.status,
        note: note || "Status updated by admin.",
      });

      await supabase.from("application_status_logs").insert({
        application_id: id,
        actor_id: user?.id,
        actor_role: "admin",
        old_status: application.status,
        new_status: updates.status,
        note: note || "Status updated by admin.",
      });

      if (application.user_id) {
        await supabase.from("notifications").insert({
          user_id: application.user_id,
          application_id: id,
          title: "Application status updated",
          message: `${application.service_name} status is now ${String(updates.status).replace(/_/g, " ")}.`,
        });
      }

      // Customer-relevant WhatsApp only when status actually changes. Never for notes/assignment-only.
      try {
        const eventType = whatsappEventForStatusChange(application.status, updates.status);
        if (eventType) {
          const details = (application.customer_details ?? {}) as Record<string, unknown>;
          const formDataRecord = (application.form_data ?? {}) as Record<string, unknown>;
          const mobile = String(application.customer_mobile ?? details.mobile ?? formDataRecord.mobile ?? "").trim();
          const customerName = String(details.name ?? formDataRecord.name ?? "Customer");
          if (mobile) {
            await sendApplicationWhatsApp({
              applicationId: id,
              eventType,
              recipientMobile: mobile,
              customerName,
              serviceName: application.service_name,
              notes: note || customerNote || undefined,
            });
          }
        }
      } catch (whatsappError) {
        console.error("[admin-applications-patch] whatsapp_status_ping_failed", whatsappError);
      }

      if (isCashbackCompletionStatus(updates.status) && !application.final_document_url && !updates.final_document_url && !application.final_document_path && !updates.final_document_path) {
        await createAdminNotification(supabase, {
          type: "final_document_pending",
          title: "Final document pending",
          message: `${application.service_name} is marked complete but final document is not uploaded yet.`,
          relatedType: "application",
          relatedId: id,
        });
      }

      if (
        isCashbackCompletionStatus(updates.status) &&
        application.user_id &&
        Number(application.amount ?? 0) > 0
      ) {
        const creditedTransactionId = await creditCashbackForApplication({
          applicationId: id,
          createdBy: user?.id ?? null,
        });

        if (creditedTransactionId) {
          await supabase
            .from("applications")
            .update({ cashback_credited_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", id);

          await supabase.from("notifications").insert({
            user_id: application.user_id,
            application_id: id,
            title: "Reward Wallet cashback credited",
            message: "Your eligible DigiConnect Rewards cashback has been credited after verified service completion.",
          });
        }
      }
    }

    revalidatePath(`/admin/applications/${id}`);
    revalidatePath("/admin/applications");

    return NextResponse.json({ message: updates.status ? `Application status saved as ${String(updates.status).replace(/_/g, " ")}.` : "Application updated successfully." });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };

  if (body.action !== "generate_invoice") {
    return NextResponse.json({ message: "Unsupported action." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, user_id, customer_id, service_name, amount, total_amount, payment_status, form_data, customer_details")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json({ message: "Application not found." }, { status: 404 });
  }

  const formData = (application.form_data ?? {}) as Record<string, unknown>;
  const customerDetails = (application.customer_details ?? {}) as Record<string, unknown>;
  const invoice = await createInvoiceForApplication({
    applicationId: id,
    userId: application.user_id,
    customerId: application.customer_id,
    customerName: String(customerDetails.name ?? formData.name ?? "Customer"),
    customerEmail: String(customerDetails.email ?? formData.email ?? ""),
    customerMobile: String(customerDetails.mobile ?? formData.mobile ?? ""),
    serviceName: application.service_name,
    amount: Number(application.total_amount ?? application.amount ?? 0),
    paymentStatus: application.payment_status ?? "pending",
  });

  if (!invoice?.id) {
    return NextResponse.json({ message: "Invoice could not be generated." }, { status: 500 });
  }

  return NextResponse.json({ message: "Invoice generated.", invoiceId: invoice.id });
}
