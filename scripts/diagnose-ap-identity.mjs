/**
 * Safe identity inventory for Digi Partner linkage diagnosis.
 * Never prints passwords, tokens, or secret keys.
 *
 * Usage: node --env-file=.env.local scripts/diagnose-ap-identity.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const MOBILE = "7007595931";
const PARTNER_CODE = "CEO-DCD-AD-0001";
const EMAILS = ["janabfaizalam@gmail.com", "faizalamjalaun@gmail.com"];

function maskId(id) {
  if (!id) return null;
  return `${String(id).slice(0, 8)}…${String(id).slice(-4)}`;
}

async function listAuthUsersByEmail(email) {
  // Prefer listUsers paging is heavy; use admin getUserByEmail if available via RPC-less filter
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return { error: error.message, users: [] };
  const users = (data?.users ?? []).filter((u) => String(u.email ?? "").toLowerCase() === email.toLowerCase());
  return { users, error: null };
}

async function main() {
  const report = { partnerCode: PARTNER_CODE, mobile: MOBILE, emails: EMAILS };

  const { data: partnersByCode } = await admin
    .from("agency_partners")
    .select("id, user_id, partner_code, username, email, mobile, status, kyc_status, full_name, partner_type")
    .eq("partner_code", PARTNER_CODE);

  const { data: partnersByMobile } = await admin
    .from("agency_partners")
    .select("id, user_id, partner_code, username, email, mobile, status, kyc_status, full_name, partner_type")
    .or(`mobile.eq.${MOBILE},mobile.eq.91${MOBILE},mobile.eq.+91${MOBILE}`);

  report.agency_partners = [...(partnersByCode ?? []), ...(partnersByMobile ?? [])]
    .filter((row, i, arr) => arr.findIndex((r) => r.id === row.id) === i)
    .map((p) => ({
      id: p.id,
      user_id: p.user_id,
      user_id_masked: maskId(p.user_id),
      partner_code: p.partner_code,
      username: p.username,
      email: p.email,
      mobile: p.mobile,
      status: p.status,
      kyc_status: p.kyc_status,
      full_name: p.full_name,
      partner_type: p.partner_type,
    }));

  const { data: profilesByMobile } = await admin
    .from("profiles")
    .select("id, user_id, email, mobile, role, kyc_status, active, is_active, full_name, agent_code")
    .or(`mobile.eq.${MOBILE},mobile.eq.91${MOBILE},mobile.eq.+91${MOBILE}`);

  const profileQueries = [];
  for (const email of EMAILS) {
    const { data } = await admin.from("profiles").select("id, user_id, email, mobile, role, kyc_status, active, is_active, full_name, agent_code").ilike("email", email);
    profileQueries.push(...(data ?? []));
  }

  // Also load profiles for each partner user_id
  for (const p of report.agency_partners) {
    if (!p.user_id) continue;
    const { data } = await admin
      .from("profiles")
      .select("id, user_id, email, mobile, role, kyc_status, active, is_active, full_name, agent_code")
      .or(`id.eq.${p.user_id},user_id.eq.${p.user_id}`);
    profileQueries.push(...(data ?? []));
  }

  const allProfiles = [...(profilesByMobile ?? []), ...profileQueries].filter(
    (row, i, arr) => arr.findIndex((r) => r.id === row.id) === i,
  );

  report.profiles = allProfiles.map((p) => ({
    id: p.id,
    id_masked: maskId(p.id),
    user_id: p.user_id ?? null,
    email: p.email,
    mobile: p.mobile,
    role: p.role,
    kyc_status: p.kyc_status,
    active: p.active,
    is_active: p.is_active,
    full_name: p.full_name,
    agent_code: p.agent_code,
  }));

  report.auth_users = [];
  for (const email of EMAILS) {
    const { users, error } = await listAuthUsersByEmail(email);
    if (error) {
      report.auth_users.push({ email, error });
      continue;
    }
    for (const u of users) {
      report.auth_users.push({
        id: u.id,
        id_masked: maskId(u.id),
        email: u.email,
        phone: u.phone ?? null,
        email_confirmed: Boolean(u.email_confirmed_at),
        last_sign_in_at: u.last_sign_in_at ?? null,
        app_metadata_role: u.app_metadata?.role ?? null,
        user_metadata_role: u.user_metadata?.role ?? null,
      });
    }
  }

  // Auth users by partner user_id
  for (const p of report.agency_partners) {
    if (!p.user_id) continue;
    if (report.auth_users.some((u) => u.id === p.user_id)) continue;
    const { data, error } = await admin.auth.admin.getUserById(p.user_id);
    if (error || !data?.user) {
      report.auth_users.push({ id: p.user_id, id_masked: maskId(p.user_id), error: error?.message ?? "not found" });
      continue;
    }
    const u = data.user;
    report.auth_users.push({
      id: u.id,
      id_masked: maskId(u.id),
      email: u.email,
      phone: u.phone ?? null,
      email_confirmed: Boolean(u.email_confirmed_at),
      last_sign_in_at: u.last_sign_in_at ?? null,
      app_metadata_role: u.app_metadata?.role ?? null,
      user_metadata_role: u.user_metadata?.role ?? null,
    });
  }

  // Linkage analysis
  report.analysis = report.agency_partners.map((p) => {
    const profile = report.profiles.find((pr) => pr.id === p.user_id || pr.user_id === p.user_id);
    const auth = report.auth_users.find((u) => u.id === p.user_id);
    const issues = [];
    if (!p.user_id) issues.push("partner_missing_auth_user");
    if (p.user_id && !auth) issues.push("auth_user_not_found");
    if (p.user_id && !profile) issues.push("profile_missing_for_auth_user");
    if (profile?.role === "admin") issues.push("profile_role_is_admin_blocks_legacy_ap_gate");
    if (auth?.email?.toLowerCase() === "janabfaizalam@gmail.com") {
      issues.push("hardcoded_primary_admin_email_forces_admin_role_in_middleware");
    }
    if (p.status === "active" && p.kyc_status === "approved" && profile?.role === "admin") {
      issues.push("VALID_AP_BLOCKED_BY_ADMIN_ROLE");
    }
    return {
      partner_id: p.id,
      partner_code: p.partner_code,
      agency_partners_user_id: p.user_id,
      auth_email: auth?.email ?? null,
      profile_role: profile?.role ?? null,
      profile_email: profile?.email ?? null,
      status: p.status,
      kyc_status: p.kyc_status,
      linkage_ok: Boolean(p.user_id && auth && !auth.error),
      issues,
    };
  });

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
