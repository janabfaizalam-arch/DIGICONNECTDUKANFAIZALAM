import { NextResponse } from "next/server";

import {
  isValidCtaUrl,
  jsonError,
  nullableText,
  parseSortOrder,
  requireAdmin,
  revalidateDprPaths,
  toIsoOrNull,
  uploadDprImage,
  validateImageFile,
} from "@/lib/dpr/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

function nullableFormText(formData: FormData, key: string) {
  return nullableText(formData.get(key));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const formData = await request.formData();
  const image = formData.get("image");
  const mobileImage = formData.get("mobile_image");
  const imageError = validateImageFile(image, "Desktop");
  if (imageError) return jsonError(imageError, 400);
  const mobileError = validateImageFile(mobileImage, "Mobile");
  if (mobileError) return jsonError(mobileError, 400);

  const buttonUrl = nullableFormText(formData, "button_url");
  if (!isValidCtaUrl(buttonUrl)) return jsonError("Button URL must be a relative path or http(s) URL.", 400);

  const sortOrder = parseSortOrder(formData.get("sort_order"));
  if (sortOrder == null) return jsonError("Sort order must be a number.", 400);

  const updates: Record<string, unknown> = {
    section_key: String(formData.get("section_key") ?? "").trim() || undefined,
    title: nullableFormText(formData, "title"),
    description: nullableFormText(formData, "description"),
    alt_text: nullableFormText(formData, "alt_text"),
    button_text: nullableFormText(formData, "button_text"),
    button_url: buttonUrl,
    start_at: toIsoOrNull(nullableFormText(formData, "start_at")),
    end_at: toIsoOrNull(nullableFormText(formData, "end_at")),
    is_active: formData.has("is_active"),
    sort_order: sortOrder,
  };

  if (!updates.section_key) delete updates.section_key;

  if (image instanceof File && image.size > 0) {
    const upload = await uploadDprImage(image, "desktop");
    if (upload.error || !upload.url) return jsonError(upload.error || "Image upload failed.", 400);
    updates.image_url = upload.url;
    updates.image_path = upload.path;
  }

  if (mobileImage instanceof File && mobileImage.size > 0) {
    const upload = await uploadDprImage(mobileImage, "mobile");
    if (upload.error || !upload.url) return jsonError(upload.error || "Mobile image upload failed.", 400);
    updates.mobile_image_url = upload.url;
    updates.mobile_image_path = upload.path;
  }

  const { data, error } = await supabase
    .from("dpr_section_banners")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Banner not found.", 404);

  revalidateDprPaths();
  return NextResponse.json({ banner: data, message: "Banner updated." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { error } = await supabase.from("dpr_section_banners").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  revalidateDprPaths();
  return NextResponse.json({ message: "Banner deleted." });
}
