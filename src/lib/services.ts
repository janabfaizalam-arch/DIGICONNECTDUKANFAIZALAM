import { FileText, type LucideIcon } from "lucide-react";

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
  title: string;
  slug: string;
  short_description: string | null;
  overview: string | null;
  benefits: string[] | null;
  documents: string[] | null;
  process: string[] | null;
  old_price: number | null;
  offer_price: number | null;
  price_label: string | null;
  cta_type: "apply" | "enquiry";
  badge: string | null;
  icon: string | null;
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
};

export type AdminService = DbService & {
  category?: DbServiceCategory | null;
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

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function iconByName(name?: string | null): LucideIcon {
  return (name && serviceIconMap[name]) || FileText;
}

function categoryFromDb(category: DbServiceCategory, services: DbService[] = []): ServiceCategoryWithCount {
  const fallback = getFallbackCategoryBySlug(category.slug);

  return {
    title: category.name,
    slug: category.slug,
    heading: fallback?.heading ?? `${category.name} Services`,
    description: category.description || fallback?.description || "",
    icon: fallback?.icon ?? FileText,
    featuredSlugs: services.filter((service) => service.featured).map((service) => service.slug),
    id: category.id,
    sortOrder: category.sort_order,
    isActive: category.is_active,
    serviceCount: services.filter((service) => service.status === "published").length,
  };
}

export function serviceFromDb(service: DbService): ServiceItem {
  const category = service.service_categories ?? undefined;
  const fallback = getFallbackServiceBySlug(service.slug);
  const offerPrice = formatPrice(service.offer_price);
  const oldPrice = formatPrice(service.old_price);
  const priceLabel = service.price_label || offerPrice || fallback?.priceLabel || "Enquiry Now";

  return {
    title: service.title,
    slug: service.slug,
    category: category?.name ?? fallback?.category ?? "Services",
    categorySlug: category?.slug ?? fallback?.categorySlug ?? "services",
    shortDescription: service.short_description || fallback?.shortDescription || "",
    overview: service.overview || fallback?.overview || "",
    benefits: jsonArray<string>(service.benefits, fallback?.benefits ?? []),
    documents: jsonArray<string>(service.documents, fallback?.documents ?? []),
    process: jsonArray<string>(service.process, fallback?.process ?? []),
    oldPrice,
    offerPrice,
    priceLabel,
    amount: Number(service.offer_price ?? 0),
    ctaType: service.cta_type === "enquiry" ? "enquiry" : "apply",
    icon: iconByName(service.icon),
    badge: service.badge || fallback?.badge || (service.cta_type === "apply" ? "Limited Offer" : "Enquiry"),
    faqs: jsonArray(service.faqs, fallback?.faqs ?? []),
    reviews: jsonArray(service.reviews, fallback?.reviews ?? []),
    seoTitle: service.seo_title || fallback?.seoTitle || `${service.title} | DigiConnect Dukan`,
    seoDescription: service.seo_description || fallback?.seoDescription || service.short_description || "",
    seoKeywords: jsonArray<string>(service.seo_keywords, fallback?.seoKeywords ?? []),
    blogContent: service.blog_content || fallback?.blogContent || "",
  };
}

async function fetchPublishedServiceRows() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as DbService[];

  const { data, error } = await supabase
    .from("services")
    .select("*, service_categories(*)")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    console.error("[services] published service lookup failed", error.message);
    return [];
  }

  return (data ?? []) as DbService[];
}

export async function hasDatabaseServices() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { count, error } = await supabase.from("services").select("id", { count: "exact", head: true });
  if (error) return false;
  return Boolean(count);
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
    const { data } = await supabase
      .from("services")
      .select("*, service_categories(*)")
      .eq("slug", normalizedSlug)
      .eq("status", "published")
      .maybeSingle();

    if (data) return serviceFromDb(data as DbService);
  }

  const shouldFallback = !(await hasDatabaseServices());
  return shouldFallback ? getFallbackServiceBySlug(normalizedSlug) ?? null : null;
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
    .filter((service) => service.service_categories?.slug === slug && service.service_categories?.is_active)
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

    return ["gst-registration", "bike-insurance", "pmegp-loan", "pan-card", "passport-assistance", "mudra-loan"]
      .map((slug) => getFallbackServiceBySlug(slug))
      .filter((service): service is ServiceItem => Boolean(service));
  }

  return rows
    .filter((service) => service.featured && (!categorySlug || service.service_categories?.slug === categorySlug))
    .map(serviceFromDb);
}

export async function getAdminServiceCategories() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as DbServiceCategory[];

  const { data } = await supabase.from("service_categories").select("*").order("sort_order", { ascending: true }).order("name");
  return (data ?? []) as DbServiceCategory[];
}

export async function getAdminServices() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as AdminService[];

  const { data } = await supabase.from("services").select("*, service_categories(*)").order("sort_order").order("title");
  return (data ?? []).map((service) => ({
    ...(service as DbService),
    category: (service as DbService).service_categories,
  }));
}

export async function getAdminServiceById(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase.from("services").select("*, service_categories(*)").eq("id", id).maybeSingle();
  if (!data) return null;

  return {
    ...(data as DbService),
    category: (data as DbService).service_categories,
  } as AdminService;
}

export function getServiceSeedRows() {
  return servicesData.map((service, index) => ({
    title: service.title,
    slug: service.slug,
    category_slug: service.categorySlug,
    short_description: service.shortDescription,
    overview: service.overview,
    benefits: service.benefits,
    documents: service.documents,
    process: service.process,
    old_price: service.oldPrice ? Number(service.oldPrice.replace(/[^\d]/g, "")) : null,
    offer_price: service.offerPrice ? Number(service.offerPrice.replace(/[^\d]/g, "")) : null,
    price_label: service.priceLabel,
    cta_type: service.ctaType,
    badge: service.badge,
    icon: "FileText",
    status: "published" as const,
    featured: ["gst-registration", "bike-insurance", "pmegp-loan", "pan-card", "passport-assistance", "mudra-loan"].includes(service.slug),
    sort_order: index + 1,
    seo_title: service.seoTitle,
    seo_description: service.seoDescription,
    seo_keywords: service.seoKeywords,
    blog_content: service.blogContent,
    faqs: service.faqs,
    reviews: service.reviews,
  }));
}
