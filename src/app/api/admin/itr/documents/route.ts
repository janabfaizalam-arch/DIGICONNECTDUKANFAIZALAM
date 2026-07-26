import { NextResponse } from "next/server";

import { getAllItrCmsForAdmin } from "@/lib/itr/cms";
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

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const cms = await getAllItrCmsForAdmin();
  return NextResponse.json({ documents: cms.documents });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body) return jsonError("Invalid JSON body.", 400);

  const { error: payloadError, payload } = buildDocumentPayload(body);
  if (payloadError || !payload) return jsonError(payloadError || "Invalid document item.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { data, error } = await supabase.from("itr_document_checklist").insert(payload).select("*").single();
  if (error) return jsonError(error.message, 500);

  revalidateItrPaths();
  return NextResponse.json({ document: data, message: "Document item created." });
}
