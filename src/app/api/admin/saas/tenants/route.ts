import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  const { data: tenants, error: tenantErr } = await supabase
    .from("saas_tenants")
    .select("*, saas_domains(*)");

  if (tenantErr) {
    return NextResponse.json({ message: tenantErr.message }, { status: 500 });
  }

  return NextResponse.json({ data: tenants });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  const payload = await request.json();
  const { id, name, slug, logo_url, primary_color, secondary_color, contact_email, domains } = payload;

  if (!name || !slug) {
    return NextResponse.json({ message: "Name and Slug are required." }, { status: 400 });
  }

  let tenantId = id;

  if (tenantId) {
    // Update existing tenant
    const { error: updateErr } = await supabase
      .from("saas_tenants")
      .update({
        name,
        slug,
        logo_url,
        primary_color,
        secondary_color,
        contact_email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    if (updateErr) {
      return NextResponse.json({ message: updateErr.message }, { status: 500 });
    }
  } else {
    // Insert new tenant
    const { data: newTenant, error: insertErr } = await supabase
      .from("saas_tenants")
      .insert({
        name,
        slug,
        logo_url,
        primary_color,
        secondary_color,
        contact_email,
      })
      .select("id")
      .single();

    if (insertErr || !newTenant) {
      return NextResponse.json({ message: insertErr?.message || "Failed to create tenant." }, { status: 500 });
    }
    tenantId = newTenant.id;
  }

  // Manage domains mapping (clear and reload)
  if (Array.isArray(domains)) {
    const { error: deleteDomainsErr } = await supabase
      .from("saas_domains")
      .delete()
      .eq("tenant_id", tenantId);

    if (deleteDomainsErr) {
      return NextResponse.json({ message: deleteDomainsErr.message }, { status: 500 });
    }

    if (domains.length > 0) {
      const domainsToInsert = domains.map((domainStr: string) => ({
        tenant_id: tenantId,
        domain: domainStr,
        is_verified: true,
        ssl_active: true,
      }));

      const { error: insertDomainsErr } = await supabase
        .from("saas_domains")
        .insert(domainsToInsert);

      if (insertDomainsErr) {
        return NextResponse.json({ message: insertDomainsErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ message: "Tenant configuration saved successfully.", tenantId });
}
