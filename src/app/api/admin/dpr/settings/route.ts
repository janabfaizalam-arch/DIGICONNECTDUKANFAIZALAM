import { NextResponse } from "next/server";

import { getAllDprCmsForAdmin } from "@/lib/dpr/cms";
import { jsonError, readJsonBody, requireAdmin, revalidateDprPaths } from "@/lib/dpr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body) return jsonError("Invalid JSON body.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const updates: Record<string, unknown> = {};
  if ("stickyCtaEnabled" in body) updates.sticky_cta_enabled = Boolean(body.stickyCtaEnabled);
  if ("stickyCtaLabel" in body) updates.sticky_cta_label = String(body.stickyCtaLabel ?? "").trim() || "Apply for DPR";
  if ("stickyCtaUrl" in body) updates.sticky_cta_url = String(body.stickyCtaUrl ?? "").trim() || "/apply/detailed-project-report";
  if ("videoUrl" in body) updates.video_url = body.videoUrl ? String(body.videoUrl).trim() : null;
  if ("whatsappNumber" in body) updates.whatsapp_number = String(body.whatsappNumber ?? "").trim();
  if ("supportPhone" in body) updates.support_phone = String(body.supportPhone ?? "").trim();
  if ("defaultPlanId" in body) updates.default_plan_id = String(body.defaultPlanId ?? "").trim() || "basic";
  if ("metaTitle" in body) updates.meta_title = body.metaTitle ? String(body.metaTitle).trim() : null;
  if ("metaDescription" in body) updates.meta_description = body.metaDescription ? String(body.metaDescription).trim() : null;

  if (!Object.keys(updates).length) return jsonError("No settings to update.", 400);

  const { error } = await supabase.from("dpr_page_settings").update(updates).eq("id", 1);

  if (error) return jsonError(error.message, 500);

  revalidateDprPaths();
  const cms = await getAllDprCmsForAdmin();
  return NextResponse.json({ settings: cms.settings, message: "Settings updated." });
}
