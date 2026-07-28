import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ADMIN_APPLICATION_SELECT,
  ADMIN_APPLICATION_SELECT_LEGACY,
  ADMIN_APPLICATION_SELECT_MINIMAL,
  normalizeAdminApplicationRow,
} from "@/lib/applications/safe-selects";
import {
  isAuthOrPermissionError,
  isMissingColumnError,
} from "@/lib/supabase/schema-compat";

export type AdminApplicationRowLoadResult =
  | { ok: true; row: Record<string, unknown>; mode: "modern" | "legacy" | "minimal" | "star" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "forbidden"; message: string; code?: string }
  | { ok: false; reason: "error"; message: string; code?: string };

type QueryError = { code?: string; message?: string } | null;

/**
 * Load a single applications row for admin detail with progressive schema fallback.
 * never maps schema/network errors to not_found.
 */
export async function loadAdminApplicationRow(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<AdminApplicationRowLoadResult> {
  const attempts: Array<{ mode: "modern" | "legacy" | "minimal" | "star"; select: string }> = [
    { mode: "modern", select: ADMIN_APPLICATION_SELECT },
    { mode: "legacy", select: ADMIN_APPLICATION_SELECT_LEGACY },
    { mode: "minimal", select: ADMIN_APPLICATION_SELECT_MINIMAL },
    { mode: "star", select: "*" },
  ];

  let lastError: QueryError = null;

  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from("applications")
      .select(attempt.select)
      .eq("id", applicationId)
      .maybeSingle();

    if (!error && data) {
      console.info("[admin-crm] APPLICATION_ROW_LOADED", {
        applicationId,
        mode: attempt.mode,
      });
      return {
        ok: true,
        mode: attempt.mode,
        row: normalizeAdminApplicationRow(data as unknown as Record<string, unknown>),
      };
    }

    if (!error && !data) {
      // Successful query, zero rows — true 404.
      console.info("[admin-crm] APPLICATION_ROW_NOT_FOUND", { applicationId, mode: attempt.mode });
      return { ok: false, reason: "not_found" };
    }

    lastError = error ? { code: error.code, message: error.message } : null;

    if (error && isAuthOrPermissionError(error)) {
      console.error("[admin-crm] APPLICATION_ROW_FORBIDDEN", {
        applicationId,
        mode: attempt.mode,
        code: error.code,
      });
      return {
        ok: false,
        reason: "forbidden",
        message: "Not authorized to load this application.",
        code: error.code,
      };
    }

    if (error && isMissingColumnError(error)) {
      console.warn("[admin-crm] APPLICATION_ROW_SCHEMA_FALLBACK", {
        applicationId,
        mode: attempt.mode,
        code: error.code,
        message: error.message,
      });
      continue;
    }

    // Non-schema DB/network error — stop; do not pretend the row is missing.
    console.error("[admin-crm] APPLICATION_ROW_QUERY_ERROR", {
      applicationId,
      mode: attempt.mode,
      code: error?.code,
      message: error?.message,
    });
    return {
      ok: false,
      reason: "error",
      message: "Application could not be loaded. Please retry.",
      code: error?.code,
    };
  }

  console.error("[admin-crm] APPLICATION_ROW_ALL_FALLBACKS_FAILED", {
    applicationId,
    code: lastError?.code,
    message: lastError?.message,
  });
  return {
    ok: false,
    reason: "error",
    message: "Application could not be loaded. Please retry.",
    code: lastError?.code,
  };
}
