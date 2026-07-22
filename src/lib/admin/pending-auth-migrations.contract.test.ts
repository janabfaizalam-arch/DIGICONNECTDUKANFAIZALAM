/**
 * Static safety checks for pending auth-related Supabase migrations.
 * These do not connect to production — they assert SQL source contracts.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function readMigration(name: string) {
  return readFileSync(resolve(root, "supabase/migrations", name), "utf8");
}

describe("pending auth migrations — production safety contracts", () => {
  const primaryAdmin = readMigration("20260719190000_primary_admin_faiz_alam.sql");
  const whatsappAuth = readMigration("20260718180000_customer_whatsapp_pin_auth.sql");
  const ceoRepair = readMigration("20260721190000_repair_ceo_partner_admin_role_conflict.sql");
  const dashboard = readMigration("20260722100000_admin_dashboard_aggregates.sql");

  it("primary-admin migration does not promote by mobile number", () => {
    expect(primaryAdmin).not.toMatch(/mobile\s+in\s*\(/i);
    expect(primaryAdmin).not.toMatch(/or\s+mobile\s+in/i);
    expect(primaryAdmin).toMatch(/from\s+auth\.users\s+u/i);
    expect(primaryAdmin).toMatch(/u\.id\s*=\s*p\.id/i);
    expect(primaryAdmin).toMatch(/janabfaizalam@gmail\.com/);
    expect(primaryAdmin).toMatch(/agency_partners/);
    expect(primaryAdmin).not.toMatch(/\$argon2id\$/);
    expect(primaryAdmin).not.toMatch(/placeholder/i);
  });

  it("primary-admin migration excludes Digi Partner memberships from promotion", () => {
    expect(primaryAdmin).toMatch(/not exists\s*\([\s\S]*agency_partners/i);
    expect(primaryAdmin).toMatch(/is distinct from 'agency_partner'/i);
  });

  it("primary-admin migration keeps demotion of former admin email", () => {
    expect(primaryAdmin).toMatch(/dgcntdkn@gmail\.com/);
    expect(primaryAdmin).toMatch(/role\s*=\s*'customer'/i);
  });

  it("whatsapp auth cleanup function revokes public/anon/authenticated", () => {
    expect(whatsappAuth).toMatch(/set search_path\s*=\s*public/i);
    expect(whatsappAuth).toMatch(/revoke all on function public\.cleanup_expired_auth_otps\(\) from public/i);
    expect(whatsappAuth).toMatch(/revoke all on function public\.cleanup_expired_auth_otps\(\) from anon/i);
    expect(whatsappAuth).toMatch(/revoke all on function public\.cleanup_expired_auth_otps\(\) from authenticated/i);
    expect(whatsappAuth).toMatch(/grant execute on function public\.cleanup_expired_auth_otps\(\) to service_role/i);
    expect(whatsappAuth).toMatch(/auth_otp_requests_deny_all/);
  });

  it("ceo repair cannot demote primary admin Auth email and does not touch partner financial rows", () => {
    expect(ceoRepair).not.toMatch(/update\s+public\.agency_partners/i);
    expect(ceoRepair).not.toMatch(/set\s+user_id\s*=/i);
    expect(ceoRepair).toMatch(/janabfaizalam@gmail\.com/);
    expect(ceoRepair).toMatch(/not exists\s*\([\s\S]*janabfaizalam@gmail\.com/i);
    expect(ceoRepair).toMatch(/role\s*=\s*'agency_partner'/i);
  });

  it("dashboard aggregates remain service_role-only and independent", () => {
    expect(dashboard).toMatch(/grant execute[\s\S]*to service_role/i);
    expect(dashboard).toMatch(/revoke all[\s\S]*from public/i);
    expect(dashboard).not.toMatch(/7007595931/);
    expect(dashboard).not.toMatch(/janabfaizalam/);
  });
});
