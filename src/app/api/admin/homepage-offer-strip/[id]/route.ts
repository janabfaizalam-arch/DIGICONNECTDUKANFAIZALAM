import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { validateFileSignature } from "@/lib/file-validation";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { siteMediaBucketName } from "@/lib/homepage-offer-banners";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const maxImageSize = 8 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function nullableText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function parseBoolean(formData: FormData, key: string, fallback: boolean) {
  const value = formData.get(key);
  return value === null ? fallback : String(value) === "true" || String(value) === "on";
}

function parseSortOrder(formData: FormData) {
  const value = Number.parseInt(String(formData.get("sort_order") ?? "0").trim() || "0", 10);
  return Number.isNaN(value) ? null : value;
}

function isValidLink(value: string | null) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function requireAdminJson() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) return { error: jsonError("Please log in before managing the homepage offer strip.", 401) };
  if (!isAdminRole(role)) return { error: jsonError("You do not have permission to manage the homepage offer strip.", 403) };
  return { error: null };
}

function validateOptionalImage(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/") || !allowedImageTypes.includes(file.type)) return "Offer banner must be JPG, PNG, or WebP.";
  if (file.size > maxImageSize) return "Offer banner must be smaller than 8MB.";
  return null;
}

async function uploadImage(file: File) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Offer banner upload is not configured on the server.", path: null, url: null };

  const path = `homepage-offer-strip/${Date.now()}-${crypto.randomUUID()}-${cleanFileName(file.name)}`;
  const { error } = await supabase.storage.from(siteMediaBucketName).upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { error: error.message, path: null, url: null };

  const { data } = supabase.storage.from(siteMediaBucketName).getPublicUrl(path);
  return { error: null, path, url: data.publicUrl };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const uploadedPaths: string[] = [];

  try {
    const auth = await requireAdminJson();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("Offer banner update is not configured on the server.", 500);

    const { id } = await context.params;
    const { data: existingBanner } = await supabase
      .from("homepage_offer_banners")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();

    if (!existingBanner) return jsonError("Offer banner was not found.", 404);

    const formData = await request.formData();
    const image = formData.get("image");
    const imageError = validateOptionalImage(image);
    const sortOrder = parseSortOrder(formData);
    const linkUrl = nullableText(formData, "link_url");

    if (imageError) return jsonError(imageError, 400);
    if (sortOrder === null) return jsonError("Sort order must be a number.", 400);
    if (!isValidLink(linkUrl)) return jsonError("Link must be an internal path or a valid HTTP/HTTPS URL.", 400);

    const updates: Record<string, unknown> = {
      title: nullableText(formData, "title"),
      link_url: linkUrl,
      sort_order: sortOrder,
      is_active: parseBoolean(formData, "is_active", true),
    };

    if (image instanceof File && image.size > 0) {
      const check = await validateFileSignature(image, allowedImageTypes);
      if (!check.valid) return jsonError(check.error || "Invalid file.", 400);

      const upload = await uploadImage(image);
      if (upload.error || !upload.path || !upload.url) return jsonError(upload.error || "Offer banner could not be uploaded.", 500);

      uploadedPaths.push(upload.path);
      updates.image_url = upload.url;
      updates.storage_path = upload.path;
    }

    const { data: banner, error } = await supabase
      .from("homepage_offer_banners")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (uploadedPaths.length) await supabase.storage.from(siteMediaBucketName).remove(uploadedPaths);
      return jsonError(error.message, 500);
    }

    if (uploadedPaths.length && existingBanner.storage_path) {
      await supabase.storage.from(siteMediaBucketName).remove([existingBanner.storage_path]);
    }

    revalidatePath("/");
    revalidatePath("/admin/homepage-offer-strip");
    return NextResponse.json({ banner, message: "Offer banner updated successfully." });
  } catch (error) {
    console.error("[api/admin/homepage-offer-strip] Update failed", error);
    return jsonError("Offer banner could not be updated. Please try again.", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminJson();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("Offer banner delete is not configured on the server.", 500);

    const { id } = await context.params;
    const { data: banner } = await supabase
      .from("homepage_offer_banners")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();

    if (!banner) return jsonError("Offer banner was not found.", 404);

    const { error: removeError } = await supabase.storage.from(siteMediaBucketName).remove([banner.storage_path]);
    if (removeError) return jsonError(removeError.message, 500);

    const { error } = await supabase.from("homepage_offer_banners").delete().eq("id", id);
    if (error) return jsonError(error.message, 500);

    revalidatePath("/");
    revalidatePath("/admin/homepage-offer-strip");
    return NextResponse.json({ message: "Offer banner deleted successfully." });
  } catch (error) {
    console.error("[api/admin/homepage-offer-strip] Delete failed", error);
    return jsonError("Offer banner could not be deleted. Please try again.", 500);
  }
}
