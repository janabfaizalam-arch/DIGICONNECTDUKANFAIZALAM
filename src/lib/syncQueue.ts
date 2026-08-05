import "server-only";

import { isGoogleSheetsConfigured } from "@/lib/google";
import { ensureCrmSheetsExist } from "@/lib/googleSheets";
import { syncApplicationToSheets } from "@/lib/workSync";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CrmSyncEventType =
  | "application_created"
  | "payment_updated"
  | "status_updated"
  | "admin_updated"
  | "invoice_generated"
  | "whatsapp_sent"
  | "manual_retry"
  | "full_resync"
  | "historical_backfill";

export type CrmSyncJobRow = {
  id: string;
  event_type: string;
  application_id: string | null;
  customer_id: string | null;
  entity_key: string | null;
  payload: Record<string, unknown> | null;
  status: "pending" | "processing" | "success" | "failed";
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  next_attempt_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

const STALE_PROCESSING_MS = 10 * 60 * 1000;

function backoffSeconds(attempts: number): number {
  const table = [30, 120, 600, 1800, 7200];
  return table[Math.min(attempts, table.length - 1)] ?? 7200;
}

function mergePayload(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return {
    ...(existing && typeof existing === "object" ? existing : {}),
    ...(incoming && typeof incoming === "object" ? incoming : {}),
  };
}

/**
 * Enqueue a CRM sync job. Never throws to callers — failures are logged only.
 * Idempotent: at most one pending job per application (payloads are merged).
 */
export async function enqueueCrmSyncJob(input: {
  eventType: CrmSyncEventType;
  applicationId?: string | null;
  customerId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<{ ok: true; jobId: string | null; skipped?: string } | { ok: false; error: string }> {
  if (!isGoogleSheetsConfigured()) {
    console.info("[crm-sync] google_disabled", {
      eventType: input.eventType,
      applicationId: input.applicationId,
    });
    return { ok: true, jobId: null, skipped: "not_configured" };
  }

  if (!input.applicationId) {
    console.error("[crm-sync] enqueue_failed", {
      eventType: input.eventType,
      error: "applicationId is required",
    });
    return { ok: false, error: "applicationId is required" };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[crm-sync] enqueue_failed", {
      eventType: input.eventType,
      applicationId: input.applicationId,
      error: "Supabase admin unavailable",
    });
    return { ok: false, error: "Supabase admin unavailable" };
  }

  console.info("[crm-sync] enqueue_starting", {
    eventType: input.eventType,
    applicationId: input.applicationId,
  });

  const { data: existing } = await supabase
    .from("crm_sync_jobs")
    .select("id, payload, event_type")
    .eq("application_id", input.applicationId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const merged = mergePayload(existing.payload as Record<string, unknown> | null, input.payload);
    const events = Array.isArray(merged.events) ? merged.events : [];
    if (!events.includes(input.eventType)) events.push(input.eventType);
    if (existing.event_type && !events.includes(existing.event_type)) events.unshift(existing.event_type);

    await supabase
      .from("crm_sync_jobs")
      .update({
        event_type: input.eventType === "historical_backfill" ? existing.event_type : input.eventType,
        customer_id: input.customerId ?? null,
        payload: { ...merged, events },
        next_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("status", "pending");

    console.info("[crm-sync] enqueue_success", {
      jobId: existing.id,
      eventType: input.eventType,
      applicationId: input.applicationId,
      skipped: "merged_pending",
    });
    return { ok: true, jobId: existing.id, skipped: "merged_pending" };
  }

  const { data, error } = await supabase
    .from("crm_sync_jobs")
    .insert({
      event_type: input.eventType,
      application_id: input.applicationId,
      customer_id: input.customerId ?? null,
      entity_key: input.applicationId,
      payload: { ...(input.payload ?? {}), events: [input.eventType] },
      status: "pending",
      next_attempt_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Unique pending-per-application race: merge into the winner once.
    if (error.code === "23505") {
      const { data: raced } = await supabase
        .from("crm_sync_jobs")
        .select("id, payload, event_type")
        .eq("application_id", input.applicationId)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();
      if (raced?.id) {
        const merged = mergePayload(raced.payload as Record<string, unknown> | null, input.payload);
        const events = Array.isArray(merged.events) ? merged.events : [];
        if (!events.includes(input.eventType)) events.push(input.eventType);
        await supabase
          .from("crm_sync_jobs")
          .update({
            payload: { ...merged, events },
            next_attempt_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", raced.id)
          .eq("status", "pending");
        return { ok: true, jobId: raced.id, skipped: "merged_pending_race" };
      }
    }
    console.error("[crm-sync] enqueue_failed", {
      eventType: input.eventType,
      applicationId: input.applicationId,
      error: error.message,
      code: error.code,
    });
    return { ok: false, error: error.message || "Failed to enqueue CRM sync job" };
  }

  if (!data?.id) {
    return { ok: false, error: "Failed to enqueue CRM sync job" };
  }

  console.info("[crm-sync] enqueue_success", {
    jobId: data.id,
    eventType: input.eventType,
    applicationId: input.applicationId,
  });
  console.info("[crm-sync] queue_insert_complete", {
    jobId: data.id,
    applicationId: input.applicationId,
  });

  return { ok: true, jobId: data.id };
}

async function recoverStaleProcessingJobs(): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const { data, error } = await supabase
    .from("crm_sync_jobs")
    .update({
      status: "pending",
      next_attempt_at: new Date().toISOString(),
      last_error: "recovered_stale_processing",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .lt("updated_at", cutoff)
    .select("id");

  if (error) {
    console.error("[crm-sync] stale_recovery_failed", { error: error.message });
    return 0;
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.warn("[crm-sync] recovered_stale_processing", { count });
  }
  return count;
}

async function claimJob(job: CrmSyncJobRow): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("crm_sync_jobs")
    .update({
      status: "processing",
      attempts: job.attempts + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[crm-sync] claim_failed", { jobId: job.id, error: error.message });
    return false;
  }

  return Boolean(data?.id);
}

async function markSiblingPendingJobsCoalesced(applicationId: string, winnerJobId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase
    .from("crm_sync_jobs")
    .update({
      status: "success",
      last_error: null,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payload: { coalesced_into: winnerJobId },
    })
    .eq("application_id", applicationId)
    .eq("status", "pending")
    .neq("id", winnerJobId);
}

async function processOneJob(job: CrmSyncJobRow): Promise<"success" | "failed" | "skipped"> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return "failed";

  const claimed = await claimJob(job);
  if (!claimed) return "skipped";

  const ensure = await ensureCrmSheetsExist();
  if (!ensure.ok) {
    await failJob(job, ensure.error);
    return "failed";
  }

  if (!job.application_id) {
    await failJob(job, "Missing application_id");
    return "failed";
  }

  const payload = (job.payload ?? {}) as Record<string, unknown>;
  const result = await syncApplicationToSheets(job.application_id, {
    whatsappStatus: typeof payload.whatsappStatus === "string" ? payload.whatsappStatus : null,
    notes: typeof payload.notes === "string" ? payload.notes : null,
  });

  if (!result.ok) {
    await failJob(job, result.error);
    return "failed";
  }

  await supabase
    .from("crm_sync_jobs")
    .update({
      status: "success",
      last_error: null,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payload: {
        ...payload,
        workId: result.workId,
        customerCode: result.customerCode,
      },
    })
    .eq("id", job.id)
    .eq("status", "processing");

  await markSiblingPendingJobsCoalesced(job.application_id, job.id);

  console.info("[crm-sync] job_success", {
    jobId: job.id,
    applicationId: job.application_id,
    workId: result.workId,
  });

  return "success";
}

async function failJob(job: CrmSyncJobRow, error: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const attempts = job.attempts + 1;
  const exhausted = attempts >= job.max_attempts;
  const next = new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString();

  await supabase
    .from("crm_sync_jobs")
    .update({
      status: exhausted ? "failed" : "pending",
      last_error: error.slice(0, 1000),
      next_attempt_at: next,
      updated_at: new Date().toISOString(),
      processed_at: exhausted ? new Date().toISOString() : null,
    })
    .eq("id", job.id)
    .eq("status", "processing");

  console.error("[crm-sync] job_failed", {
    jobId: job.id,
    applicationId: job.application_id,
    attempts,
    exhausted,
    error: error.slice(0, 300),
  });
}

/**
 * Process due CRM sync jobs. Safe to call from cron or after().
 * Claims jobs optimistically so concurrent workers cannot double-process.
 */
export async function processCrmSyncQueue(options: { limit?: number } = {}): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  recovered: number;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { processed: 0, succeeded: 0, failed: 0, skipped: 0, recovered: 0 };

  if (!isGoogleSheetsConfigured()) {
    console.info("[crm-sync] processing_queue_skipped_google_disabled");
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0, recovered: 0 };
  }

  console.info("[crm-sync] processing_queue", { limit: options.limit ?? 10 });
  const recovered = await recoverStaleProcessingJobs();
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
  const now = new Date().toISOString();

  const { data: jobs, error } = await supabase
    .from("crm_sync_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", now)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[crm-sync] queue_fetch_failed", { error: error.message });
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0, recovered };
  }

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  const seenApps = new Set<string>();

  for (const raw of jobs ?? []) {
    const job = raw as CrmSyncJobRow;
    if (job.application_id) {
      if (seenApps.has(job.application_id)) {
        skipped += 1;
        continue;
      }
      seenApps.add(job.application_id);
    }

    try {
      const outcome = await processOneJob(job);
      if (outcome === "success") succeeded += 1;
      else if (outcome === "failed") failed += 1;
      else skipped += 1;
    } catch (error) {
      failed += 1;
      await failJob(job, error instanceof Error ? error.message : "Unexpected CRM sync error");
    }
  }

  return {
    processed: (jobs ?? []).length,
    succeeded,
    failed,
    skipped,
    recovered,
  };
}

export async function retryCrmSyncJob(jobId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Supabase admin unavailable" };

  const { data: job } = await supabase.from("crm_sync_jobs").select("id, payload").eq("id", jobId).maybeSingle();
  if (!job?.id) return { ok: false, error: "Job not found" };

  const { error } = await supabase
    .from("crm_sync_jobs")
    .update({
      status: "pending",
      next_attempt_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
      payload: mergePayload(job.payload as Record<string, unknown> | null, { manualRetry: true }),
    })
    .eq("id", jobId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listCrmSyncJobs(limit = 100): Promise<CrmSyncJobRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from("crm_sync_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as CrmSyncJobRow[];
}

export async function getCrmSyncSummary() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { pending: 0, success: 0, failed: 0, processing: 0 };
  }

  const [{ count: pending }, { count: success }, { count: failed }, { count: processing }] = await Promise.all([
    supabase.from("crm_sync_jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("crm_sync_jobs").select("id", { count: "exact", head: true }).eq("status", "success"),
    supabase.from("crm_sync_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("crm_sync_jobs").select("id", { count: "exact", head: true }).eq("status", "processing"),
  ]);

  return {
    pending: pending ?? 0,
    success: success ?? 0,
    failed: failed ?? 0,
    processing: processing ?? 0,
  };
}
