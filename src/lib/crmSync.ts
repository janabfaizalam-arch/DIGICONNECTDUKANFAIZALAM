import "server-only";

import { after } from "next/server";

import {
  enqueueCrmSyncJob,
  processCrmSyncQueue,
  type CrmSyncEventType,
} from "@/lib/syncQueue";
import { isGoogleSheetsConfigured } from "@/lib/google";

/**
 * Schedule CRM Google Sheets sync without blocking the user request.
 * Enqueues a durable job, then processes the queue in the background via after().
 */
export function scheduleCrmSync(
  applicationId: string | null | undefined,
  eventType: CrmSyncEventType,
  options: {
    customerId?: string | null;
    payload?: Record<string, unknown>;
    processInlineLimit?: number;
  } = {},
): void {
  if (!applicationId) return;

  const run = async () => {
    try {
      const enqueued = await enqueueCrmSyncJob({
        eventType,
        applicationId,
        customerId: options.customerId,
        payload: options.payload,
      });

      if (!enqueued.ok) {
        console.error("[crm-sync] schedule_enqueue_failed", {
          applicationId,
          eventType,
          error: enqueued.error,
        });
        return;
      }

      if (enqueued.skipped === "not_configured") {
        console.info("[crm-sync] schedule_skipped_not_configured", {
          applicationId,
          eventType,
        });
        return;
      }

      await processCrmSyncQueue({ limit: options.processInlineLimit ?? 5 });
    } catch (error) {
      console.error("[crm-sync] schedule_failed", {
        applicationId,
        eventType,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  };

  try {
    // Register while the request context is still active so Next.js keeps the
    // invocation alive for both the durable enqueue and inline processing.
    after(run);
  } catch {
    // Scripts and tests have no request context. Keep their existing safe,
    // non-blocking behavior while still running the same enqueue lifecycle.
    void run();
  }
}

export function scheduleCrmSyncMany(
  applicationIds: Array<string | null | undefined>,
  eventType: CrmSyncEventType,
): void {
  const unique = [...new Set(applicationIds.filter((id): id is string => Boolean(id)))];
  for (const id of unique) {
    scheduleCrmSync(id, eventType);
  }
}

export function crmSyncConfigured(): boolean {
  return isGoogleSheetsConfigured();
}

// Re-exports for a single import surface
export { processCrmSyncQueue, enqueueCrmSyncJob } from "@/lib/syncQueue";
export type { CrmSyncEventType } from "@/lib/syncQueue";
