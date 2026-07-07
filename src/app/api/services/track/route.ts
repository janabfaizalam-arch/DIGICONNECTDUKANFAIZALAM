import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database client unavailable." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { service_slug, package_slug, click_type, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = body;

    if (!click_type) {
      return NextResponse.json({ error: "click_type is required." }, { status: 400 });
    }

    let serviceId = null;
    let packageId = null;

    if (service_slug) {
      const { data: s } = await supabase.from("services").select("id").eq("slug", service_slug).maybeSingle();
      if (s) serviceId = s.id;
    }

    if (package_slug) {
      const { data: p } = await supabase.from("service_packages").select("id").eq("slug", package_slug).maybeSingle();
      if (p) packageId = p.id;
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const userAgent = request.headers.get("user-agent") || "";

    const { error } = await supabase.from("service_clicks_log").insert({
      service_id: serviceId,
      package_id: packageId,
      click_type,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_term: utm_term || null,
      utm_content: utm_content || null,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    if (error) {
      console.error("[track-analytics] Insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[track-analytics] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to log tracking event." }, { status: 500 });
  }
}
