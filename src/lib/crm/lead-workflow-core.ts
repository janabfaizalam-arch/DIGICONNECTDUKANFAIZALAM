/** Stage transition rules + follow-up helpers (pure). */

import {
  isLeadPipelineStage,
  type LeadPipelineStage,
} from "@/lib/crm/leads-core";

const TERMINAL: LeadPipelineStage[] = ["won", "lost"];

/** Allowed forward transitions (plus stay). Lost/won require reopen via admin override flag. */
const ALLOWED: Record<LeadPipelineStage, LeadPipelineStage[]> = {
  new: ["contact_attempted", "contacted", "qualified", "follow_up_scheduled", "lost"],
  contact_attempted: ["contacted", "follow_up_scheduled", "lost", "new"],
  contacted: ["qualified", "service_selected", "follow_up_scheduled", "lost", "contact_attempted"],
  qualified: ["service_selected", "documents_awaited", "follow_up_scheduled", "lost"],
  service_selected: ["documents_awaited", "application_created", "follow_up_scheduled", "lost"],
  documents_awaited: ["application_created", "follow_up_scheduled", "lost", "service_selected"],
  application_created: ["won", "follow_up_scheduled", "documents_awaited"],
  follow_up_scheduled: ["contact_attempted", "contacted", "qualified", "lost", "new"],
  won: [],
  lost: [],
};

export function canTransitionLeadStage(input: {
  from: LeadPipelineStage;
  to: LeadPipelineStage;
  allowReopen?: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (!isLeadPipelineStage(input.from) || !isLeadPipelineStage(input.to)) {
    return { ok: false, error: "Invalid pipeline stage." };
  }
  if (input.from === input.to) return { ok: true };
  if (TERMINAL.includes(input.from)) {
    if (input.allowReopen && (input.to === "new" || input.to === "contact_attempted")) {
      return { ok: true };
    }
    return { ok: false, error: "Terminal leads cannot change stage without authorized reopen." };
  }
  if (!ALLOWED[input.from].includes(input.to)) {
    return { ok: false, error: `Transition ${input.from} → ${input.to} is not allowed.` };
  }
  return { ok: true };
}

export function assertLostReason(stage: LeadPipelineStage, reason?: string | null) {
  if (stage !== "lost") return { ok: true as const };
  if (!String(reason ?? "").trim()) return { ok: false as const, error: "Lost reason is required." };
  return { ok: true as const };
}

export type FollowUpBucket = "overdue" | "today" | "upcoming" | "none";

/** Server-side bucket using an explicit "now" (pass Asia/Kolkata wall-clock instant if desired). */
export function classifyFollowUp(input: {
  nextFollowUpAt: string | null | undefined;
  stage: LeadPipelineStage;
  now?: Date;
}): FollowUpBucket {
  if (!input.nextFollowUpAt || TERMINAL.includes(input.stage)) return "none";
  const due = Date.parse(input.nextFollowUpAt);
  if (!Number.isFinite(due)) return "none";
  const now = input.now ?? new Date();
  if (due < now.getTime()) return "overdue";

  // Asia/Kolkata calendar day comparison via Intl
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dueDay = fmt.format(new Date(due));
  const nowDay = fmt.format(now);
  if (dueDay === nowDay) return "today";
  return "upcoming";
}

export function formatFollowUpForDisplay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

/**
 * Inclusive Asia/Kolkata calendar-day bounds for a user-picked date range.
 *
 * A bare `new Date("2026-08-07")` is UTC midnight — 05:30 IST — so a naive
 * range silently drops the first 5.5 hours of the "from" day and pulls in the
 * first 5.5 hours of the day after "to". Anchoring to +05:30 keeps the filter
 * aligned with the dates the operator actually typed.
 */
export function getAsiaKolkataRangeForDates(input: {
  from?: string | null;
  to?: string | null;
}): { startIso: string | null; endIso: string | null } {
  const dayOnly = /^\d{4}-\d{2}-\d{2}$/;

  const resolve = (value: string | null | undefined, edge: "start" | "end"): string | null => {
    const raw = String(value ?? "").trim();
    if (!raw) return null;

    // A full timestamp already carries its own offset — respect it as given.
    if (!dayOnly.test(raw)) {
      const parsed = Date.parse(raw);
      return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
    }

    const anchored = new Date(
      edge === "start" ? `${raw}T00:00:00.000+05:30` : `${raw}T23:59:59.999+05:30`,
    );
    return Number.isFinite(anchored.getTime()) ? anchored.toISOString() : null;
  };

  return { startIso: resolve(input.from, "start"), endIso: resolve(input.to, "end") };
}

/** Calendar-day bounds in Asia/Kolkata (+05:30 year-round). */
export function getAsiaKolkataDayRange(now: Date = new Date()): { startIso: string; endIso: string; day: string } {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const start = new Date(`${day}T00:00:00+05:30`);
  const end = new Date(`${day}T23:59:59.999+05:30`);
  return { startIso: start.toISOString(), endIso: end.toISOString(), day };
}
