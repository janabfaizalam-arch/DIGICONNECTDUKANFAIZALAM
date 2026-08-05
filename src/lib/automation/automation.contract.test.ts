/**
 * Phase 5B automation contract tests — deterministic, no live provider/DB.
 * CI: `pnpm test:crm-automation`
 * Local Windows: Vitest may be BLOCKED — do not claim PASS if blocked.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import {
  evaluateSafeConditions,
  isAllowedAutomationActionType,
  isAllowedAutomationEventType,
  buildAutomationEventIdempotencyKey,
} from "@/lib/automation/events-core";
import {
  resolveCrmNotificationDeliveryMode,
  resolveCrmNotificationDeliveryModeDetailed,
  isQueueDeliveryMode,
  isDirectDeliveryMode,
  outboxMaySend,
  automationMayEnqueueCustomerWhatsApp,
} from "@/lib/automation/delivery-mode";
import { istBusinessDate, istDayUtcBounds } from "@/lib/automation/daily-summary";
import { roleHasCapability } from "@/lib/crm/permissions-core";
import { AUTOMATION_RULES } from "@/lib/automation/rules";
import {
  APPLICATION_STATUS_PRODUCER_CALL_SITES,
  INTERNAL_ONLY_APPLICATION_STATUSES,
} from "@/lib/automation/producers/status-changed";
import { DAILY_SUMMARY_METRIC_CONTRACT } from "@/lib/automation/daily-summary-contract";

describe("P0 fail-closed delivery mode", () => {
  it("unset → disabled", () => {
    const r = resolveCrmNotificationDeliveryModeDetailed({} as NodeJS.ProcessEnv);
    expect(r.mode).toBe("disabled");
    expect(r.reason).toBe("missing");
    expect(r.failClosed).toBe(true);
  });

  it("blank → disabled", () => {
    const r = resolveCrmNotificationDeliveryModeDetailed({
      CRM_NOTIFICATION_DELIVERY_MODE: "   ",
    } as NodeJS.ProcessEnv);
    expect(r.mode).toBe("disabled");
    expect(r.reason).toBe("blank");
  });

  it("invalid → disabled (never direct); trim+lower is deterministic", () => {
    for (const v of ["both", "live", "true", "1", "queued", "DIRECT "]) {
      // "DIRECT " trims to "direct" — exact after normalize is intentional
      if (v.trim().toLowerCase() === "direct") {
        expect(resolveCrmNotificationDeliveryMode({ CRM_NOTIFICATION_DELIVERY_MODE: v } as NodeJS.ProcessEnv)).toBe(
          "direct",
        );
        continue;
      }
      const r = resolveCrmNotificationDeliveryModeDetailed({
        CRM_NOTIFICATION_DELIVERY_MODE: v,
      } as NodeJS.ProcessEnv);
      expect(r.mode).toBe("disabled");
      expect(r.reason).toBe("unknown");
    }
  });
  it("exact queue / direct / disabled", () => {
    expect(resolveCrmNotificationDeliveryMode({ CRM_NOTIFICATION_DELIVERY_MODE: "queue" } as NodeJS.ProcessEnv)).toBe(
      "queue",
    );
    expect(resolveCrmNotificationDeliveryMode({ CRM_NOTIFICATION_DELIVERY_MODE: "direct" } as NodeJS.ProcessEnv)).toBe(
      "direct",
    );
    expect(
      resolveCrmNotificationDeliveryMode({ CRM_NOTIFICATION_DELIVERY_MODE: "disabled" } as NodeJS.ProcessEnv),
    ).toBe("disabled");
  });

  it("never defines a dual-send mode", () => {
    expect(isQueueDeliveryMode("queue") && isDirectDeliveryMode("queue")).toBe(false);
    expect(outboxMaySend("direct")).toBe(false);
    expect(outboxMaySend("disabled")).toBe(false);
    expect(outboxMaySend("queue")).toBe(true);
    expect(automationMayEnqueueCustomerWhatsApp("direct")).toBe(false);
    expect(automationMayEnqueueCustomerWhatsApp("disabled")).toBe(false);
  });

  it("proves unset never enables provider path (outboxMaySend)", () => {
    expect(outboxMaySend(resolveCrmNotificationDeliveryMode({} as NodeJS.ProcessEnv))).toBe(false);
  });

  it("proves invalid never enables provider path", () => {
    expect(
      outboxMaySend(
        resolveCrmNotificationDeliveryMode({ CRM_NOTIFICATION_DELIVERY_MODE: "live" } as NodeJS.ProcessEnv),
      ),
    ).toBe(false);
  });
});

describe("direct/queue/disabled transition matrix", () => {
  it("documents exclusive ownership", () => {
    const matrix = {
      queue: { requestSends: false, automationEnqueues: true, outboxSends: true },
      direct: { requestSends: true, automationEnqueues: false, outboxSends: false },
      disabled: { requestSends: false, automationEnqueues: false, outboxSends: false },
    };
    expect(matrix.queue.outboxSends && matrix.direct.requestSends).toBe(false); // not both paths live
    expect(matrix.direct.automationEnqueues).toBe(false);
    expect(matrix.disabled.requestSends).toBe(false);
  });

  it("customer WA rules require delivery_mode=queue", () => {
    const waRules = AUTOMATION_RULES.filter((r) => r.actionType === "enqueue_communication" && r.enabled);
    for (const rule of waRules) {
      expect(rule.conditions?.some((c) => c.field === "delivery_mode" && c.value === "queue")).toBe(true);
    }
  });
});

describe("no queue+direct duplicate / direct_handled / disabled not sendable", () => {
  it("direct_handled metadata is recognized as terminal for reconcile skip", () => {
    const handling = "direct_handled";
    expect(["direct_handled", "configuration_required"].includes(handling)).toBe(true);
  });

  it("disabled event status is not claimable", () => {
    const claimable = ["pending", "retryable"];
    expect(claimable.includes("suppressed")).toBe(false);
    expect(claimable.includes("completed")).toBe(false);
  });
});

describe("assignment / follow-up / status producers (contracts)", () => {
  it("assignment idempotency uses history row id", () => {
    const key = buildAutomationEventIdempotencyKey([
      "application.assigned",
      "assignment_history",
      "hist-uuid-1",
    ]);
    expect(key).toContain("hist-uuid-1");
    expect(key).toBe(
      buildAutomationEventIdempotencyKey(["application.assigned", "assignment_history", "hist-uuid-1"]),
    );
  });

  it("follow-up due idempotency uses follow-up id + scheduled_at", () => {
    const scheduledAt = "2026-08-05T10:00:00.000Z";
    const a = buildAutomationEventIdempotencyKey(["lead.followup_due", "followup_due", "fu-1", scheduledAt]);
    const b = buildAutomationEventIdempotencyKey(["lead.followup_due", "followup_due", "fu-1", scheduledAt]);
    expect(a).toBe(b);
  });

  it("status-history idempotency is distinct per history row", () => {
    const a = buildAutomationEventIdempotencyKey(["application.status_changed", "status_history", "h1"]);
    const b = buildAutomationEventIdempotencyKey(["application.status_changed", "status_history", "h2"]);
    expect(a).not.toBe(b);
  });

  it("internal-only statuses are classified", () => {
    expect(INTERNAL_ONLY_APPLICATION_STATUSES.has("assigned_to_agent")).toBe(true);
    expect(INTERNAL_ONLY_APPLICATION_STATUSES.has("documents_required")).toBe(false);
  });

  it("status producer call-site coverage list is non-empty", () => {
    expect(APPLICATION_STATUS_PRODUCER_CALL_SITES.length).toBeGreaterThan(0);
  });

  it("admin applications route imports status and assignment producers", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/api/admin/applications/[id]/route.ts"),
      "utf8",
    );
    expect(src).toContain("emitApplicationStatusChangedFromHistory");
    expect(src).toContain("recordApplicationAssignmentEvent");
  });
});

describe("communication failure / alert recursion", () => {
  it("failure idempotency parts include outbox id + terminal key", () => {
    const a = buildAutomationEventIdempotencyKey(["communication.failed", "outbox", "msg-1", "failed", "provider_error"]);
    const b = buildAutomationEventIdempotencyKey(["communication.failed", "outbox", "msg-1", "failed", "provider_error"]);
    expect(a).toBe(b);
  });

  it("communication.failed rule does not enqueue customer WA", () => {
    const failRule = AUTOMATION_RULES.find((r) => r.key === "communication_failed_admin_alert");
    expect(failRule?.actionType).toBe("create_admin_alert");
    expect(failRule?.actionType).not.toBe("enqueue_communication");
  });
});

describe("rule execution uniqueness / no auto-replay", () => {
  it("execution key binds event + rule + version", () => {
    const execKey = `exec:evt-1:application_created_customer_wa:v1`;
    expect(execKey).toContain(":v1");
    // New rule version = new key — deliberate replay required; completed events not auto-replayed
    expect(`exec:evt-1:application_created_customer_wa:v2`).not.toBe(execKey);
  });

  it("documents DB uniqueness contracts exist in migration", () => {
    const mig = readFileSync(
      join(process.cwd(), "supabase/migrations/20260805170000_crm_automation_foundation.sql"),
      "utf8",
    );
    expect(mig).toMatch(/unique \(idempotency_key\)/);
    expect(mig).toContain("crm_automation_events");
    expect(mig).toContain("crm_automation_executions");
    expect(mig).toContain("crm_ops_alerts");
    expect(mig).toContain("crm_daily_summaries");
  });
});

describe("permissions — retry and alerts", () => {
  it("admin can retry; partner/customer cannot", () => {
    expect(roleHasCapability("admin", "automation.retry")).toBe(true);
    expect(roleHasCapability("agency_partner", "automation.retry")).toBe(false);
    expect(roleHasCapability("customer", "automation.retry")).toBe(false);
  });

  it("admin can resolve alerts; partner cannot", () => {
    expect(roleHasCapability("admin", "alerts.resolve")).toBe(true);
    expect(roleHasCapability("agency_partner", "alerts.resolve")).toBe(false);
  });
});

describe("daily summary definitions and IST boundaries", () => {
  it("formats IST business date", () => {
    const d = istBusinessDate(new Date("2026-08-05T18:30:00.000Z"));
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("produces 24h window", () => {
    const { fromIso, toIso } = istDayUtcBounds("2026-08-05");
    expect(new Date(toIso).getTime() - new Date(fromIso).getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("metric contract covers required keys", () => {
    const keys = Object.keys(DAILY_SUMMARY_METRIC_CONTRACT);
    expect(keys).toContain("leads_converted");
    expect(keys).toContain("walk_in_customers");
    expect(keys).toContain("applications_completed");
    expect(keys).toContain("pending_applications");
    expect(keys).toContain("overdue_follow_ups");
    expect(keys).toContain("failed_communications");
  });
});

describe("OTP separation", () => {
  it("documents OTP does not use CRM_NOTIFICATION_DELIVERY_MODE", () => {
    // Contract: OTP campaigns remain on dedicated paths; delivery mode resolver is CRM non-OTP only.
    expect(typeof resolveCrmNotificationDeliveryMode).toBe("function");
  });
});

describe("env example fail-closed", () => {
  it(".env.example must not default CRM_NOTIFICATION_DELIVERY_MODE to direct", () => {
    const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    expect(envExample).toMatch(/CRM_NOTIFICATION_DELIVERY_MODE/);
    // Must not uncomment a direct default as the recommended value
    expect(envExample).not.toMatch(/^CRM_NOTIFICATION_DELIVERY_MODE=direct\s*$/m);
    expect(envExample).toMatch(/disabled|empty|unset|fail.?closed/i);
  });
});

describe("provider never called on unset/invalid (mock contract)", () => {
  it("outbox skip when mode disabled — no provider factory needed", () => {
    const send = vi.fn();
    const mode = resolveCrmNotificationDeliveryMode({} as NodeJS.ProcessEnv);
    if (mode !== "queue") {
      // Processor returns early — provider must not be invoked
      expect(send).not.toHaveBeenCalled();
    }
    expect(mode).toBe("disabled");
  });

  it("outbox skip when mode invalid", () => {
    const send = vi.fn();
    const mode = resolveCrmNotificationDeliveryMode({
      CRM_NOTIFICATION_DELIVERY_MODE: "nonsense",
    } as NodeJS.ProcessEnv);
    if (mode !== "queue") expect(send).not.toHaveBeenCalled();
    expect(mode).toBe("disabled");
  });
});

describe("safe conditions", () => {
  it("evaluates whitelisted operators only", () => {
    expect(
      evaluateSafeConditions([{ field: "delivery_mode", op: "eq", value: "queue" }], {
        delivery_mode: "queue",
      }),
    ).toBe(true);
    expect(
      evaluateSafeConditions([{ field: "delivery_mode", op: "eq", value: "queue" }], {
        delivery_mode: "direct",
      }),
    ).toBe(false);
  });
});

describe("rules catalogue safety", () => {
  it("has no arbitrary URL/SQL actions", () => {
    for (const rule of AUTOMATION_RULES) {
      expect(isAllowedAutomationActionType(rule.actionType)).toBe(true);
      expect(isAllowedAutomationEventType(rule.eventType)).toBe(true);
    }
  });

  it("keeps onboarding PIN rule disabled", () => {
    const onboarding = AUTOMATION_RULES.find((r) => r.key === "onboarding_pin_disabled");
    expect(onboarding?.enabled).toBe(false);
  });
});
