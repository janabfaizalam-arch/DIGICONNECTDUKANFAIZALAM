import "server-only";

import { after } from "next/server";

import {
  enqueueCrmSyncJob,
  processCrmSyncQueue,
  type CrmSyncEventType,
} from "@/lib/syncQueue";
import { isGoogleSheetsConfigured } from "@/lib/google";

/**
 * Schedule CRM Google Sheets sync.
 *
 * CRITICAL (Vercel/serverless): enqueue MUST be awaited before the HTTP response
 * finishes. A detached `void (async () => {})()` can be killed with 0 rows inserted.
 * Wrapping only in `after()` is better than detached async, but awaiting enqueue is
 * the durable guarantee that `crm_sync_jobs` gets a row before the request ends.
 * Queue processing may run in `after()` so it does not block the user response.
 */
export async function scheduleCrmSync(
  applicationId: string | null | undefined,
  eventType: CrmSyncEventType,
  options: {
    customerId?: string | null;
    payload?: Record<string, unknown>;
    processInlineLimit?: number;
    /** When true, also process the queue before returning (admin/manual paths). */
    awaitProcess?: boolean;
  } = {},
): Promise<{ ok: boolean; jobId?: string | null; skipped?: string; error?: string }> {
  if (!applicationId) {
    console.info("[crm-sync] schedule_skipped_no_application", { eventType });
    return { ok: false, error: "missing_application_id" };
  }

  console.info("[crm-sync] schedule_start", {
    applicationId,
    eventType,
    googleConfigured: isGoogleSheetsConfigured(),
  });

  try {
    console.info("[crm-sync] enqueue_starting", { applicationId, eventType });
    const enqueued = await enqueueCrmSyncJob({
      eventType,
      applicationId,
      customerId: options.customerId,
      payload: options.payload,
    });

    if (!enqueued.ok) {
      console.error("[crm-sync] enqueue_failed", {
        applicationId,
        eventType,
        error: enqueued.error,
      });
      return { ok: false, error: enqueued.error };
    }

    if (enqueued.skipped === "not_configured") {
      console.info("[crm-sync] google_disabled", { applicationId, eventType });
      return { ok: true, jobId: null, skipped: "not_configured" };
    }

    console.info("[crm-sync] enqueue_success", {
      applicationId,
      eventType,
      jobId: enqueued.jobId,
      skipped: enqueued.skipped,
    });

    const runProcess = async () => {
      try {
        console.info("[crm-sync] processing_queue", {
          applicationId,
          eventType,
          limit: options.processInlineLimit ?? 5,
        });
        const result = await processCrmSyncQueue({
          limit: options.processInlineLimit ?? 5,
        });
        console.info("[crm-sync] processing_queue_done", {
          applicationId,
          eventType,
          ...result,
        });
      } catch (error) {
        console.error("[crm-sync] background_process_failed", {
          applicationId,
          eventType,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    };

    if (options.awaitProcess) {
      await runProcess();
    } else {
      try {
        after(runProcess);
      } catch {
        // Outside request context (scripts/tests) — enqueue already persisted.
        void runProcess();
      }
    }

    return { ok: true, jobId: enqueued.jobId, skipped: enqueued.skipped };
  } catch (error) {
    console.error("[crm-sync] schedule_failed", {
      applicationId,
      eventType,
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "schedule_failed",
    };
  }
}

export async function scheduleCrmSyncMany(
  applicationIds: Array<string | null | undefined>,
  eventType: CrmSyncEventType,
): Promise<void> {
  const unique = [...new Set(applicationIds.filter((id): id is string => Boolean(id)))];
  console.info("[crm-sync] schedule_many_start", {
    eventType,
    count: unique.length,
    googleConfigured: isGoogleSheetsConfigured(),
  });
  // Enqueue sequentially so idempotent pending-merge races stay simple and durable.
  for (const id of unique) {
    await scheduleCrmSync(id, eventType);
  }
  console.info("[crm-sync] schedule_many_done", { eventType, count: unique.length });
}

export function crmSyncConfigured(): boolean {
  return isGoogleSheetsConfigured();
}

// Re-exports for a single import surface
export { processCrmSyncQueue, enqueueCrmSyncJob } from "@/lib/syncQueue";
export type { CrmSyncEventType } from "@/lib/syncQueue";
