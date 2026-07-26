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

function buildDocumentPayload(body: Record<string, unknown>) {
  const categoryKey = String(body.categoryKey ?? "").trim();
  const categoryLabel = String(body.categoryLabel ?? "").trim();
  const documentKey = String(body.documentKey ?? "").trim();
  const documentLabel = String(body.documentLabel ?? "").trim();
  const sortOrder = parseSortOrder(body.sortOrder);

  if (!categoryKey) return { error: "Category key is required.", payload: null };
  if (!categoryLabel) return { error: "Category label is required.", payload: null };
  if (!documentKey) return { error: "Document key is required.", payload: null };
  if (!documentLabel) return { error: "Document label is required.", payload: null };
  if (sortOrder == null) return { error: "Sort order must be a number.", payload: null };

  return {
    error: null,
    payload: {
      category_key: categoryKey,
      category_label: categoryLabel,
      document_key: documentKey,
      document_label: documentLabel,
      taxpayer_profiles: parseStringArray(body.taxpayerProfiles),
      income_sources: parseStringArray(body.incomeSources),
      required_default: Boolean(body.requiredDefault),
      help_text: nullableText(body.helpText),
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

  const { error: payloadError, payload } = buildDocumentPayload(body);
  if (payloadError || !payload) return jsonError(payloadError || "Invalid document item.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { data, error } = await supabase
    .from("itr_document_checklist")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Document item not found.", 404);

  revalidateItrPaths();
  return NextResponse.json({ document: data, message: "Document item updated." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { error } = await supabase.from("itr_document_checklist").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  revalidateItrPaths();
  return NextResponse.json({ message: "Document item deleted." });
}
