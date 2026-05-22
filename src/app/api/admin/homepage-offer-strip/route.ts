import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import {
  homepageOfferStripSettingKey,
  siteMediaBucketName,
} from "@/lib/homepage-offer-banners";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const maxImageSize = 8 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function parseBoolean(formData: FormData, key: string, fallback: boolean) {
  const value = formData.get(key);
  return value === null ? fallback : String(value) === "true" || String(value) === "on";
}

function parseSortOrder(formData: FormData) {
  const value = Number.parseInt(String(formData.get("sort_order") ?? "0").trim() || "0", 10);
  return Number.isNaN(value) ? null : value;
}

function nullableText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
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

function friendlyError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("bucket") && lowerMessage.includes("not found")) {
    return "Site media storage is not available yet. Please apply the offer strip migration.";
  }

  if (lowerMessage.includes("homepage_offer_banners") || lowerMessage.includes("site_section_settings") || lowerMessage.includes("relation")) {
    return "Offer strip tables are not available yet. Please apply the offer strip migration.";
  }

  return message;
}

async function requireAdminJson() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) return { error: jsonError("Please log in before managing the homepage offer strip.", 401) };
  if (!isAdminRole(role)) return { error: jsonError("You do not have permission to manage the homepage offer strip.", 403) };
  return { error: null };
}

function validateImage(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return "Offer banner image is required.";
  if (!file.type.startsWith("image/") || !allowedImageTypes.includes(file.type)) return "Offer banner must be JPG, PNG, or WebP.";
  if (file.size > maxImageSize) return "Offer banner must be smaller than 8MB.";
  return null;
}

async function uploadImage(file: File) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { error: "Offer banner upload is not configured on the server.", path: null, url: null };
  }

  const path = `homepage-offer-strip/${Date.now()}-${crypto.randomUUID()}-${cleanFileName(file.name)}`;
  const { error } = await supabase.storage.from(siteMediaBucketName).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { error: friendlyError(error.message), path: null, url: null };

  const { data } = supabase.storage.from(siteMediaBucketName).getPublicUrl(path);
  return { error: null, path, url: data.publicUrl };
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminJson();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("Offer banner upload is not configured on the server.", 500);

    const formData = await request.formData();
    const image = formData.get("image");
    const imageError = validateImage(image);
    const sortOrder = parseSortOrder(formData);
    const linkUrl = nullableText(formData, "link_url");

    if (imageError) return jsonError(imageError, 400);
    if (sortOrder === null) return jsonError("Sort order must be a number.", 400);
    if (!isValidLink(linkUrl)) return jsonError("Link must be an internal path or a valid HTTP/HTTPS URL.", 400);

    const upload = await uploadImage(image as File);
    if (upload.error || !upload.path || !upload.url) return jsonError(upload.error || "Offer banner could not be uploaded.", 500);

    const { data: banner, error } = await supabase
      .from("homepage_offer_banners")
      .insert({
        title: nullableText(formData, "title"),
        image_url: upload.url,
        storage_path: upload.path,
        link_url: linkUrl,
        sort_order: sortOrder,
        is_active: parseBoolean(formData, "is_active", true),
      })
      .select("*")
      .single();

    if (error) {
      await supabase.storage.from(siteMediaBucketName).remove([upload.path]);
      return jsonError(friendlyError(error.message), 500);
    }

    revalidatePath("/");
    revalidatePath("/admin/homepage-offer-strip");
    return NextResponse.json({ banner, message: "Offer banner created successfully." });
  } catch (error) {
    console.error("[api/admin/homepage-offer-strip] Create failed", error);
    return jsonError("Offer banner could not be created. Please try again.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdminJson();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("Offer strip settings are not configured on the server.", 500);

    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();

    if (!title) return jsonError("Offer strip title is required.", 400);
    if (title.length > 100) return jsonError("Offer strip title must be 100 characters or fewer.", 400);

    const { data: setting, error } = await supabase
      .from("site_section_settings")
      .upsert({ section_key: homepageOfferStripSettingKey, title }, { onConflict: "section_key" })
      .select("*")
      .single();

    if (error) return jsonError(friendlyError(error.message), 500);

    revalidatePath("/");
    revalidatePath("/admin/homepage-offer-strip");
    return NextResponse.json({ setting, message: "Offer strip title updated successfully." });
  } catch (error) {
    console.error("[api/admin/homepage-offer-strip] Settings update failed", error);
    return jsonError("Offer strip title could not be updated. Please try again.", 500);
  }
}
