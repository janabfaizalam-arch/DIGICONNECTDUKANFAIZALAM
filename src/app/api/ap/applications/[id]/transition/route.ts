import { NextResponse } from "next/server";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { triggerWhatsAppNotification } from "@/lib/whatsapp-automation";
import { logCommissionStatusChange } from "@/lib/ap-commission-engine";

interface DBWorkflowStep {
  id: string;
  service_id: string;
  step_key: string;
  label: string;
  sort_order: number;
  allowed_transitions: string[];
}

interface DBRule {
  id: string;
  name: string;
  description: string | null;
  scope_type: string;
  service_id: string | null;
  agency_partner_id: string | null;
  tier_id: string | null;
  campaign_code: string | null;
  commission_type: string;
  rule_type: string | null;
  fixed_amount: number | null;
  percentage_rate: number | null;
  tiered_config: unknown;
  min_amount: number | null;
  max_amount: number | null;
  is_active: boolean;
  priority: number;
  metadata: Record<string, unknown> | null;
}

interface LegacyTierBracket {
  min: number;
  max: number | null;
  fixed?: number;
  rate?: number;
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

    // 6. Handle Rules-based Commission crediting upon 'completed' status
    if (nextStep === "completed") {
      // Look up dynamic rules
      const { data: rulesData } = await supabase
        .from("commission_rules")
        .select("*")
        .eq("is_active", true)
        .eq("service_id", application.service_id)
        .order("priority", { ascending: false });

      const rules = rulesData as unknown as DBRule[];
      let commissionAmount = 0;
      let ruleUsedId: string | null = null;
      let ruleUsedType = "fixed";

      if (rules && rules.length > 0) {
        const rule = rules[0];
        ruleUsedId = rule.id;
        ruleUsedType = rule.rule_type || rule.commission_type || "fixed";

        if (ruleUsedType === "fixed") {
          commissionAmount = Number(rule.fixed_amount ?? rule.metadata?.fixed_amount ?? rule.metadata?.amount ?? 0);
        } else if (ruleUsedType === "percentage") {
          const rate = Number(rule.percentage_rate ?? rule.metadata?.percentage_rate ?? rule.metadata?.rate ?? 0);
          commissionAmount = Math.round((Number(application.amount) * rate) / 100);
        } else if (ruleUsedType === "slab" || ruleUsedType === "tiered") {
          // Volume matching slabs
          const { count } = await supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .eq("agency_partner_id", ap.id)
            .eq("current_step", "completed");

          const volumeCount = (count || 0) + 1; // Current one is now completed too

          const { data: slab } = await supabase
            .from("commission_slabs")
            .select("*")
            .eq("rule_id", rule.id)
            .lte("min_volume", volumeCount)
            .or(`max_volume.gte.${volumeCount},max_volume.is.null`)
            .maybeSingle();

          if (slab) {
            commissionAmount = Number(slab.commission_amount);
          } else {
            // Check legacy tiered_config in json
            const tiers = Array.isArray(rule.tiered_config) ? (rule.tiered_config as LegacyTierBracket[]) : [];
            const matchedTier = tiers.find((t) => volumeCount >= t.min && (!t.max || volumeCount <= t.max));
            if (matchedTier) {
              if (matchedTier.fixed) {
                commissionAmount = Number(matchedTier.fixed);
              } else if (matchedTier.rate) {
                commissionAmount = Math.round((Number(application.amount) * Number(matchedTier.rate)) / 100);
              }
            } else {
              commissionAmount = Number(rule.fixed_amount || 0);
            }
          }
        } else if (ruleUsedType === "partner_tier") {
          const tierSlug = (ap.tier?.slug as string | null) || "silver";
          const tierRates = (rule.metadata?.tier_rates as Record<string, unknown> | null) || {};
          const rateObj = tierRates[tierSlug];
          if (typeof rateObj === "number") {
            commissionAmount = rateObj;
          } else if (rateObj && typeof rateObj === "object") {
            const typedRateObj = rateObj as { fixed?: unknown; rate?: unknown };
            if (typedRateObj.fixed) {
              commissionAmount = Number(typedRateObj.fixed);
            } else if (typedRateObj.rate) {
              commissionAmount = Math.round((Number(application.amount) * Number(typedRateObj.rate)) / 100);
            }
          }
        }
      } else {
        // Fallback to application snapshot agent payout
        commissionAmount = Number(application.agent_payout_snapshot || 0);
      }

      if (commissionAmount > 0) {
        // Check if commission transaction was already written to avoid duplicates
        const { data: existingTx } = await supabase
          .from("commission_transactions")
          .select("id")
          .eq("application_id", id)
          .maybeSingle();

        if (!existingTx) {
          // 6a. Record universal commission transaction
          const { data: commTx, error: commTxErr } = await supabase
            .from("commission_transactions")
            .insert({
              agency_partner_id: ap.id,
              application_id: id,
              commission_rule_id: ruleUsedId,
              amount: commissionAmount,
              status: "approved"
            })
            .select("id")
            .single();

          if (commTxErr) {
            if (commTxErr.code === "23505") {
              console.log(`[transition] Commission transaction for application ${id} already exists (idempotent duplicate, 23505).`);
            } else {
              console.error("[transition] Commission transaction insert failed:", commTxErr);
            }
          } else if (commTx?.id) {
            // 6b. Record legacy commission (for backward compatibility with old dashboard & screens)
            const { data: insertedComm, error: legacyErr } = await supabase
              .from("ap_commissions")
              .insert({
                agency_partner_id: ap.id,
                application_id: id,
                commission_rule_id: ruleUsedId,
                service_slug: application.service_slug,
                service_name: application.service_name,
                sale_amount: Number(application.amount),
                commission_type: ruleUsedType,
                commission_value: commissionAmount,
                commission_rate: 0,
                calculated_amount: commissionAmount,
                status: "approved"
              })
              .select("id")
              .maybeSingle();

            if (legacyErr && legacyErr.code !== "23505") {
              console.error("[transition] Legacy commission insert failed:", legacyErr);
            }

            if (insertedComm?.id) {
              try {
                await logCommissionStatusChange(insertedComm.id, null, "approved", user.id, "Commission created and approved on application completion");
              } catch (auditErr) {
                console.error("[transition] Audit logging failed:", auditErr);
              }
            }

            // 6c. Fetch latest wallet balance to record the ledger credit
            const { data: ledgerHistory } = await supabase
              .from("ap_wallet_ledger")
              .select("running_balance")
              .eq("agency_partner_id", ap.id)
              .order("created_at", { ascending: false })
              .limit(1);

            const lastBalance = ledgerHistory && ledgerHistory[0] ? Number(ledgerHistory[0].running_balance) : 0;
            const newBalance = lastBalance + commissionAmount;

            // Write ledger credit
            const { error: ledgerErr } = await supabase.from("ap_wallet_ledger").insert({
              agency_partner_id: ap.id,
              entry_type: "commission_credit",
              amount: commissionAmount,
              running_balance: newBalance,
              reference_type: "commission",
              reference_id: commTx.id,
              description: `Commission credit for application ${application.application_code || id}`,
              created_by: user.id
            });

            if (ledgerErr) {
              if (ledgerErr.code === "23505") {
                console.log(`[transition] Ledger entry for reference commission ${commTx.id} already exists (idempotent duplicate, 23505).`);
              } else {
                console.error("[transition] Ledger credit insert failed:", ledgerErr);
              }
            } else {
              // Timeline wallet log
              await supabase.from("entity_timelines").insert({
                entity_type: "wallet",
                entity_id: ap.id,
                event_title: "Commission Credited",
                event_description: `Wallet credited with Rs. ${commissionAmount} from application commission. New balance: Rs. ${newBalance}.`,
                metadata: {
                  amount: commissionAmount,
                  application_id: id,
                  tx_id: commTx.id
                }
              });

              // Event Bus publish
              await supabase.from("system_events").insert({
                event_name: "commission.credited",
                entity_type: "wallet",
                entity_id: ap.id,
                payload: {
                  amount: commissionAmount,
                  application_id: id,
                  running_balance: newBalance
                }
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true, message: "Workflow transition completed successfully." });
  } catch (err: unknown) {
    console.error("[api/ap/applications/[id]/transition] POST error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
