import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Database client unavailable." }, { status: 500 });

  try {
    const body = await request.json();
    const { service_id, variants } = body;

    if (!service_id || !Array.isArray(variants)) {
      return NextResponse.json({ message: "service_id and variants array required." }, { status: 400 });
    }

    // Delete existing variants for service first to recreate
    await supabase.from("service_variants").delete().eq("service_id", service_id);

    if (variants.length === 0) {
      return NextResponse.json({ message: "Variants cleared." });
    }

    const { data, error } = await supabase.from("service_variants").insert(
      variants.map((v: unknown) => {
        const varObj = v as Record<string, unknown>;
        return {
          service_id,
          slug: String(varObj.slug || ""),
          name: String(varObj.name || ""),
          description: varObj.description ? String(varObj.description) : null,
          original_price: Number(varObj.original_price || 0),
          selling_price: Number(varObj.selling_price || 0),
          offer_price: Number(varObj.offer_price || 0),
          agent_cost: Number(varObj.agent_cost || 0),
          partner_payout: Number(varObj.partner_payout || 0),
          wallet_cashback: Number(varObj.wallet_cashback || 0),
          wallet_redeem_allowed: varObj.wallet_redeem_allowed !== false,
          gst_included: varObj.gst_included || false,
          gst_percentage: Number(varObj.gst_percentage || 18.00),
          timeline: varObj.timeline ? String(varObj.timeline) : null,
          government_fees: Number(varObj.government_fees || 0),
          professional_fees: Number(varObj.professional_fees || 0),
          required_documents: Array.isArray(varObj.required_documents) ? varObj.required_documents : [],
          form_fields: Array.isArray(varObj.form_fields) ? varObj.form_fields : [],
          is_active: varObj.is_active !== false,
        };
      })
    ).select();

    if (error) return NextResponse.json({ message: error.message }, { status: 500 });

    return NextResponse.json({ message: "Variants updated successfully.", data });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Request failed." }, { status: 500 });
  }
}
