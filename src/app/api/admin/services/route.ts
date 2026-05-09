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


export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const formData = await request.formData();
  const payload = servicePayload(formData);
  if (!payload.title || !payload.slug) return NextResponse.json({ message: "Service name is required." }, { status: 400 });

  const { data: duplicate } = await supabase.from("services").select("id").eq("slug", payload.slug).maybeSingle();
  if (duplicate) return NextResponse.json({ message: "A service with this slug already exists." }, { status: 409 });

  const { data, error } = await supabase.from("services").insert(payload).select("id, slug").single();
  if (error || !data) return NextResponse.json({ message: error?.message ?? "Service could not be saved." }, { status: 500 });

  revalidateServicePaths(data.slug);
  return NextResponse.json({ message: "Service saved.", serviceId: data.id });
}
