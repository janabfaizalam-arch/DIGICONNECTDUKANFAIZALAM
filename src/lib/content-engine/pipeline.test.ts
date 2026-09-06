import { describe, expect, it } from "vitest";

import {
  DASHBOARD_BUCKETS,
  allowedNext,
  bucketFor,
  canTransition,
  stageIndex,
  transition,
} from "@/lib/content-engine/pipeline";
import { CONTENT_STAGES, type ContentStatus } from "@/lib/content-engine/types";

/**
 * The pipeline only moves forward, and only through its gates.
 *
 * A status column that accepts anything is not a pipeline. These tests are the
 * difference: a draft cannot become SCHEDULED without having been approved,
 * and no amount of convenience elsewhere in the codebase can change that
 * without one of these failing.
 */

describe("moving forward", () => {
  it("walks the whole pipeline one step at a time", () => {
    let status: ContentStatus = "IDEA";
    const walked: ContentStatus[] = [status];

    for (const next of CONTENT_STAGES.slice(1)) {
      // FACT_CHECK_PENDING and FACT_CHECKED are skippable for non-government
      // content, so a straight walk uses the full path where one exists.
      if (!canTransition(status, next)) continue;
      const result = transition(status, next);
      expect(result.ok, `${status} → ${next}`).toBe(true);
      if (!result.ok) return;
      status = result.status;
      walked.push(status);
    }

    expect(status).toBe("ANALYZED");
    expect(walked).toContain("APPROVAL_PENDING");
    expect(walked).toContain("APPROVED");
  });

  it("lets ordinary content skip the fact check but not the approval", () => {
    expect(canTransition("DRAFT_READY", "DESIGN_READY")).toBe(true);
    expect(canTransition("DESIGN_READY", "APPROVAL_PENDING")).toBe(true);
    expect(canTransition("DESIGN_READY", "SCHEDULED")).toBe(false);
  });
});

describe("the jumps that must not be possible", () => {
  it("cannot skip approval", () => {
    for (const from of ["DRAFT_READY", "FACT_CHECKED", "DESIGN_READY"] as ContentStatus[]) {
      expect(canTransition(from, "SCHEDULED"), `${from} → SCHEDULED`).toBe(false);
      expect(canTransition(from, "PUBLISHED"), `${from} → PUBLISHED`).toBe(false);
    }
  });

  it("cannot jump from an idea to published", () => {
    expect(canTransition("IDEA", "PUBLISHED")).toBe(false);
    expect(canTransition("IDEA", "APPROVED")).toBe(false);
  });

  it("cannot go backwards from published", () => {
    for (const to of CONTENT_STAGES.filter((stage) => stage !== "ANALYZED")) {
      expect(canTransition("PUBLISHED", to), `PUBLISHED → ${to}`).toBe(false);
    }
  });

  it("refuses a status that is not part of the pipeline at all", () => {
    const result = transition("DRAFT_READY", "SOMETHING_ELSE" as ContentStatus);
    expect(result.ok).toBe(false);
  });

  it("says both ends in the refusal, so the message is actionable", () => {
    const result = transition("IDEA", "PUBLISHED");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("IDEA");
    expect(result.reason).toContain("PUBLISHED");
  });
});

describe("failure and recovery", () => {
  it("can fail from anywhere", () => {
    for (const stage of CONTENT_STAGES) {
      expect(canTransition(stage, "FAILED"), `${stage} → FAILED`).toBe(true);
    }
  });

  it("resumes from wherever a retry decides", () => {
    expect(canTransition("FAILED", "DRAFT_READY")).toBe(true);
    expect(canTransition("FAILED", "IDEA")).toBe(true);
  });

  it("sits outside the pipeline rather than at the start of it", () => {
    expect(stageIndex("FAILED")).toBe(-1);
    expect(stageIndex("IDEA")).toBe(0);
  });
});

describe("sending work back", () => {
  it("lets an approver return a post for a rewrite or a redesign", () => {
    expect(canTransition("APPROVAL_PENDING", "DRAFT_READY")).toBe(true);
    expect(canTransition("APPROVAL_PENDING", "DESIGN_READY")).toBe(true);
    expect(canTransition("APPROVAL_PENDING", "FACT_CHECK_PENDING")).toBe(true);
  });

  it("lets a fact check be redone when a source turns out to be stale", () => {
    expect(canTransition("FACT_CHECKED", "FACT_CHECK_PENDING")).toBe(true);
  });

  it("refuses to move to the status it is already at", () => {
    expect(transition("DRAFT_READY", "DRAFT_READY").ok).toBe(false);
  });
});

describe("the dashboard's buckets", () => {
  it("places every stage in exactly one bucket", () => {
    const placed = DASHBOARD_BUCKETS.flatMap((bucket) => bucket.statuses);
    for (const stage of CONTENT_STAGES) {
      expect(placed.filter((status) => status === stage).length, `${stage}`).toBe(1);
    }
    expect(placed).toContain("FAILED");
  });

  it("resolves a status to its bucket", () => {
    expect(bucketFor("APPROVAL_PENDING")).toBe("approval");
    expect(bucketFor("FAILED")).toBe("failed");
    expect(bucketFor("ANALYZED")).toBe("published");
  });

  it("offers a next step from every stage except the last", () => {
    for (const stage of CONTENT_STAGES.filter((candidate) => candidate !== "ANALYZED")) {
      expect(allowedNext(stage).length, `${stage}`).toBeGreaterThan(1);
    }
  });
});
