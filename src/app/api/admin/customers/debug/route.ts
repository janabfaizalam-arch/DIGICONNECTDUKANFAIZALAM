import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isSuperAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_EMAILS = ["atifsiddiqui4536@gmail.com", "mohtatifsiddiqui431@gmail.com"];
const TABLES = [
  "profiles",
  "customers",
  "customer_profiles",
  "reward_wallets",
  "wallet_transactions",
  "referral_events",
  "applications",
  "wallets",
  "reward_transactions",
  "customer_wallets",
  "cashback_wallets",
];

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function sanitize(row: Record<string, unknown>) {
  const blocked = new Set(["encrypted_password", "confirmation_token", "recovery_token", "email_change_token_new", "email_change_token_current"]);
  return Object.fromEntries(Object.entries(row).filter(([key]) => !blocked.has(key)));
}

function rowHasNeedle(row: unknown, needles: string[]) {
  const text = JSON.stringify(row ?? {}).toLowerCase();
  return needles.some((needle) => needle && text.includes(needle));
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) return jsonError("Please login.", 401);
  if (!isSuperAdminRole(role)) return jsonError("Super admin access required.", 403);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Supabase service role key is missing.", 500);

  const url = new URL(request.url);
  const emails = (url.searchParams.get("emails") ?? DEFAULT_EMAILS.join(","))
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const output: Record<string, unknown> = {
    emails,
    tables: {},
    authUsers: [],
    ids: [],
    mobiles: [],
  };
  const ids = new Set<string>();
  const mobiles = new Set<string>();
  const tableRows: Record<string, Record<string, unknown>[]> = {};

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*").limit(5000);
    if (error) {
      (output.tables as Record<string, unknown>)[table] = { error: error.message };
      tableRows[table] = [];
      continue;
    }
    tableRows[table] = (data ?? []) as Record<string, unknown>[];
    const emailMatches = tableRows[table].filter((row) => rowHasNeedle(row, emails));
    for (const row of emailMatches) {
      for (const key of ["id", "user_id", "referrer_user_id", "referred_user_id", "customer_id", "created_by"]) {
        if (row[key]) ids.add(String(row[key]));
      }
      for (const key of ["mobile", "phone", "mobile_number"]) {
        if (row[key]) mobiles.add(String(row[key]).replace(/\D/g, ""));
      }
    }
    (output.tables as Record<string, unknown>)[table] = {
      emailMatches: emailMatches.map(sanitize),
    };
  }

  const authUsers = [];
  for (let page = 1; page <= 20; page += 1) {
    const result = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) break;
    const users = result.data.users ?? [];
    authUsers.push(...users);
    if (users.length < 100) break;
  }
  const authMatches = authUsers.filter((authUser) => emails.includes(String(authUser.email ?? "").toLowerCase()) || rowHasNeedle(authUser.user_metadata, emails));
  for (const authUser of authMatches) {
    ids.add(authUser.id);
    if (authUser.phone) mobiles.add(String(authUser.phone).replace(/\D/g, ""));
    for (const key of ["mobile", "phone"]) {
      const value = authUser.user_metadata?.[key];
      if (value) mobiles.add(String(value).replace(/\D/g, ""));
    }
  }

  function idMatch(row: Record<string, unknown>) {
    return ["id", "user_id", "referrer_user_id", "referred_user_id", "customer_id", "created_by", "assigned_agent_id"].some((key) => row[key] && ids.has(String(row[key])));
  }

  function mobileMatch(row: Record<string, unknown>) {
    const digits = JSON.stringify(row ?? {}).replace(/\D/g, " ");
    return [...mobiles].some((mobile) => mobile && digits.includes(mobile));
  }

  for (const table of TABLES) {
    const existing = ((output.tables as Record<string, Record<string, unknown>>)[table] ?? {}) as Record<string, unknown>;
    if (!tableRows[table]?.length) continue;
    const matches = tableRows[table].filter((row) => idMatch(row) || mobileMatch(row));
    (output.tables as Record<string, unknown>)[table] = {
      ...existing,
      idOrMobileMatches: matches.map(sanitize),
      count: matches.length,
    };
  }

  output.authUsers = authMatches.map((authUser) => ({
    id: authUser.id,
    email: authUser.email,
    phone: authUser.phone,
    created_at: authUser.created_at,
    user_metadata: authUser.user_metadata,
    app_metadata: authUser.app_metadata,
  }));
  output.ids = [...ids];
  output.mobiles = [...mobiles].filter(Boolean);

  return NextResponse.json(output);
}
