import { NextResponse } from "next/server";

import { getAllItrCmsForAdmin } from "@/lib/itr/cms";
import { jsonError, nullableText, parseSortOrder, readJsonBody, requireAdmin, revalidateItrPaths } from "@/lib/itr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const cms = await getAllItrCmsForAdmin();
  return NextResponse.json({ comparison: cms.comparison });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body) return jsonError("Invalid JSON body.", 400);

  const { error: payloadError, payload } = buildComparisonPayload(body);
  if (payloadError || !payload) return jsonError(payloadError || "Invalid comparison row.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { data, error } = await supabase.from("itr_comparison_rows").insert(payload).select("*").single();
  if (error) return jsonError(error.message, 500);

  revalidateItrPaths();
  return NextResponse.json({ row: data, message: "Comparison row created." });
}
