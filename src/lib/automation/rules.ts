import "server-only";

import type { AutomationActionType, AutomationEventType, SafeCondition } from "@/lib/automation/events-core";
import type { CommunicationPurpose } from "@/lib/communications/comms-core";

export type AutomationRuleDefinition = {
  key: string;
  name: string;
  enabled: boolean;
  eventType: AutomationEventType;
  actionType: AutomationActionType;
  version: number;
  /** Delay seconds before action (0 = immediate) */
  delaySeconds: number;
  maxExecutionsPerEvent: number;
  conditions?: SafeCondition[];
  /** For enqueue_communication */
  purpose?: CommunicationPurpose | string;
  templateEvent?: string;
  recipientStrategy?: "application_customer" | "none";
  classification?: "transactional" | "promotional";
  /** For alerts */
  alertType?: string;
  alertSeverity?: "info" | "warning" | "critical";
  /** Environment readiness */
  readiness: "active" | "configuration_ready" | "deferred";
};

/**
 * Code-defined automation rules — no arbitrary JS/SQL/URLs.
 * Admin UI may be read-only over this catalogue.
 */
export const AUTOMATION_RULES: AutomationRuleDefinition[] = [
  {
    key: "application_created_customer_wa",
    name: "Application created — customer confirmation",
    enabled: true,
    eventType: "application.created",
    actionType: "enqueue_communication",
    version: 1,
    delaySeconds: 0,
    maxExecutionsPerEvent: 1,
    conditions: [{ field: "delivery_mode", op: "eq", value: "queue" }],
    purpose: "application_submitted",
    templateEvent: "application_submitted",
    recipientStrategy: "application_customer",
    classification: "transactional",
    readiness: "active",
  },
  {
    key: "lead_converted_customer_wa",
    name: "Lead converted — application confirmation",
    enabled: true,
    eventType: "lead.converted",
    actionType: "enqueue_communication",
    version: 1,
    delaySeconds: 0,
    maxExecutionsPerEvent: 1,
    conditions: [{ field: "delivery_mode", op: "eq", value: "queue" }],
    purpose: "application_submitted",
    templateEvent: "application_submitted",
    recipientStrategy: "application_customer",
    classification: "transactional",
    readiness: "active",
  },
  {
    key: "application_status_customer_wa",
    name: "Application status update — customer",
    enabled: true,
    eventType: "application.status_changed",
    actionType: "enqueue_communication",
    version: 1,
    delaySeconds: 0,
    maxExecutionsPerEvent: 1,
    conditions: [{ field: "delivery_mode", op: "eq", value: "queue" }],
    purpose: "application_status",
    recipientStrategy: "application_customer",
    classification: "transactional",
    readiness: "active",
  },
  {
    key: "application_document_required_wa",
    name: "Document required — customer",
    enabled: true,
    eventType: "application.document_required",
    actionType: "enqueue_communication",
    version: 1,
    delaySeconds: 0,
    maxExecutionsPerEvent: 1,
    conditions: [{ field: "delivery_mode", op: "eq", value: "queue" }],
    purpose: "document_required",
    templateEvent: "documents_required",
    recipientStrategy: "application_customer",
    classification: "transactional",
    readiness: "active",
  },
  {
    key: "application_payment_received_wa",
    name: "Payment received — customer",
    enabled: true,
    eventType: "application.payment_received",
    actionType: "enqueue_communication",
    version: 1,
    delaySeconds: 0,
    maxExecutionsPerEvent: 1,
    conditions: [{ field: "delivery_mode", op: "eq", value: "queue" }],
    purpose: "payment_success",
    templateEvent: "payment_success",
    recipientStrategy: "application_customer",
    classification: "transactional",
    readiness: "active",
  },
  {
    key: "application_payment_due_wa",
    name: "Payment due — customer reminder",
    enabled: true,
    eventType: "application.payment_due",
    actionType: "enqueue_communication",
    version: 1,
    delaySeconds: 0,
    maxExecutionsPerEvent: 1,
    conditions: [{ field: "delivery_mode", op: "eq", value: "queue" }],
    purpose: "payment_due",
    templateEvent: "payment_pending",
    recipientStrategy: "application_customer",
    classification: "transactional",
    readiness: "active",
  },
  {
    key: "application_completed_wa",
    name: "Application completed — customer",
    enabled: true,
    eventType: "application.completed",
    actionType: "enqueue_communication",
    version: 1,
    delaySeconds: 0,
    maxExecutionsPerEvent: 1,
    conditions: [{ field: "delivery_mode", op: "eq", value: "queue" }],
    purpose: "application_completed",
    templateEvent: "completed",
    recipientStrategy: "application_customer",
    classification: "transactional",
    readiness: "active",
  },
  {
    key: "application_assigned_staff_alert",
    name: "Application assigned — staff alert",
    enabled: true,
    eventType: "application.assigned",
    actionType: "create_staff_alert",
    version: 1,
    delaySeconds: 0,
    maxExecutionsPerEvent: 1,
    alertType: "application_assigned",
    alertSeverity: "info",
    readiness: "active",
  },
  {
    key: "lead_followup_due_internal",
    name: "Lead follow-up due — internal alert",
    enabled: true,
    eventType: "lead.followup_due",
    actionType: "schedule_internal_followup_alert",
    version: 1,
    delaySeconds: 0,
    maxExecutionsPerEvent: 1,
    alertType: "followup_overdue",
    alertSeverity: "warning",
    readiness: "active",
  },
  {
    key: "communication_failed_admin_alert",
    name: "Communication failed — admin alert",
    enabled: true,
    eventType: "communication.failed",
    actionType: "create_admin_alert",
    version: 1,
    delaySeconds: 0,
    maxExecutionsPerEvent: 1,
    alertType: "communication_failed",
    alertSeverity: "critical",
    readiness: "active",
  },
  {
    key: "feedback_request_deferred",
    name: "Feedback request (promotional) — deferred",
    enabled: false,
    eventType: "application.completed",
    actionType: "enqueue_communication",
    version: 1,
    delaySeconds: 86400,
    maxExecutionsPerEvent: 1,
    conditions: [
      { field: "delivery_mode", op: "eq", value: "queue" },
      { field: "classification", op: "eq", value: "promotional" },
    ],
    purpose: "feedback_request",
    recipientStrategy: "application_customer",
    classification: "promotional",
    readiness: "deferred",
  },
  {
    key: "onboarding_pin_disabled",
    name: "Customer onboarding temporary PIN — configuration-disabled",
    enabled: false,
    eventType: "customer.onboarding_requested",
    actionType: "enqueue_communication",
    version: 1,
    delaySeconds: 0,
    maxExecutionsPerEvent: 1,
    purpose: "customer_welcome",
    recipientStrategy: "none",
    classification: "transactional",
    readiness: "deferred",
  },
];

export function rulesForEventType(eventType: string): AutomationRuleDefinition[] {
  return AUTOMATION_RULES.filter((r) => r.eventType === eventType && r.enabled);
}

export function getAutomationRuleCatalogue(): AutomationRuleDefinition[] {
  return AUTOMATION_RULES;
}
