import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ServiceSectionType } from "@/lib/services";

export function slugifyService(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

function parseJsonArray<T>(value: FormDataEntryValue | null, fallback: T[] = []) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").replace(/[^\d.]/g, "");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function parseBoolean(value: FormDataEntryValue | null) {
  return String(value ?? "") === "true" || String(value ?? "") === "on";
}

export type ServiceSectionInput = {
  id?: string;
  section_type: ServiceSectionType;
  title?: string;
  subtitle?: string;
  content?: Record<string, unknown>;
  sort_order?: number;
  is_active?: boolean;
};

function normalizeSections(value: FormDataEntryValue | null): ServiceSectionInput[] {
  return parseJsonArray<ServiceSectionInput>(value)
    .filter((section) => section?.section_type)
    .map((section, index) => ({
      section_type: section.section_type,
      title: String(section.title ?? "").trim(),
      subtitle: String(section.subtitle ?? "").trim(),
      content: typeof section.content === "object" && section.content !== null ? section.content : {},
      sort_order: Number.isFinite(Number(section.sort_order)) ? Number(section.sort_order) : (index + 1) * 10,
      is_active: section.is_active !== false,
    }));
}

export function servicePayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = slugifyService(String(formData.get("slug") ?? title));
  const basePrice = parseNumber(formData.get("basePrice")) ?? parseNumber(formData.get("oldPrice")) ?? 0;
  const salePrice = parseNumber(formData.get("salePrice")) ?? parseNumber(formData.get("offerPrice"));
  const status = parseBoolean(formData.get("isActive")) || String(formData.get("status") ?? "draft") === "published" ? "published" : "draft";
  const isPaid = parseBoolean(formData.get("isPaid"));

  return {
    category_id: String(formData.get("categoryId") ?? "").trim() || null,
    category: String(formData.get("categorySlug") ?? "").trim() || null,
    title,
    slug,
    short_description: String(formData.get("shortDescription") ?? "").trim(),
    full_description: String(formData.get("fullDescription") ?? formData.get("overview") ?? "").trim(),
    overview: String(formData.get("overview") ?? "").trim(),
    benefits: parseJsonArray<string>(formData.get("benefits")),
    documents: parseJsonArray<string>(formData.get("documents")),
    process: parseJsonArray<string>(formData.get("process")),
    base_price: basePrice,
    sale_price: salePrice,
    is_paid: isPaid,
    is_featured: parseBoolean(formData.get("isFeatured")) || parseBoolean(formData.get("featured")),
    show_on_homepage: parseBoolean(formData.get("showOnHomepage")),
    is_active: status === "published",
    old_price: basePrice,
    offer_price: salePrice,
    price_label: String(formData.get("priceLabel") ?? "").trim(),
    cta_type: !isPaid || String(formData.get("ctaType") ?? "apply") === "enquiry" ? "enquiry" : "apply",
    badge: String(formData.get("badge") ?? "").trim(),
    icon: String(formData.get("icon") ?? "FileText").trim() || "FileText",
    status,
    featured: parseBoolean(formData.get("isFeatured")) || parseBoolean(formData.get("featured")),
    hero_image_url: String(formData.get("heroImageUrl") ?? "").trim() || null,
    hero_image_storage_path: String(formData.get("heroImageStoragePath") ?? "").trim() || null,
    cta_primary_label: String(formData.get("ctaPrimaryLabel") ?? "").trim() || (isPaid ? "Apply Now" : "Enquiry Now"),
    cta_primary_url: String(formData.get("ctaPrimaryUrl") ?? "").trim() || (isPaid ? `/apply/${slug}` : null),
    cta_secondary_label: String(formData.get("ctaSecondaryLabel") ?? "").trim() || "WhatsApp",
    cta_secondary_url: String(formData.get("ctaSecondaryUrl") ?? "").trim() || null,
    sort_order: Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10) || 0,
    seo_title: String(formData.get("seoTitle") ?? "").trim(),
    seo_description: String(formData.get("seoDescription") ?? "").trim(),
    seo_keywords: parseJsonArray<string>(formData.get("seoKeywords")),
    blog_content: String(formData.get("blogContent") ?? "").trim(),
    faqs: parseJsonArray<{ question: string; answer: string }>(formData.get("faqs")),
    reviews: parseJsonArray<{ name: string; location: string; text: string }>(formData.get("reviews")),
  };
}

export function serviceSectionsPayload(formData: FormData) {
  return normalizeSections(formData.get("sections"));
}

