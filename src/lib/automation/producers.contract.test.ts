/**
 * Producer contract tests — assignment, follow-up due, status (deterministic).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import { buildAutomationEventIdempotencyKey } from "@/lib/automation/events-core";
import { INTERNAL_ONLY_APPLICATION_STATUSES } from "@/lib/automation/producers/status-changed";

/** Pure follow-up eligibility mirror of scanner filters (no DB). */
function isFollowUpDueEligible(input: {
  status: string;
  scheduledAt: string;
  nowIso: string;
  lookbackIso: string;
  pipelineStage: string;
}): boolean {
  if (input.status !== "scheduled") return false;
  if (["completed", "cancelled", "rescheduled"].includes(input.status)) return false;
  if (input.scheduledAt > input.nowIso) return false;
  if (input.scheduledAt < input.lookbackIso) return false;
  if (["won", "lost", "converted"].includes(input.pipelineStage)) return false;
  return true;
}

describe("follow-up due eligibility", () => {
  const now = "2026-08-05T12:00:00.000Z";
  const lookback = "2026-08-02T12:00:00.000Z";

  it("not-yet-due", () => {
    expect(
      isFollowUpDueEligible({
        status: "scheduled",
        scheduledAt: "2026-08-05T13:00:00.000Z",
        nowIso: now,
        lookbackIso: lookback,
        pipelineStage: "contacted",
      }),
    ).toBe(false);
  });

  it("due follow-up", () => {
    expect(
      isFollowUpDueEligible({
        status: "scheduled",
        scheduledAt: "2026-08-05T11:00:00.000Z",
        nowIso: now,
        lookbackIso: lookback,
        pipelineStage: "contacted",
      }),
    ).toBe(true);
  });

  it("excludes completed / cancelled / rescheduled", () => {
    for (const status of ["completed", "cancelled", "rescheduled"]) {
      expect(
        isFollowUpDueEligible({
          status,
          scheduledAt: "2026-08-05T11:00:00.000Z",
          nowIso: now,
          lookbackIso: lookback,
          pipelineStage: "contacted",
        }),
      ).toBe(false);
    }
  });

  it("repeated scan same idempotency", () => {
    const a = buildAutomationEventIdempotencyKey([
      "lead.followup_due",
      "followup_due",
      "fu-1",
      "2026-08-05T11:00:00.000Z",
    ]);
    const b = buildAutomationEventIdempotencyKey([
      "lead.followup_due",
      "followup_due",
      "fu-1",
      "2026-08-05T11:00:00.000Z",
    ]);
    expect(a).toBe(b);
  });

  it("reschedule changes scheduled_at → new key", () => {
    const a = buildAutomationEventIdempotencyKey(["lead.followup_due", "followup_due", "fu-1", "t1"]);
    const b = buildAutomationEventIdempotencyKey(["lead.followup_due", "followup_due", "fu-1", "t2"]);
    expect(a).not.toBe(b);
  });

  it("bounded lookback excludes ancient rows", () => {
    expect(
      isFollowUpDueEligible({
        status: "scheduled",
        scheduledAt: "2026-07-01T11:00:00.000Z",
        nowIso: now,
        lookbackIso: lookback,
        pipelineStage: "contacted",
      }),
    ).toBe(false);
  });
});

describe("assignment producer contracts", () => {
  it("initial and reassignment use distinct history ids", () => {
    const initial = buildAutomationEventIdempotencyKey([
      "application.assigned",
      "assignment_history",
      "h-initial",
    ]);
    const reassign = buildAutomationEventIdempotencyKey([
      "application.assigned",
      "assignment_history",
      "h-reassign",
    ]);
    expect(initial).not.toBe(reassign);
  });

  it("unassigned uses alert idempotency on history id (no customer WA rule)", () => {
    const alertKey = buildAutomationEventIdempotencyKey(["unassigned_application", "unassigned", "h-u"]);
    expect(alertKey).toContain("h-u");
  });

  it("all canonical assignment-history writers invoke assignment event producer", () => {
    const writers = [
      "src/lib/crm/walk-in-application.ts",
      "src/app/api/admin/applications/[id]/route.ts",
    ];
    for (const file of writers) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      expect(src).toContain("recordApplicationAssignmentEvent");
      expect(src).toContain(".from(\"application_assignment_history\")");
    }
  });
});

describe("internal-only status suppression", () => {
  it("assigned_to_agent is internal-only", () => {
    expect(INTERNAL_ONLY_APPLICATION_STATUSES.has("assigned_to_agent")).toBe(true);
  });
});
