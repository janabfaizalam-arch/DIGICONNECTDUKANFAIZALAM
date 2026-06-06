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
  name?: string | null;
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
  if (slug === "passport" || slug === "passport-assistance") {
    return { oldPrice: 6499, offerPrice: 2499 };
  }

  if (slug === "learning-driving-license" || slug === "driving-licence") {
    return { oldPrice: 2499, offerPrice: 1499 };
  }

  if (slug === "cibil-report-increase" || slug === "cibil-report-analysis-and-credit-health-consultation" || slug === "cibil-credit-score-guidance") {
    return { oldPrice: 3200, offerPrice: 2600 };
  }

  if (slug === "eshram-card" || slug === "eshram-card-registration") {
    return { oldPrice: 149, offerPrice: 149 };
  }

  return null;
}

export const allowedPublicServiceSlugs = new Set([
  "pvc-card",
  "pmegp-loan",
  "mudra-loan",
  "pm-vishwakarma-yojana",
  "startup-india-assistance",
  "cm-yuva-entrepreneur-loan-assistance",
  "credit-cards",
  "saving-account-opening",
  "current-account-opening",
  "cibil-report-increase",
  "passport",
  "learning-driving-license",
  "voter-id",
  "eshram-card",
  "labour-card",
  "gst-registration-filing",
  "gst-registration",
  "gst-return-filing",
  "itr-filing",
  "private-limited-registration",
  "private-limited-compliance",
  "opc-registration",
  "dsc",
  "msme-registration",
  "iso-certification",
  "insurance"
]);

function categorySlugFromService(service: DbService) {
  const rawCat = service.category || service.service_categories?.slug || getFallbackServiceBySlug(service.slug)?.categorySlug || "services";
  const catAliases: Record<string, string> = {
    "tax-business": "tax",
    "finance-banking": "banking",
    "gov-id-form-submission": "licence",
    "digital-services": "cards",
  };
  return catAliases[rawCat] ?? rawCat;
}

function activeServiceFilter(service: DbService) {
  const aliases: Record<string, string> = {
    msme: "msme-registration",
    "msme-certificate": "msme-registration",
    "food-license": "insurance",
    "food-license-fssai": "insurance",
    passport: "passport",
    "passport-assistance": "passport",
    "pvc-card-printing": "pvc-card",
    "eshram-card-registration": "eshram-card",
    "labour-card-e-shram-card": "labour-card",
    "driving-licence": "learning-driving-license",
    "gst-registration-filing": "gst-registration",
    "cibil-report-analysis-and-credit-health-consultation": "cibil-report-increase",
    "cibil-credit-score-guidance": "cibil-report-increase",
    "credit-cards-all-banks": "credit-cards",
    "credit-cards---all-banks": "credit-cards",
    "savings-account-opening": "saving-account-opening",
    "savings-account": "saving-account-opening",
    "saving-account": "saving-account-opening",
    "bike-insurance": "insurance",
    "car-insurance": "insurance",
    "commercial-vehicle-insurance": "insurance",
    "insurance-renewal": "insurance",
  };
  const normalizedSlug = aliases[service.slug] ?? service.slug;
  return allowedPublicServiceSlugs.has(normalizedSlug) && (service.is_active ?? service.status === "published") && service.status === "published";
}

const serviceSelect =
  "*, service_sections(*), service_media(*), service_faqs(*), service_documents_required(*), service_process_steps(*), service_testimonials(*)";

const legacyServiceSelect = "*";
const serviceCatalogSelect = "id, slug, name, description, amount, commission_amount, required_documents, active, created_at, updated_at";

function isSchemaMismatch(error: { message?: string; code?: string } | null | undefined) {
  const message = String(error?.message ?? "").toLowerCase();
  return error?.code === "42703" || error?.code === "PGRST200" || message.includes("does not exist") || message.includes("relationship");
}

