import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isSuperAdminRole } from "@/lib/auth";
import { revalidateServicePaths } from "@/lib/service-admin";
import { servicesData } from "@/lib/services-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isSuperAdminRole(role)) return NextResponse.json({ message: "Super admin access required." }, { status: 403 });
  return null;
}

function amountFromPrice(value?: string) {
  const amount = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

function servicePayload(service: (typeof servicesData)[number], index: number) {
  const basePrice = amountFromPrice(service.oldPrice) ?? service.amount ?? 0;
  const salePrice = amountFromPrice(service.offerPrice) ?? service.amount ?? null;
  const isPaid = service.ctaType === "apply" && Number(salePrice ?? basePrice) > 0;
  const featuredSlugs = new Set(["gst-registration", "bike-insurance", "pmegp-loan", "passport-assistance", "mudra-loan"]);

  return {
    title: service.title,
    slug: service.slug,
    category: service.categorySlug,
    short_description: service.shortDescription,
    full_description: service.overview,
    overview: service.overview,
    benefits: service.benefits,
    documents: service.documents,
    process: service.process,
    base_price: basePrice,
    sale_price: salePrice,
    old_price: basePrice,
    offer_price: salePrice,
    is_paid: isPaid,
    cta_type: isPaid ? "apply" : "enquiry",
    price_label: service.priceLabel,
    badge: service.badge,
    icon: "FileText",
    status: "published",
    is_active: true,
    featured: featuredSlugs.has(service.slug),
    is_featured: featuredSlugs.has(service.slug),
    show_on_homepage: featuredSlugs.has(service.slug),
    sort_order: index + 1,
    seo_title: service.seoTitle,
    seo_description: service.seoDescription,
    seo_keywords: service.seoKeywords,
    blog_content: service.blogContent,
    faqs: service.faqs,
    reviews: service.reviews,
    cta_primary_label: isPaid ? "Apply Now" : "Enquiry Now",
    cta_primary_url: isPaid ? `/apply/${service.slug}` : null,
    cta_secondary_label: "WhatsApp",
  };
}

function sectionRows(serviceId: string, service: (typeof servicesData)[number]) {
  return [
    {
      service_id: serviceId,
      section_type: "overview",
      title: "Overview",
      content: { text: service.overview },
      sort_order: 20,
      is_active: true,
    },
    {
      service_id: serviceId,
      section_type: "benefits",
      title: "Benefits",
      content: { items: service.benefits },
      sort_order: 30,
      is_active: service.benefits.length > 0,
    },
    {
      service_id: serviceId,
      section_type: "documents",
      title: "Documents Required",
      content: { items: service.documents },
      sort_order: 40,
      is_active: service.documents.length > 0,
    },
    {
      service_id: serviceId,
      section_type: "process",
      title: "Process",
      content: { items: service.process },
      sort_order: 50,
      is_active: service.process.length > 0,
    },
    {
      service_id: serviceId,
      section_type: "faq",
      title: "FAQ",
      content: { items: service.faqs },
      sort_order: 60,
      is_active: service.faqs.length > 0,
    },
    {
      service_id: serviceId,
      section_type: "rich_text",
      title: `Complete Guide for ${service.title}`,
      content: { text: service.blogContent },
      sort_order: 70,
      is_active: Boolean(service.blogContent),
    },
  ];
}

export async function POST() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const legacyServices = servicesData;
  const slugs = legacyServices.map((service) => service.slug);
  const { data: existingRows, error: existingError } = await supabase.from("services").select("id, slug").in("slug", slugs);
  if (existingError) return NextResponse.json({ message: existingError.message }, { status: 500 });

  const existingBySlug = new Map((existingRows ?? []).map((row) => [String(row.slug), String(row.id)]));
  const rows = legacyServices.map(servicePayload);
  const { data: upsertedRows, error: upsertError } = await supabase
    .from("services")
    .upsert(rows, { onConflict: "slug" })
    .select("id, slug");

  if (upsertError || !upsertedRows?.length) {
    return NextResponse.json({ message: upsertError?.message ?? "Existing services could not be imported." }, { status: 500 });
  }

  const serviceIdBySlug = new Map(upsertedRows.map((row) => [String(row.slug), String(row.id)]));
  const serviceIds = upsertedRows.map((row) => row.id);

  await Promise.all([
    supabase.from("service_sections").delete().in("service_id", serviceIds),
    supabase.from("service_faqs").delete().in("service_id", serviceIds),
    supabase.from("service_documents_required").delete().in("service_id", serviceIds),
    supabase.from("service_process_steps").delete().in("service_id", serviceIds),
  ]);

  const sections = legacyServices.flatMap((service) => {
    const serviceId = serviceIdBySlug.get(service.slug);
    return serviceId ? sectionRows(serviceId, service) : [];
  });
  const faqs = legacyServices.flatMap((service) => {
    const serviceId = serviceIdBySlug.get(service.slug);
    return serviceId
      ? service.faqs.map((faq, index) => ({
          service_id: serviceId,
          question: faq.question,
          answer: faq.answer,
          sort_order: index + 1,
          is_active: true,
        }))
      : [];
  });
  const documents = legacyServices.flatMap((service) => {
    const serviceId = serviceIdBySlug.get(service.slug);
    return serviceId
      ? service.documents.map((document, index) => ({
          service_id: serviceId,
          document_name: document,
          is_required: true,
          sort_order: index + 1,
        }))
      : [];
  });
  const processSteps = legacyServices.flatMap((service) => {
    const serviceId = serviceIdBySlug.get(service.slug);
    return serviceId
      ? service.process.map((step, index) => ({
          service_id: serviceId,
          step_title: step,
          step_description: "Our team guides you and shares status updates through dashboard, call, or WhatsApp.",
          sort_order: index + 1,
        }))
      : [];
  });

  for (const [table, tableRows] of [
    ["service_sections", sections],
    ["service_faqs", faqs],
    ["service_documents_required", documents],
    ["service_process_steps", processSteps],
  ] as const) {
    if (!tableRows.length) continue;
    const { error } = await supabase.from(table).insert(tableRows);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  }

  revalidateServicePaths();
  return NextResponse.json({
    message: `Imported ${legacyServices.length} existing services. ${legacyServices.length - existingBySlug.size} created, ${existingBySlug.size} updated.`,
    found: legacyServices.length,
    imported: legacyServices.length - existingBySlug.size,
    updated: existingBySlug.size,
  });
}
