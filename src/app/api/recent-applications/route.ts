import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface ApplicationItem {
  service_name: string;
  status: string;
  created_at: string;
}

// This feed powers a public "recent activity" section. It must only ever
// contain real, privacy-safe data (service name + status + time; never
// customer details). Synthetic fallback entries were removed: presenting
// generated activity as verified transactions is misleading.
export async function GET() {
  const supabase = getSupabaseAdmin();

  let applications: ApplicationItem[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("service_name, status, created_at")
        .in("status", ["completed", "delivered", "submitted", "in_process"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        applications = data as ApplicationItem[];
      } else if (error) {
        console.warn("[recent-applications] Database query returned error:", error.message);
      }
    } catch (err) {
      console.error("[recent-applications] Failed to fetch applications from Supabase:", err);
    }
  }

  return NextResponse.json({
    success: true,
    applications,
  });
}
