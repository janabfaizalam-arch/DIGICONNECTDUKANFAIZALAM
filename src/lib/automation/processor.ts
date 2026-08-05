import "server-only";

import { randomUUID } from "crypto";

import { resolveCrmNotificationDeliveryMode } from "@/lib/automation/delivery-mode";
import { evaluateSafeConditions } from "@/lib/automation/events-core";
import { createOpsAlert } from "@/lib/automation/alerts";
import { buildQueueOutboxKeyFromAutomationEvent } from "@/lib/automation/outbox-key";
import { rulesForEventType, type AutomationRuleDefinition } from "@/lib/automation/rules";
import { enqueueCommunication } from "@/lib/communications/enqueue";
import {
  buildApplicationTemplateParams,
  getApplicationCampaignName,
} from "@/lib/whatsapp/templates";
import type { ApplicationWhatsAppEvent } from "@/lib/whatsapp/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ProcessAutomationSummary = {
  claimed: number;
  completed: number;
  retryable: number;
  failed: number;
  actionsCompleted: number;
  actionsSkipped: number;
  errors: string[];
  deliveryMode: string;
  configurationStatus: "ready_queue" | "internal_only_direct" | "internal_only_disabled" | "other";
};

const MAX_ACTIONS_PER_EVENT = 8;

/**
 * Process pending automation events.
 * Never calls AiSensy — only enqueue_communication / alerts / activity.
 * Finalize requires matching processing_owner.
 */
export async function processAutomationEvents(input?: {
  batchSize?: number;
  workerId?: string;
  timeBudgetMs?: number;
}): Promise<ProcessAutomationSummary> {
  const summary: ProcessAutomationSummary = {
    claimed: 0,
    completed: 0,
    retryable: 0,
    failed: 0,
    actionsCompleted: 0,
    actionsSkipped: 0,
    errors: [],
    deliveryMode: "disabled",
    configurationStatus: "internal_only_disabled",
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    summary.errors.push("supabase_missing");
    return summary;
  }

  const workerId = input?.workerId || `auto-${randomUUID().slice(0, 8)}`;
  const batchSize = Math.min(30, Math.max(1, input?.batchSize ?? 10));
  const started = Date.now();
  const budget = input?.timeBudgetMs ?? 18_000;
  const deliveryMode = resolveCrmNotificationDeliveryMode();
  summary.deliveryMode = deliveryMode;
  summary.configurationStatus =
    deliveryMode === "queue"
      ? "ready_queue"
      : deliveryMode === "direct"
        ? "internal_only_direct"
        : "internal_only_disabled";

  let rows: Array<Record<string, unknown>> = [];
  const claim = await supabase.rpc("claim_crm_automation_events", {
    p_batch_size: batchSize,
    p_worker_id: workerId,
    p_lease_seconds: 120,
  });

  if (claim.error) {
    if (/PGRST202|42883|does not exist|schema cache/i.test(claim.error.message)) {
      summary.errors.push("claim_rpc_missing");
      return summary;
    }
    summary.errors.push("claim_failed");
    return summary;
  }
  rows = Array.isArray(claim.data) ? (claim.data as Array<Record<string, unknown>>) : [];
  summary.claimed = rows.length;

  for (const row of rows) {
    if (Date.now() - started > budget) break;
    const id = String(row.id);

    const { data: fresh } = await supabase
      .from("crm_automation_events")
      .select("*")
      .eq("id", id)
      .eq("processing_owner", workerId)
      .eq("status", "processing")
      .maybeSingle();

    if (!fresh) continue;

    const eventType = String(fresh.event_type);
    const rules = rulesForEventType(eventType).slice(0, MAX_ACTIONS_PER_EVENT);
    let actionFailed = false;

    for (const rule of rules) {
      const ctx = {
        event_type: eventType,
        entity_type: String(fresh.entity_type),
        delivery_mode: deliveryMode,
        classification: String(rule.classification ?? "transactional"),
      };
      if (!evaluateSafeConditions(rule.conditions, ctx)) {
        summary.actionsSkipped += 1;
        continue;
      }

      const execKey = `exec:${fresh.id}:${rule.key}:v${rule.version}`;
      const { data: prior } = await supabase
        .from("crm_automation_executions")
        .select("id, status")
        .eq("idempotency_key", execKey)
        .maybeSingle();

      if (prior && ["completed", "skipped", "suppressed"].includes(String(prior.status))) {
        summary.actionsSkipped += 1;
        continue;
      }

      const result = await runRuleAction({
        rule,
        event: fresh as Record<string, unknown>,
        execKey,
        workerId,
      });

      if (result.status === "failed") actionFailed = true;
      if (result.status === "completed") summary.actionsCompleted += 1;
      if (result.status === "skipped" || result.status === "suppressed") summary.actionsSkipped += 1;
    }

    const attempts = Number(fresh.attempt_count ?? 1);
    const maxAttempts = Number(fresh.max_attempts ?? 5);

    if (actionFailed && attempts < maxAttempts) {
      await finalizeEvent(supabase, id, workerId, {
        status: "retryable",
        next_attempt_at: new Date(Date.now() + 60_000 * attempts).toISOString(),
        failure_code: "action_failed",
        failure_summary: "One or more rule actions failed.",
      });
      summary.retryable += 1;
    } else if (actionFailed) {
      await finalizeEvent(supabase, id, workerId, {
        status: "failed",
        failed_at: new Date().toISOString(),
        failure_code: "max_attempts",
        failure_summary: "Automation event exhausted attempts.",
      });
      // Alert once — not communication.failed recursion
      if (eventType !== "communication.failed") {
        await createOpsAlert({
          alertType: "automation_event_failed",
          severity: "warning",
          title: "Automation event failed",
          safeSummary: `Event ${eventType} failed after max attempts.`,
          relatedEntityType: String(fresh.entity_type),
          relatedEntityId: String(fresh.entity_id),
          sourceEventId: id,
          idempotencyParts: ["automation_failed", id],
        });
      }
      summary.failed += 1;
    } else {
      await finalizeEvent(supabase, id, workerId, {
        status: "completed",
        completed_at: new Date().toISOString(),
        failure_code: null,
        failure_summary: null,
      });
      summary.completed += 1;
    }
  }

  return summary;
}

