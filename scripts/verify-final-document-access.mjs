/**
 * Staging access checks for private final-document bucket + RLS.
 *
 * Requires staging gate. Uses service role for setup probes and anon for denial checks.
 * Optional role JWTs via env:
 *   STAGING_CUSTOMER_ACCESS_TOKEN
 *   STAGING_AP_ACCESS_TOKEN
 *   STAGING_ADMIN_ACCESS_TOKEN
 *
 * Usage:
 *   node --env-file=.env.local scripts/verify-final-document-access.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { assertStagingEnvironment, loadEnvFiles } from "./lib/env-load.mjs";

loadEnvFiles();

const FINAL_BUCKET = "application-final-documents";

function client(url, key, accessToken) {
  const c = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
  return c;
}

async function trySelectDocs(label, supabase) {
  const { data, error } = await supabase.from("application_documents").select("id, is_final, document_type").limit(20);
  return {
    label,
    rowCount: data?.length ?? 0,
    finalRowsVisible: (data || []).filter((r) => r.is_final || r.document_type === "final_document").length,
    error: error ? { code: error.code, message: error.message } : null,
  };
}

async function trySelectWhatsapp(label, supabase) {
  const { data, error } = await supabase.from("whatsapp_messages").select("id").limit(5);
  return {
    label,
    rowCount: data?.length ?? 0,
    error: error ? { code: error.code, message: error.message } : null,
  };
}

async function tryListBucket(label, supabase, bucket, prefix = "") {
  const { data, error } = await supabase.storage.from(bucket).list(prefix || "", { limit: 5 });
  return {
    label,
    bucket,
    itemCount: data?.length ?? 0,
    error: error ? { message: error.message, statusCode: error.statusCode || error.status } : null,
  };
}

async function main() {
  const gate = assertStagingEnvironment();
  if (!gate.ok) {
    console.error("STAGING_ENVIRONMENT_ASSERTION_FAILED");
    console.error(JSON.stringify(gate, null, 2));
    process.exit(2);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) {
    console.error("Missing URL / service role / anon key");
    process.exit(1);
  }

  const admin = client(url, serviceKey);
  const anon = client(url, anonKey);
  const customer = process.env.STAGING_CUSTOMER_ACCESS_TOKEN
    ? client(url, anonKey, process.env.STAGING_CUSTOMER_ACCESS_TOKEN)
    : null;
  const ap = process.env.STAGING_AP_ACCESS_TOKEN
    ? client(url, anonKey, process.env.STAGING_AP_ACCESS_TOKEN)
    : null;
  const adminUser = process.env.STAGING_ADMIN_ACCESS_TOKEN
    ? client(url, anonKey, process.env.STAGING_ADMIN_ACCESS_TOKEN)
    : null;

  const { data: buckets } = await admin.storage.listBuckets();
  const finalBucket = (buckets || []).find((b) => b.id === FINAL_BUCKET);

  const report = {
    projectRef: gate.ref,
    finalBucket: finalBucket
      ? { id: finalBucket.id, public: finalBucket.public, file_size_limit: finalBucket.file_size_limit }
      : null,
    storage: {
      anonListFinal: await tryListBucket("anon", anon, FINAL_BUCKET, "applications"),
      customerListFinal: customer
        ? await tryListBucket("customer", customer, FINAL_BUCKET, "applications")
        : { skipped: true, reason: "STAGING_CUSTOMER_ACCESS_TOKEN not set" },
      apListFinal: ap
        ? await tryListBucket("ap", ap, FINAL_BUCKET, "applications")
        : { skipped: true, reason: "STAGING_AP_ACCESS_TOKEN not set" },
      adminUserListFinal: adminUser
        ? await tryListBucket("admin_user", adminUser, FINAL_BUCKET, "applications")
        : { skipped: true, reason: "STAGING_ADMIN_ACCESS_TOKEN not set" },
      serviceListFinal: await tryListBucket("service_role", admin, FINAL_BUCKET, "applications"),
    },
    rls: {
      anonDocs: await trySelectDocs("anon", anon),
      customerDocs: customer
        ? await trySelectDocs("customer", customer)
        : { skipped: true, reason: "STAGING_CUSTOMER_ACCESS_TOKEN not set" },
      apDocs: ap ? await trySelectDocs("ap", ap) : { skipped: true, reason: "STAGING_AP_ACCESS_TOKEN not set" },
      adminUserDocs: adminUser
        ? await trySelectDocs("admin_user", adminUser)
        : { skipped: true, reason: "STAGING_ADMIN_ACCESS_TOKEN not set" },
      serviceDocs: await trySelectDocs("service_role", admin),
      anonWhatsapp: await trySelectWhatsapp("anon", anon),
      customerWhatsapp: customer
        ? await trySelectWhatsapp("customer", customer)
        : { skipped: true, reason: "token missing" },
      apWhatsapp: ap ? await trySelectWhatsapp("ap", ap) : { skipped: true, reason: "token missing" },
    },
    signedUrlProbe: null,
  };

  // Service-role signed URL capability (no URL printed)
  const { data: finals } = await admin
    .from("application_documents")
    .select("id, storage_path, storage_bucket")
    .or("is_final.eq.true,document_type.eq.final_document")
    .limit(1);
  const sample = finals?.[0];
  if (sample?.storage_path) {
    const bucket = sample.storage_bucket || FINAL_BUCKET;
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(sample.storage_path, 60);
    report.signedUrlProbe = {
      ok: Boolean(data?.signedUrl) && !error,
      error: error?.message || null,
      urlRedacted: Boolean(data?.signedUrl),
      note: "Signed URL generated server-side only; value not logged.",
    };
  } else {
    report.signedUrlProbe = { ok: null, note: "No final document row available to probe." };
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
