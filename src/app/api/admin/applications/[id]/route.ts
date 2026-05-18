import { NextResponse } from "next/server";

import { createAdminNotification } from "@/lib/admin-notifications";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { applicationStatuses } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { creditCashbackForApplication } from "@/lib/wallet";

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function isCashbackCompletionStatus(status: unknown) {
  return ["completed", "delivered", "approved", "done"].includes(String(status ?? "").toLowerCase());
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const role = await getCurrentUserRole(user);

    if (!isAdminRole(role)) {
      return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const status = String(formData.get("status") ?? "");
    const assignedTo = String(formData.get("assignedTo") ?? "").trim();
    const assignedAgentId = String(formData.get("assignedAgentId") ?? "").trim();
    const internalNotes = String(formData.get("internalNotes") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const finalDocument = formData.get("finalDocument");
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
    }

    const { data: application } = await supabase
      .from("applications")
      .select("id, user_id, customer_id, service_id, service_slug, service_name, amount, status, payment_status, agent_id, assigned_agent_id, commission_amount, cashback_enabled, cashback_amount, cashback_expiry_days, cashback_credited_at, final_document_url, form_data")
      .eq("id", id)
      .single();

    if (!application) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    const updates: Record<string, string | number | boolean | null> = {
      updated_at: new Date().toISOString(),
      cashback_enabled: true,
      cashback_amount: null,
    };

    if (applicationStatuses.includes(status as never)) {
      updates.status = status;
    }

    if (assignedTo) {
      updates.assigned_to = assignedTo;
    }

    if (assignedAgentId) {
      updates.assigned_agent_id = assignedAgentId === "none" ? null : assignedAgentId;
      updates.status = assignedAgentId === "none" ? updates.status ?? application.status : "assigned_to_agent";
    }

    if (internalNotes) {
      updates.internal_notes = internalNotes;
    }

    if (finalDocument instanceof File && finalDocument.size > 0) {
      const path = `${application.user_id}/${id}/final/${Date.now()}-${cleanFileName(finalDocument.name)}`;
      const bytes = await finalDocument.arrayBuffer();
      const { error: uploadError } = await supabase.storage.from("application-documents").upload(path, bytes, {
        contentType: finalDocument.type || "application/octet-stream",
        upsert: true,
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = await supabase.storage.from("application-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      updates.final_document_url = data?.signedUrl ?? "";
      updates.final_document_path = path;
      updates.final_document_name = finalDocument.name;
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

    return NextResponse.json({ message: "Application updated successfully." });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
