import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { revalidateServicePaths, servicePayload } from "@/lib/service-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  return null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const { id } = await params;
  const formData = await request.formData();
  const payload = { ...servicePayload(formData), updated_at: new Date().toISOString() };
  if (!payload.title || !payload.slug) return NextResponse.json({ message: "Service name is required." }, { status: 400 });

  const { data: duplicate } = await supabase.from("services").select("id").eq("slug", payload.slug).neq("id", id).maybeSingle();
  if (duplicate) return NextResponse.json({ message: "A service with this slug already exists." }, { status: 409 });

  const { error } = await supabase.from("services").update(payload).eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  revalidateServicePaths(payload.slug);
  return NextResponse.json({ message: "Service updated." });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const { id } = await params;
  const { data: service } = await supabase.from("services").select("slug").eq("id", id).maybeSingle();
  const { error } = await supabase
    .from("services")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  revalidateServicePaths(service?.slug);
  return NextResponse.json({ message: "Service archived." });
}
