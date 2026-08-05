/**
 * Daily summary metric definitions — query contracts for Phase 5B.
 * Delivery of the summary itself remains disabled (stored row only).
 *
 * Late-arriving updates: metrics use the timestamp column listed; rows updated
 * after the IST day may appear on a later business date when using updated_at.
 * Prefer created_at / failed_at for event-time accuracy where noted.
 */

export type MetricContract = {
  sourceTable: string;
  timestampColumn: string;
  includedStatuses: string[];
  excludedStatuses: string[];
  distinctKey: string;
  istBoundary: string;
  lateArriving: string;
  partnerScope: string;
  excludesDeletedTestDemo: string;
  notes: string;
};

export const DAILY_SUMMARY_METRIC_CONTRACT: Record<string, MetricContract> = {
  new_leads: {
    sourceTable: "leads",
    timestampColumn: "created_at",
    includedStatuses: ["*"],
    excludedStatuses: [],
    distinctKey: "leads.id",
    istBoundary: "created_at ∈ [IST day start, IST day end)",
    lateArriving: "Counted on create day only",
    partnerScope: "Global admin aggregate (no partner filter in Phase 5B)",
    excludesDeletedTestDemo: "No soft-delete filter — none defined on leads",
    notes: "All leads created in window",
  },
  leads_converted: {
    sourceTable: "leads",
    timestampColumn: "updated_at",
    includedStatuses: ["pipeline_stage in (won, converted)"],
    excludedStatuses: [],
    distinctKey: "leads.id",
    istBoundary: "updated_at ∈ IST day",
    lateArriving: "May shift day if stage updated later",
    partnerScope: "Global admin",
    excludesDeletedTestDemo: "None",
    notes:
      "Separate from won-only UI labels. Converted + won are both counted here as conversion outcomes — UI must not also show a separate 'won' that double-counts the same rows without labeling.",
  },
  walk_in_customers: {
    sourceTable: "customers",
    timestampColumn: "created_at",
    includedStatuses: ["source_channel = walk_in"],
    excludedStatuses: [],
    distinctKey: "customers.id",
    istBoundary: "created_at ∈ IST day",
    lateArriving: "Create-day only",
    partnerScope: "Global admin",
    excludesDeletedTestDemo: "None",
    notes: "Canonical walk-in source_channel value",
  },
  applications_created: {
    sourceTable: "applications",
    timestampColumn: "created_at",
    includedStatuses: ["*"],
    excludedStatuses: [],
    distinctKey: "applications.id",
    istBoundary: "created_at ∈ IST day",
    lateArriving: "Create-day only",
    partnerScope: "Global admin",
    excludesDeletedTestDemo: "None",
    notes: "Includes walk-in and lead-conversion applications",
  },
  applications_completed: {
    sourceTable: "applications",
    timestampColumn: "updated_at",
    includedStatuses: ["status = completed"],
    excludedStatuses: [],
    distinctKey: "applications.id",
    istBoundary: "updated_at ∈ IST day",
    lateArriving: "Uses row updated_at — prefer status history in a future hardening",
    partnerScope: "Global admin",
    excludesDeletedTestDemo: "None",
    notes: "Phase 5B uses applications.status=completed; status-history completion is preferred long-term",
  },
  pending_applications: {
    sourceTable: "applications",
    timestampColumn: "n/a (snapshot)",
    includedStatuses: ["not in completed, cancelled, rejected"],
    excludedStatuses: ["completed", "cancelled", "rejected"],
    distinctKey: "applications.id",
    istBoundary: "Point-in-time snapshot (not day-bounded)",
    lateArriving: "Snapshot at generation time",
    partnerScope: "Global admin",
    excludesDeletedTestDemo: "None",
    notes: "Excludes terminal completed/cancelled/rejected",
  },
  overdue_follow_ups: {
    sourceTable: "leads",
    timestampColumn: "next_follow_up_at",
    includedStatuses: ["next_follow_up_at < now"],
    excludedStatuses: ["pipeline_stage in won, lost, converted"],
    distinctKey: "leads.id",
    istBoundary: "Compared in UTC timestamptz; IST is presentation",
    lateArriving: "Live overdue set",
    partnerScope: "Global admin",
    excludesDeletedTestDemo: "None",
    notes:
      "Lead pointer overdue. lead_follow_ups completed/cancelled/rescheduled are excluded from due scanner; this metric uses leads.next_follow_up_at and should be aligned to follow-up table in a follow-up hardening.",
  },
  unassigned_leads: {
    sourceTable: "leads",
    timestampColumn: "n/a (snapshot)",
    includedStatuses: ["assigned_to is null"],
    excludedStatuses: ["pipeline_stage in won, lost, converted"],
    distinctKey: "leads.id",
    istBoundary: "Snapshot",
    lateArriving: "Snapshot",
    partnerScope: "Matches Phase 4 unassigned semantics (assigned_to)",
    excludesDeletedTestDemo: "None",
    notes: "Phase 4 unassigned queue",
  },
  unassigned_applications: {
    sourceTable: "applications",
    timestampColumn: "n/a (snapshot)",
    includedStatuses: ["assigned_agent_id is null"],
    excludedStatuses: ["completed", "cancelled", "rejected"],
    distinctKey: "applications.id",
    istBoundary: "Snapshot",
    lateArriving: "Snapshot",
    partnerScope: "Phase 4 assigned_agent_id semantics",
    excludesDeletedTestDemo: "None",
    notes: "Unassigned applications",
  },
  payments_due: {
    sourceTable: "applications",
    timestampColumn: "n/a (snapshot)",
    includedStatuses: ["payment_status in pending, unpaid"],
    excludedStatuses: ["paid", "verified", "void", "refunded (not included)"],
    distinctKey: "applications.id",
    istBoundary: "Snapshot",
    lateArriving: "Snapshot",
    partnerScope: "Global admin",
    excludesDeletedTestDemo: "None",
    notes: "Does not count paid/void/refunded — only pending/unpaid",
  },
  failed_communications: {
    sourceTable: "whatsapp_messages",
    timestampColumn: "failed_at",
    includedStatuses: ["status = failed"],
    excludedStatuses: ["cancelled", "suppressed", "configuration_required"],
    distinctKey: "whatsapp_messages.id",
    istBoundary: "failed_at ∈ IST day",
    lateArriving: "Event-time via failed_at",
    partnerScope: "Global admin",
    excludesDeletedTestDemo: "None",
    notes: "Current trustworthy failed state",
  },
  configuration_required_communications: {
    sourceTable: "whatsapp_messages",
    timestampColumn: "updated_at",
    includedStatuses: ["status = configuration_required"],
    excludedStatuses: [],
    distinctKey: "whatsapp_messages.id",
    istBoundary: "updated_at ∈ IST day (approx)",
    lateArriving: "May move with updates",
    partnerScope: "Global admin",
    excludesDeletedTestDemo: "None",
    notes: "Separate from failed",
  },
  failed_automation_executions: {
    sourceTable: "crm_automation_executions",
    timestampColumn: "completed_at",
    includedStatuses: ["status = failed"],
    excludedStatuses: ["retryable event-level failures not counted here"],
    distinctKey: "crm_automation_executions.id",
    istBoundary: "completed_at ∈ IST day",
    lateArriving: "Action failure time",
    partnerScope: "Global admin",
    excludesDeletedTestDemo: "None",
    notes: "Does not count transient retryable *events* as permanent failures — only failed executions",
  },
};
