import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { revalidateServicePaths, slugifyService } from "@/lib/service-admin";
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
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugifyService(String(formData.get("slug") ?? name));
  if (!name || !slug) return NextResponse.json({ message: "Category name is required." }, { status: 400 });

  const { error } = await supabase.from("service_categories").upsert(
    {
      id: String(formData.get("id") ?? "").trim() || undefined,
      name,
      slug,
      description: String(formData.get("description") ?? "").trim(),
      sort_order: Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10) || 0,
      is_active: String(formData.get("isActive") ?? "true") === "true",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  revalidateServicePaths();
  return NextResponse.json({ message: "Category saved." });
}
