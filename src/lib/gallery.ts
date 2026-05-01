import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type GalleryImage = {
  id: string;
  title: string | null;
  image_url: string;
  storage_path: string;
  active: boolean;
  created_at: string;
};

export const galleryBucketName = "gallery";

export async function getActiveGalleryImages(limit = 9): Promise<GalleryImage[]> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("gallery_images")
    .select("id, title, image_url, storage_path, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[gallery] Failed to fetch gallery images", error);
    return [];
  }

  return data ?? [];
}

export async function getAllGalleryImages(limit = 60): Promise<GalleryImage[]> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("gallery_images")
    .select("id, title, image_url, storage_path, active, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[gallery] Failed to fetch admin gallery images", error);
    return [];
  }

  return data ?? [];
}
