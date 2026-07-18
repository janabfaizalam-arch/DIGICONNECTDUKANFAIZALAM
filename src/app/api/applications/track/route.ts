import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "Tracking code is required." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("applications")
    .select("tracking_code, status, payment_status, service_name")
    .eq("tracking_code", code)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  return NextResponse.json(data);
}
