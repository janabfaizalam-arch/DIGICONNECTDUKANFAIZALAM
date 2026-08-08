/** Pure lead helpers (unit-testable). */

export const LEAD_SOURCES = [
  "website",
  "whatsapp",
  "walk_in",
  "referral",
  "agency_partner",
  "field_executive",
  "manual",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_PIPELINE_STAGES = [
  "new",
  "contact_attempted",
  "contacted",
  "qualified",
  "service_selected",
  "documents_awaited",
  "application_created",
  "won",
  "lost",
  "follow_up_scheduled",
] as const;

export type LeadPipelineStage = (typeof LEAD_PIPELINE_STAGES)[number];

/**
 * Status semantics (single source of truth):
 * - pipeline_stage: operational pipeline (`LEAD_PIPELINE_STAGES`)
 * - legacy `status` text: compatibility mirror via mapStageToLegacyStatus
 * - `converted` is NOT a pipeline stage — it is legacy status + converted_at / converted_* refs
 * - `application_created`: application linked/created; pre-won operational stage
 * - `won`: terminal commercially converted success (sets legacy status=converted)
 * - `lost`: terminal loss; lost_reason required; reopen only via authorized allowReopen
 * Analytics: count won OR converted_at IS NOT NULL once — do not sum both.
 */
export const LEAD_TERMINAL_STAGES: LeadPipelineStage[] = ["won", "lost"];

export function isTerminalLeadStage(stage: LeadPipelineStage): boolean {
  return LEAD_TERMINAL_STAGES.includes(stage);
}
export function normalizeLeadMobile(value: string): string {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}

export function isValidLeadMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeLeadMobile(value));
}

export function isLeadSource(value: string | null | undefined): value is LeadSource {
  return LEAD_SOURCES.includes(String(value ?? "") as LeadSource);
}

export function isLeadPipelineStage(value: string | null | undefined): value is LeadPipelineStage {
  return LEAD_PIPELINE_STAGES.includes(String(value ?? "") as LeadPipelineStage);
}

export function mapLegacyStatusToStage(status: string | null | undefined): LeadPipelineStage {
  const value = String(status ?? "").toLowerCase();
  if (["converted", "won", "completed"].includes(value)) return "won";
  if (["closed", "lost", "cancelled", "rejected"].includes(value)) return "lost";
  if (value === "contacted") return "contacted";
  if (value === "qualified") return "qualified";
  if (["documents_required", "documents_under_review"].includes(value)) return "documents_awaited";
  if (["application_processing", "submitted_to_department", "under_government_review"].includes(value)) {
    return "application_created";
  }
  return "new";
}

/** Map canonical stage → legacy status for backward-compatible admin UI. */
export function mapStageToLegacyStatus(stage: LeadPipelineStage): string {
  switch (stage) {
    case "won":
      return "converted";
    case "lost":
      return "closed";
    case "contacted":
    case "contact_attempted":
      return "contacted";
    case "application_created":
      return "application_processing";
    case "documents_awaited":
      return "documents_required";
    default:
      return "new";
  }
}

/** Prototype crm_leads pipeline_stage adapter. */
export function mapStageToCrmLeadsPipeline(stage: LeadPipelineStage): string {
  switch (stage) {
    case "won":
      return "won";
    case "lost":
      return "lost";
    case "qualified":
    case "service_selected":
    case "documents_awaited":
    case "application_created":
      return "negotiation";
    case "contacted":
    case "contact_attempted":
    case "follow_up_scheduled":
      return "opportunity";
    default:
      return "lead";
  }
}

export function mapCrmLeadsPipelineToStage(pipeline: string | null | undefined): LeadPipelineStage {
  const value = String(pipeline ?? "").toLowerCase();
  if (value === "won") return "won";
  if (value === "lost") return "lost";
  if (value === "negotiation") return "qualified";
  if (value === "opportunity") return "contacted";
  return "new";
}

export function isFollowUpOverdue(input: {
  nextFollowUpAt: string | null | undefined;
  stage: LeadPipelineStage;
  now?: Date;
}): boolean {
  if (!input.nextFollowUpAt) return false;
  if (input.stage === "won" || input.stage === "lost") return false;
  const due = Date.parse(input.nextFollowUpAt);
  if (!Number.isFinite(due)) return false;
  return due < (input.now ?? new Date()).getTime();
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return UUID_PATTERN.test(String(value ?? "").trim());
}

