import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
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
    return NextResponse.json({ message: leadErr.message }, { status: 500 });
  }

  // If no leads exist, return default seed values for a populated demo pipeline
  if (leads.length === 0) {
    const demoLeads = [
      {
        id: "demo-lead-1",
        customer_name: "Amit Sharma",
        customer_email: "amit.sharma@gmail.com",
        customer_mobile: "9876543210",
        pipeline_stage: "lead",
        lead_score: 85,
        estimated_clv: 12500,
        notes: "Interested in Business Registration and GST combo starter package.",
        created_at: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: "demo-lead-2",
        customer_name: "Priya Patel",
        customer_email: "priya.patel@hotmail.com",
        customer_mobile: "8765432109",
        pipeline_stage: "opportunity",
        lead_score: 90,
        estimated_clv: 45000,
        notes: "SaaS client requiring custom domain setup and high-speed approvals.",
        created_at: new Date(Date.now() - 3600000 * 12).toISOString()
      },
      {
        id: "demo-lead-3",
        customer_name: "Ramesh Kumar",
        customer_email: "ramesh.k@yahoo.com",
        customer_mobile: "7654321098",
        pipeline_stage: "negotiation",
        lead_score: 75,
        estimated_clv: 8500,
        notes: "Requires ITR filing assistance, asked for discount coupons.",
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: "demo-lead-4",
        customer_name: "Suresh Gupta",
        customer_email: "suresh.g@gmail.com",
        customer_mobile: "9555666777",
        pipeline_stage: "won",
        lead_score: 100,
        estimated_clv: 15000,
        notes: "Payment complete. Registered PVC print template and dispatched.",
        created_at: new Date(Date.now() - 3600000 * 48).toISOString()
      }
    ];
    return NextResponse.json({ data: demoLeads });
  }

  return NextResponse.json({ data: leads });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  const payload = await request.json();
  const { id, customer_name, customer_email, customer_mobile, pipeline_stage, lead_score, estimated_clv, notes } = payload;

  if (!customer_name || !customer_mobile) {
    return NextResponse.json({ message: "Customer Name and Mobile are required." }, { status: 400 });
  }

  if (id && !id.startsWith("demo-")) {
    const { error: updateErr } = await supabase
      .from("crm_leads")
      .update({
        customer_name,
        customer_email,
        customer_mobile,
        pipeline_stage,
        lead_score: Number(lead_score || 50),
        estimated_clv: Number(estimated_clv || 0),
        notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ message: updateErr.message }, { status: 500 });
    }
  } else {
    // Insert new lead (or replace demo lead with database lead)
    const { data: newLead, error: insertErr } = await supabase
      .from("crm_leads")
      .insert({
        customer_name,
        customer_email,
        customer_mobile,
        pipeline_stage: pipeline_stage || "lead",
        lead_score: Number(lead_score || 50),
        estimated_clv: Number(estimated_clv || 0),
        notes
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ message: insertErr.message }, { status: 500 });
    }
    return NextResponse.json({ message: "Lead saved successfully.", data: newLead });
  }

  return NextResponse.json({ message: "Lead updated successfully." });
}
