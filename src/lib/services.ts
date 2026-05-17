import { FileText, type LucideIcon } from "lucide-react";

import { safeCurrency } from "@/lib/admin-format";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getCategoryBySlug as getFallbackCategoryBySlug,
  getServiceBySlug as getFallbackServiceBySlug,
  getServicesByCategory as getFallbackServicesByCategory,
  serviceCategories as fallbackCategories,
  serviceIconMap,
  servicesData,
  type ServiceCategory,
  type ServiceItem,
} from "@/lib/services-data";

export type ServiceStatus = "draft" | "published" | "archived";

export type DbServiceCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbService = {
  id: string;
  category_id: string | null;
  category: string | null;
  title: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  overview: string | null;
  benefits: string[] | null;
  documents: string[] | null;
  process: string[] | null;
  base_price: number | null;
  sale_price: number | null;
  is_paid: boolean | null;
  is_featured: boolean | null;
  show_on_homepage: boolean | null;
  is_active: boolean | null;
  old_price: number | null;
  offer_price: number | null;
  price_label: string | null;
  cta_type: "apply" | "enquiry";
  badge: string | null;
  icon: string | null;
  hero_image_url: string | null;
  hero_image_storage_path: string | null;
  cta_primary_label: string | null;
  cta_primary_url: string | null;
  cta_secondary_label: string | null;
  cta_secondary_url: string | null;
  status: ServiceStatus;
  featured: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  blog_content: string | null;
  faqs: { question: string; answer: string }[] | null;
  reviews: { name: string; location: string; text: string }[] | null;
  created_at: string;
  updated_at: string;
  service_categories?: DbServiceCategory | null;
  service_sections?: DbServiceSection[] | null;
  service_media?: DbServiceMedia[] | null;
  service_faqs?: DbServiceFaq[] | null;
  service_documents_required?: DbServiceDocument[] | null;
  service_process_steps?: DbServiceProcessStep[] | null;
  service_testimonials?: DbServiceTestimonial[] | null;
};

export type AdminService = Omit<DbService, "category"> & {
  category?: DbServiceCategory | null;
  category_slug?: string | null;
};

export type ServiceSectionType =
  | "hero"
  | "overview"
  | "benefits"
  | "documents"
  | "process"
  | "faq"
  | "gallery"
  | "testimonials"
  | "pricing"
  | "stats"
  | "banner"
  | "rich_text"
  | "custom_html"
  | "video"
  | "trust_badges"
  | "offer_strip"
  | "contact_cta";

export type DbServiceSection = {
  id: string;
  service_id: string;
  section_type: ServiceSectionType;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown> | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type DbServiceMedia = {
  id: string;
  service_id: string;
  section_id: string | null;
  file_url: string;
  storage_path: string | null;
  alt_text: string | null;
  media_type: string | null;
  sort_order: number;
  created_at?: string;
};

export type DbServiceFaq = {
  id: string;
  service_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
};

export type DbServiceDocument = {
  id: string;
  service_id: string;
  document_name: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
};

export type DbServiceProcessStep = {
  id: string;
  service_id: string;
  step_title: string;
  step_description: string | null;
  step_icon: string | null;
  sort_order: number;
};

export type DbServiceTestimonial = {
  id: string;
  service_id: string;
  customer_name: string;
  review_text: string;
  rating: number;
  photo_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ServiceCategoryWithCount = ServiceCategory & {
  id?: string;
  sortOrder?: number;
  isActive?: boolean;
  serviceCount: number;
};

function jsonArray<T>(value: unknown, fallback: T[] = []) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return undefined;
  }

  return safeCurrency(value);
}

function iconByName(name?: string | null): LucideIcon {
  return (name && serviceIconMap[name]) || FileText;
}

function priceOverride(slug: string) {
  if (slug === "passport-assistance") {
    return { oldPrice: 6499, offerPrice: 2499 };
  }

  if (slug === "driving-licence") {
    return { oldPrice: 1999, offerPrice: 1099 };
  }

  return null;
}

