/**
 * Staging-safe historical final-document COPY tool.
 *
 * - Default: --dry-run (no writes)
 * - Explicit: --execute to copy + update rows
 * - Never deletes legacy storage objects
 * - Never prints signed/public URLs
 * - Aborts unless SUPABASE_TARGET_ENV=staging and project ref allowlisted
 * - Known production ref oqcudhmnsmqwlfzlrvfw is hard-blocked
 *
 * Examples:
 *   node --experimental-strip-types --env-file=.env.local scripts/migrate-legacy-final-documents.ts --dry-run
 *   node --experimental-strip-types --env-file=.env.local scripts/migrate-legacy-final-documents.ts --execute --limit=10
 *   node --experimental-strip-types --env-file=.env.local scripts/migrate-legacy-final-documents.ts --dry-run --application-id=<uuid>
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  assertStagingEnvironment,
  extractSupabaseProjectRef,
  loadEnvFiles,
} from "./lib/env-load.mjs";

loadEnvFiles();

const FINAL_BUCKET = "application-final-documents";
const LEGACY_BUCKETS = ["documents", "application-documents"] as const;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/octet-stream",
]);

type CliArgs = {
  dryRun: boolean;
  execute: boolean;
  applicationId: string | null;
  limit: number | null;
  continueOnError: boolean;
  inventoryOnly: boolean;
  outDir: string;
};

type Candidate = {
  source: "application_documents" | "applications_legacy";
  applicationId: string;
  documentId: string | null;
  currentBucket: string;
  currentPath: string;
  fileName: string;
  mimeType: string | null;
  size: number | null;
  isFinal: boolean;
  documentType: string | null;
  hasPublicUrlField: boolean;
  eligibility: "eligible" | "skip";
  skipReason: string | null;
  targetPath: string | null;
};

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  };
  const execute = argv.includes("--execute");
  const dryRun = !execute || argv.includes("--dry-run");
  return {
    dryRun,
    execute,
    applicationId: get("application-id"),
    limit: get("limit") ? Number(get("limit")) : null,
    continueOnError: argv.includes("--continue-on-error"),
    inventoryOnly: argv.includes("--inventory-only"),
    outDir: get("out-dir") || path.resolve(process.cwd(), "tmp"),
  };
}

function maskId(id: string | null | undefined) {
  if (!id) return null;
  const s = String(id);
  if (s.length < 12) return "***";
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function maskPath(p: string | null | undefined) {
  if (!p) return null;
  return String(p).replace(/([0-9a-f-]{8,})/gi, (m) => maskId(m) || "***");
}

function sanitizeFileName(name: string) {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase().slice(0, 120);
  return base || "final-document.pdf";
}

function buildTargetPath(applicationId: string, originalFileName: string) {
  return `applications/${applicationId}/final/${crypto.randomUUID()}-${sanitizeFileName(originalFileName)}`;
}

function looksLikeFinalPath(storagePath: string | null | undefined) {
  const p = String(storagePath || "");
  return p.includes("/final/") || p.includes("final-documents/");
}

function inferBucket(storagePath: string | null | undefined, storageBucket: string | null | undefined) {
  if (storageBucket) return storageBucket;
  const p = String(storagePath || "");
  if (p.startsWith("applications/") && p.includes("/final/")) return FINAL_BUCKET;
  if (p.startsWith("final-documents/") || p.includes("final-documents/")) return "documents";
  return "documents";
}

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function downloadObject(
  admin: SupabaseClient,
  bucket: string,
  objectPath: string,
): Promise<{ ok: true; bytes: Buffer; contentType: string | null } | { ok: false; error: string }> {
  const { data, error } = await admin.storage.from(bucket).download(objectPath);
  if (error || !data) {
    return { ok: false, error: error?.message || "download failed" };
  }
  const ab = await data.arrayBuffer();
  const bytes = Buffer.from(ab);
  return { ok: true, bytes, contentType: data.type || null };
}

async function objectExists(admin: SupabaseClient, bucket: string, objectPath: string) {
  const dir = objectPath.includes("/") ? objectPath.slice(0, objectPath.lastIndexOf("/")) : "";
  const name = objectPath.includes("/") ? objectPath.slice(objectPath.lastIndexOf("/") + 1) : objectPath;
  const { data, error } = await admin.storage.from(bucket).list(dir, { search: name, limit: 100 });
  if (error) return { exists: false as const, error: error.message, size: null as number | null };
  const hit = (data || []).find((f) => f.name === name);
  return {
    exists: Boolean(hit),
    error: null as string | null,
    size: hit?.metadata?.size != null ? Number(hit.metadata.size) : null,
  };
}

async function collectCandidates(admin: SupabaseClient, args: CliArgs): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  const docSelectWithBucket =
    "id, application_id, document_type, is_final, storage_path, storage_bucket, file_name, document_name, file_url, file_type, file_size, customer_visible, partner_visible";
  const docSelectLegacy =
    "id, application_id, document_type, is_final, storage_path, file_name, document_name, file_url, file_type, file_size";

  async function loadDocs(select: string) {
    let docQuery = admin
      .from("application_documents")
      .select(select)
      .or("is_final.eq.true,document_type.eq.final_document,storage_path.ilike.%/final/%,storage_path.ilike.%final-documents/%")
      .order("created_at", { ascending: false });
    if (args.applicationId) docQuery = docQuery.eq("application_id", args.applicationId);
    if (args.limit) docQuery = docQuery.limit(Math.max(args.limit * 3, args.limit));
    return docQuery;
  }

  let { data: docs, error: docsErr } = await loadDocs(docSelectWithBucket);
  if (docsErr && /column .* does not exist|42703/i.test(docsErr.message)) {
    ({ data: docs, error: docsErr } = await loadDocs(docSelectLegacy));
  }
  if (docsErr) throw new Error(`application_documents query failed: ${docsErr.message}`);

  for (const row of docs || []) {
    const applicationId = String(row.application_id);
    const currentPath = String(row.storage_path || "").trim();
    const currentBucket = inferBucket(currentPath, row.storage_bucket);
    const key = `${currentBucket}:${currentPath || row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let eligibility: Candidate["eligibility"] = "eligible";
    let skipReason: string | null = null;

    if (!currentPath) {
      eligibility = "skip";
      skipReason = "missing storage_path";
    } else if (currentBucket === FINAL_BUCKET && currentPath.includes("/final/")) {
      eligibility = "skip";
      skipReason = "already_in_private_final_bucket";
    } else if (!LEGACY_BUCKETS.includes(currentBucket as (typeof LEGACY_BUCKETS)[number]) && currentBucket !== FINAL_BUCKET) {
      eligibility = "skip";
      skipReason = `unexpected_bucket:${currentBucket}`;
    }

    candidates.push({
      source: "application_documents",
      applicationId,
      documentId: row.id,
      currentBucket,
      currentPath,
      fileName: String(row.file_name || row.document_name || "final-document.pdf"),
      mimeType: row.file_type || null,
      size: row.file_size ?? null,
      isFinal: Boolean(row.is_final) || row.document_type === "final_document",
      documentType: row.document_type,
      hasPublicUrlField: Boolean(row.file_url),
      eligibility,
      skipReason,
      targetPath:
        eligibility === "eligible" ? buildTargetPath(applicationId, String(row.file_name || row.document_name || "final.pdf")) : null,
    });
  }

  let appQuery = admin
    .from("applications")
    .select(
      "id, final_document_path, final_document_url, final_document_name, completed_document_url, completed_document_storage_path",
    )
    .or(
      "final_document_path.not.is.null,completed_document_storage_path.not.is.null,final_document_url.not.is.null,completed_document_url.not.is.null",
    );

  if (args.applicationId) appQuery = appQuery.eq("id", args.applicationId);
  if (args.limit) appQuery = appQuery.limit(Math.max(args.limit * 3, args.limit));

  const { data: apps, error: appsErr } = await appQuery;
  if (appsErr) throw new Error(`applications legacy query failed: ${appsErr.message}`);

  for (const app of apps || []) {
    const applicationId = String(app.id);
    const legacyPath = String(app.final_document_path || app.completed_document_storage_path || "").trim();
    if (!legacyPath) {
      if (app.final_document_url || app.completed_document_url) {
        candidates.push({
          source: "applications_legacy",
          applicationId,
          documentId: null,
          currentBucket: "unknown",
          currentPath: "",
          fileName: String(app.final_document_name || "final-document.pdf"),
          mimeType: null,
          size: null,
          isFinal: true,
          documentType: "final_document",
          hasPublicUrlField: true,
          eligibility: "skip",
          skipReason: "legacy_url_without_storage_path",
          targetPath: null,
        });
      }
      continue;
    }

    const already = candidates.some((c) => c.applicationId === applicationId && c.currentPath === legacyPath);
    if (already) continue;

    const currentBucket = inferBucket(legacyPath, null);
    let eligibility: Candidate["eligibility"] = "eligible";
    let skipReason: string | null = null;
    if (currentBucket === FINAL_BUCKET) {
      eligibility = "skip";
      skipReason = "already_in_private_final_bucket";
    }

    candidates.push({
      source: "applications_legacy",
      applicationId,
      documentId: null,
      currentBucket,
      currentPath: legacyPath,
      fileName: String(app.final_document_name || path.basename(legacyPath) || "final-document.pdf"),
      mimeType: null,
      size: null,
      isFinal: true,
      documentType: "final_document",
      hasPublicUrlField: Boolean(app.final_document_url || app.completed_document_url),
      eligibility,
      skipReason,
      targetPath: eligibility === "eligible" ? buildTargetPath(applicationId, String(app.final_document_name || "final.pdf")) : null,
    });
  }

  // Prefer document rows; sort eligible first
  candidates.sort((a, b) => {
    if (a.eligibility !== b.eligibility) return a.eligibility === "eligible" ? -1 : 1;
    return a.applicationId.localeCompare(b.applicationId);
  });

  if (args.limit != null) {
    const eligible = candidates.filter((c) => c.eligibility === "eligible").slice(0, args.limit);
    const skipped = candidates.filter((c) => c.eligibility === "skip");
    return [...eligible, ...skipped];
  }
  return candidates;
}

async function migrateOne(
  admin: SupabaseClient,
  candidate: Candidate,
  args: CliArgs,
): Promise<Record<string, unknown>> {
  const base = {
    applicationId: maskId(candidate.applicationId),
    documentId: maskId(candidate.documentId),
    source: candidate.source,
    currentBucket: candidate.currentBucket,
    currentPath: maskPath(candidate.currentPath),
    targetPath: maskPath(candidate.targetPath),
    eligibility: candidate.eligibility,
    skipReason: candidate.skipReason,
  };

  if (candidate.eligibility !== "eligible" || !candidate.targetPath || !candidate.currentPath) {
    return { ...base, status: "skipped", reason: candidate.skipReason };
  }

  const exists = await objectExists(admin, candidate.currentBucket, candidate.currentPath);
  if (!exists.exists) {
    return { ...base, status: "skipped", reason: "source_object_missing", listError: exists.error };
  }

  if (args.dryRun || !args.execute) {
    return {
      ...base,
      status: "dry_run_eligible",
      sourceExists: true,
      sourceSize: exists.size ?? candidate.size,
      mimeType: candidate.mimeType,
      wouldCopyTo: FINAL_BUCKET,
    };
  }

  const downloaded = await downloadObject(admin, candidate.currentBucket, candidate.currentPath);
  if (!downloaded.ok) {
    return { ...base, status: "failed", stage: "download", error: downloaded.error };
  }

  if (downloaded.bytes.length > MAX_BYTES) {
    return { ...base, status: "failed", stage: "size_check", error: `file exceeds ${MAX_BYTES} bytes` };
  }

  const mime = candidate.mimeType || downloaded.contentType || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime) && !mime.startsWith("image/") && mime !== "application/pdf") {
    return { ...base, status: "failed", stage: "mime_check", error: `disallowed mime: ${mime}` };
  }

  const checksum = sha256(downloaded.bytes);

  // Idempotency: if a row already points at private bucket with matching size, skip overwrite
  if (candidate.documentId) {
    const { data: existing } = await admin
      .from("application_documents")
      .select("id, storage_bucket, storage_path, file_size")
      .eq("id", candidate.documentId)
      .maybeSingle();
    if (
      existing?.storage_bucket === FINAL_BUCKET &&
      existing.storage_path &&
      Number(existing.file_size || 0) === downloaded.bytes.length
    ) {
      return {
        ...base,
        status: "skipped",
        reason: "already_migrated_same_size",
        checksum,
      };
    }
  }

  const targetCheck = await objectExists(admin, FINAL_BUCKET, candidate.targetPath);
  if (targetCheck.exists) {
    return { ...base, status: "failed", stage: "target_exists", error: "target path already exists; refusing overwrite" };
  }

  const { error: uploadErr } = await admin.storage.from(FINAL_BUCKET).upload(candidate.targetPath, downloaded.bytes, {
    contentType: mime,
    upsert: false,
  });
  if (uploadErr) {
    return { ...base, status: "failed", stage: "upload", error: uploadErr.message };
  }

  // Verify size via re-download head/list
  const verify = await objectExists(admin, FINAL_BUCKET, candidate.targetPath);
  if (!verify.exists) {
    return { ...base, status: "failed", stage: "verify_missing", error: "uploaded object not found" };
  }
  if (verify.size != null && verify.size !== downloaded.bytes.length) {
    return {
      ...base,
      status: "failed",
      stage: "verify_size",
      error: `size mismatch source=${downloaded.bytes.length} target=${verify.size}`,
    };
  }

  let documentId = candidate.documentId;

  if (documentId) {
    const { error: updErr } = await admin
      .from("application_documents")
      .update({
        storage_bucket: FINAL_BUCKET,
        storage_path: candidate.targetPath,
        is_final: true,
        customer_visible: false,
        partner_visible: false,
        document_type: "final_document",
        file_url: null,
        file_size: downloaded.bytes.length,
        file_type: mime,
        metadata: {
          migrated_from_bucket: candidate.currentBucket,
          migrated_from_path: candidate.currentPath,
          migrated_at: new Date().toISOString(),
          checksum_sha256: checksum,
          legacy_object_retained: true,
        },
      })
      .eq("id", documentId);
    if (updErr) {
      return { ...base, status: "failed", stage: "update_document", error: updErr.message, checksum };
    }
  } else {
    const { data: inserted, error: insErr } = await admin
      .from("application_documents")
      .insert({
        application_id: candidate.applicationId,
        document_type: "final_document",
        document_name: candidate.fileName,
        file_name: candidate.fileName,
        storage_bucket: FINAL_BUCKET,
        storage_path: candidate.targetPath,
        is_final: true,
        customer_visible: false,
        partner_visible: false,
        file_url: null,
        file_size: downloaded.bytes.length,
        file_type: mime,
        status: "approved",
        review_status: "approved",
        metadata: {
          migrated_from_bucket: candidate.currentBucket,
          migrated_from_path: candidate.currentPath,
          migrated_at: new Date().toISOString(),
          checksum_sha256: checksum,
          legacy_object_retained: true,
        },
      })
      .select("id")
      .maybeSingle();
    if (insErr || !inserted?.id) {
      return { ...base, status: "failed", stage: "insert_document", error: insErr?.message || "insert failed", checksum };
    }
    documentId = inserted.id;
  }

  const { error: appErr } = await admin
    .from("applications")
    .update({
      final_document_id: documentId,
      final_document_url: null,
      completed_document_url: null,
      // Keep legacy path fields for rollback discovery; do not store signed URLs.
      final_document_name: candidate.fileName,
    })
    .eq("id", candidate.applicationId);

  if (appErr) {
    return { ...base, status: "failed", stage: "update_application", error: appErr.message, documentId: maskId(documentId), checksum };
  }

  return {
    ...base,
    status: "success",
    documentId: maskId(documentId),
    checksum,
    bytes: downloaded.bytes.length,
    mime,
    legacyRetained: true,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const allowLinkedRead =
    process.argv.includes("--allow-linked-read") &&
    (process.argv.includes("--inventory-only") || process.argv.includes("--dry-run")) &&
    !process.argv.includes("--execute");

  const gate = assertStagingEnvironment();
  if (!gate.ok && !allowLinkedRead) {
    console.error("STAGING_ENVIRONMENT_ASSERTION_FAILED");
    console.error(JSON.stringify(gate, null, 2));
    console.error(
      "Set SUPABASE_TARGET_ENV=staging and ALLOWED_STAGING_SUPABASE_PROJECT_REF=<staging-ref> against a dedicated staging project.",
    );
    console.error(
      "For read-only inventory against a linked (unproven) project only: add --inventory-only --allow-linked-read (never with --execute).",
    );
    process.exit(2);
  }
  if (!gate.ok && allowLinkedRead) {
    console.error(
      "[WARN] Running inventory/dry-run against UNPROVEN environment. Writes are disabled. Do not treat this as staging verification.",
    );
  }

  // Default dry-run; --execute required for writes (and staging gate must pass)
  if (process.argv.includes("--execute")) {
    if (!gate.ok) {
      console.error("Refuse --execute: staging gate failed.");
      process.exit(2);
    }
    args.execute = true;
    args.dryRun = false;
  } else {
    args.execute = false;
    args.dryRun = true;
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Bucket must exist for execute; dry-run can still inventory
  const { data: buckets } = await admin.storage.listBuckets();
  const finalBucket = (buckets || []).find((b) => b.id === FINAL_BUCKET);
  if (args.execute && (!finalBucket || finalBucket.public)) {
    console.error("Refuse execute: application-final-documents missing or public=true");
    process.exit(4);
  }

  const candidates = await collectCandidates(admin, args);
  const results: Record<string, unknown>[] = [];

  for (const candidate of candidates) {
    if (args.inventoryOnly || candidate.eligibility === "skip") {
      const exists =
        candidate.currentPath && candidate.currentBucket !== "unknown"
          ? await objectExists(admin, candidate.currentBucket, candidate.currentPath)
          : { exists: false, error: null, size: null };
      results.push({
        applicationId: maskId(candidate.applicationId),
        documentId: maskId(candidate.documentId),
        source: candidate.source,
        currentBucket: candidate.currentBucket,
        currentPath: maskPath(candidate.currentPath),
        accessibility: "not_probed_as_role",
        fileExists: exists.exists,
        size: exists.size ?? candidate.size,
        mimeType: candidate.mimeType,
        targetPath: maskPath(candidate.targetPath),
        migrationEligibility: candidate.eligibility,
        reasonIfSkipped: candidate.skipReason,
        hasPublicUrlField: candidate.hasPublicUrlField,
        looksLikeFinalPath: looksLikeFinalPath(candidate.currentPath),
      });
      continue;
    }

    try {
      const result = await migrateOne(admin, candidate, args);
      results.push(result);
      if (result.status === "failed" && !args.continueOnError) break;
    } catch (err) {
      results.push({
        applicationId: maskId(candidate.applicationId),
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
      if (!args.continueOnError) break;
    }
  }

  const summary = {
    mode: args.execute ? "execute" : "dry-run",
    projectRef: extractSupabaseProjectRef(url),
    finalBucketPublic: finalBucket?.public ?? null,
    totalCandidates: candidates.length,
    eligible: candidates.filter((c) => c.eligibility === "eligible").length,
    skipped: candidates.filter((c) => c.eligibility === "skip").length,
    success: results.filter((r) => r.status === "success").length,
    dryRunEligible: results.filter((r) => r.status === "dry_run_eligible").length,
    failed: results.filter((r) => r.status === "failed").length,
    inventoryRows: results.filter((r) => r.migrationEligibility || r.status === "skipped").length,
  };

  if (!fs.existsSync(args.outDir)) fs.mkdirSync(args.outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(args.outDir, `legacy-final-migration-${stamp}.json`);
  const csvPath = path.join(args.outDir, `legacy-final-migration-${stamp}.csv`);

  const payload = { generatedAt: new Date().toISOString(), summary, results };
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  const headers = [
    "status",
    "applicationId",
    "documentId",
    "currentBucket",
    "currentPath",
    "targetPath",
    "reason",
    "checksum",
  ];
  const csvLines = [headers.join(",")];
  for (const r of results) {
    csvLines.push(
      [
        r.status ?? r.migrationEligibility ?? "",
        r.applicationId ?? "",
        r.documentId ?? "",
        r.currentBucket ?? "",
        r.currentPath ?? "",
        r.targetPath ?? "",
        r.reason ?? r.reasonIfSkipped ?? r.skipReason ?? r.error ?? "",
        r.checksum ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
  }
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");

  console.log(JSON.stringify({ written: { jsonPath, csvPath }, summary }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
