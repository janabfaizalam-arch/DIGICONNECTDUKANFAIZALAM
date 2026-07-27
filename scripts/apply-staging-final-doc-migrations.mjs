/**
 * Apply pending final-document migrations to STAGING ONLY via Postgres connection.
 *
 * Requires:
 *   SUPABASE_TARGET_ENV=staging
 *   ALLOWED_STAGING_SUPABASE_PROJECT_REF=<staging-ref>
 *   STAGING_DATABASE_URL=postgresql://...  (staging DB URL with migrate privileges)
 *
 * Does NOT use db reset. Does NOT push to production.
 * Supabase CLI is optional; this script uses `pg` if available, else prints SQL paths.
 *
 * Usage (dry-run / print only):
 *   node --env-file=.env.local scripts/apply-staging-final-doc-migrations.mjs --dry-run
 *
 * Execute (staging only):
 *   node --env-file=.env.local scripts/apply-staging-final-doc-migrations.mjs --execute
 */
import fs from "node:fs";
import path from "node:path";
import { assertStagingEnvironment, extractSupabaseProjectRef, loadEnvFiles } from "./lib/env-load.mjs";

loadEnvFiles();

const MIGRATIONS = [
  "supabase/migrations/20260727120000_admin_application_ops.sql",
  "supabase/migrations/20260727180000_private_final_documents.sql",
];

async function main() {
  const execute = process.argv.includes("--execute");
  const dryRun = !execute;

  const gate = assertStagingEnvironment();
  if (!gate.ok) {
    console.error("STAGING_ENVIRONMENT_ASSERTION_FAILED — refusing to apply migrations.");
    console.error(JSON.stringify(gate, null, 2));
    process.exit(2);
  }

  const dbUrl = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("Missing STAGING_DATABASE_URL (preferred) or DATABASE_URL.");
    process.exit(1);
  }

  // Extra: if DATABASE_URL host embeds a supabase ref, it must match gate.ref
  const hostMatch = String(dbUrl).match(/@db\.([a-z0-9]+)\.supabase\.co/i);
  if (hostMatch && hostMatch[1] !== gate.ref) {
    console.error(`DATABASE host ref ${hostMatch[1]} != allowlisted staging ref ${gate.ref}`);
    process.exit(2);
  }

  const payloads = MIGRATIONS.map((rel) => {
    const full = path.resolve(process.cwd(), rel);
    const sql = fs.readFileSync(full, "utf8");
    return { rel, full, bytes: Buffer.byteLength(sql), sql };
  });

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        projectRef: gate.ref,
        migrations: payloads.map((p) => ({ file: p.rel, bytes: p.bytes })),
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    console.log("Dry-run only. Re-run with --execute on staging after review.");
    process.exit(0);
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error("Package `pg` is not installed. Install temporarily for staging apply, or run SQL in Supabase staging SQL editor.");
    console.error("Migration files ready:");
    for (const p of payloads) console.error(` - ${p.full}`);
    process.exit(5);
  }

  const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const results = [];
  try {
    for (const p of payloads) {
      const started = Date.now();
      try {
        await client.query("begin");
        await client.query(p.sql);
        await client.query("commit");
        results.push({ file: p.rel, ok: true, ms: Date.now() - started });
        console.log(`OK ${p.rel}`);
      } catch (err) {
        await client.query("rollback");
        results.push({
          file: p.rel,
          ok: false,
          ms: Date.now() - started,
          error: err instanceof Error ? err.message : String(err),
        });
        console.error(`FAIL ${p.rel}:`, err);
        break;
      }
    }
  } finally {
    await client.end();
  }

  console.log(JSON.stringify({ results }, null, 2));
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
