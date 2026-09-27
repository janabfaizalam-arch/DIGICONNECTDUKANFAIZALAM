import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const revalidate = 300;

/**
 * Active service packages, with only the fields a customer sees.
 *
 * The admin endpoint returns every column, including agent cost and partner
 * payout; the public site reads this one instead.
 */
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json([], { status: 200 });

  const { data, error } = await supabase
    .from("service_packages")
    .select("id, slug, name, description, image_url, items, original_price, selling_price, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/packages] list_failed", { code: error.code });
    return NextResponse.json([], { status: 200 });
  }
  return NextResponse.json(data ?? []);
}