function normalizeServiceRow(row: Record<string, unknown>): DbService {
  const slug = String(row.slug ?? row.id ?? "");
  const fallback = getFallbackServiceBySlug(slug);
  const title = String(row.title ?? row.name ?? row.service_name ?? fallback?.title ?? slug.replace(/-/g, " "));
  const amount = Number(row.offer_price ?? row.sale_price ?? row.amount ?? 0);
  const active = row.is_active ?? row.active ?? (row.status ? row.status === "published" : true);

  return {
    ...row,
    id: String(row.id ?? slug),
    category_id: (row.category_id as string | null | undefined) ?? null,
    category: (row.category as string | null | undefined) ?? (row.category_slug as string | null | undefined) ?? fallback?.categorySlug ?? null,
    title,
    slug,
    short_description: (row.short_description as string | null | undefined) ?? (row.description as string | null | undefined) ?? fallback?.shortDescription ?? null,
    full_description: (row.full_description as string | null | undefined) ?? (row.description as string | null | undefined) ?? fallback?.overview ?? null,
    overview: (row.overview as string | null | undefined) ?? (row.description as string | null | undefined) ?? fallback?.overview ?? null,
    benefits: (row.benefits as string[] | null | undefined) ?? fallback?.benefits ?? null,
    documents: (row.documents as string[] | null | undefined) ?? (row.required_documents as string[] | null | undefined) ?? fallback?.documents ?? null,
    process: (row.process as string[] | null | undefined) ?? fallback?.process ?? null,
    base_price: (row.base_price as number | null | undefined) ?? (row.old_price as number | null | undefined) ?? amount,
    sale_price: (row.sale_price as number | null | undefined) ?? (row.offer_price as number | null | undefined) ?? amount,
    is_paid: (row.is_paid as boolean | null | undefined) ?? amount > 0,
    is_featured: (row.is_featured as boolean | null | undefined) ?? (row.featured as boolean | null | undefined) ?? false,
    show_on_homepage: (row.show_on_homepage as boolean | null | undefined) ?? false,
    is_active: Boolean(active),
    old_price: (row.old_price as number | null | undefined) ?? null,
    offer_price: (row.offer_price as number | null | undefined) ?? amount,
    price_label: (row.price_label as string | null | undefined) ?? null,
    cta_type: (row.cta_type as "apply" | "enquiry" | null | undefined) ?? (amount > 0 ? "apply" : "enquiry"),
    badge: (row.badge as string | null | undefined) ?? null,
    icon: (row.icon as string | null | undefined) ?? null,
    hero_image_url: (row.hero_image_url as string | null | undefined) ?? null,
    hero_image_storage_path: (row.hero_image_storage_path as string | null | undefined) ?? null,
    cta_primary_label: (row.cta_primary_label as string | null | undefined) ?? null,
    cta_primary_url: (row.cta_primary_url as string | null | undefined) ?? null,
    cta_secondary_label: (row.cta_secondary_label as string | null | undefined) ?? null,
    cta_secondary_url: (row.cta_secondary_url as string | null | undefined) ?? null,
    status: (row.status as ServiceStatus | null | undefined) ?? (active ? "published" : "draft"),
    featured: Boolean(row.featured ?? row.is_featured ?? false),
    sort_order: Number(row.sort_order ?? 0),
    seo_title: (row.seo_title as string | null | undefined) ?? null,
    seo_description: (row.seo_description as string | null | undefined) ?? null,
    seo_keywords: (row.seo_keywords as string[] | null | undefined) ?? null,
    blog_content: (row.blog_content as string | null | undefined) ?? null,
    faqs: (row.faqs as { question: string; answer: string }[] | null | undefined) ?? null,
    reviews: (row.reviews as { name: string; location: string; text: string }[] | null | undefined) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? row.created_at ?? ""),
  } as DbService;
}

async function fetchLegacyPublishedServiceRows() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [] as DbService[];

  const legacyResult = await supabase
    .from("services")
    .select(legacyServiceSelect)
    .eq("active", true)
    .order("name", { ascending: true });

  if (!legacyResult.error) {
    return (legacyResult.data ?? [])
      .map((row) => normalizeServiceRow(row as Record<string, unknown>))
      .filter((service) => allowedPublicServiceSlugs.has(service.slug));
  }

  if (!isSchemaMismatch(legacyResult.error)) {
    console.error("[services] legacy published service lookup failed", legacyResult.error.message);
  }

  const catalogResult = await supabase
    .from("service_catalog")
    .select(serviceCatalogSelect)
    .eq("active", true)
    .order("name", { ascending: true });

  if (catalogResult.error) {
    console.error("[services] service_catalog published lookup failed", catalogResult.error.message);
    return [];
  }

  return (catalogResult.data ?? [])
    .map((row) => normalizeServiceRow(row as Record<string, unknown>))
    .filter((service) => allowedPublicServiceSlugs.has(service.slug));
}

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

