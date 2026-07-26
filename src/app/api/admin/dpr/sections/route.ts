import { NextResponse } from "next/server";

import { getAllDprCmsForAdmin } from "@/lib/dpr/cms";
import { isValidCtaUrl, jsonError, readJsonBody, requireAdmin, revalidateDprPaths } from "@/lib/dpr/admin-api";
import type { DprSection } from "@/lib/dpr/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const cms = await getAllDprCmsForAdmin();
  return NextResponse.json({ sections: cms.sections });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJsonBody<{ sections?: DprSection[] }>(request);
  if (!body?.sections?.length) return jsonError("sections array is required.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  for (const section of body.sections) {
    const sectionKey = String(section.sectionKey ?? "").trim();
    if (!sectionKey) return jsonError("Each section must have a sectionKey.", 400);

    const ctaUrl = section.ctaUrl ?? null;
    if (!isValidCtaUrl(ctaUrl)) {
      return jsonError(`Invalid CTA URL for section "${sectionKey}".`, 400);
    }

    const row = {
      section_key: sectionKey,
      enabled: Boolean(section.enabled),
      sort_order: Number(section.sortOrder ?? 0),
      heading: section.heading ?? null,
      description: section.description ?? null,
      cta_label: section.ctaLabel ?? null,
      cta_url: ctaUrl,
      animation_type: section.animationType ?? "fade-up",
    };

    const { error } = await supabase.from("dpr_sections").upsert(row, { onConflict: "section_key" });
    if (error) return jsonError(error.message, 500);
  }

  revalidateDprPaths();
  const cms = await getAllDprCmsForAdmin();
  return NextResponse.json({ sections: cms.sections, message: "Sections updated." });
}
