import { NextResponse } from "next/server";

import { getAllDprCmsForAdmin } from "@/lib/dpr/cms";
import { jsonError, nullableText, parseSortOrder, readJsonBody, requireAdmin, revalidateDprPaths } from "@/lib/dpr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const cms = await getAllDprCmsForAdmin();
  return NextResponse.json({ related: cms.related });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body) return jsonError("Invalid JSON body.", 400);

  const { error: payloadError, payload } = buildRelatedPayload(body);
  if (payloadError || !payload) return jsonError(payloadError || "Invalid related service.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { data, error } = await supabase.from("dpr_related_services").insert(payload).select("*").single();
  if (error) return jsonError(error.message, 500);

  revalidateDprPaths();
  return NextResponse.json({ item: data, message: "Related service created." });
}
