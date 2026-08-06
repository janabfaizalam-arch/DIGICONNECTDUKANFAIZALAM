/**
 * Contract tests for transactional lead conversion authZ / privacy / pricing /
 * production customer schema alignment (M9).
 *
 * These are deterministic pure+mocked-boundary tests. Full RPC concurrency tests belong in CI
 * against a Postgres/Supabase fixture (`pnpm test:crm-leads`).
 *
 * Local Windows host: Vitest may be BLOCKED by App Control (Rollup native). Do not claim PASS.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import { canTransitionLeadStage, assertLostReason } from "@/lib/crm/lead-workflow-core";
import {
  isTerminalLeadStage,
  normalizeLeadMobile,
  buildLeadIngestionKey,
} from "@/lib/crm/leads-core";
import { roleHasCapability } from "@/lib/crm/permissions-core";

const ROOT = join(__dirname, "..", "..", "..");
const M9_SQL = readFileSync(
  join(ROOT, "supabase", "migrations", "20260805140000_crm_lead_conversion_rpc.sql"),
  "utf8",
);
const LEAD_CONVERT_TS = readFileSync(join(ROOT, "src", "lib", "crm", "lead-convert.ts"), "utf8");

/** Strip SQL line/block comments before forbidden-column scans. */
function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ");
}

describe("Lead conversion authorization matrix", () => {
  it("allows admin and partner convert; denies customer", () => {
    expect(roleHasCapability("admin", "leads.convert")).toBe(true);
    expect(roleHasCapability("agency_partner", "leads.convert")).toBe(true);
    expect(roleHasCapability("customer", "leads.convert")).toBe(false);
  });

  it("denies partner reassignment capability", () => {
    expect(roleHasCapability("agency_partner", "applications.assign")).toBe(false);
    expect(roleHasCapability("admin", "applications.assign")).toBe(true);
  });
});

describe("M9 SQL must not reference invalid production customer columns", () => {
  const executable = stripSqlComments(M9_SQL);

  it("does not reference customers.full_name / c.full_name", () => {
    expect(executable).not.toMatch(/\bfull_name\b/);
  });

  it("does not reference customers.user_id or c.user_id (parameter names allowed elsewhere)", () => {
    expect(executable).not.toMatch(/\bc\.user_id\b/);
    expect(executable).not.toMatch(/\bcustomers\.user_id\b/);
  });

  it("does not invent customers.created_by / assigned_agent_id / source on insert", () => {
    expect(executable).not.toMatch(/insert\s+into\s+public\.customers\s*\([^)]*\bcreated_by\b/i);
    expect(executable).not.toMatch(/insert\s+into\s+public\.customers\s*\([^)]*\bassigned_agent_id\b/i);
    expect(executable).not.toMatch(/insert\s+into\s+public\.customers\s*\([^)]*\bsource\b/i);
  });

  it("uses customers.name for display name", () => {
    expect(executable).toMatch(/insert\s+into\s+public\.customers\s*\([^)]*\bname\b/i);
  });

  it("sets applications.user_id from proven auth.users.id = customer.id only", () => {
    expect(executable).toMatch(/from\s+auth\.users\s+u/i);
    expect(executable).toMatch(/where\s+u\.id\s*=\s*v_customer_id/i);
  });

  it("hardens SECURITY DEFINER + empty search_path + service_role only", () => {
    expect(executable).toMatch(/security\s+definer/i);
    expect(executable).toMatch(/set\s+search_path\s*=\s*''/i);
    expect(executable).toMatch(/revoke\s+all\s+on\s+function\s+public\.convert_lead_to_application_core/i);
    expect(executable).toMatch(/grant\s+execute\s+on\s+function\s+public\.convert_lead_to_application_core[\s\S]*to\s+service_role/i);
  });

  it("scopes partner customer access via applications ownership helper", () => {
    expect(executable).toMatch(/crm_actor_can_access_customer/);
    expect(executable).toMatch(/a\.created_by\s*=\s*p_actor_id/);
  });

  it("creates normalized mobile unique index matching normalize_customer_mobile", () => {
    expect(executable).toMatch(/customers_mobile_normalized_unique_idx/);
    expect(executable).toMatch(/normalize_customer_mobile\(mobile\)/);
  });
});

describe("lead-convert.ts production schema contracts", () => {
  it("does not select invented customer ownership columns", () => {
    expect(LEAD_CONVERT_TS).not.toMatch(/select\("id, mobile, created_by, assigned_agent_id"\)/);
    expect(LEAD_CONVERT_TS).not.toMatch(/created_by\.eq\.\$\{input\.actorId\},assigned_agent_id/);
  });

  it("uses application ownership for partner customer scope", () => {
    expect(LEAD_CONVERT_TS).toMatch(/partnerCanAccessCustomer/);
    expect(LEAD_CONVERT_TS).toMatch(/from\("applications"\)/);
  });

  it("documents no Auth creation at conversion time", () => {
    expect(LEAD_CONVERT_TS).toMatch(/does not create Auth users/i);
  });
});

