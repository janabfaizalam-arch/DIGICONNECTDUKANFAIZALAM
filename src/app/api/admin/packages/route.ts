import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Database client unavailable." }, { status: 500 });

  try {
    const { data, error } = await supabase.from("service_packages").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Request failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Database client unavailable." }, { status: 500 });

  try {
    const body = await request.json();
    const { id, slug, name, description, image_url, items, original_price, selling_price, agent_cost, partner_payout, wallet_cashback, wallet_redeem_allowed, is_active } = body;

    if (!slug || !name || !Array.isArray(items)) {
      return NextResponse.json({ message: "slug, name and items array are required." }, { status: 400 });
    }

    const payload = {
      slug,
      name,
      description: description || null,
      image_url: image_url || null,
      items,
      original_price: Number(original_price || 0),
      selling_price: Number(selling_price || 0),
      agent_cost: Number(agent_cost || 0),
      partner_payout: Number(partner_payout || 0),
      wallet_cashback: Number(wallet_cashback || 0),
      wallet_redeem_allowed: wallet_redeem_allowed !== false,
      is_active: is_active !== false,
      updated_at: new Date().toISOString()
    };

    let result;
    if (id) {
      // Update
      const { data, error } = await supabase.from("service_packages").update(payload).eq("id", id).select().single();
      if (error) return NextResponse.json({ message: error.message }, { status: 500 });
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase.from("service_packages").insert({ ...payload, created_at: new Date().toISOString() }).select().single();
      if (error) return NextResponse.json({ message: error.message }, { status: 500 });
      result = data;
    }

    return NextResponse.json({ message: "Package saved successfully.", data: result });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Request failed." }, { status: 500 });
  }
}
