import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  return null;
}

function articlePayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? title));
  return {
    title,
    slug,
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
    featured_image_url: String(formData.get("featuredImageUrl") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim(),
    seo_title: String(formData.get("seoTitle") ?? "").trim(),
    seo_description: String(formData.get("seoDescription") ?? "").trim(),
    keywords: String(formData.get("keywords") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    status: String(formData.get("status") ?? "draft") === "published" ? "published" : "draft",
    updated_at: new Date().toISOString(),
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  const { id } = await params;
  const formData = await request.formData();
  const payload = articlePayload(formData);

  const { error } = await supabase.from("articles").update(payload).eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  revalidatePath("/admin/articles");
  revalidatePath("/blog");
  revalidatePath(`/blog/${payload.slug}`);
  return NextResponse.json({ message: "Article updated." });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  const { id } = await params;
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  revalidatePath("/admin/articles");
  revalidatePath("/blog");
  return NextResponse.json({ message: "Article deleted." });
}
