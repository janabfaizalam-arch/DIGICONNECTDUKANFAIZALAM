import { NextResponse } from "next/server";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { scheduleCrmSync } from "@/lib/crmSync";
import { triggerWhatsAppNotification } from "@/lib/whatsapp-automation";
import { settleCommissionForCompletedApplication } from "@/lib/ap-commission-settlement";

interface DBWorkflowStep {
  id: string;
  service_id: string;
  step_key: string;
  label: string;
  sort_order: number;
  allowed_transitions: string[];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await isActiveAgent(user))) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id } = await params;
    const { nextStep, note } = (await request.json()) as { nextStep: string; note?: string };

    if (!nextStep) {
      return NextResponse.json({ error: "Next step is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database service unavailable." }, { status: 500 });
    }

    // 1. Load Agency Partner record
    const ap = await getAgencyPartnerByUserId(user.id);
    if (!ap) {
      return NextResponse.json({ error: "Agency Partner profile not found." }, { status: 403 });
    }

    // 2. Fetch the application
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (appError || !application) {
      return NextResponse.json({ error: "Application not found." }, { status: 444 });
    }

    // Verify ownership
    const isOwner =
      application.agency_partner_id === ap.id ||
      application.agent_id === user.id ||
      application.created_by === user.id;

    if (!isOwner) {
      return NextResponse.json({ error: "Access denied to this application." }, { status: 403 });
    }

    // 3. Fetch workflows definitions for this service
    const { data: workflowsData } = await supabase
      .from("service_workflows")
      .select("*")
      .eq("service_id", application.service_id)
      .order("sort_order", { ascending: true });

    // Fallback workflow definition if none are configured in the DB
    const fallbackWorkflows = [
      { step_key: "submitted", label: "Submitted", allowed_transitions: ["in_process", "rejected"] },
      { step_key: "in_process", label: "Under Review", allowed_transitions: ["completed", "rejected"] },
      { step_key: "completed", label: "Completed", allowed_transitions: [] },
      { step_key: "rejected", label: "Rejected", allowed_transitions: [] }
    ];

    const workflows = workflowsData && workflowsData.length > 0
      ? (workflowsData as unknown as DBWorkflowStep[]).map((w) => ({
          step_key: w.step_key,
          label: w.label,
          allowed_transitions: Array.isArray(w.allowed_transitions) ? w.allowed_transitions : []
        }))
      : fallbackWorkflows;

    let currentStep = application.current_step as string | null;
    if (!currentStep) {
      // Map legacy status to step key
      if (application.status === "in_process" || application.status === "in_progress") {
        currentStep = "in_process";
      } else if (application.status === "completed") {
        currentStep = "completed";
      } else if (application.status === "rejected") {
        currentStep = "rejected";
      } else {
        currentStep = "submitted";
      }
    }

    const currentStepObj = workflows.find((w) => w.step_key === currentStep);
    const isAllowed = currentStepObj ? currentStepObj.allowed_transitions.includes(nextStep) : false;

    if (!isAllowed) {
      return NextResponse.json(
        { error: `Workflow transition from "${currentStep}" to "${nextStep}" is not permitted.` },
        { status: 400 }
      );
    }

    // Map status column to allowed check constraints
    let legacyStatus = nextStep;
    const allowedStatusValues = [
      "new", "documents_pending", "payment_pending", "payment_failed",
      "cancelled", "in_process", "in_progress", "submitted", "completed", "rejected"
    ];
    if (!allowedStatusValues.includes(legacyStatus)) {
      legacyStatus = "in_process";
    }

    // Get actor info for logging
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    const actorName = (profile?.full_name as string | null) || user.email;
    const actorRole = (profile?.role as string | null) || "partner";

    // 4. Update application state
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        current_step: nextStep,
        status: legacyStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateError) {
      console.error("[transition] Update application error:", updateError);
      return NextResponse.json({ error: "Failed to update application step." }, { status: 555 });
    }

    try {
      if (nextStep === "documents_pending" || nextStep === "documents_required") {
        await triggerWhatsAppNotification("documents_required", id, { notes: note });
      } else if (nextStep === "in_process" || nextStep === "in_progress") {
        await triggerWhatsAppNotification("processing_started", id);
      } else if (nextStep === "completed") {
        await triggerWhatsAppNotification("completed", id);
      }
    } catch (waError) {
      console.error("WhatsApp trigger error for transition status:", waError);
    }

    // 5. Write logs (Legacy Status Log & Universal Timeline Event)
    await supabase.from("status_logs").insert({
      application_id: id,
      changed_by: user.id,
      old_status: currentStep,
      new_status: nextStep,
      note: note || `Workflow transitioned from "${currentStep}" to "${nextStep}"`
    });

    await supabase.from("entity_timelines").insert({
      entity_type: "application",
      entity_id: id,
      event_title: `Transitioned to ${workflows.find((w) => w.step_key === nextStep)?.label || nextStep}`,
      event_description: note || `Application shifted from stage "${currentStep}" to "${nextStep}".`,
      metadata: {
        actor_name: actorName,
        actor_role: actorRole,
        old_step: currentStep,
        new_step: nextStep
      }
    });

    // Centralized Event Bus publish
    await supabase.from("system_events").insert({
      event_name: "application.transitioned",
      entity_type: "application",
      entity_id: id,
      payload: {
        old_step: currentStep,
        new_step: nextStep,
        actor_id: user.id,
        note: note
      }
    });

    // 6. Settle the partner's commission on completion.
    //
    // This used to be ~200 lines inline: it matched only service-scoped rules,
    // fell back to the payout snapshot, and wrote the wallet ledger by hand
    // against the commission_transactions id — while creditCommission and
    // reverseCommissionCredit both key on the ap_commissions id. Nothing
    // matched, so an admin approving the same commission afterwards paid the
    // partner twice and cancelling clawed nothing back. The shared settlement
    // path credits through creditCommission, which cannot pay the same
    // commission twice, and admin completion now runs the same code.
    if (nextStep === "completed") {
      const settlement = await settleCommissionForCompletedApplication({
        applicationId: id,
        actorId: user.id,
      });

      if (!settlement.ok) {
        console.error("[transition] commission_settlement_failed", {
          applicationId: id,
          error: settlement.error,
        });
      } else if (settlement.settled && settlement.walletChanged) {
        await supabase.from("entity_timelines").insert({
          entity_type: "wallet",
          entity_id: ap.id,
          event_title: "Commission Credited",
          event_description: `Wallet credited with Rs. ${settlement.amount} on application completion.`,
          metadata: {
            amount: settlement.amount,
            application_id: id,
            commission_id: settlement.commissionId,
            source: settlement.source,
          },
        });

        await supabase.from("system_events").insert({
          event_name: "commission.credited",
          entity_type: "wallet",
          entity_id: ap.id,
          payload: {
            amount: settlement.amount,
            application_id: id,
            commission_id: settlement.commissionId,
            source: settlement.source,
          },
        });
      }
    }

    await scheduleCrmSync(id, "status_updated");

    return NextResponse.json({ ok: true, message: "Workflow transition completed successfully." });
  } catch (err: unknown) {
    console.error("[api/ap/applications/[id]/transition] POST error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
