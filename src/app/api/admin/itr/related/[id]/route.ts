import { NextResponse } from "next/server";

import { jsonError, nullableText, parseSortOrder, readJsonBody, requireAdmin, revalidateItrPaths } from "@/lib/itr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

function buildRelatedPayload(body: Record<string, unknown>) {
  const serviceSlug = String(body.serviceSlug ?? "").trim();
  const sortOrder = parseSortOrder(body.sortOrder);

  if (!serviceSlug) return { error: "Service slug is required.", payload: null };
  if (sortOrder == null) return { error: "Sort order must be a number.", payload: null };

  return {
    error: null,
    payload: {
      service_slug: serviceSlug,
      title: nullableText(body.title),
      description: nullableText(body.description),
      is_active: body.isActive !== false,
      sort_order: sortOrder,
    },
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body) return jsonError("Invalid JSON body.", 400);

  const { error: payloadError, payload } = buildRelatedPayload(body);
  if (payloadError || !payload) return jsonError(payloadError || "Invalid related service.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { data, error } = await supabase
    .from("itr_related_services")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Related service not found.", 404);

  revalidateItrPaths();
  return NextResponse.json({ item: data, message: "Related service updated." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { error } = await supabase.from("itr_related_services").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  revalidateItrPaths();
  return NextResponse.json({ message: "Related service deleted." });
}
