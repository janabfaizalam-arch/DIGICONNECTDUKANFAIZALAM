import { NextResponse } from "next/server";

import { getAllItrCmsForAdmin } from "@/lib/itr/cms";
import { isValidCtaUrl, jsonError, readJsonBody, requireAdmin, revalidateItrPaths } from "@/lib/itr/admin-api";
import type { ItrSection } from "@/lib/itr/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const cms = await getAllItrCmsForAdmin();
  return NextResponse.json({ sections: cms.sections });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJsonBody<{ sections?: ItrSection[] }>(request);
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
      subheading: section.subheading ?? null,
      description: section.description ?? null,
      content: section.content ?? {},
      layout_style: section.layoutStyle ?? "default",
      cta_label: section.ctaLabel ?? null,
      cta_url: ctaUrl,
      animation_type: section.animationType ?? "fade-up",
    };

    const { error } = await supabase.from("itr_sections").upsert(row, { onConflict: "section_key" });
    if (error) return jsonError(error.message, 500);
  }

  revalidateItrPaths();
  const cms = await getAllItrCmsForAdmin();
  return NextResponse.json({ sections: cms.sections, message: "Sections updated." });
}
