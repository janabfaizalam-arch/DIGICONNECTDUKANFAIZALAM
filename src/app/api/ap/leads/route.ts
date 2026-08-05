import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser, getCurrentUserRole, isActiveAgent } from "@/lib/auth";
import { ingestLead, listCanonicalLeads } from "@/lib/crm/leads";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

/**
 * Legacy Digi Partner leads API — aligned with canonical ownership
 * (agent_id OR assigned_to OR partner_id), same as listCanonicalLeads.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await isActiveAgent(user))) {
      return jsonError("Unauthorized access.", 401);
    }

    const role = await getCurrentUserRole(user);
    const url = new URL(request.url);
    const followUp = url.searchParams.get("followUp");
    const result = await listCanonicalLeads({
      actorId: user.id,
      actorRole: role ?? "agency_partner",
      q: url.searchParams.get("q") ?? undefined,
      stage: url.searchParams.get("stage") ?? "all",
      source: url.searchParams.get("source") ?? "all",
      followUpQueue:
        followUp === "overdue" || followUp === "today" || followUp === "upcoming" ? followUp : "all",
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Math.min(100, Number(url.searchParams.get("pageSize") ?? 50)),
    });

    if (!result.ok) {
      return jsonError(result.error, result.status);
    }

    return NextResponse.json({
      leads: result.leads,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      kpis: {
        overdue: result.kpis.overdue,
        today: result.kpis.today,
        upcoming: result.kpis.upcoming,
      },
    });
  } catch (err) {
    console.error("[api/ap/leads] GET error", err);
    return jsonError("Failed to fetch leads.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await isActiveAgent(user))) {
      return jsonError("Unauthorized access.", 401);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return jsonError("Database connection missing.", 500);
    }

    const body = await request.json();
    const { name, mobile, service, message, notes, city } = body;

    if (!name || !mobile || !service) {
      return jsonError("Name, mobile, and service are required fields.", 400);
    }

    const ingested = await ingestLead({
      source: "agency_partner",
      name,
      mobile,
      service,
      message: message ?? "",
      notes: notes ?? "",
      city: city ?? "",
      actorId: user.id,
    });

    if (!ingested.ok) {
      return jsonError(ingested.error, ingested.status);
    }

    const { data } = await supabase.from("leads").select("*").eq("id", ingested.leadId).maybeSingle();

    return NextResponse.json({
      message: ingested.deduped ? "Existing lead reused (idempotent)." : "Lead registered successfully.",
      lead: data ?? { id: ingested.leadId },
      ok: true,
      deduped: ingested.deduped,
      duplicates: ingested.duplicates,
    });
  } catch (err) {
    console.error("[api/ap/leads] POST error", err);
    return jsonError("Failed to register lead.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await isActiveAgent(user))) {
      return jsonError("Unauthorized access.", 401);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return jsonError("Database connection missing.", 500);
    }

    const body = await request.json();
    const { id, status, notes, message } = body as {
      id?: string;
      status?: string;
      notes?: string;
      message?: string;
    };

    if (!id) return jsonError("Lead id is required.", 400);

    const { data: existing } = await supabase
      .from("leads")
      .select("id, agent_id, assigned_to, partner_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) return jsonError("Lead not found.", 404);

    const owned =
      existing.agent_id === user.id ||
      existing.assigned_to === user.id ||
      existing.partner_id === user.id;
    if (!owned) return jsonError("Lead is outside your authorized scope.", 403);

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };
    if (typeof notes === "string") updates.notes = notes;
    if (typeof message === "string") updates.message = message;
    if (typeof status === "string") updates.status = status;

    const { data, error } = await supabase.from("leads").update(updates).eq("id", id).select("*").single();
    if (error) return jsonError("Failed to update lead.", 500);
    return NextResponse.json({ lead: data });
  } catch (err) {
    console.error("[api/ap/leads] PATCH error", err);
    return jsonError("Failed to update lead.", 500);
  }
}
