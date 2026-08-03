import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ApplicationItem {
  service_name: string;
  status: string;
  created_at: string;
}

/**
 * Privacy-safe recent activity for homepage.
 * Returns only completed/delivered application summaries — never pads with fabricated rows.
 */
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: true, applications: [], configured: false });
  }

  try {
    const { data, error } = await supabase
      .from("applications")
      .select("service_name, status, created_at")
      .in("status", ["completed", "delivered"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.warn("[recent-applications] query_failed", error.message);
      return NextResponse.json({ success: true, applications: [], configured: true });
    }

    const applications = ((data ?? []) as ApplicationItem[]).map((row) => ({
      service_name: String(row.service_name || "Service").trim() || "Service",
      status: String(row.status || "completed"),
      created_at: row.created_at,
    }));

    return NextResponse.json({ success: true, applications, configured: true });
  } catch (err) {
    console.error("[recent-applications] unexpected_error", err);
    return NextResponse.json({ success: true, applications: [], configured: true });
  }
}
