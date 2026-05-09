import { revalidatePath } from "next/cache";

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

export function servicePayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = slugifyService(String(formData.get("slug") ?? title));

  return {
    category_id: String(formData.get("categoryId") ?? "").trim() || null,
    title,
    slug,
    short_description: String(formData.get("shortDescription") ?? "").trim(),
    overview: String(formData.get("overview") ?? "").trim(),
    benefits: parseJsonArray<string>(formData.get("benefits")),
    documents: parseJsonArray<string>(formData.get("documents")),
    process: parseJsonArray<string>(formData.get("process")),
    old_price: parseNumber(formData.get("oldPrice")),
    offer_price: parseNumber(formData.get("offerPrice")),
    price_label: String(formData.get("priceLabel") ?? "").trim(),
    cta_type: String(formData.get("ctaType") ?? "apply") === "enquiry" ? "enquiry" : "apply",
    badge: String(formData.get("badge") ?? "").trim(),
    icon: String(formData.get("icon") ?? "FileText").trim() || "FileText",
    status: String(formData.get("status") ?? "draft") === "published" ? "published" : "draft",
    featured: String(formData.get("featured") ?? "") === "true",
    sort_order: Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10) || 0,
    seo_title: String(formData.get("seoTitle") ?? "").trim(),
    seo_description: String(formData.get("seoDescription") ?? "").trim(),
    seo_keywords: parseJsonArray<string>(formData.get("seoKeywords")),
    blog_content: String(formData.get("blogContent") ?? "").trim(),
    faqs: parseJsonArray<{ question: string; answer: string }>(formData.get("faqs")),
    reviews: parseJsonArray<{ name: string; location: string; text: string }>(formData.get("reviews")),
  };
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
