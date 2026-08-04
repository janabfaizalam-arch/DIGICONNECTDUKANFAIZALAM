/**
 * Historical CRM sync backfill (idempotent).
 *
 * Usage:
 *   node --env-file=.env.local --experimental-strip-types scripts/crm-sync-backfill.mjs
 *   node --env-file=.env.local --experimental-strip-types scripts/crm-sync-backfill.mjs --limit=50 --process
 *   node --env-file=.env.local --experimental-strip-types scripts/crm-sync-backfill.mjs --include-mapped
 *
 * Requires GOOGLE_SHEETS_* + SUPABASE_SERVICE_ROLE_KEY.
 * Safe to re-run: Application ID upserts; mapped apps skipped by default.
 */

import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const cursorArg = process.argv.find((a) => a.startsWith("--cursor="));
const maxBatchesArg = process.argv.find((a) => a.startsWith("--max-batches="));

const limit = Number(limitArg?.split("=")[1] || 100);
const maxBatches = Number(maxBatchesArg?.split("=")[1] || 20);
const processAfter = args.has("--process");
const includeMapped = args.has("--include-mapped");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function configured() {
  return Boolean(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.includes("BEGIN PRIVATE KEY"),
  );
}

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!configured()) {
  console.error("Google Sheets env vars are not configured. Aborting.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function enqueueBatch(cursorCreatedAt, cursorId) {
  let query = supabase
    .from("applications")
    .select("id, created_at, customer_id")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (cursorCreatedAt && cursorId) {
    query = query.or(
      `created_at.gt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.gt.${cursorId})`,
    );
  }

  const { data: apps, error } = await query;
  if (error) throw new Error(error.message);

  const rows = apps || [];
  let enqueued = 0;
  let skippedMapped = 0;

  let mapped = new Set();
  if (!includeMapped && rows.length) {
    const { data: mapRows } = await supabase
      .from("crm_sheet_row_map")
      .select("entity_key")
      .eq("entity_type", "customer_work")
      .in(
        "entity_key",
        rows.map((r) => r.id),
      );
    mapped = new Set((mapRows || []).map((r) => r.entity_key));
  }

  for (const app of rows) {
    if (!includeMapped && mapped.has(app.id)) {
      skippedMapped += 1;
      continue;
    }

    const { data: pending } = await supabase
      .from("crm_sync_jobs")
      .select("id, payload")
      .eq("application_id", app.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (pending?.id) {
      const payload = { ...(pending.payload || {}), source: "backfill", events: ["historical_backfill"] };
      await supabase
        .from("crm_sync_jobs")
        .update({
          payload,
          next_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pending.id);
      enqueued += 1;
      continue;
    }

    const { error: insertError } = await supabase.from("crm_sync_jobs").insert({
      event_type: "historical_backfill",
      application_id: app.id,
      customer_id: app.customer_id ?? null,
      entity_key: app.id,
      payload: { source: "backfill", events: ["historical_backfill"] },
      status: "pending",
      next_attempt_at: new Date().toISOString(),
    });

    if (insertError && insertError.code !== "23505") {
      console.error("enqueue failed", app.id, insertError.message);
      continue;
    }
    enqueued += 1;
  }

  const last = rows[rows.length - 1];
  return {
    scanned: rows.length,
    enqueued,
    skippedMapped,
    nextCreatedAt: last?.created_at || null,
    nextId: last?.id || null,
    done: rows.length < limit,
  };
}

async function kickProcessor() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  const secret = process.env.CRON_SECRET || process.env.CRM_SYNC_SECRET;
  if (!base || !secret) {
    console.warn("Skipping remote process: NEXT_PUBLIC_SITE_URL/VERCEL_URL and CRON_SECRET required");
    return;
  }
  const url = base.startsWith("http") ? `${base.replace(/\/$/, "")}/api/crm-sync` : `https://${base}/api/crm-sync`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ limit: 25 }),
  });
  const body = await res.text();
  console.log("process", res.status, body.slice(0, 300));
}

async function main() {
  let cursorCreatedAt = null;
  let cursorId = null;
  if (cursorArg) {
    const raw = cursorArg.split("=")[1] || "";
    const [cAt, cId] = raw.split("|");
    cursorCreatedAt = cAt || null;
    cursorId = cId || null;
  }

  let batch = 0;
  let totalEnqueued = 0;
  let totalScanned = 0;

  while (batch < maxBatches) {
    batch += 1;
    const result = await enqueueBatch(cursorCreatedAt, cursorId);
    totalEnqueued += result.enqueued;
    totalScanned += result.scanned;
    console.log(`batch ${batch}`, result);

    if (processAfter && result.enqueued > 0) {
      await kickProcessor();
    }

    if (result.done) break;
    cursorCreatedAt = result.nextCreatedAt;
    cursorId = result.nextId;
  }

  console.log("backfill complete", {
    batches: batch,
    totalScanned,
    totalEnqueued,
    nextCursor: cursorCreatedAt && cursorId ? `${cursorCreatedAt}|${cursorId}` : null,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