function categorySlugFromService(service: DbService) {
  return service.category || service.service_categories?.slug || getFallbackServiceBySlug(service.slug)?.categorySlug || "services";
}

function activeServiceFilter(service: DbService) {
  return (service.is_active ?? service.status === "published") && service.status === "published";
}

const serviceSelect =
  "*, service_categories(*), service_sections(*), service_media(*), service_faqs(*), service_documents_required(*), service_process_steps(*), service_testimonials(*)";

function categoryFromDb(category: DbServiceCategory, services: DbService[] = []): ServiceCategoryWithCount {
  const fallback = getFallbackCategoryBySlug(category.slug);

  return {
    title: category.name,
    slug: category.slug,
    heading: fallback?.heading ?? `${category.name} Services`,
    description: category.description || fallback?.description || "",
    icon: fallback?.icon ?? FileText,
    featuredSlugs: services.filter((service) => service.is_featured ?? service.featured).map((service) => service.slug),
    id: category.id,
    sortOrder: category.sort_order,
    isActive: category.is_active,
    serviceCount: services.filter(activeServiceFilter).length,
  };
}

export function serviceFromDb(service: DbService): ServiceItem {
  const category = service.service_categories ?? undefined;
  const fallback = getFallbackServiceBySlug(service.slug);
  const override = priceOverride(service.slug);
  const baseAmount = Number(override?.oldPrice ?? service.base_price ?? service.old_price ?? service.sale_price ?? service.offer_price ?? 0);
  const saleAmount = Number(override?.offerPrice ?? service.sale_price ?? service.offer_price ?? service.base_price ?? service.old_price ?? 0);
  const isPaid = service.is_paid ?? saleAmount > 0;
  const offerPrice = isPaid ? formatPrice(saleAmount) : undefined;
  const oldPrice = isPaid ? formatPrice(baseAmount && baseAmount !== saleAmount ? baseAmount : service.old_price) : undefined;
  const childFaqs = (service.service_faqs ?? [])
    .filter((item) => item.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({ question: item.question, answer: item.answer }));
  const childDocuments = (service.service_documents_required ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => item.document_name);
  const childProcess = (service.service_process_steps ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => item.step_title);
  const childReviews = (service.service_testimonials ?? [])
    .filter((item) => item.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({ name: item.customer_name, location: "", text: item.review_text }));
  const priceLabel = isPaid ? service.price_label || offerPrice || fallback?.priceLabel || "Apply Now" : service.price_label || "Free";

  return {
    title: service.title,
    slug: service.slug,
    category: category?.name ?? fallback?.category ?? "Services",
    categorySlug: categorySlugFromService(service),
    shortDescription: service.short_description || fallback?.shortDescription || "",
    overview: service.full_description || service.overview || fallback?.overview || "",
    benefits: jsonArray<string>(service.benefits, fallback?.benefits ?? []),
    documents: childDocuments.length ? childDocuments : jsonArray<string>(service.documents, fallback?.documents ?? []),
    process: childProcess.length ? childProcess : jsonArray<string>(service.process, fallback?.process ?? []),
    oldPrice,
    offerPrice,
    priceLabel,
    amount: isPaid ? saleAmount : 0,
    ctaType: !isPaid || service.cta_type === "enquiry" ? "enquiry" : "apply",
    icon: iconByName(service.icon),
    badge: service.badge || fallback?.badge || (service.cta_type === "apply" ? "Limited Offer" : "Enquiry"),
    faqs: childFaqs.length ? childFaqs : jsonArray(service.faqs, fallback?.faqs ?? []),
    reviews: childReviews.length ? childReviews : jsonArray(service.reviews, fallback?.reviews ?? []),
    seoTitle: service.seo_title || fallback?.seoTitle || `${service.title} | DigiConnect Dukan`,
    seoDescription: service.seo_description || fallback?.seoDescription || service.short_description || "",
    seoKeywords: jsonArray<string>(service.seo_keywords, fallback?.seoKeywords ?? []),
    blogContent: service.blog_content || fallback?.blogContent || "",
  };
}

