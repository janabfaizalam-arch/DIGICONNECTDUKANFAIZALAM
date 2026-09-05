/**
 * Put the starting scheme dataset into the database.
 *
 * The page reads from `labour_schemes` and only falls back to the file in
 * src/lib/labour/seed-schemes.ts when that table is empty. Running this once
 * moves the figures into the CMS, which is where they need to be for anybody
 * to correct an amount without a deploy.
 *
 *   node --env-file=.env.local scripts/seed-labour-schemes.mjs
 *
 * Safe to re-run: rows are upserted by id. It will not overwrite a row an
 * administrator has already edited unless --force is passed, because the
 * whole point of the CMS is that the database outranks this file.
 *
 * The admin panel does the same import from a button, which is where most
 * people will do it. This script stays for --force and for a machine with no
 * browser session.
 */

import { createClient } from "@supabase/supabase-js";

const force = process.argv.includes("--force");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run again.");
  process.exit(1);
}

const { SEED_SCHEMES } = await import("../src/lib/labour/seed-schemes.ts").catch(async () => {
  console.error(
    "Could not import the seed file directly. Run with:\n" +
      "  node --experimental-strip-types --env-file=.env.local scripts/seed-labour-schemes.mjs",
  );
  process.exit(1);
});

const { schemeToRow } = await import("../src/lib/labour/rows.ts");

const supabase = createClient(url, key, { auth: { persistSession: false } });

const rows = SEED_SCHEMES.map(schemeToRow);

const { data: existing } = await supabase.from("labour_schemes").select("id");
const known = new Set((existing ?? []).map((row) => row.id));
const toWrite = force ? rows : rows.filter((row) => !known.has(row.id));

if (!toWrite.length) {
  console.log(`Nothing to do — all ${rows.length} schemes are already in the database.`);
  console.log("Pass --force to overwrite them with the file's version.");
  process.exit(0);
}

const { error } = await supabase.from("labour_schemes").upsert(toWrite, { onConflict: "id" });
if (error) {
  console.error("Could not write:", error.message);
  process.exit(1);
}

console.log(`Wrote ${toWrite.length} scheme${toWrite.length === 1 ? "" : "s"}.`);
if (!force && known.size) console.log(`Left ${known.size} existing row(s) untouched.`);
