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

  void (async () => {
    try {
      const enqueued = await enqueueCrmSyncJob({
        eventType,
        applicationId,
        customerId: options.customerId,
        payload: options.payload,
      });

      if (!enqueued.ok || enqueued.skipped === "not_configured") return;

      const run = async () => {
        try {
          await processCrmSyncQueue({ limit: options.processInlineLimit ?? 5 });
        } catch (error) {
          console.error("[crm-sync] background_process_failed", {
            applicationId,
            eventType,
            error: error instanceof Error ? error.message : "unknown",
          });
        }
      };

      try {
        after(run);
      } catch {
        // outside request context (scripts/tests) — fire and forget
        void run();
      }
    } catch (error) {
      console.error("[crm-sync] schedule_failed", {
        applicationId,
        eventType,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  })();
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
