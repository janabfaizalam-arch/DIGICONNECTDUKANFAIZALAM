import { NextResponse } from "next/server";

import { getCurrentUser, hasAdminAccess } from "@/lib/auth";
import {
  canTransitionPrivacyRequest,
  completionBlocker,
  privacyRequestUpdateSchema,
  type PrivacyRequestStatus,
  type VerificationStatus,
} from "@/lib/privacy/requests";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * Move a privacy request through its workflow.
 *
 * Admin-only. Status changes follow the allowed transitions, completion
 * requires the requester's identity to have been verified, and notes are
 * appended (with who and when) rather than overwritten. This route never
 * touches the requester's data itself — correcting or erasing it is done
 * deliberately, elsewhere, once this request says it may be.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rate = checkRateLimit(`admin-privacy-request:${getClientIp(request)}`, 60, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  if (!user || !(await hasAdminAccess(user))) return jsonError("Admin access required.", 403);

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError("Request not found.", 404);

  const parsed = privacyRequestUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid update.", 400);
  const input = parsed.data;

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 503);

  const { data: current, error: loadError } = await supabase
    .from("privacy_requests")
    .select("id, status, verification_status, admin_notes")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return jsonError("Could not load the request.", 500);
  if (!current) return jsonError("Request not found.", 404);

  const now = new Date().toISOString();
  const status = current.status as PrivacyRequestStatus;
  const verification = (input.verificationStatus ?? current.verification_status) as VerificationStatus;
  const update: Record<string, unknown> = { updated_at: now };

  if (input.verificationStatus) update.verification_status = input.verificationStatus;
  if (input.assignToMe) update.assigned_admin_id = user.id;

  if (input.status && input.status !== status) {
    if (!canTransitionPrivacyRequest(status, input.status)) {
      return jsonError(`A ${status.replace("_", " ")} request cannot move to ${input.status.replace("_", " ")}.`, 409);
    }
    if (input.status === "completed") {
      const blocker = completionBlocker({ status, verification_status: verification });
      if (blocker) return jsonError(blocker, 409);
    }
    update.status = input.status;
    if (input.status === "completed" || input.status === "rejected") update.resolved_at = now;
  }

  if (input.notes) {
    const stamp = `[${now.slice(0, 16).replace("T", " ")} UTC · ${user.email ?? user.id}]`;
    const previous = String(current.admin_notes ?? "");
    update.admin_notes = `${previous ? `${previous}\n` : ""}${stamp} ${input.notes}`.slice(-4000);
  }

  const { error: updateError } = await supabase.from("privacy_requests").update(update).eq("id", id);
  if (updateError) {
    console.error("[admin/privacy-requests] update_failed", { code: updateError.code });
    return jsonError("Could not update the request.", 500);
  }

  return NextResponse.json({ ok: true });
}