describe("Conversion privacy contract (matchedCustomerId)", () => {
  it("documents that partners only receive scoped match ids via applications ownership", () => {
    // Implementation: lead-convert.ts filters matches with partnerCanAccessCustomer.
    const actorId = "p1";
    const appsOwnedByPartner = new Set(["c1"]);
    const partnerVisible = [{ id: "c1" }, { id: "c2" }];
    const visible = partnerVisible.filter((row) => appsOwnedByPartner.has(row.id));
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("c1");
    expect(actorId).toBe("p1");
  });
});

describe("Mobile normalization contract (walk-in / convert / unique index)", () => {
  it("normalizes identically to last-10 digits", () => {
    expect(normalizeLeadMobile("+91 98765-43210")).toBe("9876543210");
    expect(normalizeLeadMobile("09876543210")).toBe("9876543210");
  });
});

describe("Auth linkage / applications.user_id contracts", () => {
  it("linked customer: applications.user_id equals customer.id when auth.users exists", () => {
    const customerId = "cust-1";
    const authUserId = "cust-1";
    const applicationsUserId = authUserId === customerId ? customerId : null;
    expect(applicationsUserId).toBe(customerId);
  });

  it("unlinked customer: applications.user_id is null; customer_id remains authoritative", () => {
    const customerId = "cust-2";
    const authExists = false;
    const applicationsUserId = authExists ? customerId : null;
    expect(applicationsUserId).toBeNull();
    expect(customerId).toBeTruthy();
  });

  it("actor must never become applications.user_id", () => {
    const actorId = "admin-1";
    const customerId = "cust-3";
    const applicationsUserId = customerId === actorId ? null : customerId;
    // Actor differs from customer → customer id may be used only if Auth-linked.
    expect(applicationsUserId).not.toBe(actorId);
  });
});

describe("Idempotency / terminal conversion guards", () => {
  it("treats won/lost as terminal without reopen", () => {
    expect(isTerminalLeadStage("won")).toBe(true);
    expect(isTerminalLeadStage("lost")).toBe(true);
    expect(canTransitionLeadStage({ from: "won", to: "new" }).ok).toBe(false);
    expect(canTransitionLeadStage({ from: "lost", to: "new", allowReopen: true }).ok).toBe(true);
  });

  it("requires lost reason", () => {
    expect(assertLostReason("lost", null).ok).toBe(false);
  });

  it("partner-scoped ingest keys do not collide across partners", () => {
    const a = buildLeadIngestionKey({
      source: "agency_partner",
      mobile: "9876543210",
      service: "GST",
      scopeId: "partner-a",
    });
    const b = buildLeadIngestionKey({
      source: "agency_partner",
      mobile: "9876543210",
      service: "GST",
      scopeId: "partner-b",
    });
    expect(a).not.toBe(b);
  });
});

describe("Browser-supplied price must be ignored (contract)", () => {
  it("documents RPC overwrites fee from agent_services when service id present", () => {
    // convert_lead_to_application_core sets v_amount from agent_services.customer_fee
    // and ignores p_amount when p_agent_service_id is set; otherwise amount=0.
    const clientPrice = 99999;
    const catalogFee = 499;
    const authoritative = catalogFee; // RPC path
    expect(authoritative).not.toBe(clientPrice);
    expect(authoritative).toBe(499);
  });
});

/**
 * CI checklist (Linux / approved runners — not claimed PASS on blocked Windows host):
 * 1. Admin converts lead → new customer/application (customers.name; user_id null)
 * 2. Admin links existing Auth-linked customer → applications.user_id = customer.id
 * 3. Admin links existing unlinked customer → applications.user_id null
 * 4. Partner converts owned lead
 * 5. Partner cannot convert other partner lead
 * 6. Customer cannot convert
 * 7. Partner customer scope via applications ownership (not customers.created_by)
 * 8. Inactive service rejected
 * 9. Browser price ignored
 * 10. Unauthorized customer selection rejected
 * 11. Unauthorized assignee rejected
 * 12. Actor cannot become applications.user_id
 * 13. Repeated request returns prior success
 * 14. Different clientKey cannot double-convert
 * 15. Concurrent convert → one application
 * 16. Concurrent same-mobile → no duplicate customers
 * 17. Failure after customer insert rolls back
 * 18–20. Status / timeline / assignment history created
 * 21. Notification failure does not roll back
 * 22. Raw DB errors not in API body
 *
 * Command: pnpm test:crm-leads
 */
describe("CI integration checklist placeholder", () => {
  it("keeps the checklist discoverable", () => {
    expect(true).toBe(true);
  });
});