async function runRuleAction(input: {
  rule: AutomationRuleDefinition;
  event: Record<string, unknown>;
  execKey: string;
  workerId: string;
}): Promise<{ status: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { status: "failed" };

  try {
    if (input.rule.actionType === "enqueue_communication") {
      const enq = await enqueueFromEvent(input.rule, input.event);
      const status = enq.ok ? (enq.suppressed ? "suppressed" : "completed") : "failed";
      await insertExecution(supabase, {
        eventId: String(input.event.id),
        rule: input.rule,
        execKey: input.execKey,
        status,
        targetEntityType: String(input.event.entity_type),
        targetEntityId: String(input.event.entity_id),
        resultCode: enq.code ?? null,
        failureCode: enq.ok ? null : enq.code ?? "enqueue_failed",
        correlationId: input.event.correlation_id ? String(input.event.correlation_id) : input.workerId,
      });
      return { status: enq.ok ? "completed" : "failed" };
    }

    if (
      input.rule.actionType === "create_admin_alert" ||
      input.rule.actionType === "create_staff_alert" ||
      input.rule.actionType === "schedule_internal_followup_alert"
    ) {
      const alertType =
        String(input.event.event_type) === "communication.failed" &&
        String((input.event.safe_metadata as Record<string, unknown> | undefined)?.failure_code) ===
          "configuration_required"
          ? "communication_configuration_required"
          : input.rule.alertType || "automation_event_failed";

      const alert = await createOpsAlert({
        alertType,
        severity: input.rule.alertSeverity ?? "warning",
        title: input.rule.name,
        safeSummary: `Automation ${input.rule.key} for ${String(input.event.event_type)}`,
        relatedEntityType: String(input.event.entity_type),
        relatedEntityId: String(input.event.entity_id),
        sourceEventId: String(input.event.id),
        idempotencyParts: [input.rule.key, String(input.event.id)],
      });
      await insertExecution(supabase, {
        eventId: String(input.event.id),
        rule: input.rule,
        execKey: input.execKey,
        status: alert.ok ? "completed" : "failed",
        targetEntityType: String(input.event.entity_type),
        targetEntityId: String(input.event.entity_id),
        resultCode: alert.ok ? "alert_ok" : "alert_failed",
        failureCode: alert.ok ? null : "alert_failed",
        correlationId: input.workerId,
      });
      return { status: alert.ok ? "completed" : "failed" };
    }

    if (input.rule.actionType === "record_activity") {
      await insertExecution(supabase, {
        eventId: String(input.event.id),
        rule: input.rule,
        execKey: input.execKey,
        status: "completed",
        targetEntityType: String(input.event.entity_type),
        targetEntityId: String(input.event.entity_id),
        resultCode: "recorded",
        failureCode: null,
        correlationId: input.workerId,
      });
      return { status: "completed" };
    }

    await insertExecution(supabase, {
      eventId: String(input.event.id),
      rule: input.rule,
      execKey: input.execKey,
      status: "skipped",
      targetEntityType: String(input.event.entity_type),
      targetEntityId: String(input.event.entity_id),
      resultCode: "unknown_action",
      failureCode: null,
      correlationId: input.workerId,
    });
    return { status: "skipped" };
  } catch {
    await insertExecution(supabase, {
      eventId: String(input.event.id),
      rule: input.rule,
      execKey: input.execKey,
      status: "failed",
      targetEntityType: String(input.event.entity_type),
      targetEntityId: String(input.event.entity_id),
      resultCode: null,
      failureCode: "action_exception",
      correlationId: input.workerId,
    });
    return { status: "failed" };
  }
}

