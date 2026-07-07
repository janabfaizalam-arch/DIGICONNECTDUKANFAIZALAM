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
    const { service_id, comparisons } = body;

    if (!service_id || !Array.isArray(comparisons)) {
      return NextResponse.json({ message: "service_id and comparisons array required." }, { status: 400 });
    }

    // Delete existing comparisons for service first to recreate
    await supabase.from("service_comparisons").delete().eq("service_id", service_id);

    if (comparisons.length === 0) {
      return NextResponse.json({ message: "Comparisons cleared." });
    }

    const { data, error } = await supabase.from("service_comparisons").insert(
      comparisons.map((c: unknown) => {
        const compObj = c as Record<string, unknown>;
        return {
          service_id,
          title: String(compObj.title || ""),
          description: compObj.description ? String(compObj.description) : null,
          headers: Array.isArray(compObj.headers) ? compObj.headers : [],
          rows: Array.isArray(compObj.rows) ? compObj.rows : [],
          sort_order: Number(compObj.sort_order || 0),
          is_active: compObj.is_active !== false,
        };
      })
    ).select();

    if (error) return NextResponse.json({ message: error.message }, { status: 500 });

    return NextResponse.json({ message: "Comparisons updated successfully.", data });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Request failed." }, { status: 500 });
  }
}
