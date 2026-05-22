import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const siteMediaBucketName = "site-media";
export const homepageOfferStripSettingKey = "homepage_offer_strip";
export const defaultHomepageOfferStripTitle = "Featured Offers";

export type SiteSectionSetting = {
  section_key: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type HomepageOfferBanner = {
  id: string;
  title: string | null;
  image_url: string;
  storage_path: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const bannerSelect = "id, title, image_url, storage_path, link_url, sort_order, is_active, created_at, updated_at";
const settingSelect = "section_key, title, created_at, updated_at";

export async function getHomepageOfferStripSetting(): Promise<SiteSectionSetting> {
  const supabase = getSupabaseAdmin();
  const fallback = {
    section_key: homepageOfferStripSettingKey,
    title: defaultHomepageOfferStripTitle,
    created_at: "",
    updated_at: "",
  };

  if (!supabase) {
    return fallback;
  }

  try {
    const { data, error } = await supabase
      .from("site_section_settings")
      .select(settingSelect)
      .eq("section_key", homepageOfferStripSettingKey)
      .maybeSingle();

    if (error) {
      console.error("[homepage-offer-banners] Failed to fetch offer strip setting", error);
      return fallback;
    }

    return (data as SiteSectionSetting | null) ?? fallback;
  } catch (error) {
    console.error("[homepage-offer-banners] Failed to fetch offer strip setting", error);
    return fallback;
  }
}

export async function getActiveHomepageOfferBanners(limit = 12): Promise<HomepageOfferBanner[]> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("homepage_offer_banners")
      .select(bannerSelect)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[homepage-offer-banners] Failed to fetch active banners", error);
      return [];
    }

    return (data ?? []) as HomepageOfferBanner[];
  } catch (error) {
    console.error("[homepage-offer-banners] Failed to fetch active banners", error);
    return [];
  }
}

export async function getAllHomepageOfferBanners(limit = 80): Promise<HomepageOfferBanner[]> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("homepage_offer_banners")
      .select(bannerSelect)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[homepage-offer-banners] Failed to fetch admin banners", error);
      return [];
    }

    return (data ?? []) as HomepageOfferBanner[];
  } catch (error) {
    console.error("[homepage-offer-banners] Failed to fetch admin banners", error);
    return [];
  }
}
