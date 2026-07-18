import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SERVICES, getServiceBySlug, type ServiceItem } from "@/lib/services-data";

export type PublicService = ServiceItem & {
  id?: string;
  active?: boolean;
};

export async function listPublicServices(): Promise<PublicService[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return SERVICES.map((service) => ({ ...service, active: true }));
  }

  const { data, error } = await supabase
    .from("services")
    .select("id, slug, name, short_description, amount, documents, benefits, active, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    return SERVICES.map((service) => ({ ...service, active: true }));
  }

  return data.map((row) => ({
    id: row.id as string,
    title: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    shortDescription: String(row.short_description ?? ""),
    amount: Number(row.amount ?? 0),
    documents: Array.isArray(row.documents) ? (row.documents as string[]) : [],
    benefits: Array.isArray(row.benefits) ? (row.benefits as string[]) : [],
    active: Boolean(row.active),
  }));
}

export async function getPublicServiceBySlug(slug: string): Promise<PublicService | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return getServiceBySlug(slug);
  }

  const { data } = await supabase
    .from("services")
    .select("id, slug, name, short_description, description, amount, documents, benefits, active")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) {
    return getServiceBySlug(slug);
  }

  return {
    id: data.id as string,
    title: String(data.name ?? ""),
    slug: String(data.slug ?? ""),
    shortDescription: String(data.short_description ?? data.description ?? ""),
    amount: Number(data.amount ?? 0),
    documents: Array.isArray(data.documents) ? (data.documents as string[]) : [],
    benefits: Array.isArray(data.benefits) ? (data.benefits as string[]) : [],
    active: Boolean(data.active),
  };
}
