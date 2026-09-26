import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);

/**
 * Service-page click analytics.
 *
 * Public, so rate-limited and bounded. It no longer stores the visitor's IP
 * address: click counts by service and campaign do not need it, and the
 * privacy policy says our analytics keep no IP addresses.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`services-track:${getClientIp(request)}`, 60, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database client unavailable." }, { status: 500 });
  }

  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    const service_slug = text(body.service_slug, 120);
    const package_slug = text(body.package_slug, 120);
    const click_type = text(body.click_type, 40);
    const utm_source = text(body.utm_source, 120);
    const utm_medium = text(body.utm_medium, 120);
    const utm_campaign = text(body.utm_campaign, 120);
    const utm_term = text(body.utm_term, 120);
    const utm_content = text(body.utm_content, 120);

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

    const userAgent = (request.headers.get("user-agent") || "").slice(0, 300);

    const { error } = await supabase.from("service_clicks_log").insert({
      service_id: serviceId,
      package_id: packageId,
      click_type,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_term: utm_term || null,
      utm_content: utm_content || null,
      ip_address: null,
      user_agent: userAgent
    });

    if (error) {
      console.error("[track-analytics] Insert error:", error.message);
      return NextResponse.json({ error: "Failed to log tracking event." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[track-analytics] Unexpected error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Failed to log tracking event." }, { status: 500 });
  }
}