function categoryFromSlug(categorySlug: string, services: DbService[] = []): ServiceCategoryWithCount {
  const fallback = getFallbackCategoryBySlug(categorySlug);
  const categoryName = fallback?.title ?? categorySlug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  return {
    title: categoryName,
    slug: categorySlug,
    heading: fallback?.heading ?? `${categoryName} Services`,
    description: fallback?.description ?? "",
    icon: fallback?.icon ?? FileText,
    featuredSlugs: services.filter((service) => service.is_featured ?? service.featured).map((service) => service.slug),
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

  const item: ServiceItem = {
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

  if (item.slug === "pm-vishwakarma-yojana") {
    return {
      ...item,
      title: "PM Vishwakarma Yojana Registration",
      shortDescription: "PM Vishwakarma scheme registration assistance for eligible traditional artisans and skilled workers.",
      amount: 250,
      oldPrice: "₹499",
      offerPrice: "₹250",
      priceLabel: "₹250",
      ctaType: "apply",
      seoTitle: "PM Vishwakarma Yojana Registration | DigiConnect Dukan",
      seoDescription: "Apply for PM Vishwakarma Yojana with DigiConnect Dukan. Get assistance for registration, documents, toolkit incentive, training stipend, certificate, ID card and business support.",
      seoKeywords: ["PM Vishwakarma Yojana", "Vishwakarma Registration", "Toolkit Incentive", "Skill Training", "Artisan Scheme", "DigiConnect Dukan"],
    };
  }

  if (item.slug === "driving-licence") {
    return {
      ...item,
      amount: 1499,
      oldPrice: "₹2499",
      offerPrice: "₹1499",
      priceLabel: "₹1499",
      badge: "Save ₹1000",
      ctaType: "apply",
    };
  }

  if (item.slug === "cibil-report-analysis-and-credit-health-consultation" || item.slug === "cibil-credit-score-guidance") {
    return {
      ...item,
      title: "CIBIL Report Analysis & Credit Health Consultation",
      slug: "cibil-report-analysis-and-credit-health-consultation",
      shortDescription: "6-month TransUnion CIBIL membership with expert one page credit health analysis.",
      amount: 2600,
      oldPrice: "₹3200",
      offerPrice: "₹2600",
      priceLabel: "₹2600",
      badge: "Credit Health",
      ctaType: "apply",
      documents: ["Aadhaar", "PAN", "Mobile", "Email"],
      seoTitle: "CIBIL Report Analysis & Credit Health Consultation | DigiConnect Dukan",
      seoDescription: "Get 6-month TransUnion CIBIL membership assistance with expert one page CIBIL report analysis, credit health review, dispute guidance, and loan readiness consultation.",
      seoKeywords: ["CIBIL report analysis", "credit health consultation", "CIBIL membership", "credit score improvement", "loan readiness", "DigiConnect Dukan"],
    };
  }

  if (item.slug === "eshram-card-registration") {
    return {
      ...item,
      title: "e-Shram Card Registration Assistance",
      amount: 149,
      oldPrice: undefined,
      offerPrice: "₹149",
      priceLabel: "₹149",
      badge: "Quick Registration",
      ctaType: "apply",
      seoTitle: "e-Shram Card Registration Assistance | DigiConnect Dukan",
      seoDescription: "Get e-Shram registration assistance for eligibility check, document guidance, UAN generation, card download, and update support.",
      seoKeywords: ["e-Shram card registration", "e-Shram UAN card", "unorganised workers", "e-Shram download", "DigiConnect Dukan"],
    };
  }

  return item;
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
      .order("sort_order", { ascending: true });

    if (error) {
      if (isSchemaMismatch(error)) {
        return fetchLegacyPublishedServiceRows();
      }
      console.error("[services] published service lookup failed", error.message);
      return [];
    }

    return (data ?? []).map((row) => normalizeServiceRow(row as Record<string, unknown>));
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
  const dbServices = rows.filter(activeServiceFilter).map(serviceFromDb);
  const allowedFallbackServices = servicesData.filter((service) => allowedPublicServiceSlugs.has(service.slug));
  if (!dbServices.length) return allowedFallbackServices;

  const bySlug = new Map(allowedFallbackServices.map((service) => [service.slug, service]));
  dbServices.forEach((service) => bySlug.set(service.slug, service));
  return Array.from(bySlug.values());
}

export async function getPublicServiceBySlug(slug: string) {
  const aliases: Record<string, string> = {
    msme: "msme-registration",
    "msme-certificate": "msme-registration",
    "food-license": "insurance",
    "food-license-fssai": "insurance",
    passport: "passport",
    "passport-assistance": "passport",
    "pvc-card-printing": "pvc-card",
    "eshram-card-registration": "eshram-card",
    "labour-card-e-shram-card": "labour-card",
    "driving-licence": "learning-driving-license",
    "gst-registration-filing": "gst-registration",
    "cibil-report-analysis-and-credit-health-consultation": "cibil-report-increase",
    "cibil-credit-score-guidance": "cibil-report-increase",
    "credit-cards-all-banks": "credit-cards",
    "credit-cards---all-banks": "credit-cards",
    "savings-account-opening": "saving-account-opening",
    "savings-account": "saving-account-opening",
    "saving-account": "saving-account-opening",
    "bike-insurance": "insurance",
    "car-insurance": "insurance",
    "commercial-vehicle-insurance": "insurance",
    "insurance-renewal": "insurance",
  };
  const normalizedSlug = aliases[slug] ?? slug;
  if (!allowedPublicServiceSlugs.has(normalizedSlug)) return null;
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

      if (!error && data) return serviceFromDb(normalizeServiceRow(data as Record<string, unknown>));
      if (error && isSchemaMismatch(error)) {
        const rows = await fetchLegacyPublishedServiceRows();
        const service = rows.find((item) => item.slug === normalizedSlug);
        return service ? serviceFromDb(service) : null;
      }
    } catch (error) {
      console.error("[services] service lookup failed", error);
    }
  }

  return getFallbackServiceBySlug(normalizedSlug) ?? null;
}

