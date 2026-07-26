import { getDefaultDprCmsPayload } from "@/lib/dpr/defaults";
import type {
  DprBanner,
  DprCmsPayload,
  DprComparisonRow,
  DprFaq,
  DprPageSettings,
  DprPricingPlan,
  DprRelatedService,
  DprReview,
  DprSection,
} from "@/lib/dpr/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function asFeatures(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapSettings(row: Record<string, unknown> | null, fallback: DprPageSettings): DprPageSettings {
  if (!row) return fallback;
  return {
    stickyCtaEnabled: row.sticky_cta_enabled != null ? Boolean(row.sticky_cta_enabled) : fallback.stickyCtaEnabled,
    stickyCtaLabel: String(row.sticky_cta_label ?? fallback.stickyCtaLabel),
    stickyCtaUrl: String(row.sticky_cta_url ?? fallback.stickyCtaUrl),
    videoUrl: (row.video_url as string | null) ?? null,
    whatsappNumber: String(row.whatsapp_number ?? fallback.whatsappNumber),
    supportPhone: String(row.support_phone ?? fallback.supportPhone),
    defaultPlanId: String(row.default_plan_id ?? fallback.defaultPlanId),
    metaTitle: (row.meta_title as string | null) ?? fallback.metaTitle,
    metaDescription: (row.meta_description as string | null) ?? fallback.metaDescription,
  };
}

