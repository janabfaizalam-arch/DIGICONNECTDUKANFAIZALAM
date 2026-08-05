/** Pure CRM capability helpers (safe for unit tests — no server-only). */

export type CrmCapability =
  | "customers.view"
  | "customers.create"
  | "customers.edit"
  | "customers.merge"
  | "applications.view"
  | "applications.create"
  | "applications.status_change"
  | "applications.assign"
  | "payments.view"
  | "payments.edit"
  | "documents.view"
  | "documents.upload"
  | "exports.run"
  | "staff.manage"
  | "roles.manage"
  | "services.manage"
  | "integrations.manage"
  | "analytics.view"
  | "audit.view"
  | "leads.view"
  | "leads.convert"
  | "messaging.view"
  | "messaging.resend"
  | "messaging.cancel"
  | "walk_in.create"
  | "automation.view"
  | "automation.retry"
  | "alerts.view"
  | "alerts.resolve"
  | "summaries.view";

const ADMIN_ALIASES = new Set(["admin", "super_admin", "staff", "team", "employee", "processor"]);
const PARTNER_ALIASES = new Set(["agency_partner", "agent", "ap"]);
const CUSTOMER_ALIASES = new Set(["customer"]);

function normalizeRole(role: string | null | undefined): "admin" | "agency_partner" | "customer" | null {
  const value = String(role ?? "")
    .trim()
    .toLowerCase();
  if (!value) return null;
  if (ADMIN_ALIASES.has(value)) return "admin";
  if (PARTNER_ALIASES.has(value)) return "agency_partner";
  if (CUSTOMER_ALIASES.has(value)) return "customer";
  return null;
}

const ADMIN_ALL: CrmCapability[] = [
  "customers.view",
  "customers.create",
  "customers.edit",
  "customers.merge",
  "applications.view",
  "applications.create",
  "applications.status_change",
  "applications.assign",
  "payments.view",
  "payments.edit",
  "documents.view",
  "documents.upload",
  "exports.run",
  "staff.manage",
  "roles.manage",
  "services.manage",
  "integrations.manage",
  "analytics.view",
  "audit.view",
  "leads.view",
  "leads.convert",
  "messaging.view",
  "messaging.resend",
  "messaging.cancel",
  "walk_in.create",
  "automation.view",
  "automation.retry",
  "alerts.view",
  "alerts.resolve",
  "summaries.view",
];

const PARTNER_CAPS: CrmCapability[] = [
  "customers.view",
  "customers.create",
  "customers.edit",
  "applications.view",
  "applications.create",
  "applications.status_change",
  "payments.view",
  "payments.edit",
  "documents.view",
  "documents.upload",
  "analytics.view",
  "leads.view",
  "leads.convert",
  "walk_in.create",
];

const CUSTOMER_CAPS: CrmCapability[] = [
  "customers.view",
  "customers.edit",
  "applications.view",
  "applications.create",
  "payments.view",
  "documents.view",
  "documents.upload",
];

export function capabilitiesForRole(role: string | null | undefined): Set<CrmCapability> {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return new Set(ADMIN_ALL);
  if (normalized === "agency_partner") return new Set(PARTNER_CAPS);
  if (normalized === "customer") return new Set(CUSTOMER_CAPS);
  return new Set();
}

export function roleHasCapability(role: string | null | undefined, capability: CrmCapability): boolean {
  return capabilitiesForRole(role).has(capability);
}
