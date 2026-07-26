import { NextResponse } from "next/server";

import {
  jsonError,
  nullableText,
  parseSortOrder,
  parseStringArray,
  readJsonBody,
  requireAdmin,
  revalidateItrPaths,
} from "@/lib/itr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

function buildPricingPayload(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const price = Number(body.price);
  const sortOrder = parseSortOrder(body.sortOrder);

  if (!name) return { error: "Plan name is required.", payload: null };
  if (!Number.isFinite(price) || price < 0) return { error: "Price must be a valid number.", payload: null };
  if (sortOrder == null) return { error: "Sort order must be a number.", payload: null };

  const payload: Record<string, unknown> = {
    name,
    price,
    old_price: body.oldPrice == null || body.oldPrice === "" ? null : Number(body.oldPrice),
    description: nullableText(body.description),
    features: parseStringArray(body.features),
    eligible_profiles: parseStringArray(body.eligibleProfiles),
    complexity_notes: nullableText(body.complexityNotes),
    is_featured: Boolean(body.isFeatured),
    is_active: body.isActive !== false,
    sort_order: sortOrder,
    cta_label: nullableText(body.ctaLabel),
  };

  if (body.planKey) payload.plan_key = String(body.planKey).trim();

  return { error: null, payload };
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body) return jsonError("Invalid JSON body.", 400);

  const { error: payloadError, payload } = buildPricingPayload(body);
  if (payloadError || !payload) return jsonError(payloadError || "Invalid pricing plan.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { data, error } = await supabase
    .from("itr_pricing_plans")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Pricing plan not found.", 404);

  revalidateItrPaths();
  return NextResponse.json({ plan: data, message: "Pricing plan updated." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { error } = await supabase.from("itr_pricing_plans").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  revalidateItrPaths();
  return NextResponse.json({ message: "Pricing plan deleted." });
}
