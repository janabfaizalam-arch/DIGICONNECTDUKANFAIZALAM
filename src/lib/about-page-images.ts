import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AboutPageImage = {
  id: string;
  title: string | null;
  alt_text: string | null;
  image_url: string;
  storage_path: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const imageSelect = "id, title, alt_text, image_url, storage_path, sort_order, is_active, created_at, updated_at";

export async function getActiveAboutPageImages(limit = 12): Promise<AboutPageImage[]> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("about_page_images")
      .select(imageSelect)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[about-page-images] Failed to fetch active images", error);
      return [];
    }

    return (data ?? []) as AboutPageImage[];
  } catch (error) {
    console.error("[about-page-images] Failed to fetch active images", error);
    return [];
  }
}

export async function getAllAboutPageImages(limit = 80): Promise<AboutPageImage[]> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("about_page_images")
      .select(imageSelect)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[about-page-images] Failed to fetch admin images", error);
      return [];
    }

    return (data ?? []) as AboutPageImage[];
  } catch (error) {
    console.error("[about-page-images] Failed to fetch admin images", error);
    return [];
  }
}
