import { NextResponse } from "next/server";

import { jsonError, nullableText, parseSortOrder, readJsonBody, requireAdmin, revalidateDprPaths } from "@/lib/dpr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

function buildReviewPayload(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const text = String(body.text ?? "").trim();
  const rating = Number(body.rating ?? 5);
  const sortOrder = parseSortOrder(body.sortOrder);

  if (!name) return { error: "Name is required.", payload: null };
  if (!text) return { error: "Review text is required.", payload: null };
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5.", payload: null };
  }
  if (sortOrder == null) return { error: "Sort order must be a number.", payload: null };

  return {
    error: null,
    payload: {
      name,
      location: nullableText(body.location),
      rating,
      text,
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

  const { error: payloadError, payload } = buildReviewPayload(body);
  if (payloadError || !payload) return jsonError(payloadError || "Invalid review.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { data, error } = await supabase.from("dpr_reviews").update(payload).eq("id", id).select("*").maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Review not found.", 404);

  revalidateDprPaths();
  return NextResponse.json({ review: data, message: "Review updated." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { error } = await supabase.from("dpr_reviews").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  revalidateDprPaths();
  return NextResponse.json({ message: "Review deleted." });
}
