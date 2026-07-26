import { NextResponse } from "next/server";

import { jsonError, parseSortOrder, readJsonBody, requireAdmin, revalidateDprPaths } from "@/lib/dpr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

function buildComparisonPayload(body: Record<string, unknown>) {
  const feature = String(body.feature ?? "").trim();
  const digiconnect = String(body.digiconnect ?? "").trim();
  const others = String(body.others ?? "").trim();
  const sortOrder = parseSortOrder(body.sortOrder);

  if (!feature) return { error: "Feature is required.", payload: null };
  if (!digiconnect) return { error: "DigiConnect value is required.", payload: null };
  if (!others) return { error: "Others value is required.", payload: null };
  if (sortOrder == null) return { error: "Sort order must be a number.", payload: null };

  return {
    error: null,
    payload: {
      feature,
      digiconnect,
      others,
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
    .from("dpr_comparison_rows")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Comparison row not found.", 404);

  revalidateDprPaths();
  return NextResponse.json({ row: data, message: "Comparison row updated." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { error } = await supabase.from("dpr_comparison_rows").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  revalidateDprPaths();
  return NextResponse.json({ message: "Comparison row deleted." });
}
