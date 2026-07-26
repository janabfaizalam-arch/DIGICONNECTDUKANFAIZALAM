import { NextResponse } from "next/server";

import { getAllDprCmsForAdmin } from "@/lib/dpr/cms";
import { jsonError, nullableText, parseSortOrder, readJsonBody, requireAdmin, revalidateDprPaths } from "@/lib/dpr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function buildPricingPayload(body: Record<string, unknown>) {
  const planKey = String(body.planKey ?? "").trim();
  const name = String(body.name ?? "").trim();
  const price = Number(body.price);
  const sortOrder = parseSortOrder(body.sortOrder);

  if (!planKey) return { error: "Plan key is required.", payload: null };
  if (!name) return { error: "Plan name is required.", payload: null };
  if (!Number.isFinite(price) || price < 0) return { error: "Price must be a valid number.", payload: null };
  if (sortOrder == null) return { error: "Sort order must be a number.", payload: null };

  const features = Array.isArray(body.features)
    ? body.features.map(String).filter(Boolean)
    : String(body.features ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

  return {
    error: null,
    payload: {
      plan_key: planKey,
      name,
      price,
      old_price: body.oldPrice == null || body.oldPrice === "" ? null : Number(body.oldPrice),
      description: nullableText(body.description),
      features,
      is_featured: Boolean(body.isFeatured),
      is_active: body.isActive !== false,
      sort_order: sortOrder,
      cta_label: nullableText(body.ctaLabel),
    },
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const cms = await getAllDprCmsForAdmin();
  return NextResponse.json({ pricing: cms.pricing });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body) return jsonError("Invalid JSON body.", 400);

  const { error: payloadError, payload } = buildPricingPayload(body);
  if (payloadError || !payload) return jsonError(payloadError || "Invalid pricing plan.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { data, error } = await supabase.from("dpr_pricing_plans").insert(payload).select("*").single();
  if (error) return jsonError(error.message, 500);

  revalidateDprPaths();
  return NextResponse.json({ plan: data, message: "Pricing plan created." });
}
