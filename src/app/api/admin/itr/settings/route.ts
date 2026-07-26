import { NextResponse } from "next/server";

import { getAllItrCmsForAdmin } from "@/lib/itr/cms";
import { jsonError, nullableText, readJsonBody, requireAdmin, revalidateItrPaths } from "@/lib/itr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body) return jsonError("Invalid JSON body.", 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const updates: Record<string, unknown> = {};

  if ("serviceName" in body) updates.service_name = String(body.serviceName ?? "").trim() || "Income Tax Return Filing";
  if ("shortName" in body) updates.short_name = String(body.shortName ?? "").trim() || "ITR Filing";
  if ("assessmentYear" in body) {
    const ay = String(body.assessmentYear ?? "").trim();
    if (!ay) return jsonError("Assessment year is required.", 400);
    updates.assessment_year = ay;
  }
  if ("filingOpenNotice" in body) updates.filing_open_notice = nullableText(body.filingOpenNotice);
  if ("startingPrice" in body) {
    const price = Number(body.startingPrice);
    if (!Number.isFinite(price) || price < 0) return jsonError("Starting price must be a valid number.", 400);
    updates.starting_price = price;
  }
  if ("heroHeading" in body) updates.hero_heading = nullableText(body.heroHeading);
  if ("heroDescription" in body) updates.hero_description = nullableText(body.heroDescription);
  if ("primaryCtaLabel" in body) updates.primary_cta_label = String(body.primaryCtaLabel ?? "").trim() || "Apply Now";
  if ("primaryCtaUrl" in body) updates.primary_cta_url = String(body.primaryCtaUrl ?? "").trim() || "/apply/itr-filing";
  if ("secondaryCtaLabel" in body) updates.secondary_cta_label = nullableText(body.secondaryCtaLabel);
  if ("secondaryCtaUrl" in body) updates.secondary_cta_url = nullableText(body.secondaryCtaUrl);
  if ("supportCtaLabel" in body) updates.support_cta_label = nullableText(body.supportCtaLabel);
  if ("supportCtaUrl" in body) updates.support_cta_url = nullableText(body.supportCtaUrl);
  if ("estimatedTurnaround" in body) updates.estimated_turnaround = nullableText(body.estimatedTurnaround);
  if ("stickyCtaEnabled" in body) updates.sticky_cta_enabled = Boolean(body.stickyCtaEnabled);
  if ("stickyCtaLabel" in body) updates.sticky_cta_label = String(body.stickyCtaLabel ?? "").trim() || "Apply for ITR";
  if ("stickyCtaUrl" in body) updates.sticky_cta_url = String(body.stickyCtaUrl ?? "").trim() || "/apply/itr-filing";
  if ("videoUrl" in body) updates.video_url = body.videoUrl ? String(body.videoUrl).trim() : null;
  if ("whatsappNumber" in body) updates.whatsapp_number = String(body.whatsappNumber ?? "").trim();
  if ("supportPhone" in body) updates.support_phone = String(body.supportPhone ?? "").trim();
  if ("defaultPlanId" in body) updates.default_plan_id = String(body.defaultPlanId ?? "").trim() || "basic";
  if ("isPublished" in body) updates.is_published = Boolean(body.isPublished);
  if ("metaTitle" in body) updates.meta_title = nullableText(body.metaTitle);
  if ("metaDescription" in body) updates.meta_description = nullableText(body.metaDescription);
  if ("metaKeywords" in body) updates.meta_keywords = nullableText(body.metaKeywords);
  if ("ogTitle" in body) updates.og_title = nullableText(body.ogTitle);
  if ("ogDescription" in body) updates.og_description = nullableText(body.ogDescription);
  if ("ogImageUrl" in body) updates.og_image_url = nullableText(body.ogImageUrl);
  if ("twitterImageUrl" in body) updates.twitter_image_url = nullableText(body.twitterImageUrl);
  if ("robotsIndex" in body) updates.robots_index = Boolean(body.robotsIndex);
  if ("pricingDisclaimer" in body) updates.pricing_disclaimer = nullableText(body.pricingDisclaimer);
  if ("finalQuoteDisclaimer" in body) updates.final_quote_disclaimer = nullableText(body.finalQuoteDisclaimer);
  if ("taxLiabilityDisclaimer" in body) updates.tax_liability_disclaimer = nullableText(body.taxLiabilityDisclaimer);
  if ("refundDisclaimer" in body) updates.refund_disclaimer = nullableText(body.refundDisclaimer);
  if ("customerDeclaration" in body) updates.customer_declaration = nullableText(body.customerDeclaration);

  if (!Object.keys(updates).length) return jsonError("No settings to update.", 400);

  const { error } = await supabase.from("itr_page_settings").update(updates).eq("id", 1);

  if (error) return jsonError(error.message, 500);

  revalidateItrPaths();
  const cms = await getAllItrCmsForAdmin();
  return NextResponse.json({ settings: cms.settings, message: "Settings updated." });
}
