import { NextResponse } from "next/server";

import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const leadStatuses = ["new", "in_progress", "completed"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || !(await isActiveAgent(user))) {
      return jsonError("Agent access required.", 403);
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Supabase service role key is missing.", 500);
    }

    const formData = await request.formData();
    const customerName = String(formData.get("customerName") ?? "").trim();
    const mobile = String(formData.get("mobile") ?? "").trim();
    const service = String(formData.get("service") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!customerName || !mobile || !service) {
      return jsonError("Customer name, mobile number, and service are required.", 400);
    }

    const { error } = await supabase.from("leads").insert({
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

    if (error) {
      return jsonError("Lead could not be saved.", 500);
    }

    return NextResponse.json({ message: "Lead saved successfully." });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Lead could not be saved.", 500);
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
      return jsonError("Supabase service role key is missing.", 500);
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
      return jsonError("Lead status could not be updated.", 500);
    }

    return NextResponse.json({ message: "Lead status updated successfully." });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Lead status could not be updated.", 500);
  }
}