export async function syncServiceBuilderRows(supabase: SupabaseClient, serviceId: string, formData: FormData) {
  const sections = serviceSectionsPayload(formData);
  const benefits = parseJsonArray<string>(formData.get("benefits")).map((item) => item.trim()).filter(Boolean);
  const documents = parseJsonArray<string>(formData.get("documents")).map((item) => item.trim()).filter(Boolean);
  const process = parseJsonArray<string>(formData.get("process")).map((item) => item.trim()).filter(Boolean);
  const faqs = parseJsonArray<{ question: string; answer: string }>(formData.get("faqs")).filter((item) => item.question?.trim() && item.answer?.trim());
  const reviews = parseJsonArray<{ name: string; location?: string; text: string }>(formData.get("reviews")).filter((item) => item.name?.trim() && item.text?.trim());

  await Promise.all([
    supabase.from("service_sections").delete().eq("service_id", serviceId),
    supabase.from("service_faqs").delete().eq("service_id", serviceId),
    supabase.from("service_documents_required").delete().eq("service_id", serviceId),
    supabase.from("service_process_steps").delete().eq("service_id", serviceId),
    supabase.from("service_testimonials").delete().eq("service_id", serviceId),
  ]);

  if (sections.length) {
    const { error } = await supabase.from("service_sections").insert(
      sections.map((section) => ({
        service_id: serviceId,
        section_type: section.section_type,
        title: section.title || null,
        subtitle: section.subtitle || null,
        content: section.content ?? {},
        sort_order: section.sort_order ?? 0,
        is_active: section.is_active !== false,
      })),
    );
    if (error) throw error;
  }

  if (faqs.length) {
    const { error } = await supabase.from("service_faqs").insert(
      faqs.map((faq, index) => ({
        service_id: serviceId,
        question: faq.question.trim(),
        answer: faq.answer.trim(),
        sort_order: index + 1,
        is_active: true,
      })),
    );
    if (error) throw error;
  }

  if (documents.length) {
    const { error } = await supabase.from("service_documents_required").insert(
      documents.map((document, index) => ({
        service_id: serviceId,
        document_name: document,
        is_required: true,
        sort_order: index + 1,
      })),
    );
    if (error) throw error;
  }

  if (process.length) {
    const { error } = await supabase.from("service_process_steps").insert(
      process.map((step, index) => ({
        service_id: serviceId,
        step_title: step,
        step_description: "Our team guides you and shares status updates through dashboard, call, or WhatsApp.",
        sort_order: index + 1,
      })),
    );
    if (error) throw error;
  }

  if (reviews.length) {
    const { error } = await supabase.from("service_testimonials").insert(
      reviews.map((review, index) => ({
        service_id: serviceId,
        customer_name: review.name.trim(),
        review_text: review.text.trim(),
        rating: 5,
        sort_order: index + 1,
        is_active: true,
      })),
    );
    if (error) throw error;
  }

  if (!sections.length) {
    const starterSections = [
      { section_type: "overview", title: "Overview", content: { text: String(formData.get("overview") ?? "") }, sort_order: 20 },
      { section_type: "benefits", title: "Benefits", content: { items: benefits }, sort_order: 30 },
      { section_type: "documents", title: "Documents Required", content: { items: documents }, sort_order: 40 },
      { section_type: "process", title: "Process", content: { items: process }, sort_order: 50 },
      { section_type: "faq", title: "FAQ", content: { items: faqs }, sort_order: 60 },
    ] satisfies ServiceSectionInput[];
    const activeStarterSections = starterSections.filter((section) => {
      const content = section.content ?? {};
      return Boolean((content.text as string | undefined)?.trim()) || Boolean((content.items as unknown[] | undefined)?.length);
    });

    if (activeStarterSections.length) {
      const { error } = await supabase.from("service_sections").insert(
        activeStarterSections.map((section) => ({
          service_id: serviceId,
          section_type: section.section_type,
          title: section.title,
          content: section.content,
          sort_order: section.sort_order,
          is_active: true,
        })),
      );
      if (error) throw error;
    }
  }
}

export function revalidateServicePaths(slug?: string) {
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/admin/services");
  if (slug) {
    revalidatePath(`/services/${slug}`);
    revalidatePath(`/apply/${slug}`);
  }
}

export function getChangesDiff(oldRow: Record<string, unknown>, newRow: Record<string, unknown>) {
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(newRow)) {
    if (key === "updated_at" || key === "created_at" || key === "id") continue;
    const oldVal = oldRow[key];
    const newVal = newRow[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }
  return diff;
}

export async function writeServiceAuditLog(
  supabase: SupabaseClient,
  serviceId: string,
  userId: string,
  action: string,
  changes: Record<string, unknown> = {}
) {
  const { error } = await supabase.from("service_audit_logs").insert({
    service_id: serviceId,
    user_id: userId,
    action,
    changes,
  });
  if (error) {
    console.error("[service_audit_logs] Failed to write log", error);
  }
}

export async function syncServiceCatalogAndAgentPortal(
  supabase: SupabaseClient,
  serviceSlug: string,
  payload: {
    title: string;
    description: string;
    category?: string | null;
    customer_fee: number;
    agent_payout: number;
    payout_type: "fixed" | "percentage";
    payout_percentage: number;
    required_documents: string[];
    is_active: boolean;
    sort_order: number;
  }
) {
  // 1. Sync with service_catalog
  const catalogPayload = {
    slug: serviceSlug,
    name: payload.title,
    description: payload.description || "",
    amount: payload.customer_fee,
    commission_amount: payload.agent_payout,
    commission_rate: payload.payout_type === "percentage" ? payload.payout_percentage : null,
    required_documents: payload.required_documents,
    active: payload.is_active,
    updated_at: new Date().toISOString(),
  };

  const { data: catalogData, error: catalogError } = await supabase
    .from("service_catalog")
    .upsert(catalogPayload, { onConflict: "slug" })
    .select("id")
    .maybeSingle();

  if (catalogError) {
    console.error("[sync] service_catalog sync failed", catalogError);
    throw catalogError;
  }

  const catalogId = catalogData?.id;

  // 2. Sync with agent_services
  const agentServicePayload = {
    service_id: catalogId || null,
    slug: serviceSlug,
    title: payload.title,
    description: payload.description || "",
    category: payload.category || "services",
    customer_fee: payload.customer_fee,
    agent_payout: payload.agent_payout,
    payout_type: payload.payout_type,
    payout_percentage: payload.payout_percentage,
    required_documents: payload.required_documents.join("\n"),
    is_active: payload.is_active,
    sort_order: payload.sort_order,
    updated_at: new Date().toISOString(),
  };

  const { error: agentError } = await supabase
    .from("agent_services")
    .upsert(agentServicePayload, { onConflict: "slug" });

  if (agentError) {
    console.error("[sync] agent_services sync failed", agentError);
    throw agentError;
  }
}

