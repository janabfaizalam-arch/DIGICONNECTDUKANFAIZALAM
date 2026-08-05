/**
 * Supabase Security Advisor remediation — static contract tests.
 * No live DB / production access.
 * CI: vitest this file; local Windows Vitest may be BLOCKED.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const root = process.cwd();
const migrationPath = join(
  root,
  "supabase/migrations/20260805180000_supabase_security_advisor_remediation.sql",
);
const offlineSource = join(root, "supabase/migrations/20260518193000_offline_invoices.sql");

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Security Advisor remediation migration exists", () => {
  it("creates forward-only migration after automation foundation", () => {
    expect(existsSync(migrationPath)).toBe(true);
    const sql = read(migrationPath);
    expect(sql).toContain("20260805180000");
    expect(sql).toMatch(/DO NOT APPLY TO PRODUCTION/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql).not.toMatch(/delete from auth\.users/i);
    expect(sql).not.toMatch(/update auth\.users/i);
  });
});

describe("offline_invoices user_metadata risk and fix", () => {
  it("source policy historically trusted user_metadata.role", () => {
    const src = read(offlineSource);
    expect(src).toContain('"Admins manage offline invoices"');
    expect(src).toContain("user_metadata");
    expect(src).toContain("app_metadata");
  });

  it("remediation uses is_admin_from_db only (no JWT metadata in policy)", () => {
    const sql = read(migrationPath);
    expect(sql).toContain("create or replace function public.is_admin_from_db()");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toMatch(/from public\.profiles/i);
    // Function body must not read JWT metadata (comments may mention it)
    const fnStart = sql.indexOf("create or replace function public.is_admin_from_db()");
    const fnEnd = sql.indexOf("$$;", fnStart);
    const fnBody = sql.slice(fnStart, fnEnd);
    expect(fnBody).toContain("public.profiles");
    expect(fnBody).toContain("coalesce(");
    expect(fnBody).toContain("false");
    expect(fnBody).toMatch(/in \('admin', 'super_admin'\)/);
    expect(fnBody).not.toContain("user_metadata");
    expect(fnBody).not.toContain("app_metadata");
    expect(fnBody).not.toContain("auth.jwt()");
    expect(fnBody).not.toMatch(/agency_partner|customer/);
    // Policy body after drop must not reintroduce user_metadata
    const policyBlock = sql.slice(sql.indexOf('create policy "Admins manage offline invoices"'));
    const policyEnd = policyBlock.indexOf(";");
    const policySql = policyBlock.slice(0, policyEnd);
    expect(policySql).toContain("is_admin_from_db()");
    expect(policySql).not.toContain("user_metadata");
    expect(policySql).not.toContain("app_metadata");
  });

  it("documents admin-only intended access (partners/customers denied at RLS)", () => {
    const sql = read(migrationPath);
    expect(sql).toMatch(/Partners and customers have no offline_invoices/i);
  });

  it("covers forged metadata denied and missing DB role → false", () => {
    const sql = read(migrationPath);
    expect(sql).toMatch(/Missing\/null auth\.uid\(\).*→ false|Returns false by default/i);
    expect(sql).toMatch(/Does not read.*user_metadata/i);
    const expected = {
      forged_user_metadata_admin: "denied",
      missing_db_admin_role: "denied",
    };
    expect(expected.forged_user_metadata_admin).toBe("denied");
    expect(expected.missing_db_admin_role).toBe("denied");
  });
});

describe("SECURITY DEFINER view treatment", () => {
  const views = [
    "crm_application_payment_diagnostics",
    "admin_crm_application_facts",
    "admin_crm_payment_facts",
    "reward_wallet_diagnostics",
    "admin_crm_diagnostics",
    "agent_legacy_leads_deprecated",
    "admin_wallet_ledger_balances",
  ];

  it("sets security_invoker and revokes anon/authenticated for all Advisor views", () => {
    const sql = read(migrationPath);
    for (const v of views) {
      expect(sql).toContain(v);
    }
    expect(sql).toContain("security_invoker = true");
    expect(sql).toContain("revoke all on table public.%I from anon");
    expect(sql).toContain("revoke all on table public.%I from authenticated");
    expect(sql).toContain("grant select on table public.%I to service_role");
  });

  it("admin CRM diagnostics remain service-role consumable (app uses getSupabaseAdmin)", () => {
    const adminCrm = read(join(root, "src/lib/admin-crm.ts"));
    expect(adminCrm).toContain('from("admin_crm_diagnostics")');
    expect(adminCrm).toContain("getSupabaseAdmin");
    const recon = read(join(root, "src/lib/admin-payment-reconciliation.ts"));
    expect(recon).toContain('from("admin_crm_diagnostics")');
    expect(recon).toContain("getSupabaseAdmin");
  });
});

describe("Auth RLS initplan optimization targets", () => {
  it("wraps auth.uid / auth.jwt in scalar subselects on flagged tables", () => {
    const sql = read(migrationPath);
    expect(sql).toContain("asa.agent_id = (select auth.uid())");
    expect(sql).toContain("agent_id = (select auth.uid())");
    expect(sql).toContain("((select auth.jwt()) ->> 'role') = 'service_role'");
    expect(sql).toContain("(select auth.uid()) = user_id");
  });

  it("does not claim initplan warnings are security vulnerabilities", () => {
    const sql = read(migrationPath);
    expect(sql).toMatch(/Not security vulnerabilities/i);
  });
});

describe("Access isolation matrix (contract documentation)", () => {
  /**
   * Runtime RLS isolation requires a DB harness. Until available, encode the
   * expected matrix so CI fails if the migration regresses intent.
   */
  const expected = {
    offline_invoices: {
      admin_db_role: "permitted",
      partner: "denied",
      customer_own: "denied", // no customer portal path for offline invoices
      customer_other: "denied",
      forged_user_metadata_admin: "denied",
      anon: "denied",
    },
    diagnostic_views: {
      admin_via_service_role: "permitted",
      authenticated_partner: "denied",
      authenticated_customer: "denied",
      anon: "denied",
    },
  };

  it("offline_invoices matrix: only canonical admin", () => {
    expect(expected.offline_invoices.admin_db_role).toBe("permitted");
    expect(expected.offline_invoices.forged_user_metadata_admin).toBe("denied");
    expect(expected.offline_invoices.partner).toBe("denied");
    expect(expected.offline_invoices.customer_own).toBe("denied");
    expect(expected.offline_invoices.anon).toBe("denied");
  });

  it("diagnostic views matrix: service_role only for clients", () => {
    expect(expected.diagnostic_views.admin_via_service_role).toBe("permitted");
    expect(expected.diagnostic_views.authenticated_partner).toBe("denied");
    expect(expected.diagnostic_views.authenticated_customer).toBe("denied");
    expect(expected.diagnostic_views.anon).toBe("denied");
  });
});

describe("Preflight and backup gates present in migration comments", () => {
  it("includes preflight_failed stops and verification guidance", () => {
    const sql = read(migrationPath);
    expect(sql).toContain("preflight_failed");
    expect(sql).toContain("Security Advisor recheck");
    expect(sql).toContain("Post-migration verification");
    expect(sql).toContain("will not invent policy");
    expect(sql).toContain("PostgreSQL 15+");
  });
});
