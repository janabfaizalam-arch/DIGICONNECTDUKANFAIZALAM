import { NextResponse } from "next/server";

import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const leadStatuses = ["new", "in_progress", "completed"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || !(await isActiveAgent(user))) {
      return jsonError("Agent access required.", 403);
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.error("[agent-leads] Supabase service role key is missing.");
      return jsonError("Customer could not be added right now.", 500);
    }

    const formData = await request.formData();
    const customerName = String(formData.get("customerName") ?? "").trim();
    const mobile = normalizeMobile(String(formData.get("mobile") ?? ""));
    const service = String(formData.get("service") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!customerName || !mobile || !service) {
      return jsonError("Customer name, mobile number, and service are required.", 400);
    }

    if (!/^\d{10}$/.test(mobile)) {
      return jsonError("Enter a valid 10 digit mobile number.", 400);
    }

    const { error: leadError } = await supabase.from("leads").insert({
      name: customerName,
      customer_name: customerName,
      mobile,
      service,
      city,
      message: notes,
      notes,
      status: "new",
      agent_id: user.id,
    });

    if (leadError) {
      console.error("[agent-leads] Lead insert failed.", leadError.message);
      return jsonError("Customer could not be added.", 500);
    }

    const { error: customerError } = await supabase.from("customers").insert({
      full_name: customerName,
      mobile,
      email: null,
      city,
      address: city,
      notes: notes || service,
      source: "agent_pos",
      created_by: user.id,
      assigned_agent_id: user.id,
    });

    if (customerError) {
      console.error("[agent-leads] Customer insert failed.", customerError.message);
    }

    return NextResponse.json({ message: "Customer added successfully." });
  } catch (error) {
    console.error("[agent-leads] Lead create failed.", error);
    return jsonError("Customer could not be added.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || !(await isActiveAgent(user))) {
      return jsonError("Agent access required.", 403);
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.error("[agent-leads] Supabase service role key is missing.");
      return jsonError("Lead status could not be updated.", 500);
    }

    const body = (await request.json()) as { id?: string; status?: string };

    if (!body.id || !body.status || !leadStatuses.includes(body.status as never)) {
      return jsonError("Invalid lead status update.", 400);
    }

    const { error } = await supabase
      .from("leads")
      .update({ status: body.status })
      .eq("id", body.id)
      .eq("agent_id", user.id);

    if (error) {
      console.error("[agent-leads] Status update failed.", error.message);
      return jsonError("Lead status could not be updated.", 500);
    }

    return NextResponse.json({ message: "Lead status updated successfully." });
  } catch (error) {
    console.error("[agent-leads] Status update failed.", error);
    return jsonError("Lead status could not be updated.", 500);
  }
}
