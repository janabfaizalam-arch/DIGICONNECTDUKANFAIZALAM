import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const homepageSlidesBucketName = "homepage-slides";

export const homepageSlideCtaPositions = [
  "bottom-left",
  "bottom-right",
  "bottom-center",
  "center-left",
  "center-right",
  "hidden",
] as const;

export type HomepageSlideCtaPosition = (typeof homepageSlideCtaPositions)[number];

export type HomepageSlide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  image_path: string | null;
  mobile_image_url: string | null;
  mobile_image_path: string | null;
  cta_primary_label: string | null;
  cta_primary_url: string | null;
  cta_secondary_label: string | null;
  cta_secondary_url: string | null;
  cta_position: HomepageSlideCtaPosition;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

const slideSelect =
  "id, title, subtitle, image_url, image_path, mobile_image_url, mobile_image_path, cta_primary_label, cta_primary_url, cta_secondary_label, cta_secondary_url, cta_position, sort_order, is_active, starts_at, ends_at, created_at, updated_at";

export function isHomepageSlideCtaPosition(value: string): value is HomepageSlideCtaPosition {
  return homepageSlideCtaPositions.includes(value as HomepageSlideCtaPosition);
}

export async function getActiveHomepageSlides(limit = 12): Promise<HomepageSlide[]> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [];
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("homepage_slides")
    .select(slideSelect)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[homepage-slides] Failed to fetch active slides", error);
    return [];
  }

  return (data ?? []) as HomepageSlide[];
}

export async function getAllHomepageSlides(limit = 80): Promise<HomepageSlide[]> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("homepage_slides")
    .select(slideSelect)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[homepage-slides] Failed to fetch admin slides", error);
    return [];
  }

  return (data ?? []) as HomepageSlide[];
}
