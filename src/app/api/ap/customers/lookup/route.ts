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
    const search = String(searchParams.get("search") ?? searchParams.get("mobile") ?? "").trim();
    const serviceSlug = String(searchParams.get("serviceSlug") ?? "").trim();

    if (!search || search.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ message: "Database connection failed." }, { status: 500 });
    }

    // Determine search types
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search);
    const cleanSearch = search.replace(/[\s-]/g, "");
    const isAadhaar = /^\d{12}$/.test(cleanSearch);
    const isPan = /^[a-z]{5}\d{4}[a-z]$/i.test(cleanSearch);

    let matchedCustomerIdsFromApps: string[] = [];

    // If search is a potential Aadhaar or PAN, look up corresponding customer_ids in applications form_data
    if (isAadhaar || isPan) {
      let orClause = "";
      if (isAadhaar) {
        orClause = `form_data->>aadhaar.eq.${cleanSearch},form_data->>aadhaar_number.eq.${cleanSearch},form_data->>aadhaarNumber.eq.${cleanSearch}`;
      } else {
        orClause = `form_data->>pan.eq.${cleanSearch},form_data->>pan_number.eq.${cleanSearch},form_data->>panNumber.eq.${cleanSearch}`;
      }

      const { data: apps } = await supabase
        .from("applications")
        .select("customer_id")
        .or(`created_by.eq.${user.id},assigned_agent_id.eq.${user.id}`)
        .or(orClause)
        .limit(10);

      if (apps) {
        matchedCustomerIdsFromApps = apps
          .map((a) => a.customer_id)
          .filter((id): id is string => Boolean(id));
      }
    }

    // Dynamically build the OR query on the customers table
    const orConditions: string[] = [];
    orConditions.push(`mobile.like.%${cleanSearch}%`);
    orConditions.push(`full_name.ilike.%${search}%`);

    if (isUuid) {
      orConditions.push(`id.eq.${search}`);
    }

    if (matchedCustomerIdsFromApps.length > 0) {
      matchedCustomerIdsFromApps.forEach((id) => {
        orConditions.push(`id.eq.${id}`);
      });
    }

    const { data: matchedCustomers, error: customerError } = await supabase
      .from("customers")
      .select("id, full_name, mobile, email, city, pincode, state, address")
      .or(`created_by.eq.${user.id},assigned_agent_id.eq.${user.id}`)
      .or(orConditions.join(","))
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
