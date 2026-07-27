import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { canTransitionStatus } from "@/lib/applications/status-machine";
import {
  FINAL_DOCUMENT_BUCKET,
  removeFinalDocumentObject,
  resolveDocumentStorageBucket,
  uploadFinalDocumentObject,
} from "@/lib/documents/final-document-storage";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { validateFileSignature } from "@/lib/file-validation";
import { completeAndSendFinalDocumentWhatsApp } from "@/lib/whatsapp/application-notify";
import { creditCashbackForApplication } from "@/lib/wallet";

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxFileSize = 8 * 1024 * 1024;

function customerMobileFrom(application: Record<string, unknown>) {
  const details = (application.customer_details ?? {}) as Record<string, unknown>;
  const formData = (application.form_data ?? {}) as Record<string, unknown>;
  return String(application.customer_mobile ?? details.mobile ?? formData.mobile ?? "").trim();
}

function customerNameFrom(application: Record<string, unknown>) {
  const details = (application.customer_details ?? {}) as Record<string, unknown>;
  const formData = (application.form_data ?? {}) as Record<string, unknown>;
  return String(details.name ?? formData.name ?? "Customer").trim() || "Customer";
}

async function loadActiveFinalDocument(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>, applicationId: string) {
  const { data } = await supabase
    .from("application_documents")
    .select("id, storage_path, storage_bucket, file_name, document_name, is_final, document_type, metadata")
    .eq("application_id", applicationId)
    .or("is_final.eq.true,document_type.eq.final_document")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const role = await getCurrentUserRole(user);

    if (!user || !isAdminRole(role)) {
      return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const action = String(formData.get("action") ?? "").trim();
    const retryOnly = action === "retry_whatsapp" || String(formData.get("retryWhatsApp") ?? "") === "true";
    const completeAndSend = String(formData.get("completeAndSend") ?? "true").toLowerCase() !== "false";
    const title = String(formData.get("title") ?? "Final completed document").trim();
    const note = String(formData.get("note") ?? "").trim();
    const file = formData.get("file");

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ message: "Final document upload is not configured." }, { status: 500 });
    }

    const { data: application } = await supabase
      .from("applications")
      .select(
        "id, user_id, customer_id, service_id, service_name, status, payment_status, customer_mobile, customer_details, form_data, final_document_id, final_document_path, completed_document_storage_path, final_document_name, amount, commission_amount, agent_id, assigned_agent_id, whatsapp_final_delivery_status",
      )
      .eq("id", id)
      .maybeSingle();

    if (!application) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    const mobile = customerMobileFrom(application as Record<string, unknown>);
    const customerName = customerNameFrom(application as Record<string, unknown>);
    const existingFinal = await loadActiveFinalDocument(supabase, id);

    let storageBucket = existingFinal
      ? resolveDocumentStorageBucket(existingFinal)
      : FINAL_DOCUMENT_BUCKET;
    let storagePath =
      String(existingFinal?.storage_path ?? application.final_document_path ?? application.completed_document_storage_path ?? "").trim() ||
      "";
    let documentName = String(
      existingFinal?.document_name || existingFinal?.file_name || application.final_document_name || "final-document.pdf",
    );
    let documentId: string | null = existingFinal?.id ?? application.final_document_id ?? null;

    if (retryOnly) {
      if (!storagePath) {
        return NextResponse.json({ message: "No final document on file to resend." }, { status: 400 });
      }
      if (!mobile) {
        return NextResponse.json({ message: "Valid WhatsApp mobile number required." }, { status: 400 });
      }

      const wa = await completeAndSendFinalDocumentWhatsApp({
        applicationId: id,
        storagePath,
        storageBucket,
        documentName,
        documentId: documentId ?? undefined,
        recipientMobile: mobile,
        customerName,
        serviceName: application.service_name,
        forceRetry: true,
      });

      await supabase.from("status_logs").insert({
        application_id: id,
        changed_by: user.id,
        old_status: application.status,
        new_status: application.status,
        note: wa.ok ? "Final document WhatsApp retry sent." : `WhatsApp retry failed: ${"error" in wa ? wa.error : "unknown"}`,
      });

      revalidatePath(`/admin/applications/${id}`);
      return NextResponse.json({
        message: wa.ok
          ? "Final document resent on WhatsApp."
          : "code" in wa && wa.code === "configuration_required"
            ? "WhatsApp not configured — delivery queued. Configure AiSensy and retry."
            : "WhatsApp delivery failed. You can retry.",
        whatsappOk: wa.ok,
        error: wa.ok ? undefined : "error" in wa ? wa.error : undefined,
      });
    }

    if (!(file instanceof File) || file.size === 0) {
      // Allow complete+send using existing final without re-upload
      if (!(completeAndSend && storagePath)) {
        return NextResponse.json({ message: "Choose a final document to upload." }, { status: 400 });
      }
    } else {
      const validationResult = await validateFileSignature(file, allowedFileTypes);
      if (!validationResult.valid) {
        return NextResponse.json(
          { message: validationResult.error || "Final document must be PDF, JPG, PNG, or WebP." },
          { status: 400 },
        );
      }
      if (file.size > maxFileSize) {
        return NextResponse.json({ message: "Final document must be smaller than 8MB." }, { status: 400 });
      }

      if (completeAndSend) {
        const status = String(application.status ?? "").toLowerCase();
        if (status === "cancelled" || status === "refunded") {
          const transition = canTransitionStatus(application.status, "completed", {
            hasFinalDocument: true,
            paymentStatus: application.payment_status,
          });
          return NextResponse.json({ message: transition.ok ? "Cannot complete." : transition.message }, { status: 400 });
        }
      }

      const uploaded = await uploadFinalDocumentObject({
        applicationId: id,
        fileName: file.name,
        bytes: await file.arrayBuffer(),
        contentType: file.type,
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

      storageBucket = uploaded.bucket;
      storagePath = uploaded.storagePath;
      documentName = file.name;
      const uploadedAt = new Date().toISOString();

      const baseDoc = {
        application_id: id,
        user_id: application.user_id,
        customer_id: application.customer_id,
        uploaded_by: user.id,
        uploaded_by_role: "admin",
        document_type: "final_document",
        document_name: title || "Final completed document",
        file_name: file.name,
        file_url: "",
        file_type: file.type,
        storage_path: storagePath,
        storage_bucket: storageBucket,
        status: "approved",
        review_status: "approved",
        is_final: true,
        customer_visible: false,
        partner_visible: false,
        delivery_channel: "whatsapp",
        delivery_status: "pending",
        uploaded_at: uploadedAt,
        metadata: { note: note || null, whatsapp_only: true, storage_bucket: storageBucket },
      };

      const { data: document, error: documentError } = await supabase
        .from("application_documents")
        .insert(baseDoc)
        .select("id")
        .single();

      if (documentError) {
        const legacyInsert = {
          application_id: id,
          user_id: application.user_id,
          customer_id: application.customer_id,
          uploaded_by: user.id,
          uploaded_by_role: "admin" as const,
          document_type: "final_document",
          document_name: title || "Final completed document",
          file_name: file.name,
          file_url: "",
          file_type: file.type,
          storage_path: storagePath,
          status: "approved",
          review_status: "approved",
          is_final: true,
          uploaded_at: uploadedAt,
          metadata: { note: note || null, whatsapp_only: true, customer_visible: false, partner_visible: false, storage_bucket: storageBucket },
        };
        const { data: fallbackDoc, error: fallbackError } = await supabase
          .from("application_documents")
          .insert(legacyInsert)
          .select("id")
          .single();

        if (fallbackError) {
          await removeFinalDocumentObject(storageBucket, storagePath);
          return NextResponse.json({ message: "Final document could not be saved." }, { status: 500 });
        }
        documentId = fallbackDoc.id;
      } else {
        documentId = document.id;
      }

      const appUpdates: Record<string, unknown> = {
        final_document_id: documentId,
        final_document_url: null,
        final_document_name: file.name,
        // Keep deprecated path for server retry only; never expose to customers via safe selects.
        final_document_path: storagePath,
        completed_document_url: null,
        completed_document_storage_path: storagePath,
        completed_at: uploadedAt,
        customer_note: note || null,
        customer_message: note || null,
        updated_at: uploadedAt,
        whatsapp_final_delivery_status: completeAndSend ? "pending" : null,
      };
      if (completeAndSend) appUpdates.status = "completed";

      const { error: appUpdateError } = await supabase.from("applications").update(appUpdates).eq("id", id);
      if (appUpdateError) {
        if (documentId) await supabase.from("application_documents").delete().eq("id", documentId);
        await removeFinalDocumentObject(storageBucket, storagePath);
        return NextResponse.json({ message: "Application could not be completed." }, { status: 500 });
      }
    }

    if (completeAndSend && String(application.status) !== "completed") {
      const uploadedAt = new Date().toISOString();
      if (!(file instanceof File) || file.size === 0) {
        await supabase
          .from("applications")
          .update({ status: "completed", completed_at: uploadedAt, updated_at: uploadedAt })
          .eq("id", id);
      }

      await supabase.from("status_logs").insert({
        application_id: id,
        changed_by: user.id,
        old_status: application.status,
        new_status: "completed",
        note: note || "Completed with final document.",
      });
      await supabase.from("application_status_logs").insert({
        application_id: id,
        actor_id: user.id,
        actor_role: "admin",
        old_status: application.status,
        new_status: "completed",
        note: note || "Completed with final document.",
      });

      if (application.user_id) {
        await supabase.from("notifications").insert({
          user_id: application.user_id,
          application_id: id,
          title: "Application completed",
          message: `${application.service_name} is completed. Your final document will be shared on WhatsApp.`,
        });
      }

      const nextAgentId = application.assigned_agent_id ?? application.agent_id;
      const paymentVerified = ["verified", "paid", "success", "captured"].includes(
        String(application.payment_status ?? "").toLowerCase(),
      );
      if (nextAgentId && paymentVerified) {
        await supabase.from("commissions").upsert(
          {
            application_id: id,
            agent_id: nextAgentId,
            service_id: application.service_id,
            amount: application.commission_amount ?? 0,
            status: "pending",
            updated_at: uploadedAt,
          },
          { onConflict: "application_id,agent_id" },
        );
      }

      if (application.user_id && Number(application.amount ?? 0) > 0) {
        await creditCashbackForApplication({ applicationId: id, createdBy: user.id });
      }
    }

    let whatsappOk = false;
    let whatsappError: string | undefined;
    if (completeAndSend) {
      if (!mobile) {
        whatsappError = "Valid WhatsApp mobile number required.";
        await supabase
          .from("applications")
          .update({ whatsapp_final_delivery_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", id);
        if (documentId) {
          await supabase.from("application_documents").update({ delivery_status: "failed" }).eq("id", documentId);
        }
      } else if (!storagePath) {
        whatsappError = "Final document missing.";
      } else {
        const wa = await completeAndSendFinalDocumentWhatsApp({
          applicationId: id,
          storagePath,
          storageBucket,
          documentName,
          documentId: documentId ?? undefined,
          recipientMobile: mobile,
          customerName,
          serviceName: application.service_name,
        });
        whatsappOk = wa.ok;
        whatsappError = wa.ok ? undefined : "error" in wa ? wa.error : undefined;
        const deliveryStatus = wa.ok
          ? "sent"
          : "code" in wa && wa.code === "configuration_required"
            ? "queued"
            : "failed";
        if (documentId) {
          await supabase
            .from("application_documents")
            .update({
              delivery_status: deliveryStatus,
              delivered_at: wa.ok ? new Date().toISOString() : null,
            })
            .eq("id", documentId);
        }
      }
    }

    revalidatePath(`/admin/applications/${id}`);
    revalidatePath("/admin/applications");

    return NextResponse.json({
      message: whatsappOk
        ? "Completed and sent on WhatsApp."
        : completeAndSend
          ? whatsappError?.includes("not configured") || whatsappError?.includes("queued")
            ? "Application completed. WhatsApp queued — configure AiSensy and retry."
            : "Application completed. WhatsApp delivery failed — retry available."
          : "Final document uploaded.",
      documentId,
      whatsappOk,
      error: whatsappError,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 },
    );
  }
}
