import { getDefaultItrCmsPayload } from "@/lib/itr/defaults";
import type {
  ItrBanner,
  ItrCmsPayload,
  ItrComparisonRow,
  ItrDocumentItem,
  ItrFaq,
  ItrPageSettings,
  ItrPricingPlan,
  ItrRelatedService,
  ItrReview,
  ItrSection,
} from "@/lib/itr/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function asStringArray(value: unknown): string[] {
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

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function mapSettings(row: Record<string, unknown> | null, fallback: ItrPageSettings): ItrPageSettings {
  if (!row) return fallback;
  return {
    serviceName: String(row.service_name ?? fallback.serviceName),
    shortName: String(row.short_name ?? fallback.shortName),
    assessmentYear: String(row.assessment_year ?? fallback.assessmentYear),
    filingOpenNotice: (row.filing_open_notice as string | null) ?? fallback.filingOpenNotice,
    startingPrice: Number(row.starting_price ?? fallback.startingPrice),
    heroHeading: (row.hero_heading as string | null) ?? fallback.heroHeading,
    heroDescription: (row.hero_description as string | null) ?? fallback.heroDescription,
    primaryCtaLabel: String(row.primary_cta_label ?? fallback.primaryCtaLabel),
    primaryCtaUrl: String(row.primary_cta_url ?? fallback.primaryCtaUrl),
    secondaryCtaLabel: (row.secondary_cta_label as string | null) ?? fallback.secondaryCtaLabel,
    secondaryCtaUrl: (row.secondary_cta_url as string | null) ?? fallback.secondaryCtaUrl,
    supportCtaLabel: (row.support_cta_label as string | null) ?? fallback.supportCtaLabel,
    supportCtaUrl: (row.support_cta_url as string | null) ?? fallback.supportCtaUrl,
    estimatedTurnaround: (row.estimated_turnaround as string | null) ?? fallback.estimatedTurnaround,
    stickyCtaEnabled: row.sticky_cta_enabled != null ? Boolean(row.sticky_cta_enabled) : fallback.stickyCtaEnabled,
    stickyCtaLabel: String(row.sticky_cta_label ?? fallback.stickyCtaLabel),
    stickyCtaUrl: String(row.sticky_cta_url ?? fallback.stickyCtaUrl),
    videoUrl: (row.video_url as string | null) ?? null,
    whatsappNumber: String(row.whatsapp_number ?? fallback.whatsappNumber),
    supportPhone: String(row.support_phone ?? fallback.supportPhone),
    defaultPlanId: String(row.default_plan_id ?? fallback.defaultPlanId),
    isPublished: row.is_published != null ? Boolean(row.is_published) : fallback.isPublished,
    metaTitle: (row.meta_title as string | null) ?? fallback.metaTitle,
    metaDescription: (row.meta_description as string | null) ?? fallback.metaDescription,
    metaKeywords: (row.meta_keywords as string | null) ?? fallback.metaKeywords,
    ogTitle: (row.og_title as string | null) ?? fallback.ogTitle,
    ogDescription: (row.og_description as string | null) ?? fallback.ogDescription,
    ogImageUrl: (row.og_image_url as string | null) ?? fallback.ogImageUrl,
    twitterImageUrl: (row.twitter_image_url as string | null) ?? fallback.twitterImageUrl,
    robotsIndex: row.robots_index != null ? Boolean(row.robots_index) : fallback.robotsIndex,
    pricingDisclaimer: (row.pricing_disclaimer as string | null) ?? fallback.pricingDisclaimer,
    finalQuoteDisclaimer: (row.final_quote_disclaimer as string | null) ?? fallback.finalQuoteDisclaimer,
    taxLiabilityDisclaimer: (row.tax_liability_disclaimer as string | null) ?? fallback.taxLiabilityDisclaimer,
    refundDisclaimer: (row.refund_disclaimer as string | null) ?? fallback.refundDisclaimer,
    customerDeclaration: (row.customer_declaration as string | null) ?? fallback.customerDeclaration,
  };
}

