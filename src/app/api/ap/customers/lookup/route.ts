import { NextResponse } from "next/server";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const rateLimit = checkRateLimit(`customer-lookup:${getClientIp(request)}`, 100, 60_000);
    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const user = await getCurrentUser();
    if (!user || !(await isActiveAgent(user))) {
      return NextResponse.json({ message: "Agent access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mobile = String(searchParams.get("mobile") ?? "").trim();
    const serviceSlug = String(searchParams.get("serviceSlug") ?? "").trim();

    if (!mobile || mobile.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ message: "Database connection failed." }, { status: 500 });
    }

    // Lookup customers matching the mobile prefix
    // Only search customers created by or assigned to this agent
    const { data: matchedCustomers, error: customerError } = await supabase
      .from("customers")
      .select("id, full_name, mobile, email, city, pincode, state, address")
      .or(`created_by.eq.${user.id},assigned_agent_id.eq.${user.id}`)
      .like("mobile", `%${mobile}%`)
      .limit(10);

    if (customerError) {
      return NextResponse.json({ message: customerError.message }, { status: 500 });
    }

    const results = [];

    for (const customer of matchedCustomers ?? []) {
      // Fetch previous applications for this customer
      const { data: previousApps } = await supabase
        .from("applications")
        .select("id, service_name, service_slug, status, created_at")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      // Check for active application of the SAME service
      // Active means not completed and not rejected
      const activeDuplicate = serviceSlug
        ? (previousApps ?? []).find(
            (app) =>
              app.service_slug === serviceSlug &&
              !["completed", "rejected"].includes(app.status.toLowerCase())
          )
        : null;

      results.push({
        customer,
        previousApplications: previousApps ?? [],
        duplicateApplication: activeDuplicate ?? null,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
