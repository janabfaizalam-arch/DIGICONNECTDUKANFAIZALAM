import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { convertLeadToApplication } from "@/lib/crm/lead-convert";
import { transitionLeadStageSafe } from "@/lib/crm/lead-convert";
import { isLeadPipelineStage } from "@/lib/crm/leads-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const leadStatuses = [
  "new",
  "contacted",
  "converted",
  "closed",
  "lead_submitted",
  "payment_pending",
  "payment_verified",
  "documents_under_review",
  "documents_required",
  "application_processing",
  "submitted_to_department",
  "under_government_review",
  "rejected",
  "cancelled",
] as const;

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) return { user: null, role: null, error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  if (!isAdminRole(role)) return { user: null, role: null, error: NextResponse.json({ message: "Admin access required." }, { status: 403 }) };
  return { user, role, error: null };
}

/**
 * Legacy admin lead PATCH — convert now delegates to transactional convert API.
 * Status updates remain for backward compatibility.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    status?: string;
    convert?: boolean;
    existingCustomerId?: string;
    serviceSlug?: string;
    idempotencyKey?: string;
    pipelineStage?: string;
    lostReason?: string;
  };
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  if (body.convert) {
    const result = await convertLeadToApplication({
      actorId: auth.user!.id,
      actorRole: auth.role,
      leadId: id,
      idempotencyKey: body.idempotencyKey || randomUUID(),
      serviceSlug: body.serviceSlug,
      existingCustomerId: body.existingCustomerId,
      createCustomerIfMissing: !body.existingCustomerId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { message: result.error, matchedCustomerId: result.matchedCustomerId },
        { status: result.status },
      );
    }
    return NextResponse.json({
      message: result.deduped ? "Lead already converted." : "Lead converted to application.",
      applicationId: result.applicationId,
      customerId: result.customerId,
      deduped: result.deduped,
    });
  }

  if (body.pipelineStage && isLeadPipelineStage(body.pipelineStage)) {
    const result = await transitionLeadStageSafe({
      actorId: auth.user!.id,
      actorRole: auth.role,
      leadId: id,
      toStage: body.pipelineStage,
      lostReason: body.lostReason,
      allowReopen: true,
    });
    if (!result.ok) {
      return NextResponse.json({ message: result.error }, { status: "status" in result ? result.status : 400 });
    }
    return NextResponse.json({ message: "Lead stage updated.", lead: result.lead });
  }

  if (!body.status || !leadStatuses.includes(body.status as never)) {
    return NextResponse.json({ message: "Invalid lead status." }, { status: 400 });
  }

  const { error } = await supabase
    .from("leads")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ message: "Lead could not be updated." }, { status: 500 });
  }

  return NextResponse.json({ message: "Lead updated." });
}
