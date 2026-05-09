import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { revalidateServicePaths } from "@/lib/service-admin";
import { getServiceSeedRows } from "@/lib/services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  return null;
}

export async function POST() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const { count } = await supabase.from("services").select("id", { count: "exact", head: true });
  if (count && count > 0) return NextResponse.json({ message: "Database already has services." });

  const { data: categories, error: categoryError } = await supabase.from("service_categories").select("id, slug");
  if (categoryError) return NextResponse.json({ message: categoryError.message }, { status: 500 });

  const categoryBySlug = new Map((categories ?? []).map((category) => [category.slug, category.id]));
  const rows = getServiceSeedRows().map(({ category_slug, ...service }) => ({
    ...service,
    category_id: categoryBySlug.get(category_slug) ?? null,
  }));

  const { error } = await supabase.from("services").insert(rows);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  revalidateServicePaths();
  return NextResponse.json({ message: `${rows.length} services seeded.` });
}
