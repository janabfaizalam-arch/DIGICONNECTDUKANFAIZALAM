import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  featured_image_path: string | null;
  category: string | null;
  seo_title: string | null;
  seo_description: string | null;
  keywords: string[] | null;
  status: "draft" | "published";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAdminArticles() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as Article[];

  try {
    const { data, error } = await supabase.from("articles").select("*").order("updated_at", { ascending: false });
    if (error) return [] as Article[];
    return (data ?? []) as Article[];
  } catch (error) {
    console.error("[articles] Failed to fetch admin articles", error);
    return [] as Article[];
  }
}

export async function getPublishedArticles() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as Article[];

  try {
    const { data, error } = await supabase.from("articles").select("*").eq("status", "published").order("created_at", { ascending: false });
    if (error) return [] as Article[];
    return (data ?? []) as Article[];
  } catch (error) {
    console.error("[articles] Failed to fetch published articles", error);
    return [] as Article[];
  }
}

export async function getArticleBySlug(slug: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from("articles").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) return null;
    return (data ?? null) as Article | null;
  } catch (error) {
    console.error("[articles] Failed to fetch article by slug", error);
    return null;
  }
}

export async function getAdminArticleById(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
    if (error) return null;
    return (data ?? null) as Article | null;
  } catch (error) {
    console.error("[articles] Failed to fetch admin article by id", error);
    return null;
  }
}
