import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { toApplyFields, type ApplyField, type ServiceFieldRow } from "@/lib/apply/fields";

/**
 * The extra questions a set of services asks.
 *
 * Read from `service_fields`, the table the admin service editor already
 * writes — so what an administrator configures on the Fields tab is what the
 * customer is asked, with no second place to keep in step.
 *
 * The flow lets somebody file several services in one application, so the form
 * asks for the union of their fields. Where two services declare the same key
 * — a PAN, an assessment year — it is asked once, in the order the services
 * were chosen.
 *
 * Every failure resolves to "no extra fields": a missing column, an
 * unreachable database, a malformed row. The base form still submits, which is
 * the behaviour that matters — a configuration problem must not stop somebody
 * applying.
 */
export async function getApplyFieldsForSlugs(slugs: string[]): Promise<ApplyField[]> {
  const wanted = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
  if (!wanted.length) return [];

  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id, slug")
      .in("slug", wanted);

    if (servicesError || !services?.length) return [];

    const { data: rows, error: fieldsError } = await supabase
      .from("service_fields")
      .select("service_id, field_key, label, field_type, sort_order, validation_chains, options, placeholder, help_text")
      .in("service_id", services.map((service) => service.id))
      .order("sort_order", { ascending: true });

    if (fieldsError || !rows?.length) return [];

    const byService = new Map<string, ServiceFieldRow[]>();
    for (const row of rows) {
      const key = String((row as { service_id?: unknown }).service_id ?? "");
      const list = byService.get(key);
      if (list) list.push(row as ServiceFieldRow);
      else byService.set(key, [row as ServiceFieldRow]);
    }

    // Walk the services in the order they were asked for, not the order the
    // database happened to return them.
    const idBySlug = new Map(services.map((service) => [String(service.slug), String(service.id)]));
    const ordered: ServiceFieldRow[] = [];
    for (const slug of wanted) {
      const id = idBySlug.get(slug);
      if (id) ordered.push(...(byService.get(id) ?? []));
    }

    return toApplyFields(ordered);
  } catch {
    return [];
  }
}