/**
 * Strip characters that would break a PostgREST `or=(...)` filter list.
 * Commas separate conditions, parentheses group them, and `%`/`*` are wildcards
 * the caller supplies itself.
 */
export function sanitizeLeadSearchTerm(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/[%*(),\\]/g, "")
    .slice(0, 80);
}

/**
 * Build the PostgREST `or` filter for lead search.
 *
 * `id.eq.<term>` may only be included for a real UUID: Postgres rejects anything
 * else with "invalid input syntax for type uuid", which fails the whole query.
 * A plain mobile number is all hex-safe digits, so a loose "looks like a uuid"
 * test made every phone-number search error out.
 */
export function buildLeadSearchFilter(rawTerm: string | null | undefined): string | null {
  const term = sanitizeLeadSearchTerm(rawTerm);
  if (!term) return null;

  const conditions = [
    `name.ilike.%${term}%`,
    `mobile.ilike.%${term}%`,
    `mobile_normalized.ilike.%${term}%`,
    `service.ilike.%${term}%`,
    `external_ref.ilike.%${term}%`,
    `ingestion_key.ilike.%${term}%`,
  ];

  if (isUuid(term)) {
    conditions.push(`id.eq.${term}`);
  }

  return conditions.join(",");
}

/** Calendar day in Asia/Kolkata (the business timezone) as YYYY-MM-DD. */
export function asiaKolkataDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function buildLeadIngestionKey(input: {
  source: LeadSource;
  mobile: string;
  service?: string | null;
  externalId?: string | null;
  /** Partner/actor scope — required for agency_partner so one partner cannot block another. */
  scopeId?: string | null;
}): string {
  if (input.externalId && input.externalId.trim()) {
    return `${input.source}:ext:${input.externalId.trim().slice(0, 120)}`;
  }
  const mobile = normalizeLeadMobile(input.mobile);
  const service = String(input.service ?? "general")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  // Soft daily bucket reduces accidental double-submits without forever-blocking re-enquiry.
  // Bucket on the Asia/Kolkata business day — a UTC day rolls over at 05:30 IST,
  // splitting one working morning across two dedupe windows.
  const day = asiaKolkataDay();
  const scope = input.scopeId?.trim();
  if (input.source === "agency_partner") {
    const partnerScope = scope || "unknown-partner";
    return `${input.source}:${partnerScope}:${mobile}:${service}:${day}`;
  }
  if ((input.source === "manual" || input.source === "field_executive") && scope) {
    return `${input.source}:${scope}:${mobile}:${service}:${day}`;
  }
  return `${input.source}:${mobile}:${service}:${day}`;
}

/** Map unknown inbound source strings to a deterministic canonical source. */
export function normalizeInboundLeadSource(value: string | null | undefined): LeadSource {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (isLeadSource(raw)) return raw;
  if (raw === "web" || raw === "site" || raw === "homepage") return "website";
  if (raw === "wa" || raw === "aisensy") return "whatsapp";
  if (raw === "ap" || raw === "partner" || raw === "agent" || raw === "agency") return "agency_partner";
  if (raw === "counter" || raw === "offline" || raw === "walkin") return "walk_in";
  if (raw === "sheet" || raw === "sheets" || raw === "google_sheets") return "manual";
  return "manual";
}

export type LeadDuplicateSuggestion = {
  kind: "exact_mobile" | "same_mobile_different_service";
  leadId: string;
  name: string;
  mobile: string;
  service: string | null;
  stage: LeadPipelineStage;
};

export function classifyDuplicateMatch(input: {
  candidateMobile: string;
  candidateService?: string | null;
  existingMobile: string;
  existingService?: string | null;
  existingId: string;
  existingName: string;
  existingStage: LeadPipelineStage;
}): LeadDuplicateSuggestion | null {
  const a = normalizeLeadMobile(input.candidateMobile);
  const b = normalizeLeadMobile(input.existingMobile);
  if (!a || a !== b) return null;
  const serviceA = String(input.candidateService ?? "").trim().toLowerCase();
  const serviceB = String(input.existingService ?? "").trim().toLowerCase();
  if (serviceA && serviceB && serviceA === serviceB) {
    return {
      kind: "exact_mobile",
      leadId: input.existingId,
      name: input.existingName,
      mobile: b,
      service: input.existingService ?? null,
      stage: input.existingStage,
    };
  }
  return {
    kind: "same_mobile_different_service",
    leadId: input.existingId,
    name: input.existingName,
    mobile: b,
    service: input.existingService ?? null,
    stage: input.existingStage,
  };
}
