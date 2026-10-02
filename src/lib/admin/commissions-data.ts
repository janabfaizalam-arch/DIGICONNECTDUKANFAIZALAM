/**
 * The agent commission ledger, a page at a time.
 *
 * The page used to select the whole table — `.order("created_at", desc)` with
 * no range — plus two nested embeds. PostgREST caps that at `db.max_rows`, so
 * past a thousand commissions the oldest ones were simply absent from a
 * financial ledger, and the screen had no pagination to reach them. Nothing
 * reported an error; the list just ended.
 *
 * `count: "exact"` comes back with the page, so the total is the database's
 * count rather than the length of what was transferred.
 */

import { countRows, toAmount } from "@/lib/supabase/paged-read";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Only the fields the ledger draws. */
export type AdminCommissionRow = {
  id: string;
  agentName: string;
  agentEmail: string | null;
  serviceName: string | null;
  amount: number;
  status: string;
  createdAt: string | null;
};

export const COMMISSION_STATUSES = [
  "pending",
  "approved",
  "paid",
  "hold",
  "cancelled",
  "rejected",
] as const;

/**
 * Embeds are selected narrowly on purpose.
 *
 * `select("*")` pulled every column of `commissions` plus whole rows from
 * `applications` and `profiles` — including the agent's mobile — into a payload
 * the ledger never rendered.
 */
const SELECT =
  "id, amount, status, created_at, agent_id, applications(service_name), profiles(full_name, email)";

type RawRow = {
  id: unknown;
  amount: unknown;
  status: unknown;
  created_at: unknown;
  agent_id: unknown;
  applications: { service_name?: unknown } | { service_name?: unknown }[] | null;
  profiles: { full_name?: unknown; email?: unknown } | { full_name?: unknown; email?: unknown }[] | null;
};

/** A to-one embed arrives as an object, or as a one-element array. */
function firstEmbed<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toRow(raw: RawRow): AdminCommissionRow {
  const profile = firstEmbed(raw.profiles);
  const application = firstEmbed(raw.applications);

  const name = profile?.full_name ? String(profile.full_name) : "";
  const email = profile?.email ? String(profile.email) : null;

  return {
    id: String(raw.id),
    // Falls back the way the old markup did: name, then email, then "Agent".
    agentName: name || email || "Agent",
    agentEmail: email,
    serviceName: application?.service_name ? String(application.service_name) : null,
    amount: toAmount(raw.amount),
    status: String(raw.status ?? "pending"),
    createdAt: raw.created_at ? String(raw.created_at) : null,
  };
}

/** How many commissions match the filter. No rows cross the wire. */
export async function countAdminCommissions(status?: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { count } = await countRows(() => {
    const query = supabase.from("commissions").select("id", { count: "exact", head: true });
    return status && status !== "all" ? query.eq("status", status) : query;
  }, "commissions.total");

  return count;
}

/**
 * One page of the ledger, newest first.
 *
 * `from`/`to` are `resolvePageWindow`'s slice bounds, so `to` is one past the
 * last row; `.range()` wants an inclusive end.
 */
export async function listAdminCommissions({
  from,
  to,
  status,
}: {
  from: number;
  to: number;
  status?: string;
}): Promise<AdminCommissionRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const query = supabase.from("commissions").select(SELECT);
  const filtered = status && status !== "all" ? query.eq("status", status) : query;

  const { data, error } = await filtered
    .order("created_at", { ascending: false })
    .range(from, Math.max(from, to - 1));

  if (error) {
    console.error("[admin-commissions] page_read_failed", { error: error.message });
    return [];
  }

  return ((data ?? []) as unknown as RawRow[]).map(toRow);
}
