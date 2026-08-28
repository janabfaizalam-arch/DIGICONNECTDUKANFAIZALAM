/**
 * Delete the customer document vault's stored files.
 *
 * The vault held customers' identity documents — Aadhaar, PAN, photographs,
 * signatures — and has been withdrawn. Migration
 * `20260828090000_drop_customer_document_vault.sql` drops the two tables;
 * this removes the objects they pointed at.
 *
 * It is a separate step because Supabase will not let SQL delete from
 * `storage.objects` directly (`storage.protect_delete()` raises 42501), and
 * it is the right way round: the trigger exists to stop rows being removed
 * while the files they describe stay in the bucket.
 *
 * Run this BEFORE the migration. The safest source of truth for which objects
 * belonged to the vault is `customer_vault_documents.storage_path`, and that
 * table only exists until the migration runs.
 *
 * Usage:
 *   node scripts/delete-vault-storage-files.mjs            # show what would go
 *   node scripts/delete-vault-storage-files.mjs --confirm  # actually delete
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * IRREVERSIBLE with --confirm. Take a backup first if there is any doubt.
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "application-documents";
const PREFIX = "vault-documents/";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

/**
 * Every object under `vault-documents/`, walked one directory at a time.
 *
 * `storage.list` returns a single level and pages at 100 by default, so a
 * naive single call would quietly report a fraction of the bucket and this
 * script would report success having deleted almost nothing.
 */
async function listPrefix(supabase, prefix) {
  const found = [];
  const queue = [prefix];

  while (queue.length) {
    const dir = queue.shift();
    let offset = 0;

    for (;;) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(dir.replace(/\/$/, ""), { limit: 100, offset });
      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const entry of data) {
        const path = `${dir.replace(/\/$/, "")}/${entry.name}`;
        // A row with no `id` is a folder placeholder, not a file.
        if (entry.id) found.push(path);
        else queue.push(`${path}/`);
      }

      if (data.length < 100) break;
      offset += data.length;
    }
  }

  return found;
}

async function main() {
  const confirmed = process.argv.includes("--confirm");
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );

  const paths = new Set();

  // Preferred source: what the vault itself recorded.
  const { data: rows, error: rowsError } = await supabase
    .from("customer_vault_documents")
    .select("storage_path");

  if (rowsError) {
    console.warn(
      `Could not read customer_vault_documents (${rowsError.message}). ` +
        `Falling back to listing the ${PREFIX} prefix.`,
    );
  } else {
    for (const row of rows ?? []) {
      if (row.storage_path) paths.add(row.storage_path);
    }
    console.log(`${rows?.length ?? 0} row(s) in customer_vault_documents.`);
  }

  // Second source, and the one that catches an upload whose row never landed.
  const listed = await listPrefix(supabase, PREFIX);
  console.log(`${listed.length} object(s) under ${PREFIX} in ${BUCKET}.`);
  for (const path of listed) paths.add(path);

  // Never touch anything outside the vault's own prefix. The bucket is shared
  // with per-application uploads, which must survive.
  const targets = [...paths].filter((path) => path.startsWith(PREFIX));
  const skipped = paths.size - targets.length;
  if (skipped > 0) {
    console.warn(`Skipping ${skipped} path(s) outside ${PREFIX}.`);
  }

  if (targets.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  if (!confirmed) {
    console.log(`\nWould delete ${targets.length} file(s):`);
    for (const path of targets.slice(0, 20)) console.log(`  ${path}`);
    if (targets.length > 20) console.log(`  … and ${targets.length - 20} more`);
    console.log("\nRe-run with --confirm to delete them. This cannot be undone.");
    return;
  }

  // `remove` takes a bounded list; batch so a large vault does not fail whole.
  let deleted = 0;
  for (let i = 0; i < targets.length; i += 100) {
    const batch = targets.slice(i, i + 100);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) throw error;
    deleted += batch.length;
    console.log(`Deleted ${deleted}/${targets.length}`);
  }

  console.log(`\nDone. ${deleted} file(s) removed from ${BUCKET}/${PREFIX}.`);
  console.log("Now run the migration to drop the tables.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
