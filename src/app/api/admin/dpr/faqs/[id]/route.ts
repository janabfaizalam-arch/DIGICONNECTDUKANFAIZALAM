import { NextResponse } from "next/server";

import { jsonError, parseSortOrder, readJsonBody, requireAdmin, revalidateDprPaths } from "@/lib/dpr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

function buildFaqPayload(body: Record<string, unknown>) {
  const question = String(body.question ?? "").trim();
  const answer = String(body.answer ?? "").trim();
  const sortOrder = parseSortOrder(body.sortOrder);

  if (!question) return { error: "Question is required.", payload: null };
  if (!answer) return { error: "Answer is required.", payload: null };
  if (sortOrder == null) return { error: "Sort order must be a number.", payload: null };

  return {
    error: null,
    payload: {
      question,
      answer,
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

  const { error: payloadError, payload } = buildFaqPayload(body);
  if (payloadError || !payload) return jsonError(payloadError || "Invalid FAQ.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { data, error } = await supabase.from("dpr_faqs").update(payload).eq("id", id).select("*").maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("FAQ not found.", 404);

  revalidateDprPaths();
  return NextResponse.json({ faq: data, message: "FAQ updated." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { error } = await supabase.from("dpr_faqs").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  revalidateDprPaths();
  return NextResponse.json({ message: "FAQ deleted." });
}