async function fetchPublishedServiceRows() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as DbService[];

  try {
    const { data, error } = await supabase
      .from("services")
      .select(serviceSelect)
      .eq("status", "published")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (error) {
      console.error("[services] published service lookup failed", error.message);
      return [];
    }

    return (data ?? []) as DbService[];
  } catch (error) {
    console.error("[services] published service lookup failed", error);
    return [];
  }
}

export async function hasDatabaseServices() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { count, error } = await supabase.from("services").select("id", { count: "exact", head: true });
    if (error) return false;
    return Boolean(count);
  } catch {
    return false;
  }
}

export async function getPublicServices() {
  const rows = await fetchPublishedServiceRows();
  if (rows.length) return rows.map(serviceFromDb);
  return (await hasDatabaseServices()) ? [] : servicesData;
}

export async function getPublicServiceBySlug(slug: string) {
  const aliases: Record<string, string> = {
    msme: "msme-certificate",
    "food-license": "food-license-fssai",
    passport: "passport-assistance",
  };
  const normalizedSlug = aliases[slug] ?? slug;
  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("services")
        .select(serviceSelect)
        .eq("slug", normalizedSlug)
        .eq("status", "published")
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) return serviceFromDb(data as DbService);
    } catch (error) {
      console.error("[services] service lookup failed", error);
    }
  }

  const shouldFallback = !(await hasDatabaseServices());
  return shouldFallback ? getFallbackServiceBySlug(normalizedSlug) ?? null : null;
}

export async function getPublicServiceRowBySlug(slug: string) {
  const aliases: Record<string, string> = {
    msme: "msme-certificate",
    "food-license": "food-license-fssai",
    passport: "passport-assistance",
  };
  const normalizedSlug = aliases[slug] ?? slug;
  const supabase = getSupabaseAdmin();

  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("services")
      .select(serviceSelect)
      .eq("slug", normalizedSlug)
      .eq("status", "published")
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("[services] service page lookup failed", error.message);
      return null;
    }

    return data as DbService | null;
  } catch (error) {
    console.error("[services] service page lookup failed", error);
    return null;
  }
}