export async function getPublicServiceRowBySlug(slug: string) {
  const aliases: Record<string, string> = {
    msme: "msme-registration",
    "msme-certificate": "msme-registration",
    "food-license": "insurance",
    "food-license-fssai": "insurance",
    passport: "passport",
    "passport-assistance": "passport",
    "pvc-card-printing": "pvc-card",
    "eshram-card-registration": "eshram-card",
    "labour-card-e-shram-card": "labour-card",
    "driving-licence": "learning-driving-license",
    "gst-registration-filing": "gst-registration",
    "cibil-report-analysis-and-credit-health-consultation": "cibil-report-increase",
    "cibil-credit-score-guidance": "cibil-report-increase",
    "credit-cards-all-banks": "credit-cards",
    "credit-cards---all-banks": "credit-cards",
    "savings-account-opening": "saving-account-opening",
    "savings-account": "saving-account-opening",
    "saving-account": "saving-account-opening",
    "bike-insurance": "insurance",
    "car-insurance": "insurance",
    "commercial-vehicle-insurance": "insurance",
    "insurance-renewal": "insurance",
  };
  const normalizedSlug = aliases[slug] ?? slug;
  if (!allowedPublicServiceSlugs.has(normalizedSlug)) return null;
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
      if (isSchemaMismatch(error)) {
        const rows = await fetchLegacyPublishedServiceRows();
        return rows.find((service) => service.slug === normalizedSlug) ?? null;
      }
      console.error("[services] service page lookup failed", error.message);
      return null;
    }

    return data ? normalizeServiceRow(data as Record<string, unknown>) : null;
  } catch (error) {
    console.error("[services] service page lookup failed", error);
    return null;
  }
}

