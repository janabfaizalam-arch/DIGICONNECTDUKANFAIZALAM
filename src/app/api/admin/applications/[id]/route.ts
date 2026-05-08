import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { applicationStatuses, paymentStatuses } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { completeReferralRewardForFirstPaidOrder, creditCashbackForApplication } from "@/lib/wallet";

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
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
    const paymentStatus = String(formData.get("paymentStatus") ?? "");
    const assignedTo = String(formData.get("assignedTo") ?? "").trim();
    const assignedAgentId = String(formData.get("assignedAgentId") ?? "").trim();
    const assignedStaffId = String(formData.get("assignedStaffId") ?? "").trim();
    const internalNotes = String(formData.get("internalNotes") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const finalDocument = formData.get("finalDocument");
    const cashbackEnabled = formData.get("cashbackEnabled") === "on";
    const cashbackAmountValue = Number(formData.get("cashbackAmount") ?? 0);
    const cashbackExpiryDaysValue = Number(formData.get("cashbackExpiryDays") ?? 90);
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
    }

    const { data: application } = await supabase
      .from("applications")
      .select("id, user_id, customer_id, service_id, service_slug, service_name, amount, status, payment_status, assigned_staff_id, commission_amount, cashback_enabled, cashback_amount, cashback_expiry_days, cashback_credited_at, form_data")
      .eq("id", id)
      .single();

    if (!application) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    const updates: Record<string, string | number | boolean | null> = {
      updated_at: new Date().toISOString(),
      cashback_enabled: cashbackEnabled,
      cashback_amount: Number.isFinite(cashbackAmountValue) && cashbackAmountValue > 0 ? cashbackAmountValue : null,
      cashback_expiry_days: Number.isFinite(cashbackExpiryDaysValue) && cashbackExpiryDaysValue > 0 ? Math.round(cashbackExpiryDaysValue) : 90,
    };

    if (applicationStatuses.includes(status as never)) {
      updates.status = status;
    }

    if (assignedTo) {
      updates.assigned_to = assignedTo;
    }

    if (assignedStaffId) {
      updates.assigned_staff_id = assignedStaffId === "none" ? null : assignedStaffId;
    }

    if (assignedAgentId && assignedAgentId !== "none") {
      updates.assigned_agent_id = assignedAgentId;
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
      updates.final_document_name = finalDocument.name;
    }

    const { error } = await supabase.from("applications").update(updates).eq("id", id);

    if (error) {
      return NextResponse.json({ message: "Application could not be updated." }, { status: 500 });
    }

    if (paymentStatuses.includes(paymentStatus as never)) {
      await supabase.from("payments").update({ status: paymentStatus, updated_at: new Date().toISOString() }).eq("application_id", id);
      await supabase.from("invoices").update({ payment_status: paymentStatus }).eq("application_id", id);
      await supabase.from("applications").update({ payment_status: paymentStatus, updated_at: new Date().toISOString() }).eq("id", id);

      if (
        paymentStatus === "verified" &&
        application.payment_status !== "verified" &&
        application.user_id &&
        Number(application.amount ?? 0) > 0 &&
        cashbackEnabled &&
        !application.cashback_credited_at
      ) {
        const serviceSlugs = Array.isArray((application.form_data as { service_slugs?: unknown })?.service_slugs)
          ? ((application.form_data as { service_slugs?: string[] }).service_slugs ?? [])
          : [application.service_slug];
        const creditedTransactionId = await creditCashbackForApplication({
          userId: application.user_id,
          applicationId: id,
          serviceSlug: application.service_slug,
          serviceSlugs,
          serviceName: application.service_name,
          orderAmount: Number(application.amount ?? 0),
          cashbackAmount: Number.isFinite(cashbackAmountValue) && cashbackAmountValue > 0 ? cashbackAmountValue : null,
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
            title: "Reward cashback credited",
            message: "Cashback reward points have been credited to your wallet. They can be used on future orders.",
          });
        }

        const referralTransactionId = await completeReferralRewardForFirstPaidOrder({
          userId: application.user_id,
          applicationId: id,
          createdBy: user?.id ?? null,
        });

        if (referralTransactionId) {
          await supabase.from("notifications").insert({
            user_id: application.user_id,
            application_id: id,
            title: "Referral milestone completed",
            message: "Your first paid order is verified. Referral rewards have been processed.",
          });
        }
      }
    }

    if (assignedAgentId && assignedAgentId !== "none") {
      await supabase.from("commissions").upsert(
        {
          application_id: id,
          agent_id: assignedAgentId,
          service_id: application.service_id,
          amount: application.commission_amount ?? 0,
          status: "pending",
          updated_at: new Date().toISOString(),
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

      await supabase.from("notifications").insert({
        user_id: application.user_id,
        application_id: id,
        title: "Application status updated",
        message: `${application.service_name} status is now ${String(updates.status).replace(/_/g, " ")}.`,
      });

      if (
        updates.status === "completed" &&
        application.status !== "completed" &&
        application.user_id &&
        Number(application.amount ?? 0) > 0 &&
        (paymentStatus === "verified" || application.payment_status === "verified") &&
        cashbackEnabled &&
        !application.cashback_credited_at
      ) {
        const creditedTransactionId = await creditCashbackForApplication({
          userId: application.user_id,
          applicationId: id,
          serviceSlug: application.service_slug,
          serviceSlugs: Array.isArray((application.form_data as { service_slugs?: unknown })?.service_slugs)
            ? ((application.form_data as { service_slugs?: string[] }).service_slugs ?? [])
            : [application.service_slug],
          serviceName: application.service_name,
          orderAmount: Number(application.amount ?? 0),
          cashbackAmount: Number.isFinite(cashbackAmountValue) && cashbackAmountValue > 0 ? cashbackAmountValue : null,
          expiryDays: Number.isFinite(cashbackExpiryDaysValue) && cashbackExpiryDaysValue > 0 ? Math.round(cashbackExpiryDaysValue) : 90,
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
            title: "DigiWallet cashback credited",
          message: `₹${(Number.isFinite(cashbackAmountValue) && cashbackAmountValue > 0 ? cashbackAmountValue : Number(application.amount ?? 0)).toLocaleString("en-IN")} cashback has been credited to your DigiWallet. Valid for future eligible services.`,
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