export async function getPublicCategoriesWithCounts() {
  const rows = await fetchPublishedServiceRows();
  if (!rows.length) {
    if (await hasDatabaseServices()) return [];
    return fallbackCategories.map((category) => ({
      ...category,
      serviceCount: getFallbackServicesByCategory(category.slug).length,
    }));
  }

  const bySlug = new Map<string, { category: DbServiceCategory; services: DbService[] }>();
  rows.forEach((service) => {
    const category = service.service_categories;
    if (!category?.is_active) return;
    const current = bySlug.get(category.slug) ?? { category, services: [] };
    current.services.push(service);
    bySlug.set(category.slug, current);
  });

  return Array.from(bySlug.values())
    .map(({ category, services }) => categoryFromDb(category, services))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function getPublicCategoryBySlug(slug: string) {
  const categories = await getPublicCategoriesWithCounts();
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function getPublicServicesByCategory(slug: string) {
  const rows = await fetchPublishedServiceRows();
  if (!rows.length) return (await hasDatabaseServices()) ? [] : getFallbackServicesByCategory(slug);

  return rows
    .filter((service) => categorySlugFromService(service) === slug && (service.service_categories?.is_active ?? true))
    .map(serviceFromDb);
}

export async function getPublicFeaturedServices(categorySlug?: string) {
  const rows = await fetchPublishedServiceRows();
  if (!rows.length) {
    if (await hasDatabaseServices()) return [];
    if (categorySlug) {
      const fallbackCategory = getFallbackCategoryBySlug(categorySlug);
      return (fallbackCategory?.featuredSlugs ?? [])
        .map((slug) => getFallbackServiceBySlug(slug))
        .filter((service): service is ServiceItem => Boolean(service));
    }

    return ["gst-registration", "bike-insurance", "pmegp-loan", "passport-assistance", "mudra-loan"]
      .map((slug) => getFallbackServiceBySlug(slug))
      .filter((service): service is ServiceItem => Boolean(service));
  }

  return rows
    .filter((service) => service.slug !== "pan-card" && (service.is_featured ?? service.featured) && (!categorySlug || categorySlugFromService(service) === categorySlug))
    .map(serviceFromDb);
}

export async function getPublicHomepageServices(limit = 6) {
  const rows = await fetchPublishedServiceRows();
  if (!rows.length) {
    if (await hasDatabaseServices()) return [];
    return servicesData.slice(0, limit);
  }

  return rows
    .filter((service) => service.show_on_homepage || service.is_featured || service.featured)
    .sort((a, b) => Number(b.is_featured ?? b.featured) - Number(a.is_featured ?? a.featured) || a.sort_order - b.sort_order || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map(serviceFromDb);
}

export async function getAdminServiceCategories() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as DbServiceCategory[];

  try {
    const { data, error } = await supabase.from("service_categories").select("*").order("sort_order", { ascending: true }).order("name");
    if (error) return [] as DbServiceCategory[];
    return (data ?? []) as DbServiceCategory[];
  } catch (error) {
    console.error("[services] admin categories lookup failed", error);
    return [] as DbServiceCategory[];
  }
}

export async function getAdminServices() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as AdminService[];

  try {
    const { data, error } = await supabase.from("services").select(serviceSelect).order("sort_order").order("title");
    if (error) return [] as AdminService[];
    return (data ?? []).map((service) => ({
      ...(service as DbService),
      category: (service as DbService).service_categories,
      category_slug: (service as DbService).category,
    }));
  } catch (error) {
    console.error("[services] admin services lookup failed", error);
    return [] as AdminService[];
  }
}

export async function getAdminServiceById(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from("services").select(serviceSelect).eq("id", id).maybeSingle();
    if (error || !data) return null;

    return {
      ...(data as DbService),
      category: (data as DbService).service_categories,
      category_slug: (data as DbService).category,
    } as AdminService;
  } catch (error) {
    console.error("[services] admin service lookup failed", error);
    return null;
  }
}

export function getServiceSeedRows() {
  return servicesData.map((service, index) => ({
    title: service.title,
    slug: service.slug,
    category_slug: service.categorySlug,
    category: service.categorySlug,
    short_description: service.shortDescription,
    full_description: service.overview,
    overview: service.overview,
    benefits: service.benefits,
    documents: service.documents,
    process: service.process,
    old_price: service.oldPrice ? Number(service.oldPrice.replace(/[^\d]/g, "")) : null,
    offer_price: service.offerPrice ? Number(service.offerPrice.replace(/[^\d]/g, "")) : null,
    base_price: service.oldPrice ? Number(service.oldPrice.replace(/[^\d]/g, "")) : null,
    sale_price: service.offerPrice ? Number(service.offerPrice.replace(/[^\d]/g, "")) : null,
    is_paid: service.ctaType === "apply",
    price_label: service.priceLabel,
    cta_type: service.ctaType,
    badge: service.badge,
    icon: "FileText",
    status: "published" as const,
    featured: ["gst-registration", "bike-insurance", "pmegp-loan", "passport-assistance", "mudra-loan"].includes(service.slug),
    is_featured: ["gst-registration", "bike-insurance", "pmegp-loan", "passport-assistance", "mudra-loan"].includes(service.slug),
    show_on_homepage: ["gst-registration", "bike-insurance", "pmegp-loan", "passport-assistance", "mudra-loan"].includes(service.slug),
    is_active: true,
    sort_order: index + 1,
    seo_title: service.seoTitle,
    seo_description: service.seoDescription,
    seo_keywords: service.seoKeywords,
    blog_content: service.blogContent,
    faqs: service.faqs,
    reviews: service.reviews,
  }));
}
