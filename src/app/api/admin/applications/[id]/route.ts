import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createAdminNotification } from "@/lib/admin-notifications";
import { isApplicationStatus } from "@/lib/application-status";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminApplicationDetail } from "@/lib/admin-crm";
import { createInvoiceForApplication } from "@/lib/crm";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { creditCashbackForApplication } from "@/lib/wallet";
import { validateFileSignature } from "@/lib/file-validation";

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

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
      .select("id, user_id, customer_id, service_id, service_slug, service_name, amount, total_amount, status, payment_status, agent_id, assigned_agent_id, commission_amount, cashback_enabled, cashback_amount, cashback_expiry_days, cashback_credited_at, final_document_url, form_data, customer_details")
      .eq("id", id)
      .single();

    if (!application) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      cashback_enabled: true,
      cashback_amount: null,
    };

    if (customFormData) {
      updates.form_data = {
        ...((application.form_data as Record<string, any>) || {}),
        ...customFormData,
      };
    }

    if (status) {
      if (!isApplicationStatus(status)) {
        return NextResponse.json({ message: "Invalid application status." }, { status: 400 });
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

      const path = `final-documents/${id}/${Date.now()}-${cleanFileName(finalDocument.name)}`;
      const bytes = await finalDocument.arrayBuffer();
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, bytes, {
        contentType: finalDocument.type || "application/octet-stream",
        upsert: true,
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60);
      updates.final_document_url = data?.signedUrl ?? "";
      updates.final_document_path = path;
      updates.completed_document_url = data?.signedUrl ?? "";
      updates.completed_document_storage_path = path;
      updates.final_document_name = finalDocument.name;
      updates.completed_at = new Date().toISOString();

      await supabase.from("application_documents").insert({
        application_id: id,
        user_id: application.user_id,
        customer_id: application.customer_id,
        uploaded_by: user?.id,
        uploaded_by_role: "admin",
        document_type: "final_document",
        document_name: finalTitle || "Final completed document",
        file_name: finalDocument.name,
        file_url: data?.signedUrl ?? "",
        file_type: finalDocument.type || "application/octet-stream",
        storage_path: path,
        status: "approved",
        review_status: "approved",
        is_final: true,
        uploaded_at: new Date().toISOString(),
        metadata: { title: finalTitle, note: customerNote || note || null },
      });
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

    if (updates.status) {
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

      await supabase.from("notifications").insert({
        user_id: application.user_id,
        application_id: id,
        title: "Application status updated",
        message: `${application.service_name} status is now ${String(updates.status).replace(/_/g, " ")}.`,
      });

      if (isCashbackCompletionStatus(updates.status) && !application.final_document_url && !updates.final_document_url) {
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