async function insertExecution(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  input: {
    eventId: string;
    rule: AutomationRuleDefinition;
    execKey: string;
    status: string;
    targetEntityType: string;
    targetEntityId: string;
    resultCode: string | null;
    failureCode: string | null;
    correlationId: string;
  },
) {
  const now = new Date().toISOString();
  await supabase.from("crm_automation_executions").upsert(
    {
      event_id: input.eventId,
      rule_key: input.rule.key,
      rule_version: input.rule.version,
      action_type: input.rule.actionType,
      target_entity_type: input.targetEntityType,
      target_entity_id: input.targetEntityId,
      idempotency_key: input.execKey,
      status: input.status,
      attempt_count: 1,
      result_code: input.resultCode,
      failure_code: input.failureCode,
      started_at: now,
      completed_at: now,
      actor_origin: "system",
      correlation_id: input.correlationId,
    },
    { onConflict: "idempotency_key", ignoreDuplicates: true },
  );
}

async function enqueueFromEvent(
  rule: AutomationRuleDefinition,
  event: Record<string, unknown>,
): Promise<{ ok: boolean; suppressed?: boolean; code?: string; error?: string }> {
  const deliveryMode = resolveCrmNotificationDeliveryMode();
  // Hard fail-closed: never enqueue claimable customer WA unless exact queue.
  // Direct path already sent (or will) via request; must not create a second copy.
  if (deliveryMode !== "queue") {
    return {
      ok: true,
      suppressed: true,
      code: deliveryMode === "direct" ? "direct_handled_skip_enqueue" : "delivery_disabled",
    };
  }

  const handling = String(
    (event.safe_metadata as Record<string, unknown> | undefined)?.delivery_handling ?? "",
  );
  if (handling === "direct_handled" || handling === "configuration_required") {
    return { ok: true, suppressed: true, code: "already_handled" };
  }

  if (rule.recipientStrategy !== "application_customer") {
    return { ok: true, suppressed: true, code: "no_recipient_strategy" };
  }

  const entityType = String(event.entity_type);
  const entityId = String(event.entity_id);
  const applicationId =
    entityType === "application"
      ? entityId
      : String((event.safe_metadata as Record<string, unknown> | undefined)?.application_id ?? "");

  if (!applicationId) {
    return { ok: false, error: "missing_application_id", code: "missing_application" };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "supabase_missing" };

  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, customer_id, customer_mobile, customer_mobile_normalized, customer_name, service_name, status, total_amount, amount",
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (!app) return { ok: false, error: "application_not_found", code: "not_found" };

  const mobile = String(app.customer_mobile_normalized || app.customer_mobile || "").trim();
  if (!mobile) return { ok: false, error: "mobile_missing", code: "invalid_mobile" };

  const meta = (event.safe_metadata as Record<string, unknown> | undefined) ?? {};
  const templateEvent = String(
    rule.templateEvent || meta.whatsapp_event || rule.purpose || "application_submitted",
  ) as ApplicationWhatsAppEvent;

  const campaignName = getApplicationCampaignName(templateEvent);
  if (!campaignName) {
    await createOpsAlert({
      alertType: "missing_template_mapping",
      severity: "warning",
      title: "Missing WhatsApp template mapping",
      safeSummary: `No campaign for ${templateEvent}`,
      relatedEntityType: "application",
      relatedEntityId: applicationId,
      sourceEventId: String(event.id),
      idempotencyParts: ["missing_template", applicationId, templateEvent],
    });
    return { ok: false, error: "missing_template", code: "missing_template" };
  }

  const templateParams = buildApplicationTemplateParams(templateEvent, {
    customerName: String(app.customer_name || "Customer"),
    serviceName: String(app.service_name || "Service"),
    applicationId,
    status: String(meta.status || app.status || ""),
    amount: app.total_amount ?? app.amount,
    notes: meta.notes ? String(meta.notes) : undefined,
  });

  const version = Number(meta.version ?? 1);
  const queueOutboxKey = buildQueueOutboxKeyFromAutomationEvent({
    automationEventId: String(event.id),
    purpose: String(rule.purpose || templateEvent),
    ruleVersion: Number(rule.version ?? 1),
  });

  const result = await enqueueCommunication({
    purpose: String(rule.purpose || templateEvent),
    recipientMobile: mobile,
    customerId: app.customer_id ? String(app.customer_id) : null,
    applicationId,
    eventKeyParts: [applicationId, templateEvent, String(version)],
    idempotencyKey: queueOutboxKey,
    templateParams,
    userName: String(app.customer_name || "Customer"),
    campaignName,
    classification: rule.classification ?? "transactional",
    consentBasis: "transactional_ops",
    correlationId: event.correlation_id ? String(event.correlation_id) : undefined,
    safePayload: { automation_event_id: event.id, rule_key: rule.key },
  });

  if (!result.ok) return { ok: false, error: result.error, code: result.code };
  return { ok: true, suppressed: result.status === "suppressed" };
}

async function finalizeEvent(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  id: string,
  workerId: string,
  patch: Record<string, unknown>,
) {
  await supabase
    .from("crm_automation_events")
    .update({
      ...patch,
      processing_lease_until: null,
      processing_owner: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("processing_owner", workerId)
    .eq("status", "processing");
}
