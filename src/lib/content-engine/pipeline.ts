/**
 * What a piece of content is allowed to do next.
 *
 * The pipeline is the spine of this system, and a status that can be set to
 * anything is not a pipeline — it is a column. So every move goes through
 * `transition()`, which refuses a jump that skips a gate. That is what stops
 * a draft being marked SCHEDULED without ever having been fact checked, and
 * it is checked here rather than in each of the fourteen places that write.
 *
 * Pure: no database, no clock, no network. Everything in this file can be
 * reasoned about by reading it, and is tested that way.
 */

import {
  CONTENT_STAGES,
  FAILED_STAGE,
  type ContentStage,
  type ContentStatus,
} from "@/lib/content-engine/types";

/**
 * The one move each stage permits, plus the two that every stage permits.
 *
 * Forward one step is the normal path. FAILED is reachable from anywhere
 * because any stage can hit an API that is down. Backwards is allowed only
 * where a human sends work back — an approver rejecting a draft, a fact check
 * that came back NEEDS_REVIEW — and each of those is written out rather than
 * being a blanket "you may go back", because "back" from PUBLISHED is not a
 * thing that exists.
 */
const FORWARD: Record<ContentStage, ContentStage[]> = {
  IDEA: ["RESEARCHING", "ANGLE_READY"],
  RESEARCHING: ["ANGLE_READY"],
  ANGLE_READY: ["DRAFT_READY"],
  DRAFT_READY: ["FACT_CHECK_PENDING", "DESIGN_READY"],
  FACT_CHECK_PENDING: ["FACT_CHECKED"],
  FACT_CHECKED: ["DESIGN_READY"],
  DESIGN_READY: ["APPROVAL_PENDING"],
  APPROVAL_PENDING: ["APPROVED"],
  APPROVED: ["SCHEDULED"],
  SCHEDULED: ["PUBLISHED"],
  PUBLISHED: ["ANALYZED"],
  ANALYZED: [],
};

/**
 * Where a human may send something back to, and from where.
 *
 * Only three. An approver returning a draft for a rewrite, an approver
 * returning it for a redesign, and a fact check that has to be redone because
 * a source turned out to be stale.
 */
const SEND_BACK: Partial<Record<ContentStage, ContentStage[]>> = {
  APPROVAL_PENDING: ["DRAFT_READY", "DESIGN_READY", "FACT_CHECK_PENDING"],
  DESIGN_READY: ["DRAFT_READY"],
  FACT_CHECKED: ["FACT_CHECK_PENDING"],
  SCHEDULED: ["APPROVED"],
};

export function isContentStage(value: unknown): value is ContentStage {
  return typeof value === "string" && (CONTENT_STAGES as readonly string[]).includes(value);
}

export function isContentStatus(value: unknown): value is ContentStatus {
  return isContentStage(value) || value === FAILED_STAGE;
}

/** How far along the pipeline a status sits. FAILED sits outside it, at -1. */
export function stageIndex(status: ContentStatus): number {
  return isContentStage(status) ? CONTENT_STAGES.indexOf(status) : -1;
}

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  if (from === to) return false;
  if (to === FAILED_STAGE) return true;

  // A failed run resumes from wherever it is retried, which is why FAILED is
  // the one status that may move to any stage: the retry decides.
  if (from === FAILED_STAGE) return isContentStage(to);

  if (!isContentStage(from) || !isContentStage(to)) return false;
  return (FORWARD[from] ?? []).includes(to) || (SEND_BACK[from] ?? []).includes(to);
}

export type TransitionResult =
  | { ok: true; status: ContentStatus }
  | { ok: false; reason: string };

/**
 * Move a post, or say why it cannot move.
 *
 * The refusal message names both ends because it is shown to an
 * administrator, and "cannot change status" tells them nothing they can act
 * on.
 */
export function transition(from: ContentStatus, to: ContentStatus): TransitionResult {
  if (from === to) {
    return { ok: false, reason: `Already ${from}.` };
  }
  if (!isContentStatus(to)) {
    return { ok: false, reason: `${String(to)} is not a stage of this pipeline.` };
  }
  if (!canTransition(from, to)) {
    return {
      ok: false,
      reason: `Cannot go from ${from} to ${to}. Allowed from ${from}: ${allowedNext(from).join(", ") || "nothing"}.`,
    };
  }
  return { ok: true, status: to };
}

export function allowedNext(from: ContentStatus): ContentStatus[] {
  if (from === FAILED_STAGE) return [...CONTENT_STAGES];
  if (!isContentStage(from)) return [];
  return [...(FORWARD[from] ?? []), ...(SEND_BACK[from] ?? []), FAILED_STAGE];
}

/**
 * The dashboard's buckets, in the order the dashboard shows them.
 *
 * Named here rather than in the screen so that the counts and the pipeline
 * cannot drift apart: a stage added below appears on the dashboard without
 * anybody editing a component.
 */
export const DASHBOARD_BUCKETS: { id: string; label: string; statuses: ContentStatus[] }[] = [
  { id: "new-ideas", label: "New ideas", statuses: ["IDEA"] },
  { id: "ranked", label: "Ranked ideas", statuses: ["RESEARCHING", "ANGLE_READY"] },
  { id: "drafts", label: "Drafts", statuses: ["DRAFT_READY"] },
  { id: "fact-check", label: "Fact check pending", statuses: ["FACT_CHECK_PENDING"] },
  { id: "designs", label: "Designs", statuses: ["FACT_CHECKED", "DESIGN_READY"] },
  { id: "approval", label: "Awaiting approval", statuses: ["APPROVAL_PENDING"] },
  { id: "scheduled", label: "Scheduled", statuses: ["APPROVED", "SCHEDULED"] },
  { id: "published", label: "Published", statuses: ["PUBLISHED", "ANALYZED"] },
  { id: "failed", label: "Failed", statuses: [FAILED_STAGE] },
];

/** Which bucket a status falls in, for a badge on a row. */
export function bucketFor(status: ContentStatus): string {
  return DASHBOARD_BUCKETS.find((bucket) => bucket.statuses.includes(status))?.id ?? "new-ideas";
}
