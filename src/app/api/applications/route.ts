import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getPublicServiceBySlug } from "@/lib/services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("applications")
    .select("id, service_name, service_slug, status, payment_status, tracking_code, amount, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { serviceSlug?: string };
  const serviceSlug = String(body.serviceSlug ?? "").trim();
  const service = await getPublicServiceBySlug(serviceSlug);
  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      service_id: service.id ?? null,
      service_slug: service.slug,
      service_name: service.title,
      amount: service.amount,
      fresh_payable: service.amount,
      status: "submitted",
      payment_status: "pending",
      created_by: user.id,
      submitted_by_role: "customer",
    })
    .select("id, tracking_code")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Create failed" }, { status: 500 });
  }

  return NextResponse.json({ application: data });
}
