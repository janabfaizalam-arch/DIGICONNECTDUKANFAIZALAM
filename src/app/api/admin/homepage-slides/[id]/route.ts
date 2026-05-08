import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import {
  homepageSlideCtaPositions,
  homepageSlidesBucketName,
  isHomepageSlideCtaPosition,
} from "@/lib/homepage-slides";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const maxImageSize = 8 * 1024 * 1024;
const maxTitleLength = 120;

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

function parseOptionalDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "invalid";
  }

  return date.toISOString();
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
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateImageFile(file: FormDataEntryValue | null, label: string) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!file.type.startsWith("image/") || !allowedImageTypes.includes(file.type)) {
    return `${label} image must be JPG, PNG, or WebP.`;
  }

  if (file.size > maxImageSize) {
    return `${label} image must be smaller than 8MB.`;
  }

  return null;
}

function buildSlidePayload(formData: FormData) {
  const title = nullableText(formData, "title");
  const ctaPositionValue = String(formData.get("cta_position") ?? "bottom-right");
  const sortOrder = parseSortOrder(formData);
  const startsAt = parseOptionalDate(formData, "starts_at");
  const endsAt = parseOptionalDate(formData, "ends_at");
  const ctaPrimaryUrl = nullableText(formData, "cta_primary_url");
  const ctaSecondaryUrl = nullableText(formData, "cta_secondary_url");

  if (title && title.length > maxTitleLength) {
    return { error: `Title must be ${maxTitleLength} characters or fewer.`, payload: null };
  }

  if (!isHomepageSlideCtaPosition(ctaPositionValue)) {
    return { error: `CTA position must be one of: ${homepageSlideCtaPositions.join(", ")}.`, payload: null };
  }

  if (sortOrder === null) {
    return { error: "Sort order must be a number.", payload: null };
  }

  if (startsAt === "invalid" || endsAt === "invalid") {
    return { error: "Start and end dates must be valid dates.", payload: null };
  }

  if (!isValidCtaUrl(ctaPrimaryUrl) || !isValidCtaUrl(ctaSecondaryUrl)) {
    return { error: "CTA URLs must be internal paths or valid HTTPS URLs.", payload: null };
  }

  return {
    error: null,
    payload: {
      title,
      subtitle: nullableText(formData, "subtitle"),
      cta_primary_label: nullableText(formData, "cta_primary_label"),
      cta_primary_url: ctaPrimaryUrl,
      cta_secondary_label: nullableText(formData, "cta_secondary_label"),
      cta_secondary_url: ctaSecondaryUrl,
      cta_position: ctaPositionValue,
      sort_order: sortOrder,
      is_active: parseBoolean(formData, "is_active", true),
      starts_at: startsAt,
      ends_at: endsAt,
      updated_at: new Date().toISOString(),
    },
  };
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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const uploadedPaths: string[] = [];

  try {
    const auth = await requireAdminJson();

    if (auth.error) {
      return auth.error;
    }

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Homepage slide update is not configured on the server.", 500);
    }

    const { data: existingSlide, error: readError } = await supabase
      .from("homepage_slides")
      .select("image_path, mobile_image_path")
      .eq("id", id)
      .maybeSingle();

    if (readError) {
      return jsonError(friendlySupabaseError(readError.message), 500);
    }

    if (!existingSlide) {
      return jsonError("Homepage slide was not found.", 404);
    }

    const formData = await request.formData();
    const desktopImage = formData.get("image");
    const mobileImage = formData.get("mobile_image");
    const desktopValidationError = validateImageFile(desktopImage, "Desktop poster");
    const mobileValidationError = validateImageFile(mobileImage, "Mobile poster");

    if (desktopValidationError || mobileValidationError) {
      return jsonError(desktopValidationError || mobileValidationError || "Invalid image.", 400);
    }

    const { error: payloadError, payload } = buildSlidePayload(formData);

    if (payloadError || !payload) {
      return jsonError(payloadError || "Homepage slide details are invalid.", 400);
    }

    const updates: Record<string, unknown> = { ...payload };
    const pathsToRemove: string[] = [];

    if (desktopImage instanceof File && desktopImage.size > 0) {
      const desktopUpload = await uploadSlideImage(desktopImage, "desktop");

      if (desktopUpload.error || !desktopUpload.path || !desktopUpload.url) {
        return jsonError(desktopUpload.error || "Desktop poster could not be uploaded.", 500);
      }

      uploadedPaths.push(desktopUpload.path);
      updates.image_path = desktopUpload.path;
      updates.image_url = desktopUpload.url;

      if (existingSlide.image_path) {
        pathsToRemove.push(existingSlide.image_path);
      }
    }

    if (mobileImage instanceof File && mobileImage.size > 0) {
      const mobileUpload = await uploadSlideImage(mobileImage, "mobile");

      if (mobileUpload.error || !mobileUpload.path || !mobileUpload.url) {
        await supabase.storage.from(homepageSlidesBucketName).remove(uploadedPaths);
        return jsonError(mobileUpload.error || "Mobile poster could not be uploaded.", 500);
      }

      uploadedPaths.push(mobileUpload.path);
      updates.mobile_image_path = mobileUpload.path;
      updates.mobile_image_url = mobileUpload.url;

      if (existingSlide.mobile_image_path) {
        pathsToRemove.push(existingSlide.mobile_image_path);
      }
    }

    const { data: slide, error: updateError } = await supabase
      .from("homepage_slides")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      await supabase.storage.from(homepageSlidesBucketName).remove(uploadedPaths);
      return jsonError(friendlySupabaseError(updateError.message), 500);
    }

    if (pathsToRemove.length) {
      await supabase.storage.from(homepageSlidesBucketName).remove(pathsToRemove);
    }

    revalidatePath("/");
    revalidatePath("/admin/homepage-slides");

    return NextResponse.json({ slide, message: "Homepage slide updated successfully." });
  } catch (error) {
    console.error("[api/admin/homepage-slides] Update failed", error);
    return jsonError("Homepage slide could not be updated. Please try again.", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminJson();

    if (auth.error) {
      return auth.error;
    }

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Homepage slide delete is not configured on the server.", 500);
    }

    const { data: existingSlide, error: readError } = await supabase
      .from("homepage_slides")
      .select("image_path, mobile_image_path")
      .eq("id", id)
      .maybeSingle();

    if (readError) {
      return jsonError(friendlySupabaseError(readError.message), 500);
    }

    if (!existingSlide) {
      return jsonError("Homepage slide was not found.", 404);
    }

    const pathsToRemove = [existingSlide.image_path, existingSlide.mobile_image_path].filter(
      (path): path is string => Boolean(path),
    );

    if (pathsToRemove.length) {
      const { error: removeError } = await supabase.storage.from(homepageSlidesBucketName).remove(pathsToRemove);

      if (removeError) {
        return jsonError(friendlySupabaseError(removeError.message), 500);
      }
    }

    const { error: deleteError } = await supabase.from("homepage_slides").delete().eq("id", id);

    if (deleteError) {
      return jsonError(friendlySupabaseError(deleteError.message), 500);
    }

    revalidatePath("/");
    revalidatePath("/admin/homepage-slides");

    return NextResponse.json({ message: "Homepage slide deleted successfully." });
  } catch (error) {
    console.error("[api/admin/homepage-slides] Delete failed", error);
    return jsonError("Homepage slide could not be deleted. Please try again.", 500);
  }
}