function mapSection(row: Record<string, unknown>): ItrSection {
  return {
    id: String(row.id ?? ""),
    sectionKey: String(row.section_key ?? ""),
    enabled: Boolean(row.enabled ?? true),
    sortOrder: Number(row.sort_order ?? 0),
    heading: (row.heading as string | null) ?? null,
    subheading: (row.subheading as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    content: asObject(row.content),
    layoutStyle: (row.layout_style as string | null) ?? "default",
    ctaLabel: (row.cta_label as string | null) ?? null,
    ctaUrl: (row.cta_url as string | null) ?? null,
    animationType: (row.animation_type as string | null) ?? "fade-up",
  };
}

function mapBanner(row: Record<string, unknown>): ItrBanner {
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
    badgeText: (row.badge_text as string | null) ?? null,
    textAlignment: (row.text_alignment as string | null) ?? "left",
    overlayStrength: Number(row.overlay_strength ?? 0.35),
    startAt: (row.start_at as string | null) ?? null,
    endAt: (row.end_at as string | null) ?? null,
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapPricing(row: Record<string, unknown>): ItrPricingPlan {
  return {
    id: String(row.id ?? ""),
    planKey: String(row.plan_key ?? ""),
    name: String(row.name ?? ""),
    price: Number(row.price ?? 0),
    oldPrice: row.old_price == null ? null : Number(row.old_price),
    description: (row.description as string | null) ?? null,
    features: asStringArray(row.features),
    eligibleProfiles: asStringArray(row.eligible_profiles),
    complexityNotes: (row.complexity_notes as string | null) ?? null,
    isFeatured: Boolean(row.is_featured ?? false),
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
    ctaLabel: (row.cta_label as string | null) ?? null,
  };
}

function mapFaq(row: Record<string, unknown>): ItrFaq {
  return {
    id: String(row.id ?? ""),
    question: String(row.question ?? ""),
    answer: String(row.answer ?? ""),
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapReview(row: Record<string, unknown>): ItrReview {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    location: (row.location as string | null) ?? null,
    profileImageUrl: (row.profile_image_url as string | null) ?? null,
    rating: Number(row.rating ?? 5),
    text: String(row.text ?? ""),
    filingCategory: (row.filing_category as string | null) ?? null,
    isVerified: Boolean(row.is_verified ?? false),
    isDemo: Boolean(row.is_demo ?? false),
    isActive: Boolean(row.is_active ?? false),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapComparison(row: Record<string, unknown>): ItrComparisonRow {
  return {
    id: String(row.id ?? ""),
    feature: String(row.feature ?? ""),
    formCode: (row.form_code as string | null) ?? null,
    typicalTaxpayer: (row.typical_taxpayer as string | null) ?? null,
    commonSources: (row.common_sources as string | null) ?? null,
    commonExclusions: (row.common_exclusions as string | null) ?? null,
    complexity: (row.complexity as string | null) ?? null,
    suggestedPackage: (row.suggested_package as string | null) ?? null,
    digiconnect: (row.digiconnect as string | null) ?? null,
    selfFiling: (row.self_filing as string | null) ?? null,
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapRelated(row: Record<string, unknown>): ItrRelatedService {
  return {
    id: String(row.id ?? ""),
    serviceSlug: String(row.service_slug ?? ""),
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapDocument(row: Record<string, unknown>): ItrDocumentItem {
  return {
    id: String(row.id ?? ""),
    categoryKey: String(row.category_key ?? ""),
    categoryLabel: String(row.category_label ?? ""),
    documentKey: String(row.document_key ?? ""),
    documentLabel: String(row.document_label ?? ""),
    taxpayerProfiles: asStringArray(row.taxpayer_profiles),
    incomeSources: asStringArray(row.income_sources),
    requiredDefault: Boolean(row.required_default ?? false),
    helpText: (row.help_text as string | null) ?? null,
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mergeSections(dbSections: ItrSection[], defaults: ItrSection[]): ItrSection[] {
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
    if (!merged.some((s) => s.sectionKey === section.sectionKey)) merged.push(section);
  }
  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
}

async function fetchPayload(includeInactive: boolean): Promise<ItrCmsPayload> {
  const fallback = getDefaultItrCmsPayload();
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallback;

  try {
    const pricingQuery = includeInactive
      ? supabase.from("itr_pricing_plans").select("*").order("sort_order", { ascending: true })
      : supabase.from("itr_pricing_plans").select("*").eq("is_active", true).order("sort_order", { ascending: true });
    const faqQuery = includeInactive
      ? supabase.from("itr_faqs").select("*").order("sort_order", { ascending: true })
      : supabase.from("itr_faqs").select("*").eq("is_active", true).order("sort_order", { ascending: true });
    const reviewQuery = includeInactive
      ? supabase.from("itr_reviews").select("*").order("sort_order", { ascending: true })
      : supabase
          .from("itr_reviews")
          .select("*")
          .eq("is_active", true)
          .eq("is_demo", false)
          .order("sort_order", { ascending: true });
    const comparisonQuery = includeInactive
      ? supabase.from("itr_comparison_rows").select("*").order("sort_order", { ascending: true })
      : supabase.from("itr_comparison_rows").select("*").eq("is_active", true).order("sort_order", { ascending: true });
    const relatedQuery = includeInactive
      ? supabase.from("itr_related_services").select("*").order("sort_order", { ascending: true })
      : supabase.from("itr_related_services").select("*").eq("is_active", true).order("sort_order", { ascending: true });
    const docsQuery = includeInactive
      ? supabase.from("itr_document_checklist").select("*").order("sort_order", { ascending: true })
      : supabase.from("itr_document_checklist").select("*").eq("is_active", true).order("sort_order", { ascending: true });
    const bannersQuery = includeInactive
      ? supabase.from("itr_section_banners").select("*").order("sort_order", { ascending: true })
      : supabase.from("itr_section_banners").select("*").eq("is_active", true).order("sort_order", { ascending: true });

    const [
      settingsRes,
      sectionsRes,
      bannersRes,
      pricingRes,
      faqsRes,
      reviewsRes,
      comparisonRes,
      relatedRes,
      docsRes,
    ] = await Promise.all([
      supabase.from("itr_page_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("itr_sections").select("*").order("sort_order", { ascending: true }),
      bannersQuery,
      pricingQuery,
      faqQuery,
      reviewQuery,
      comparisonQuery,
      relatedQuery,
      docsQuery,
    ]);

    if (settingsRes.error?.message?.includes("does not exist")) return fallback;

    return {
      settings: mapSettings((settingsRes.data as Record<string, unknown> | null) ?? null, fallback.settings),
      sections: mergeSections(
        ((sectionsRes.data ?? []) as Record<string, unknown>[]).map(mapSection),
        fallback.sections,
      ),
      banners: ((bannersRes.data ?? []) as Record<string, unknown>[]).map(mapBanner),
      pricing: ((pricingRes.data ?? []) as Record<string, unknown>[]).map(mapPricing).length
        ? ((pricingRes.data ?? []) as Record<string, unknown>[]).map(mapPricing)
        : fallback.pricing,
      faqs: ((faqsRes.data ?? []) as Record<string, unknown>[]).map(mapFaq).length
        ? ((faqsRes.data ?? []) as Record<string, unknown>[]).map(mapFaq)
        : fallback.faqs,
      reviews: ((reviewsRes.data ?? []) as Record<string, unknown>[]).map(mapReview),
      comparison: ((comparisonRes.data ?? []) as Record<string, unknown>[]).map(mapComparison).length
        ? ((comparisonRes.data ?? []) as Record<string, unknown>[]).map(mapComparison)
        : fallback.comparison,
      related: ((relatedRes.data ?? []) as Record<string, unknown>[]).map(mapRelated).length
        ? ((relatedRes.data ?? []) as Record<string, unknown>[]).map(mapRelated)
        : fallback.related,
      documents: ((docsRes.data ?? []) as Record<string, unknown>[]).map(mapDocument).length
        ? ((docsRes.data ?? []) as Record<string, unknown>[]).map(mapDocument)
        : fallback.documents,
    };
  } catch (error) {
    console.error("[itr-cms] fetch failed", error);
    return fallback;
  }
}

export async function getItrCmsPayload(): Promise<ItrCmsPayload> {
  return fetchPayload(false);
}

export async function getAllItrCmsForAdmin(): Promise<ItrCmsPayload> {
  return fetchPayload(true);
}