function mapSection(row: Record<string, unknown>): DprSection {
  return {
    id: String(row.id ?? ""),
    sectionKey: String(row.section_key ?? ""),
    enabled: Boolean(row.enabled ?? true),
    sortOrder: Number(row.sort_order ?? 0),
    heading: (row.heading as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    ctaLabel: (row.cta_label as string | null) ?? null,
    ctaUrl: (row.cta_url as string | null) ?? null,
    animationType: (row.animation_type as string | null) ?? "fade-up",
  };
}

function mapBanner(row: Record<string, unknown>): DprBanner {
  return {
    id: String(row.id),
    sectionKey: String(row.section_key ?? ""),
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    altText: (row.alt_text as string | null) ?? null,
    imageUrl: String(row.image_url ?? ""),
    imagePath: (row.image_path as string | null) ?? null,
    mobileImageUrl: (row.mobile_image_url as string | null) ?? null,
    mobileImagePath: (row.mobile_image_path as string | null) ?? null,
    buttonText: (row.button_text as string | null) ?? null,
    buttonUrl: (row.button_url as string | null) ?? null,
    startAt: (row.start_at as string | null) ?? null,
    endAt: (row.end_at as string | null) ?? null,
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapPricing(row: Record<string, unknown>): DprPricingPlan {
  return {
    id: String(row.id ?? ""),
    planKey: String(row.plan_key ?? ""),
    name: String(row.name ?? ""),
    price: Number(row.price ?? 0),
    oldPrice: row.old_price == null ? null : Number(row.old_price),
    description: (row.description as string | null) ?? null,
    features: asFeatures(row.features),
    isFeatured: Boolean(row.is_featured ?? false),
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
    ctaLabel: (row.cta_label as string | null) ?? null,
  };
}

function mapFaq(row: Record<string, unknown>): DprFaq {
  return {
    id: String(row.id ?? ""),
    question: String(row.question ?? ""),
    answer: String(row.answer ?? ""),
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapReview(row: Record<string, unknown>): DprReview {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    location: (row.location as string | null) ?? null,
    rating: Number(row.rating ?? 5),
    text: String(row.text ?? ""),
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapComparison(row: Record<string, unknown>): DprComparisonRow {
  return {
    id: String(row.id ?? ""),
    feature: String(row.feature ?? ""),
    digiconnect: String(row.digiconnect ?? "Yes"),
    others: String(row.others ?? "No"),
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapRelated(row: Record<string, unknown>): DprRelatedService {
  return {
    id: String(row.id ?? ""),
    serviceSlug: String(row.service_slug ?? ""),
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mergeSections(dbSections: DprSection[], defaults: DprSection[]): DprSection[] {
  if (!dbSections.length) return defaults;
  const byKey = new Map(dbSections.map((s) => [s.sectionKey, s]));
  const merged = defaults.map((fallback) => {
    const hit = byKey.get(fallback.sectionKey);
    if (!hit) return fallback;
    return {
      ...fallback,
      ...hit,
      heading: hit.heading || fallback.heading,
      description: hit.description || fallback.description,
      ctaLabel: hit.ctaLabel ?? fallback.ctaLabel,
      ctaUrl: hit.ctaUrl ?? fallback.ctaUrl,
    };
  });
  for (const section of dbSections) {
    if (!merged.some((s) => s.sectionKey === section.sectionKey)) {
      merged.push(section);
    }
  }
  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getDprCmsPayload(): Promise<DprCmsPayload> {
  const fallback = getDefaultDprCmsPayload();
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallback;

  try {
    const [
      settingsRes,
      sectionsRes,
      bannersRes,
      pricingRes,
      faqsRes,
      reviewsRes,
      comparisonRes,
      relatedRes,
    ] = await Promise.all([
      supabase.from("dpr_page_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("dpr_sections").select("*").order("sort_order", { ascending: true }),
      supabase.from("dpr_section_banners").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("dpr_pricing_plans").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("dpr_faqs").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("dpr_reviews").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("dpr_comparison_rows").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("dpr_related_services").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    ]);

    // Tables may not exist yet — fall back silently
    if (settingsRes.error?.message?.includes("does not exist")) {
      return fallback;
    }

    const settings = mapSettings((settingsRes.data as Record<string, unknown> | null) ?? null, fallback.settings);
    const sections = mergeSections(
      ((sectionsRes.data ?? []) as Record<string, unknown>[]).map(mapSection),
      fallback.sections,
    );
    const banners = ((bannersRes.data ?? []) as Record<string, unknown>[]).map(mapBanner);
    const pricing = ((pricingRes.data ?? []) as Record<string, unknown>[]).map(mapPricing);
    const faqs = ((faqsRes.data ?? []) as Record<string, unknown>[]).map(mapFaq);
    const reviews = ((reviewsRes.data ?? []) as Record<string, unknown>[]).map(mapReview);
    const comparison = ((comparisonRes.data ?? []) as Record<string, unknown>[]).map(mapComparison);
    const related = ((relatedRes.data ?? []) as Record<string, unknown>[]).map(mapRelated);

    return {
      settings,
      sections,
      banners,
      pricing: pricing.length ? pricing : fallback.pricing,
      faqs: faqs.length ? faqs : fallback.faqs,
      reviews: reviews.length ? reviews : fallback.reviews,
      comparison: comparison.length ? comparison : fallback.comparison,
      related: related.length ? related : fallback.related,
    };
  } catch (error) {
    console.error("[dpr-cms] fetch failed", error);
    return fallback;
  }
}

export async function getAllDprCmsForAdmin(): Promise<DprCmsPayload> {
  const fallback = getDefaultDprCmsPayload();
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallback;

  try {
    const [
      settingsRes,
      sectionsRes,
      bannersRes,
      pricingRes,
      faqsRes,
      reviewsRes,
      comparisonRes,
      relatedRes,
    ] = await Promise.all([
      supabase.from("dpr_page_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("dpr_sections").select("*").order("sort_order", { ascending: true }),
      supabase.from("dpr_section_banners").select("*").order("sort_order", { ascending: true }),
      supabase.from("dpr_pricing_plans").select("*").order("sort_order", { ascending: true }),
      supabase.from("dpr_faqs").select("*").order("sort_order", { ascending: true }),
      supabase.from("dpr_reviews").select("*").order("sort_order", { ascending: true }),
      supabase.from("dpr_comparison_rows").select("*").order("sort_order", { ascending: true }),
      supabase.from("dpr_related_services").select("*").order("sort_order", { ascending: true }),
    ]);

    if (settingsRes.error?.message?.includes("does not exist")) {
      return fallback;
    }

    return {
      settings: mapSettings((settingsRes.data as Record<string, unknown> | null) ?? null, fallback.settings),
      sections: mergeSections(
        ((sectionsRes.data ?? []) as Record<string, unknown>[]).map(mapSection),
        fallback.sections,
      ),
      banners: ((bannersRes.data ?? []) as Record<string, unknown>[]).map(mapBanner),
      pricing: ((pricingRes.data ?? []) as Record<string, unknown>[]).map(mapPricing),
      faqs: ((faqsRes.data ?? []) as Record<string, unknown>[]).map(mapFaq),
      reviews: ((reviewsRes.data ?? []) as Record<string, unknown>[]).map(mapReview),
      comparison: ((comparisonRes.data ?? []) as Record<string, unknown>[]).map(mapComparison),
      related: ((relatedRes.data ?? []) as Record<string, unknown>[]).map(mapRelated),
    };
  } catch (error) {
    console.error("[dpr-cms] admin fetch failed", error);
    return fallback;
  }
}
