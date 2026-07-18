import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAgencyPartnerRole } from "@/lib/auth";
import { getPublicServiceBySlug } from "@/lib/services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/ap/login", request.url), 303);
  }

  const role = await getCurrentUserRole(user);
  if (!isAgencyPartnerRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const formData = await request.formData();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const serviceSlug = String(formData.get("service_slug") ?? "").trim();

  if (!fullName || !mobile || !serviceSlug) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const service = await getPublicServiceBySlug(serviceSlug);
  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 400 });
  }

  const { data: partner } = await supabase
    .from("agency_partners")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!partner) {
    return NextResponse.json({ error: "Partner profile missing" }, { status: 400 });
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      {
        full_name: fullName,
        mobile,
        created_by: user.id,
        assigned_agent_id: user.id,
      },
      { onConflict: "mobile" },
    )
    .select("id")
    .maybeSingle();

  if (customerError || !customer) {
    return NextResponse.json({ error: customerError?.message ?? "Customer create failed" }, { status: 500 });
  }

  const { error: appError } = await supabase.from("applications").insert({
    customer_id: customer.id,
    service_id: service.id ?? null,
    service_slug: service.slug,
    service_name: service.title,
    amount: service.amount,
    fresh_payable: service.amount,
    status: "submitted",
    payment_status: "pending",
    created_by: user.id,
    assigned_agent_id: user.id,
    agency_partner_id: partner.id,
    submitted_by_role: "agency_partner",
  });

  if (appError) {
    return NextResponse.json({ error: appError.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/ap/applications", request.url), 303);
}
