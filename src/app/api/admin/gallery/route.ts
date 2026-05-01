import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { galleryBucketName } from "@/lib/gallery";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function friendlySupabaseError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("bucket") && lowerMessage.includes("not found")) {
    return "Gallery storage bucket is not available yet. Please apply the Supabase gallery migration.";
  }

  if (lowerMessage.includes("gallery_images") || lowerMessage.includes("relation") || lowerMessage.includes("does not exist")) {
    return "Gallery database table is not available yet. Please apply the Supabase gallery migration.";
  }

  return message;
}

async function requireAdminJson() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    return { error: jsonError("Please log in before managing gallery photos.", 401), user: null };
  }

  if (!isAdminRole(role)) {
    return { error: jsonError("You do not have permission to manage gallery photos.", 403), user: null };
  }

  return { error: null, user };
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminJson();

    if (auth.error) {
      return auth.error;
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Gallery upload is not configured on the server.", 500);
    }

    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const file = formData.get("image");

    if (!(file instanceof File) || file.size === 0) {
      return jsonError("Please choose a gallery image.", 400);
    }

    if (!file.type.startsWith("image/") || !allowedImageTypes.includes(file.type)) {
      return jsonError("Gallery image must be JPG, PNG, or WebP.", 400);
    }

    if (file.size > maxImageSize) {
      return jsonError("Gallery image must be smaller than 5MB.", 400);
    }

    const storagePath = `homepage/${Date.now()}-${cleanFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from(galleryBucketName).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      return jsonError(friendlySupabaseError(uploadError.message), 500);
    }

    const { data: publicUrlData } = supabase.storage.from(galleryBucketName).getPublicUrl(storagePath);
    const { data: image, error: insertError } = await supabase
      .from("gallery_images")
      .insert({
        title: title || null,
        image_url: publicUrlData.publicUrl,
        storage_path: storagePath,
        active: true,
      })
      .select("id, title, image_url, storage_path, active, created_at")
      .single();

    if (insertError) {
      await supabase.storage.from(galleryBucketName).remove([storagePath]);
      return jsonError(friendlySupabaseError(insertError.message), 500);
    }

    revalidatePath("/");
    revalidatePath("/admin/gallery");

    return NextResponse.json({
      image,
      message: "Gallery photo uploaded successfully.",
    });
  } catch (error) {
    console.error("[api/admin/gallery] Upload failed", error);
    return jsonError("Gallery upload failed. Please try again.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdminJson();

    if (auth.error) {
      return auth.error;
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Gallery delete is not configured on the server.", 500);
    }

    const body = (await request.json().catch(() => null)) as { id?: string; storagePath?: string } | null;
    const id = String(body?.id ?? "");

    if (!id) {
      return jsonError("Gallery image details are missing.", 400);
    }

    const { data: existingImage, error: readError } = await supabase
      .from("gallery_images")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();

    if (readError) {
      return jsonError(friendlySupabaseError(readError.message), 500);
    }

    const storagePath = existingImage?.storage_path || String(body?.storagePath ?? "");

    if (!storagePath) {
      return jsonError("Gallery photo was not found.", 404);
    }

    const { error: removeError } = await supabase.storage.from(galleryBucketName).remove([storagePath]);

    if (removeError) {
      return jsonError(friendlySupabaseError(removeError.message), 500);
    }

    const { error: deleteError } = await supabase.from("gallery_images").delete().eq("id", id);

    if (deleteError) {
      return jsonError(friendlySupabaseError(deleteError.message), 500);
    }

    revalidatePath("/");
    revalidatePath("/admin/gallery");

    return NextResponse.json({
      message: "Gallery photo deleted successfully.",
    });
  } catch (error) {
    console.error("[api/admin/gallery] Delete failed", error);
    return jsonError("Gallery photo could not be deleted. Please try again.", 500);
  }
}
