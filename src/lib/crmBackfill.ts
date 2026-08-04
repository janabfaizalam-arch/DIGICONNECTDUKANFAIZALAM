import "server-only";

import { enqueueCrmSyncJob, processCrmSyncQueue } from "@/lib/syncQueue";
import { isGoogleSheetsConfigured } from "@/lib/google";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CrmBackfillResult = {
  ok: boolean;
  configured: boolean;
  scanned: number;
  enqueued: number;
  skippedExistingMap: number;
  skippedMissingId: number;
  enqueueErrors: number;
  processed?: {
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
    recovered: number;
  };
  nextCursor: string | null;
  error?: string;
};

/**
 * Enqueue CRM sync jobs for historical applications (idempotent upserts).
 * Pages by created_at ASC, id ASC. Does not block user traffic.
 */
export async function backfillCrmApplications(options: {
  limit?: number;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
  /** Skip apps already present in crm_sheet_row_map */
  skipMapped?: boolean;
  /** Process queue after enqueue (bounded) */
  processAfterEnqueue?: boolean;
  processLimit?: number;
}): Promise<CrmBackfillResult> {
  const configured = isGoogleSheetsConfigured();
  if (!configured) {
    return {
      ok: false,
      configured: false,
      scanned: 0,
      enqueued: 0,
      skippedExistingMap: 0,
      skippedMissingId: 0,
      enqueueErrors: 0,
      nextCursor: null,
      error: "Google Sheets is not configured",
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      ok: false,
      configured,
      scanned: 0,
      enqueued: 0,
      skippedExistingMap: 0,
      skippedMissingId: 0,
      enqueueErrors: 0,
      nextCursor: null,
      error: "Supabase admin unavailable",
    };
  }

  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const skipMapped = options.skipMapped !== false;

  let query = supabase
    .from("applications")
    .select("id, created_at, customer_id")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (options.cursorCreatedAt && options.cursorId) {
    // (created_at, id) > (cursorCreatedAt, cursorId)
    query = query.or(
      `created_at.gt.${options.cursorCreatedAt},and(created_at.eq.${options.cursorCreatedAt},id.gt.${options.cursorId})`,
    );
  }

  const { data: apps, error } = await query;
  if (error) {
    return {
      ok: false,
      configured,
      scanned: 0,
      enqueued: 0,
      skippedExistingMap: 0,
      skippedMissingId: 0,
      enqueueErrors: 0,
      nextCursor: null,
      error: error.message,
    };
  }

  const rows = apps ?? [];
  let enqueued = 0;
  let skippedExistingMap = 0;
  let skippedMissingId = 0;
  let enqueueErrors = 0;

  let mappedKeys = new Set<string>();
  if (skipMapped && rows.length) {
    const ids = rows.map((row) => row.id);
    const { data: mapped } = await supabase
      .from("crm_sheet_row_map")
      .select("entity_key")
      .eq("entity_type", "customer_work")
      .in("entity_key", ids);
    mappedKeys = new Set((mapped ?? []).map((row) => String(row.entity_key)));
  }

  for (const app of rows) {
    if (!app?.id) {
      skippedMissingId += 1;
      continue;
    }
    if (skipMapped && mappedKeys.has(app.id)) {
      skippedExistingMap += 1;
      continue;
    }

    const result = await enqueueCrmSyncJob({
      eventType: "historical_backfill",
      applicationId: app.id,
      customerId: app.customer_id ?? null,
      payload: { source: "backfill" },
    });

    if (result.ok && result.jobId) enqueued += 1;
    else if (!result.ok) enqueueErrors += 1;
  }

  let processed: CrmBackfillResult["processed"];
  if (options.processAfterEnqueue) {
    processed = await processCrmSyncQueue({ limit: options.processLimit ?? Math.min(enqueued || 10, 25) });
  }

  const last = rows[rows.length - 1];
  const nextCursor =
    rows.length === limit && last
      ? `${String(last.created_at)}|${String(last.id)}`
      : null;

  console.info("[crm-sync] backfill_batch", {
    scanned: rows.length,
    enqueued,
    skippedExistingMap,
    enqueueErrors,
    nextCursor,
  });

  return {
    ok: true,
    configured,
    scanned: rows.length,
    enqueued,
    skippedExistingMap,
    skippedMissingId,
    enqueueErrors,
    processed,
    nextCursor,
  };
}

export function parseBackfillCursor(cursor: string | null | undefined): {
  cursorCreatedAt: string | null;
  cursorId: string | null;
} {
  if (!cursor || !cursor.includes("|")) {
    return { cursorCreatedAt: null, cursorId: null };
  }
  const [cursorCreatedAt, cursorId] = cursor.split("|");
  return {
    cursorCreatedAt: cursorCreatedAt || null,
    cursorId: cursorId || null,
  };
}
