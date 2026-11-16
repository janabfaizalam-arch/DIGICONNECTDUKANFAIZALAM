import { NextResponse } from "next/server";

import { logAuditEvent } from "@/lib/ap-audit";
import { defaultPartnerPassword, defaultPartnerUsername } from "@/lib/ap/default-credentials";
import { pickNumberOwner, type PartnerRow } from "@/lib/ap/number-owner";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Put every existing DC Partner onto number-based credentials.
 *
 * New partners get these at provisioning. Partners who were created before
 * that did not: of the ones on this system, most had no username at all, which
 * meant they could not sign in by number however well they remembered it.
 *
 * This walks the directory and gives each one the same two things: a username
 * that is their mobile number, and a password built from it. Each is flagged
 * `must_change_password`, so the panel asks them to replace it on every
 * sign-in until they do.
 *
 * It works in slices. Forty-nine sequential calls to the Auth admin API is
 * comfortably longer than a serverless request should run, so the caller asks
 * for a window and comes back for the next one. Every write is idempotent —
 * setting the same username and password twice changes nothing — so a slice
 * that times out can simply be asked for again.
 *
 * This resets a password the partner may have chosen themselves. That is the
 * point of the operation and it is why it is behind an admin session, rate
 * limited, and written to the audit trail with the count it touched.
 */

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 25;

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * Take the number back off the records that should not hold it.
 *
 * Runs at the top of every slice rather than once, because the record holding
 * a number and the record that should hold it can fall in different slices --
 * and the winner's uniqueness check has to find the number free by the time it
 * is reached, whichever order that happens in. Clearing a username that is
 * already null is a no-op, so repeating it costs nothing.
 *
 * Returns the ids that must not be given the number, so the main pass can skip
 * them with a reason rather than silently.
 */
async function freeDuplicateNumbers(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
): Promise<{ notOwner: Set<string>; ownerOf: Map<string, string> }> {
  const notOwner = new Set<string>();
  const ownerOf = new Map<string, string>();

  const { data } = await supabase
    .from("agency_partners")
    .select("id, user_id, mobile, username, full_name, status, created_at")
    .limit(5000);

  const rows = (data ?? []) as PartnerRow[];

  const byMobile = new Map<string, PartnerRow[]>();
  for (const row of rows) {
    const mobile = defaultPartnerUsername(row.mobile);
    if (!mobile) continue;
    const group = byMobile.get(mobile);
    if (group) group.push(row);
    else byMobile.set(mobile, [row]);
  }

  const contested = [...byMobile.entries()].filter(([, group]) => group.length > 1);
  if (contested.length === 0) return { notOwner, ownerOf };

  // Only the contested rows need an application count, so this stays small
  // however many partners there are.
  const applications = new Map<string, number>();
  const contestedIds = contested.flatMap(([, group]) => group.map((row) => row.id));

  const { data: apps } = await supabase
    .from("applications")
    .select("agency_partner_id")
    .in("agency_partner_id", contestedIds);

  for (const row of (apps ?? []) as { agency_partner_id: string | null }[]) {
    const id = String(row.agency_partner_id ?? "");
    if (id) applications.set(id, (applications.get(id) ?? 0) + 1);
  }

  for (const [mobile, group] of contested) {
    const owner = pickNumberOwner(group, applications);
    ownerOf.set(mobile, owner.id);

    for (const row of group) {
      if (row.id === owner.id) continue;
      notOwner.add(row.id);

      // Only touch a record that is actually holding the number.
      if (row.username !== mobile) continue;

      await supabase.from("agency_partners").update({ username: null }).eq("id", row.id);
      if (row.user_id) {
        await supabase.from("profiles").update({ username: null }).eq("id", row.user_id);
      }
    }
  }

  return { notOwner, ownerOf };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return jsonError("Admin access required.", 403);
  }

  const rate = checkRateLimit(`ap-reset-to-default:${getClientIp(request)}`, 30, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 503);

  const body = (await request.json().catch(() => ({}))) as { offset?: number; limit?: number };
  const offset = Math.max(0, Math.floor(Number(body.offset ?? 0)) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(body.limit ?? DEFAULT_LIMIT)) || DEFAULT_LIMIT));

  const { count: total } = await supabase
    .from("agency_partners")
    .select("id", { count: "exact", head: true });

  /*
    Settle the shared numbers before assigning any, so that a record which
    should not own a number is not standing in the way of the one that should.
  */
  const { notOwner } = await freeDuplicateNumbers(supabase);

  const { data: partners, error } = await supabase
    .from("agency_partners")
    .select("id, user_id, mobile, username, full_name")
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[ap-reset-to-default] read_failed", { error: error.message });
    return jsonError("Could not read the partner list.", 500);
  }

  let updated = 0;
  const skipped: { partner: string; reason: string }[] = [];

  for (const partner of partners ?? []) {
    const username = defaultPartnerUsername(partner.mobile);
    const password = defaultPartnerPassword(partner.mobile);
    const label = String(partner.full_name ?? partner.id);

    if (!username || !password) {
      skipped.push({ partner: label, reason: "No valid 10-digit mobile number on file." });
      continue;
    }

    if (!partner.user_id) {
      skipped.push({ partner: label, reason: "No login account attached to this partner." });
      continue;
    }

    if (notOwner.has(String(partner.id))) {
      skipped.push({
        partner: label,
        reason: `Another record for ${username} does the work, so it holds the number login.`,
      });
      continue;
    }

    /*
      A username must stay unique: two partners sharing one would make the
      login route resolve the wrong account. Any collision is reported rather
      than resolved, because the right answer is a human deciding which of the
      two numbers is wrong.
    */
    const { data: clash } = await supabase
      .from("agency_partners")
      .select("id")
      .eq("username", username)
      .neq("id", partner.id)
      .maybeSingle();

    if (clash) {
      skipped.push({ partner: label, reason: `Another partner already uses ${username}.` });
      continue;
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(String(partner.user_id), {
      password,
    });

    if (authError) {
      console.error("[ap-reset-to-default] auth_update_failed", {
        partnerId: partner.id,
        message: authError.message,
      });
      skipped.push({ partner: label, reason: `Password rejected: ${authError.message}` });
      continue;
    }

    await supabase
      .from("agency_partners")
      .update({ username, must_change_password: true, updated_at: new Date().toISOString() })
      .eq("id", partner.id);

    await supabase
      .from("profiles")
      .update({ username, must_change_password: true })
      .eq("id", partner.user_id);

    updated += 1;
  }

  const processed = (partners ?? []).length;
  const nextOffset = offset + processed;
  const done = processed === 0 || nextOffset >= (total ?? 0);

  await logAuditEvent({
    actorId: user.id,
    actorRole: role,
    action: "ap_credentials_reset_to_default",
    entityType: "agency_partner",
    metadata: { offset, processed, updated, skipped: skipped.length, total: total ?? 0 },
  });

  return NextResponse.json({
    ok: true,
    processed,
    updated,
    skipped,
    nextOffset,
    total: total ?? 0,
    done,
  });
}
