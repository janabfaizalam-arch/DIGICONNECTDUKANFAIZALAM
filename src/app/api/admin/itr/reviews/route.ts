import { NextResponse } from "next/server";

import { getAllItrCmsForAdmin } from "@/lib/itr/cms";
import { jsonError, nullableText, parseSortOrder, readJsonBody, requireAdmin, revalidateItrPaths } from "@/lib/itr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
      profile_image_url: nullableText(body.profileImageUrl),
      rating,
      text,
      filing_category: nullableText(body.filingCategory),
      is_verified: Boolean(body.isVerified),
      is_demo: Boolean(body.isDemo),
      is_active: body.isActive !== false,
      sort_order: sortOrder,
    },
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const cms = await getAllItrCmsForAdmin();
  return NextResponse.json({ reviews: cms.reviews });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body) return jsonError("Invalid JSON body.", 400);

  const { error: payloadError, payload } = buildReviewPayload(body);
  if (payloadError || !payload) return jsonError(payloadError || "Invalid review.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { data, error } = await supabase.from("itr_reviews").insert(payload).select("*").single();
  if (error) return jsonError(error.message, 500);

  revalidateItrPaths();
  return NextResponse.json({ review: data, message: "Review created." });
}
