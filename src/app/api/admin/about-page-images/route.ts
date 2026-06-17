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

async function requireAdminJson() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) return { error: jsonError("Please log in before managing About page images.", 401) };
  if (!isAdminRole(role)) return { error: jsonError("You do not have permission to manage About page images.", 403) };
  return { error: null };
}

function validateImage(file: FormDataEntryValue | null, required: boolean) {
  if (!(file instanceof File) || file.size === 0) return required ? "Please choose an About page image." : null;
  if (!file.type.startsWith("image/") || !allowedImageTypes.includes(file.type)) return "About page image must be JPG, PNG, or WebP.";
  if (file.size > maxImageSize) return "About page image must be smaller than 8MB.";
  return null;
}

async function uploadImage(file: File) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "About page image upload is not configured on the server.", path: null, url: null };

  const path = `about-page/${Date.now()}-${crypto.randomUUID()}-${cleanFileName(file.name)}`;
  const { error } = await supabase.storage.from(siteMediaBucketName).upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { error: error.message, path: null, url: null };

  const { data } = supabase.storage.from(siteMediaBucketName).getPublicUrl(path);
  return { error: null, path, url: data.publicUrl };
}

function revalidateAbout() {
  revalidatePath("/about");
  revalidatePath("/admin/about-page-images");
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminJson();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("About page image upload is not configured on the server.", 500);

    const formData = await request.formData();
    const image = formData.get("image");
    const imageError = validateImage(image, true);
    const sortOrder = parseSortOrder(formData);

    if (imageError) return jsonError(imageError, 400);
    if (sortOrder === null) return jsonError("Sort order must be a number.", 400);

    const check = await validateFileSignature(image as File, allowedImageTypes);
    if (!check.valid) return jsonError(check.error || "Invalid file.", 400);

    const upload = await uploadImage(image as File);
    if (upload.error || !upload.path || !upload.url) return jsonError(upload.error || "About page image could not be uploaded.", 500);

    const { data: imageRow, error } = await supabase
      .from("about_page_images")
      .insert({
        title: nullableText(formData, "title"),
        alt_text: nullableText(formData, "alt_text"),
        image_url: upload.url,
        storage_path: upload.path,
        sort_order: sortOrder,
        is_active: parseBoolean(formData, "is_active", true),
      })
      .select("*")
      .single();

    if (error) {
      await supabase.storage.from(siteMediaBucketName).remove([upload.path]);
      return jsonError(error.message, 500);
    }

    revalidateAbout();
    return NextResponse.json({ image: imageRow, message: "About page image uploaded successfully." });
  } catch (error) {
    console.error("[api/admin/about-page-images] Upload failed", error);
    return jsonError("About page image could not be uploaded. Please try again.", 500);
  }
}

export async function PATCH(request: Request) {
  const uploadedPaths: string[] = [];

  try {
    const auth = await requireAdminJson();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("About page image update is not configured on the server.", 500);

    const formData = await request.formData();
    const id = String(formData.get("id") ?? "").trim();
    const image = formData.get("image");
    const imageError = validateImage(image, false);
    const sortOrder = parseSortOrder(formData);

    if (!id) return jsonError("About page image id is missing.", 400);
    if (imageError) return jsonError(imageError, 400);
    if (sortOrder === null) return jsonError("Sort order must be a number.", 400);

    const { data: existingImage } = await supabase
      .from("about_page_images")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();

    if (!existingImage) return jsonError("About page image was not found.", 404);

    const updates: Record<string, unknown> = {
      title: nullableText(formData, "title"),
      alt_text: nullableText(formData, "alt_text"),
      sort_order: sortOrder,
      is_active: parseBoolean(formData, "is_active", true),
    };

    if (image instanceof File && image.size > 0) {
      const check = await validateFileSignature(image, allowedImageTypes);
      if (!check.valid) return jsonError(check.error || "Invalid file.", 400);

      const upload = await uploadImage(image);
      if (upload.error || !upload.path || !upload.url) return jsonError(upload.error || "About page image could not be uploaded.", 500);

      uploadedPaths.push(upload.path);
      updates.image_url = upload.url;
      updates.storage_path = upload.path;
    }

    const { data: imageRow, error } = await supabase
      .from("about_page_images")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (uploadedPaths.length) await supabase.storage.from(siteMediaBucketName).remove(uploadedPaths);
      return jsonError(error.message, 500);
    }

    if (uploadedPaths.length) await supabase.storage.from(siteMediaBucketName).remove([existingImage.storage_path]);

    revalidateAbout();
    return NextResponse.json({ image: imageRow, message: "About page image updated successfully." });
  } catch (error) {
    console.error("[api/admin/about-page-images] Update failed", error);
    return jsonError("About page image could not be updated. Please try again.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdminJson();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("About page image delete is not configured on the server.", 500);

    const body = (await request.json().catch(() => null)) as { id?: string } | null;
    const id = String(body?.id ?? "").trim();
    if (!id) return jsonError("About page image id is missing.", 400);

    const { data: existingImage } = await supabase
      .from("about_page_images")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();

    if (!existingImage) return jsonError("About page image was not found.", 404);

    const { error: removeError } = await supabase.storage.from(siteMediaBucketName).remove([existingImage.storage_path]);
    if (removeError) return jsonError(removeError.message, 500);

    const { error } = await supabase.from("about_page_images").delete().eq("id", id);
    if (error) return jsonError(error.message, 500);

    revalidateAbout();
    return NextResponse.json({ message: "About page image deleted successfully." });
  } catch (error) {
    console.error("[api/admin/about-page-images] Delete failed", error);
    return jsonError("About page image could not be deleted. Please try again.", 500);
  }
}
