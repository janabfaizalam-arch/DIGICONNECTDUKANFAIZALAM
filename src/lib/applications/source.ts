export type ApplicationOrigin = "customer" | "agency_partner" | "admin";

export type ApplicationSourceInfo = {
  origin: ApplicationOrigin;
  label: string;
  badgeClass: string;
};

type SourceInput = {
  application_source?: string | null;
  source_channel?: string | null;
  source?: string | null;
  submitted_by_role?: string | null;
  agency_partner_id?: string | null;
  created_by?: string | null;
  created_by_role?: string | null;
  agent_id?: string | null;
  assigned_agent_id?: string | null;
};

/**
 * Deterministic source resolution (highest priority first):
 * 1. agency_partner_id / explicit partner source → Digi Partner
 * 2. Explicit admin / admin submitter → Admin Created
 * 3. Otherwise → Customer
 *
 * Does NOT treat payment `source=offline` alone as admin (legacy offline payments
 * can be customer-owned). Prefer application_source / submitted_by_role.
 */
export function resolveApplicationOrigin(app: SourceInput): ApplicationOrigin {
  const textSource = String(app.application_source ?? "").toLowerCase().trim();
  const channel = String(app.source_channel ?? "").toLowerCase().trim();
  const submittedBy = String(app.submitted_by_role ?? app.created_by_role ?? "").toLowerCase().trim();
  const enumSource = String(app.source ?? "").toLowerCase().trim();

  // 1. Digi Partner — strongest signals
  if (app.agency_partner_id) return "agency_partner";
  if (textSource === "agency_partner" || textSource === "digi_partner" || textSource.includes("partner")) {
    return "agency_partner";
  }
  if (channel === "agency_partner" || channel === "digi_partner") return "agency_partner";
  if (submittedBy.includes("partner") || submittedBy === "agency_partner" || submittedBy === "agent") {
    return "agency_partner";
  }
  if (enumSource === "agent_pos") return "agency_partner";

  // 2. Admin-created
  if (textSource === "admin" || textSource.includes("admin")) return "admin";
  if (submittedBy === "admin" || submittedBy === "office_staff") return "admin";
  if (channel === "admin") return "admin";

  // 3. Customer (default) — including online / null / unknown
  return "customer";
}

export function resolveApplicationSourceInfo(app: SourceInput): ApplicationSourceInfo {
  const origin = resolveApplicationOrigin(app);
  if (origin === "agency_partner") {
    return {
      origin,
      label: "Digi Partner",
      badgeClass: "border-violet-200 bg-violet-50 text-violet-800",
    };
  }
  if (origin === "admin") {
    return {
      origin,
      label: "Admin Created",
      badgeClass: "border-slate-200 bg-slate-100 text-slate-700",
    };
  }
  return {
    origin,
    label: "Customer",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-800",
  };
}
