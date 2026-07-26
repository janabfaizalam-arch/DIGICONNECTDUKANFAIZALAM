import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { validateFileSignature } from "@/lib/file-validation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { DPR_LANDING_PATH, DPR_MEDIA_BUCKET } from "./constants";

export const DPR_ADMIN_PATH = "/admin/services/dpr";
export const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const maxImageSize = 8 * 1024 * 1024;

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

export function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) return { error: jsonError("Please log in.", 401), user: null };
  if (!isAdminRole(role)) return { error: jsonError("Admin access required.", 403), user: null };
  return { error: null, user };
}

export function revalidateDprPaths() {
  revalidatePath(DPR_LANDING_PATH);
  revalidatePath(DPR_ADMIN_PATH);
}

export function nullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function toIsoOrNull(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseSortOrder(value: unknown) {
  const sortOrder = Number.parseInt(String(value ?? "0").trim() || "0", 10);
  return Number.isNaN(sortOrder) ? null : sortOrder;
}

export function isValidCtaUrl(value: string | null) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (value.startsWith("#")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateImageFile(file: FormDataEntryValue | null, label: string, required = false) {
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

export async function uploadDprImage(file: File, folder: "desktop" | "mobile") {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { error: "Banner upload is not configured.", path: null, url: null };
  }

  const signature = await validateFileSignature(file, allowedImageTypes);
  if (!signature.valid) {
    return { error: signature.error || "Invalid image file.", path: null, url: null };
  }

  const storagePath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${cleanFileName(file.name)}`;
  const { error } = await supabase.storage.from(DPR_MEDIA_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return { error: error.message, path: null, url: null };
  }

  const { data } = supabase.storage.from(DPR_MEDIA_BUCKET).getPublicUrl(storagePath);
  return { error: null, path: storagePath, url: data.publicUrl };
}

export async function readJsonBody<T extends Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as T) : null;
  } catch {
    return null;
  }
}
