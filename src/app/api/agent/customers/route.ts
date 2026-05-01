import { NextResponse } from "next/server";

import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !(await isActiveAgent(user))) {
    return jsonError("Agent access required.", 403);
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return jsonError("Supabase service role key is missing.", 500);
  }

  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!fullName || !mobile) {
    return jsonError("Customer name and mobile are required.", 400);
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: fullName,
      mobile,
      email,
      city,
      address,
      notes,
      source: "offline",
      created_by: user.id,
      assigned_agent_id: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return jsonError("Customer could not be created.", 500);
  }

  return NextResponse.json({ message: "Customer created successfully.", customerId: data.id });
}
