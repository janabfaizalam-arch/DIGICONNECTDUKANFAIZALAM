import { NextResponse } from "next/server";

import { jsonError, nullableText, parseSortOrder, readJsonBody, requireAdmin, revalidateItrPaths } from "@/lib/itr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

function buildComparisonPayload(body: Record<string, unknown>) {
  const feature = String(body.feature ?? "").trim();
  const sortOrder = parseSortOrder(body.sortOrder);

  if (!feature) return { error: "Feature is required.", payload: null };
  if (sortOrder == null) return { error: "Sort order must be a number.", payload: null };

  return {
    error: null,
    payload: {
      feature,
      form_code: nullableText(body.formCode),
      typical_taxpayer: nullableText(body.typicalTaxpayer),
      common_sources: nullableText(body.commonSources),
      common_exclusions: nullableText(body.commonExclusions),
      complexity: nullableText(body.complexity),
      suggested_package: nullableText(body.suggestedPackage),
      digiconnect: nullableText(body.digiconnect),
      self_filing: nullableText(body.selfFiling),
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

  const { error: payloadError, payload } = buildComparisonPayload(body);
  if (payloadError || !payload) return jsonError(payloadError || "Invalid comparison row.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { data, error } = await supabase
    .from("itr_comparison_rows")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Comparison row not found.", 404);

  revalidateItrPaths();
  return NextResponse.json({ row: data, message: "Comparison row updated." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { error } = await supabase.from("itr_comparison_rows").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  revalidateItrPaths();
  return NextResponse.json({ message: "Comparison row deleted." });
}
