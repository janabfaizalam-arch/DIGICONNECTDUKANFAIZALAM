// ============================================================================
// Digi Partner announcement banners (partner_dashboard audience)
// ============================================================================

import type { DigiPartnerType } from "@/lib/ap/partner-type";
import { DIGI_PARTNER_TYPE_VALUES, isDigiPartnerType } from "@/lib/ap/partner-type";
import type { BannerAudience, PartnerAnnouncementBanner } from "@/lib/ap/home-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const partnerBannersBucketName = "partner-announcement-banners";

const bannerSelect =
  "id, title, description, image_url, image_path, mobile_image_url, mobile_image_path, button_text, button_url, partner_types, audience, start_at, end_at, is_active, sort_order, created_at, updated_at";

function parsePartnerTypes(value: unknown): DigiPartnerType[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const types = value.filter((item): item is DigiPartnerType => typeof item === "string" && isDigiPartnerType(item));
  return types.length ? types : null;
}

function mapBanner(row: Record<string, unknown>): PartnerAnnouncementBanner {
  return {
    id: String(row.id),
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    image_url: String(row.image_url ?? ""),
    image_path: (row.image_path as string | null) ?? null,
    mobile_image_url: (row.mobile_image_url as string | null) ?? null,
    mobile_image_path: (row.mobile_image_path as string | null) ?? null,
    button_text: (row.button_text as string | null) ?? null,
    button_url: (row.button_url as string | null) ?? null,
    partner_types: parsePartnerTypes(row.partner_types),
    audience: (row.audience as BannerAudience) ?? "partner_dashboard",
    start_at: (row.start_at as string | null) ?? null,
    end_at: (row.end_at as string | null) ?? null,
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function isBannerVisibleNow(
  banner: Pick<PartnerAnnouncementBanner, "is_active" | "start_at" | "end_at" | "partner_types">,
  partnerType: DigiPartnerType,
  now = new Date(),
): boolean {
  if (!banner.is_active) return false;
  if (banner.start_at && new Date(banner.start_at) > now) return false;
  if (banner.end_at && new Date(banner.end_at) < now) return false;
  if (banner.partner_types == null || banner.partner_types.length === 0) return true;
  return banner.partner_types.includes(partnerType);
}

export async function getActivePartnerDashboardBanners(
  partnerType: DigiPartnerType,
  limit = 12,
): Promise<PartnerAnnouncementBanner[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("partner_announcement_banners")
      .select(bannerSelect)
      .eq("audience", "partner_dashboard")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[partner-banners] active fetch failed", error.message);
      return [];
    }

    return ((data ?? []) as Record<string, unknown>[])
      .map(mapBanner)
      .filter((banner) => isBannerVisibleNow(banner, partnerType));
  } catch (error) {
    console.error("[partner-banners] active fetch failed", error);
    return [];
  }
}

export async function getAllPartnerDashboardBanners(limit = 80): Promise<PartnerAnnouncementBanner[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("partner_announcement_banners")
      .select(bannerSelect)
      .eq("audience", "partner_dashboard")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[partner-banners] admin fetch failed", error.message);
      return [];
    }

    return ((data ?? []) as Record<string, unknown>[]).map(mapBanner);
  } catch (error) {
    console.error("[partner-banners] admin fetch failed", error);
    return [];
  }
}

export function parsePartnerTypesFromForm(raw: string | null | undefined): DigiPartnerType[] | null {
  if (!raw || !raw.trim()) return null;
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const types = parts.filter((part): part is DigiPartnerType => isDigiPartnerType(part));
  if (!types.length) return null;
  // Deduplicate while preserving order
  return Array.from(new Set(types));
}

export { DIGI_PARTNER_TYPE_VALUES };
