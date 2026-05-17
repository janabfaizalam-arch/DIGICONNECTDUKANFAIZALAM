import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { revalidateServicePaths } from "@/lib/service-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  return null;
}

function withoutIds<T extends Record<string, unknown>>(row: T, overrides: Record<string, unknown> = {}) {
  const skipKeys = new Set([
    "id",
    "created_at",
    "updated_at",
    "service_categories",
    "service_sections",
    "service_faqs",
    "service_documents_required",
    "service_process_steps",
    "service_testimonials",
  ]);
  const rest = Object.fromEntries(Object.entries(row).filter(([key]) => !skipKeys.has(key)));
  return { ...rest, ...overrides };
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const { id } = await params;
  const { data: service, error } = await supabase
    .from("services")
    .select("*, service_sections(*), service_faqs(*), service_documents_required(*), service_process_steps(*), service_testimonials(*)")
    .eq("id", id)
    .maybeSingle();

  if (error || !service) return NextResponse.json({ message: error?.message ?? "Service not found." }, { status: 404 });

  const copySlug = `${service.slug}-copy-${Date.now().toString(36)}`;
  const { data: copied, error: copyError } = await supabase
    .from("services")
    .insert(withoutIds(service, {
      title: `${service.title} Copy`,
      slug: copySlug,
      status: "draft",
      is_active: false,
      featured: false,
      is_featured: false,
      show_on_homepage: false,
      updated_at: new Date().toISOString(),
    }))
    .select("id, slug")
    .single();

  if (copyError || !copied) return NextResponse.json({ message: copyError?.message ?? "Service could not be duplicated." }, { status: 500 });

  const relationCopies = [
    ["service_sections", service.service_sections],
    ["service_faqs", service.service_faqs],
    ["service_documents_required", service.service_documents_required],
    ["service_process_steps", service.service_process_steps],
    ["service_testimonials", service.service_testimonials],
  ] as const;

  for (const [table, rows] of relationCopies) {
    if (Array.isArray(rows) && rows.length) {
      const { error: relationError } = await supabase.from(table).insert(rows.map((row) => withoutIds(row, { service_id: copied.id })));
      if (relationError) return NextResponse.json({ message: relationError.message }, { status: 500 });
    }
  }

  revalidateServicePaths(copied.slug);
  return NextResponse.json({ message: "Service duplicated.", serviceId: copied.id });
}
