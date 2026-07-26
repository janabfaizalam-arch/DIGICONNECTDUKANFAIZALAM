import { NextResponse } from "next/server";

import { getAllItrCmsForAdmin } from "@/lib/itr/cms";
import {
  isValidCtaUrl,
  jsonError,
  nullableText,
  parseSortOrder,
  requireAdmin,
  revalidateItrPaths,
  toIsoOrNull,
  uploadItrImage,
  validateImageFile,
} from "@/lib/itr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function nullableFormText(formData: FormData, key: string) {
  return nullableText(formData.get(key));
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const cms = await getAllItrCmsForAdmin();
  return NextResponse.json({ banners: cms.banners });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const formData = await request.formData();
  const image = formData.get("image");
  const mobileImage = formData.get("mobile_image");
  const imageError = validateImageFile(image, "Desktop", true);
  if (imageError) return jsonError(imageError, 400);
  const mobileError = validateImageFile(mobileImage, "Mobile", false);
  if (mobileError) return jsonError(mobileError, 400);

  const sectionKey = String(formData.get("section_key") ?? "").trim();
  if (!sectionKey) return jsonError("Section key is required.", 400);

  const buttonUrl = nullableFormText(formData, "button_url");
  if (!isValidCtaUrl(buttonUrl)) return jsonError("Button URL must be a relative path or http(s) URL.", 400);

  const sortOrder = parseSortOrder(formData.get("sort_order"));
  if (sortOrder == null) return jsonError("Sort order must be a number.", 400);

  const upload = await uploadItrImage(image as File, "desktop");
  if (upload.error || !upload.url) return jsonError(upload.error || "Image upload failed.", 400);

  let mobileUrl: string | null = null;
  let mobilePath: string | null = null;
  if (mobileImage instanceof File && mobileImage.size > 0) {
    const mobileUpload = await uploadItrImage(mobileImage, "mobile");
    if (mobileUpload.error || !mobileUpload.url) {
      return jsonError(mobileUpload.error || "Mobile image upload failed.", 400);
    }
    mobileUrl = mobileUpload.url;
    mobilePath = mobileUpload.path;
  }

  const payload = {
    section_key: sectionKey,
    title: nullableFormText(formData, "title"),
    description: nullableFormText(formData, "description"),
    alt_text: nullableFormText(formData, "alt_text"),
    image_url: upload.url,
    image_path: upload.path,
    mobile_image_url: mobileUrl,
    mobile_image_path: mobilePath,
    button_text: nullableFormText(formData, "button_text"),
    button_url: buttonUrl,
    badge_text: nullableFormText(formData, "badge_text"),
    start_at: toIsoOrNull(nullableFormText(formData, "start_at")),
    end_at: toIsoOrNull(nullableFormText(formData, "end_at")),
    is_active: formData.has("is_active"),
    sort_order: sortOrder,
    created_by: auth.user!.id,
  };

  const { data, error } = await supabase.from("itr_section_banners").insert(payload).select("*").single();
  if (error) return jsonError(error.message, 500);

  revalidateItrPaths();
  return NextResponse.json({ banner: data, message: "Banner created." });
}
