import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { listCanonicalLeads, toCrmLeadsCard } from "@/lib/crm/leads";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Compatibility adapter for /admin/leads/pipeline Kanban.
 * Prefers canonical public.leads. Falls back to crm_leads without demo seed pollution
 * when canonical rows exist. Never invents fake customer mobiles in production mode.
 */
export async function GET() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const canonical = await listCanonicalLeads({
    actorId: user.id,
    actorRole: role,
    page: 1,
    pageSize: 200,
  });

  if (canonical.ok && canonical.leads.length > 0) {
    return NextResponse.json({
      data: canonical.leads.map(toCrmLeadsCard),
      source: "leads",
      kpis: canonical.kpis,
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  const { data: leads, error: leadErr } = await supabase
    .from("crm_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (leadErr) {
    // Table may be absent — return empty canonical shape.
    return NextResponse.json({ data: [], source: "crm_leads", warning: leadErr.message });
  }

  // Stop returning hardcoded demo leads (removed Phase 4). Empty pipeline is valid.
  return NextResponse.json({ data: leads ?? [], source: "crm_leads" });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const payload = await request.json();
  const { customer_name, customer_mobile, pipeline_stage, notes } = payload;

  if (!customer_name || !customer_mobile) {
    return NextResponse.json({ message: "Customer Name and Mobile are required." }, { status: 400 });
  }

  // New writes go to canonical public.leads (not crm_leads prototype).
  const { ingestLead } = await import("@/lib/crm/leads");
  const { transitionLeadStageSafe } = await import("@/lib/crm/lead-convert");
  const { mapCrmLeadsPipelineToStage } = await import("@/lib/crm/leads-core");
  const ingested = await ingestLead({
    source: "manual",
    name: customer_name,
    mobile: customer_mobile,
    notes: notes ?? null,
    actorId: user.id,
    actorIsAdmin: true,
  });
  if (!ingested.ok) {
    return NextResponse.json({ message: ingested.error }, { status: ingested.status });
  }

  if (pipeline_stage) {
    const toStage = mapCrmLeadsPipelineToStage(pipeline_stage);
    // Go through the guarded transition so the stage machine (and its lost-reason
    // and terminal-stage rules) applies here too — the raw mutation skipped it.
    const transitioned = await transitionLeadStageSafe({
      actorId: user.id,
      actorRole: role,
      leadId: ingested.leadId,
      toStage,
      note: "Pipeline create mapping",
    });

    // The lead exists either way; report the stage outcome instead of
    // swallowing it and claiming an unqualified success.
    if (!transitioned.ok) {
      return NextResponse.json(
        {
          message: `Lead saved, but the stage could not be set to ${toStage}: ${transitioned.error}`,
          data: { id: ingested.leadId },
          stageApplied: false,
          source: "leads",
        },
        { status: 207 },
      );
    }
  }

  return NextResponse.json({
    message: ingested.deduped ? "Existing lead reused (idempotent)." : "Lead saved successfully.",
    data: { id: ingested.leadId },
    stageApplied: Boolean(pipeline_stage),
    source: "leads",
  });
}