export async function getPublicCategoriesWithCounts() {
  const rows = await fetchPublishedServiceRows();
  if (!rows.length) {
    return fallbackCategories.map((category) => ({
      ...category,
      serviceCount: getFallbackServicesByCategory(category.slug).length,
    }));
  }

  const bySlug = new Map<string, { category: DbServiceCategory; services: DbService[] }>();
  const byCanonicalSlug = new Map<string, DbService[]>();
  rows.forEach((service) => {
    const category = service.service_categories;
    if (category?.is_active) {
      const current = bySlug.get(category.slug) ?? { category, services: [] };
      current.services.push(service);
      bySlug.set(category.slug, current);
      return;
    }

    const canonicalSlug = categorySlugFromService(service);
    const current = byCanonicalSlug.get(canonicalSlug) ?? [];
    current.push(service);
    byCanonicalSlug.set(canonicalSlug, current);
  });

  return [
    ...Array.from(bySlug.values()).map(({ category, services }) => categoryFromDb(category, services)),
    ...Array.from(byCanonicalSlug.entries()).map(([slug, services]) => categoryFromSlug(slug, services)),
  ]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function getPublicCategoryBySlug(slug: string) {
  const categories = await getPublicCategoriesWithCounts();
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function getPublicServicesByCategory(slug: string) {
  const rows = await fetchPublishedServiceRows();
  if (!rows.length) return getFallbackServicesByCategory(slug);

  return rows
    .filter((service) => activeServiceFilter(service) && categorySlugFromService(service) === slug && (service.service_categories?.is_active ?? true))
    .map(serviceFromDb);
}

export async function getPublicFeaturedServices(categorySlug?: string) {
  const rows = await fetchPublishedServiceRows();
  if (!rows.length) {
    if (categorySlug) {
      const fallbackCategory = getFallbackCategoryBySlug(categorySlug);
      return (fallbackCategory?.featuredSlugs ?? [])
        .map((slug) => getFallbackServiceBySlug(slug))
        .filter((service): service is ServiceItem => Boolean(service));
    }

    return ["gst-registration", "bike-insurance", "pmegp-loan", "passport-assistance", "cibil-report-analysis-and-credit-health-consultation"]
      .map((slug) => getFallbackServiceBySlug(slug))
      .filter((service): service is ServiceItem => Boolean(service));
  }

  return rows
    .filter((service) => activeServiceFilter(service) && (service.is_featured ?? service.featured) && (!categorySlug || categorySlugFromService(service) === categorySlug))
    .map(serviceFromDb);
}

export async function getPublicHomepageServices(limit = 6) {
  const rows = await fetchPublishedServiceRows();
  if (!rows.length) {
    return ["gst-registration", "itr-filing", "msme-certificate", "passport-assistance", "mudra-loan", "cibil-report-analysis-and-credit-health-consultation"]
      .map((slug) => getFallbackServiceBySlug(slug))
      .filter((service): service is ServiceItem => Boolean(service))
      .slice(0, limit);
  }

  const homepageServices = rows
    .filter((service) => activeServiceFilter(service) && (service.show_on_homepage || service.is_featured || service.featured))
    .sort((a, b) => Number(b.is_featured ?? b.featured) - Number(a.is_featured ?? a.featured) || a.sort_order - b.sort_order || a.title.localeCompare(b.title))
    .map(serviceFromDb);
  const cibil = rows.find((service) => service.slug === "cibil-report-analysis-and-credit-health-consultation");
  const cibilService = cibil ? serviceFromDb(cibil) : getFallbackServiceBySlug("cibil-report-analysis-and-credit-health-consultation");
  const nextServices = homepageServices.filter((service) => service.slug !== "cibil-report-analysis-and-credit-health-consultation");

  if (cibilService) {
    nextServices.unshift(cibilService);
  }

  return nextServices.slice(0, limit);
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
    const { data, error } = await supabase.from("services").select(serviceSelect).order("sort_order");
    if (error) return [] as AdminService[];
    return (data ?? []).map((row) => {
      const service = normalizeServiceRow(row as Record<string, unknown>);
      return {
        ...service,
        category: service.service_categories,
        category_slug: service.category,
      };
    });
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
    featured: ["gst-registration", "bike-insurance", "pmegp-loan", "passport-assistance", "cibil-report-analysis-and-credit-health-consultation"].includes(service.slug),
    is_featured: ["gst-registration", "bike-insurance", "pmegp-loan", "passport-assistance", "cibil-report-analysis-and-credit-health-consultation"].includes(service.slug),
    show_on_homepage: ["gst-registration", "bike-insurance", "pmegp-loan", "passport-assistance", "cibil-report-analysis-and-credit-health-consultation"].includes(service.slug),
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
