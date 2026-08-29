import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { validateFileSignature } from "@/lib/file-validation";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { homepageSlidesBucketName } from "@/lib/homepage-slides";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { HOMEPAGE_TAGS } from "@/lib/homepage/cache";

const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const maxImageSize = 8 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function friendlySupabaseError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("bucket") && lowerMessage.includes("not found")) {
    return "Homepage slides storage bucket is not available yet. Please apply the Supabase homepage slides migration.";
  }

  if (lowerMessage.includes("homepage_slides") || lowerMessage.includes("relation") || lowerMessage.includes("does not exist")) {
    return "Homepage slides database table is not available yet. Please apply the Supabase homepage slides migration.";
  }

  return message;
}

async function requireAdminJson() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    return { error: jsonError("Please log in before managing homepage slides.", 401), user: null };
  }

  if (!isAdminRole(role)) {
    return { error: jsonError("You do not have permission to manage homepage slides.", 403), user: null };
  }

  return { error: null, user };
}

function nullableText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function parseBoolean(formData: FormData, key: string, fallback: boolean) {
  const value = formData.get(key);

  if (value === null) {
    return fallback;
  }

  return String(value) === "true" || String(value) === "on";
}

function parseSortOrder(formData: FormData) {
  const rawValue = String(formData.get("sort_order") ?? "0").trim();
  const sortOrder = Number.parseInt(rawValue || "0", 10);

  if (Number.isNaN(sortOrder)) {
    return null;
  }

  return sortOrder;
}

function isValidCtaUrl(value: string | null) {
  if (!value) {
    return true;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

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

async function uploadSlideImage(file: File, folder: "desktop" | "mobile") {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { error: "Homepage slide upload is not configured on the server.", path: null, url: null };
  }

  const storagePath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${cleanFileName(file.name)}`;
  const { error } = await supabase.storage.from(homepageSlidesBucketName).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return { error: friendlySupabaseError(error.message), path: null, url: null };
  }

  const { data } = supabase.storage.from(homepageSlidesBucketName).getPublicUrl(storagePath);
  return { error: null, path: storagePath, url: data.publicUrl };
}

function buildSlidePayload(formData: FormData) {
  const sortOrder = parseSortOrder(formData);
  const clickLink = nullableText(formData, "click_link") || nullableText(formData, "cta_primary_url");

  if (sortOrder === null) {
    return { error: "Sort order must be a number.", payload: null };
  }

  if (!isValidCtaUrl(clickLink)) {
    return { error: "Click link must be an internal path or a valid HTTP/HTTPS URL.", payload: null };
  }

  return {
    error: null,
    payload: {
      title: null,
      subtitle: null,
      cta_primary_label: null,
      cta_primary_url: clickLink,
      cta_secondary_label: null,
      cta_secondary_url: null,
      cta_position: "hidden",
      sort_order: sortOrder,
      is_active: parseBoolean(formData, "is_active", true),
      starts_at: null,
      ends_at: null,
    },
  };
}

export async function GET() {
  try {
    const auth = await requireAdminJson();

    if (auth.error) {
      return auth.error;
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Homepage slides are not configured on the server.", 500);
    }

    const { data: slides, error } = await supabase
      .from("homepage_slides")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return jsonError(friendlySupabaseError(error.message), 500);
    }

    return NextResponse.json({ slides: slides ?? [] });
  } catch (error) {
    console.error("[api/admin/homepage-slides] List failed", error);
    return jsonError("Homepage slides could not be loaded.", 500);
  }
}

export async function POST(request: Request) {
  const uploadedPaths: string[] = [];

  try {
    const auth = await requireAdminJson();

    if (auth.error) {
      return auth.error;
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Homepage slide upload is not configured on the server.", 500);
    }

    const formData = await request.formData();
    const desktopImage = formData.get("image");
    const mobileImage = formData.get("mobile_image");
    const desktopValidationError = validateImageFile(desktopImage, "Desktop poster", true);
    const mobileValidationError = validateImageFile(mobileImage, "Mobile poster", false);

    if (desktopValidationError || mobileValidationError) {
      return jsonError(desktopValidationError || mobileValidationError || "Invalid image.", 400);
    }

    if (desktopImage instanceof File) {
      const check = await validateFileSignature(desktopImage, allowedImageTypes);
      if (!check.valid) return jsonError(`Desktop poster: ${check.error}`, 400);
    }
    if (mobileImage instanceof File && mobileImage.size > 0) {
      const check = await validateFileSignature(mobileImage, allowedImageTypes);
      if (!check.valid) return jsonError(`Mobile poster: ${check.error}`, 400);
    }

    const { error: payloadError, payload } = buildSlidePayload(formData);

    if (payloadError || !payload) {
      return jsonError(payloadError || "Homepage slide details are invalid.", 400);
    }

    const desktopUpload = await uploadSlideImage(desktopImage as File, "desktop");

    if (desktopUpload.error || !desktopUpload.path || !desktopUpload.url) {
      return jsonError(desktopUpload.error || "Desktop poster could not be uploaded.", 500);
    }

    uploadedPaths.push(desktopUpload.path);

    let mobileUpload: Awaited<ReturnType<typeof uploadSlideImage>> | null = null;

    if (mobileImage instanceof File && mobileImage.size > 0) {
      mobileUpload = await uploadSlideImage(mobileImage, "mobile");

      if (mobileUpload.error || !mobileUpload.path || !mobileUpload.url) {
        await supabase.storage.from(homepageSlidesBucketName).remove(uploadedPaths);
        return jsonError(mobileUpload.error || "Mobile poster could not be uploaded.", 500);
      }

      uploadedPaths.push(mobileUpload.path);
    }

    const { data: slide, error: insertError } = await supabase
      .from("homepage_slides")
      .insert({
        ...payload,
        image_url: desktopUpload.url,
        image_path: desktopUpload.path,
        mobile_image_url: mobileUpload?.url ?? null,
        mobile_image_path: mobileUpload?.path ?? null,
      })
      .select("*")
      .single();

    if (insertError) {
      await supabase.storage.from(homepageSlidesBucketName).remove(uploadedPaths);
      return jsonError(friendlySupabaseError(insertError.message), 500);
    }

    revalidatePath("/");

    revalidateTag(HOMEPAGE_TAGS.slides);
    revalidatePath("/admin/homepage-slides");

    return NextResponse.json({ slide, message: "Homepage slide created successfully." });
  } catch (error) {
    console.error("[api/admin/homepage-slides] Create failed", error);
    return jsonError("Homepage slide could not be created. Please try again.", 500);
  }
}
