import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { DIGI_PARTNER_TYPE_VALUES } from "@/lib/ap/partner-type";
import { parsePartnerTypesFromForm, partnerBannersBucketName } from "@/lib/ap/partner-banners";
import { validateFileSignature } from "@/lib/file-validation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const maxImageSize = 8 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) return { error: jsonError("Please log in.", 401), user: null };
  if (!isAdminRole(role)) return { error: jsonError("Admin access required.", 403), user: null };
  return { error: null, user };
}

function nullableText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function toIsoOrNull(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseSortOrder(formData: FormData) {
  const sortOrder = Number.parseInt(String(formData.get("sort_order") ?? "0").trim() || "0", 10);
  return Number.isNaN(sortOrder) ? null : sortOrder;
}

function isValidCtaUrl(value: string | null) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validateImageFile(file: FormDataEntryValue | null, label: string, required: boolean) {
  if (!(file instanceof File) || file.size === 0) {
    return required ? `${label} image is required.` : null;
  }
  if (!file.type.startsWith("image/") || !allowedImageTypes.includes(file.type)) {
    return `${label} image must be JPG, PNG, or WebP.`;
  }
  if (file.size > maxImageSize) {
    return `${label} image must be smaller than 8MB.`;
  }
  return null;
}

async function uploadBannerImage(file: File, folder: "desktop" | "mobile") {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { error: "Banner upload is not configured.", path: null, url: null };
  }

  const signature = await validateFileSignature(file, allowedImageTypes);
  if (!signature.valid) {
    return { error: signature.error || "Invalid image file.", path: null, url: null };
  }

  const storagePath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${cleanFileName(file.name)}`;
  const { error } = await supabase.storage.from(partnerBannersBucketName).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return { error: error.message, path: null, url: null };
  }

  const { data } = supabase.storage.from(partnerBannersBucketName).getPublicUrl(storagePath);
  return { error: null, path: storagePath, url: data.publicUrl };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return jsonError("Service unavailable.", 500);

  const { data, error } = await supabase
    .from("partner_announcement_banners")
    .select("*")
    .eq("audience", "partner_dashboard")
    .order("sort_order", { ascending: true });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ banners: data ?? [] });
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

  const buttonUrl = nullableText(formData, "button_url");
  if (!isValidCtaUrl(buttonUrl)) return jsonError("Button URL must be a relative path or http(s) URL.", 400);

  const sortOrder = parseSortOrder(formData);
  if (sortOrder == null) return jsonError("Sort order must be a number.", 400);

  const partnerTypesRaw = nullableText(formData, "partner_types");
  let partnerTypes = parsePartnerTypesFromForm(partnerTypesRaw);
  // Checkbox group: partner_types[] values
  const multi = formData.getAll("partner_types").map(String).filter(Boolean);
  if (multi.length) {
    partnerTypes = parsePartnerTypesFromForm(multi.join(","));
  }

  const upload = await uploadBannerImage(image as File, "desktop");
  if (upload.error || !upload.url) return jsonError(upload.error || "Image upload failed.", 400);

  let mobileUrl: string | null = null;
  let mobilePath: string | null = null;
  if (mobileImage instanceof File && mobileImage.size > 0) {
    const mobileUpload = await uploadBannerImage(mobileImage, "mobile");
    if (mobileUpload.error || !mobileUpload.url) return jsonError(mobileUpload.error || "Mobile image upload failed.", 400);
    mobileUrl = mobileUpload.url;
    mobilePath = mobileUpload.path;
  }

  const payload = {
    title: nullableText(formData, "title"),
    description: nullableText(formData, "description"),
    image_url: upload.url,
    image_path: upload.path,
    mobile_image_url: mobileUrl,
    mobile_image_path: mobilePath,
    button_text: nullableText(formData, "button_text"),
    button_url: buttonUrl,
    partner_types: partnerTypes,
    audience: "partner_dashboard",
    start_at: toIsoOrNull(nullableText(formData, "start_at")),
    end_at: toIsoOrNull(nullableText(formData, "end_at")),
    is_active: formData.has("is_active"),
    sort_order: sortOrder,
    created_by: auth.user!.id,
  };

  const { data, error } = await supabase.from("partner_announcement_banners").insert(payload).select("*").single();
  if (error) return jsonError(error.message, 500);

  revalidatePath("/ap/dashboard");
  revalidatePath("/admin/partner-banners");
  return NextResponse.json({ banner: data, message: "Banner created.", partnerTypeOptions: DIGI_PARTNER_TYPE_VALUES });
}
