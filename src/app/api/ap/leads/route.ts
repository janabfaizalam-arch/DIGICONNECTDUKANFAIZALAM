import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { ingestLead } from "@/lib/crm/leads";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

// GET all leads for logged-in agency partner
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !(await isActiveAgent(user))) {
      return jsonError("Unauthorized access.", 401);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return jsonError("Database connection missing.", 500);
    }

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ leads: data ?? [] });
  } catch (err) {
    console.error("[api/ap/leads] GET error", err);
    return jsonError("Failed to fetch leads.", 500);
  }
}

// POST: Create a new lead for the logged-in partner
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

// PATCH: Update status/notes for a lead owned by the partner
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
    const { id, status, notes } = body;

    if (!id) {
      return jsonError("Lead ID is required.", 400);
    }

    // Verify ownership first
    const { data: leadCheck } = await supabase
      .from("leads")
      .select("id, agent_id")
      .eq("id", id)
      .maybeSingle();

    if (!leadCheck || leadCheck.agent_id !== user.id) {
      return jsonError("Lead not found or access denied.", 403);
    }

    const updatePayload: { status?: string; notes?: string; updated_at?: string } = {};
    if (status !== undefined) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes;
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({
      message: "Lead updated successfully.",
      lead: data,
      ok: true,
    });
  } catch (err) {
    console.error("[api/ap/leads] PATCH error", err);
    return jsonError("Failed to update lead.", 500);
  }
}
