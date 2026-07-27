import { randomUUID } from "crypto";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  DATABASE_UPGRADE_REQUIRED_MESSAGE,
  upgradeRequiredFromStorageError,
} from "@/lib/supabase/schema-compat";

/** Private bucket for WhatsApp-only / admin-only final outputs. */
export const FINAL_DOCUMENT_BUCKET = "application-final-documents";

/** Legacy buckets that historically held finals (public SELECT risk on `documents`). */
export const LEGACY_DOCUMENT_BUCKETS = ["documents", "application-documents"] as const;

export const ADMIN_FINAL_SIGNED_URL_TTL_SECONDS = Number(
  process.env.ADMIN_FINAL_DOCUMENT_URL_TTL_SECONDS ?? 600, // 10 minutes
);

/** AiSensy must fetch media after send — keep enough headroom. */
export const WHATSAPP_FINAL_SIGNED_URL_TTL_SECONDS = Number(
  process.env.AISENSY_FINAL_DOCUMENT_URL_TTL_SECONDS ?? 900, // 15 minutes
);

export function sanitizeFinalDocumentFileName(name: string) {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase().slice(0, 120);
  return base || "final-document.pdf";
}

export function buildFinalDocumentStoragePath(applicationId: string, originalFileName: string) {
  return `applications/${applicationId}/final/${randomUUID()}-${sanitizeFinalDocumentFileName(originalFileName)}`;
}

export function isFinalDocumentStorageBucket(bucket: string | null | undefined) {
  return String(bucket ?? "") === FINAL_DOCUMENT_BUCKET;
}

export function resolveDocumentStorageBucket(document: {
  storage_bucket?: string | null;
  storage_path?: string | null;
  is_final?: boolean | null;
  document_type?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  if (document.storage_bucket) return document.storage_bucket;
  const metaBucket = typeof document.metadata?.storage_bucket === "string" ? document.metadata.storage_bucket : null;
  if (metaBucket) return metaBucket;
  if (document.is_final || document.document_type === "final_document") {
    // New finals use private bucket; legacy finals often lived under documents/final-documents/
    if (document.storage_path?.startsWith("applications/") && document.storage_path.includes("/final/")) {
      return FINAL_DOCUMENT_BUCKET;
    }
    return "documents";
  }
  const path = String(document.storage_path ?? "");
  if (path.startsWith("applications/") || path.startsWith("application-documents/") || path.startsWith("final-documents/")) {
    return "documents";
  }
  return "application-documents";
}

export async function uploadFinalDocumentObject(options: {
  applicationId: string;
  fileName: string;
  bytes: ArrayBuffer;
  contentType: string;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false as const, error: "Storage unavailable." };
  }

  const storagePath = buildFinalDocumentStoragePath(options.applicationId, options.fileName);
  const { error } = await supabase.storage.from(FINAL_DOCUMENT_BUCKET).upload(storagePath, options.bytes, {
    contentType: options.contentType || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    // Never silently fall back to public/legacy buckets for NEW final uploads.
    const upgrade = upgradeRequiredFromStorageError(error);
    return {
      ok: false as const,
      error: upgrade || error.message || "Final document upload failed.",
      code: upgrade ? ("database_upgrade_required" as const) : ("upload_failed" as const),
    };
  }

  return {
    ok: true as const,
    bucket: FINAL_DOCUMENT_BUCKET,
    storagePath,
  };
}

/** Probe whether the private final bucket is available (service role). */
export async function assertFinalDocumentBucketReady() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false as const, error: "Storage unavailable.", code: "storage_unavailable" as const };
  }
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    return { ok: false as const, error: error.message, code: "list_failed" as const };
  }
  const bucket = (buckets || []).find((b) => b.id === FINAL_DOCUMENT_BUCKET);
  if (!bucket) {
    return {
      ok: false as const,
      error: DATABASE_UPGRADE_REQUIRED_MESSAGE,
      code: "database_upgrade_required" as const,
    };
  }
  if (bucket.public) {
    return {
      ok: false as const,
      error: "Final document bucket must be private.",
      code: "bucket_public" as const,
    };
  }
  return { ok: true as const, bucket: FINAL_DOCUMENT_BUCKET };
}

export async function createFinalDocumentSignedUrl(options: {
  bucket: string;
  storagePath: string;
  expiresInSeconds: number;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false as const, error: "Storage unavailable." };
  }

  const { data, error } = await supabase.storage
    .from(options.bucket)
    .createSignedUrl(options.storagePath, options.expiresInSeconds);

  if (error || !data?.signedUrl) {
    return { ok: false as const, error: error?.message || "Could not create signed URL." };
  }

  return { ok: true as const, signedUrl: data.signedUrl, expiresInSeconds: options.expiresInSeconds };
}

export async function removeFinalDocumentObject(bucket: string, storagePath: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.storage.from(bucket).remove([storagePath]);
}
