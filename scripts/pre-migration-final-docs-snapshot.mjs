/**
 * Read-only pre-migration snapshot for final-document hardening.
 *
 * Does NOT apply migrations.
 * Aborts write modes; inventory is read-only.
 *
 * Usage:
 *   node --env-file=.env.local scripts/pre-migration-final-docs-snapshot.mjs
 *   node --env-file=.env.local scripts/pre-migration-final-docs-snapshot.mjs --require-staging
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertStagingEnvironment, extractSupabaseProjectRef, loadEnvFiles } from "./lib/env-load.mjs";

loadEnvFiles();

const requireStaging = process.argv.includes("--require-staging");
const outDir = path.resolve(process.cwd(), "tmp");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outJson = path.join(outDir, `pre-migration-snapshot-${stamp}.json`);

function maskId(id) {
  if (!id) return null;
  const s = String(id);
  if (s.length < 12) return "***";
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function maskPath(p) {
  if (!p) return null;
  const s = String(p);
  // Keep structure, hide middle of filenames
  return s.replace(/([0-9a-f-]{8,})/gi, (m) => maskId(m) || "***");
}

async function safeCount(admin, table, filterFn) {
  let q = admin.from(table).select("*", { count: "exact", head: true });
  if (filterFn) q = filterFn(q);
  const { count, error } = await q;
  return { count: count ?? null, error: error ? { code: error.code, message: error.message } : null };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const ref = extractSupabaseProjectRef(url);

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const stagingGate = assertStagingEnvironment();
  if (requireStaging && !stagingGate.ok) {
    console.error("STAGING_GATE_FAILED");
    console.error(JSON.stringify(stagingGate, null, 2));
    process.exit(2);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = anonKey
    ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  const report = {
    generatedAt: new Date().toISOString(),
    environment: {
      projectRef: ref,
      urlHost: (() => { try { return new URL(url).host; } catch { return null; } })(),
      linkedProjectNameHint: "DIGICONNECTDUKANFAIZALAM (from supabase/.temp/linked-project.json)",
      stagingProven: stagingGate.ok,
      stagingGate,
      mode: "read-only-snapshot",
      warning: stagingGate.ok
        ? null
        : "Target is NOT proven staging. Do not apply migrations to this project.",
    },
    tables: {},
    columnsProbe: {},
    counts: {},
    storage: {},
    rlsProbe: {},
    notes: [],
  };

  // Table existence / counts — use explicit select to detect PGRST205
  for (const table of ["applications", "application_documents", "whatsapp_messages", "status_logs"]) {
    const { data, error } = await admin.from(table).select("id").limit(1);
    const missing = Boolean(error && /PGRST205|does not exist|schema cache/i.test(`${error.code} ${error.message}`));
    const countResult = missing ? { count: null, error: { code: error.code, message: error.message } } : await safeCount(admin, table);
    report.tables[table] = {
      reachable: !missing,
      exists: !missing,
      sampleRow: Boolean(data?.length),
      count: countResult.count,
      error: countResult.error || (error && !missing ? { code: error.code, message: error.message } : null),
    };
  }

  // Column probes via select of specific columns (PostgREST returns error if missing)
  const appCols = [
    "id",
    "final_document_id",
    "final_document_path",
    "final_document_url",
    "final_document_name",
    "completed_document_url",
    "completed_document_storage_path",
    "priority",
    "due_at",
    "whatsapp_final_delivery_status",
    "whatsapp_final_delivered_at",
  ];
  const docCols = [
    "id",
    "application_id",
    "document_type",
    "is_final",
    "customer_visible",
    "partner_visible",
    "storage_path",
    "storage_bucket",
    "file_url",
    "file_name",
    "file_type",
    "file_size",
    "delivery_channel",
    "delivery_status",
  ];

  async function probeColumns(table, cols) {
    const result = {};
    for (const col of cols) {
      const { error } = await admin.from(table).select(col).limit(1);
      result[col] = error
        ? { exists: !/does not exist|column .* does not exist/i.test(error.message), error: { code: error.code, message: error.message } }
        : { exists: true, error: null };
    }
    return result;
  }

  report.columnsProbe.applications = await probeColumns("applications", appCols);
  report.columnsProbe.application_documents = await probeColumns("application_documents", docCols);

  // Counts of interest
  report.counts.final_documents_is_final = await safeCount(admin, "application_documents", (q) =>
    q.eq("is_final", true),
  );
  report.counts.final_documents_type = await safeCount(admin, "application_documents", (q) =>
    q.eq("document_type", "final_document"),
  );
  report.counts.applications_with_final_document_path = await safeCount(admin, "applications", (q) =>
    q.not("final_document_path", "is", null),
  );
  report.counts.applications_with_final_document_url = await safeCount(admin, "applications", (q) =>
    q.not("final_document_url", "is", null),
  );
  report.counts.applications_with_completed_document_url = await safeCount(admin, "applications", (q) =>
    q.not("completed_document_url", "is", null),
  );
  report.counts.applications_with_final_document_id = await safeCount(admin, "applications", (q) =>
    q.not("final_document_id", "is", null),
  );
  report.counts.documents_with_file_url = await safeCount(admin, "application_documents", (q) =>
    q.not("file_url", "is", null),
  );

  // Path pattern samples (masked) — limited
  const { data: pathSamples, error: pathErr } = await admin
    .from("application_documents")
    .select("id, application_id, document_type, is_final, storage_path, file_url, file_size, file_type")
    .or("is_final.eq.true,document_type.eq.final_document")
    .limit(50);

  const { data: legacyPathApps, error: legacyErr } = await admin
    .from("applications")
    .select("id, final_document_path, completed_document_storage_path, final_document_url, completed_document_url, final_document_id")
    .or("final_document_path.not.is.null,completed_document_storage_path.not.is.null,final_document_url.not.is.null,completed_document_url.not.is.null,final_document_id.not.is.null")
    .limit(50);

  const { data: slashFinalDocs } = await admin
    .from("application_documents")
    .select("id, application_id, storage_path, is_final, document_type")
    .or("storage_path.ilike.%/final/%,storage_path.ilike.%final-documents/%")
    .limit(50);

  report.samples = {
    finalDocumentRows: (pathSamples || []).map((r) => ({
      documentId: maskId(r.id),
      applicationId: maskId(r.application_id),
      document_type: r.document_type,
      is_final: r.is_final,
      storage_path: maskPath(r.storage_path),
      has_file_url: Boolean(r.file_url),
      file_size: r.file_size,
      file_type: r.file_type,
    })),
    pathSampleError: pathErr ? pathErr.message : null,
    legacyApplicationFields: (legacyPathApps || []).map((r) => ({
      applicationId: maskId(r.id),
      has_final_document_path: Boolean(r.final_document_path),
      has_completed_document_storage_path: Boolean(r.completed_document_storage_path),
      has_final_document_url: Boolean(r.final_document_url),
      has_completed_document_url: Boolean(r.completed_document_url),
      has_final_document_id: Boolean(r.final_document_id),
      final_document_path: maskPath(r.final_document_path),
      completed_document_storage_path: maskPath(r.completed_document_storage_path),
    })),
    legacyError: legacyErr ? legacyErr.message : null,
    pathPatternRows: (slashFinalDocs || []).map((r) => ({
      documentId: maskId(r.id),
      applicationId: maskId(r.application_id),
      storage_path: maskPath(r.storage_path),
      is_final: r.is_final,
      document_type: r.document_type,
    })),
  };

  // Storage buckets
  const { data: buckets, error: bErr } = await admin.storage.listBuckets();
  report.storage.buckets = (buckets || []).map((b) => ({
    id: b.id,
    name: b.name,
    public: b.public,
    file_size_limit: b.file_size_limit,
    allowed_mime_types: b.allowed_mime_types,
  }));
  report.storage.listBucketsError = bErr ? bErr.message : null;
  report.storage.hasApplicationFinalDocuments = (buckets || []).some(
    (b) => b.id === "application-final-documents",
  );
  report.storage.documentsBucket = (buckets || []).find((b) => b.id === "documents") || null;

  // Anon list probe on private target (should fail or return empty/denied)
  if (anon) {
    const { data: anonList, error: anonErr } = await anon.storage
      .from("application-final-documents")
      .list("applications", { limit: 1 });
    report.rlsProbe.anonListFinalBucket = {
      dataCount: anonList?.length ?? 0,
      error: anonErr ? { message: anonErr.message, statusCode: anonErr.statusCode || anonErr.status } : null,
    };

    const { data: anonDocs, error: anonDocsErr } = await anon
      .from("application_documents")
      .select("id")
      .limit(5);
    report.rlsProbe.anonSelectApplicationDocuments = {
      rowCount: anonDocs?.length ?? 0,
      error: anonDocsErr ? { code: anonDocsErr.code, message: anonDocsErr.message } : null,
    };

    const { data: anonWa, error: anonWaErr } = await anon
      .from("whatsapp_messages")
      .select("id")
      .limit(5);
    report.rlsProbe.anonSelectWhatsappMessages = {
      rowCount: anonWa?.length ?? 0,
      error: anonWaErr ? { code: anonWaErr.code, message: anonWaErr.message } : null,
      note: anonWaErr ? "Table missing or RLS denied (expected if migration not applied / RLS on)." : null,
    };
  }

  report.notes.push(
    "Storage RLS policy names cannot be fully enumerated via PostgREST; use SQL editor on staging for pg_policies export.",
  );
  report.notes.push(
    "Index/constraint inventory requires SQL access (supabase db dump or information_schema). CLI currently blocked by App Control on this host.",
  );

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify({
    written: outJson,
    projectRef: ref,
    stagingProven: stagingGate.ok,
    tables: report.tables,
    counts: report.counts,
    buckets: report.storage.buckets?.map((b) => ({ id: b.id, public: b.public })),
    hasFinalBucket: report.storage.hasApplicationFinalDocuments,
    stagingGateErrors: stagingGate.errors,
  }, null, 2));

  if (!stagingGate.ok) {
    console.error("\n[ABORT APPLY] Environment is not proven staging. Snapshot is informational only.");
    process.exitCode = 3;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
