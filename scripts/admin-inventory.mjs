#!/usr/bin/env node
/**
 * The Phase B inventory counters.
 *
 * These numbers steer the Phase B plan, so they live in a script rather than in
 * whatever grep the author happened to type that day. Re-running this is what
 * makes "149 → X fixed" a measurement instead of a claim.
 *
 *   node scripts/admin-inventory.mjs            # human-readable
 *   node scripts/admin-inventory.mjs --json     # machine-readable
 *   node scripts/admin-inventory.mjs --detail   # every site, with file:line
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const sourceFiles = (roots, extensions) =>
  roots
    .flatMap((root) => walk(join(ROOT, root)))
    .filter((file) => extensions.some((ext) => file.endsWith(ext)))
    .filter((file) => !/\.(test|spec)\.[tj]sx?$/.test(file));

/**
 * File contents with comments blanked out.
 *
 * Doc comments in this repository quote the query shapes they are warning
 * about — `payment-link-relations.ts` documents the embed trap by showing
 * `.from("payment_links")` — and counting those as live queries inflates the
 * inventory. Comment bodies are replaced space-for-space rather than removed,
 * so byte offsets and line numbers still point at the real source.
 */
const read = (file) => {
  const text = readFileSync(file, "utf8");
  return text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (match) =>
    match.replace(/[^\n]/g, " "),
  );
};
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/**
 * A read is "bounded" when its own statement chain constrains how much comes
 * back. PostgREST silently truncates an unbounded select at `db.max_rows`, so
 * a chain with none of these can return a partial set with no error.
 */
const BOUNDED = [".range(", ".limit(", ".single(", ".maybeSingle(", "count:", "head: true"];

/** `.from(table)` — the start of one query chain. */
const CHAIN_START = /\.from\((['"`])([a-z_]+)\1\)/g;

/**
 * The text belonging to one query chain.
 *
 * It runs to the end of the statement — or to the next `.from(`, whichever
 * comes first. That second bound matters: several queries inside one
 * `Promise.all([...])` share a single terminating `;`, so stopping only at `;`
 * merges them, and a `.limit()` on any one of them then hides every other.
 * Both `/admin/wallet` and `/admin/dashboard` build their reads that way.
 */
function chainText(text, start) {
  CHAIN_START.lastIndex = start + 1;
  const next = CHAIN_START.exec(text);
  CHAIN_START.lastIndex = 0;

  const semicolon = text.indexOf(";", start);
  const candidates = [
    next ? next.index : Infinity,
    semicolon === -1 ? Infinity : semicolon,
    text.length,
  ];

  return text.slice(start, Math.min(...candidates));
}

/**
 * Tables whose rows are money or are counted in the admin UI. A truncated read
 * of one of these is a wrong number on screen, not a slow page.
 */
const FINANCIAL = new Set([
  "payments", "ap_payouts", "ap_payout_items", "ap_commissions", "commissions",
  "commission_transactions", "payout_requests", "invoices", "wallets",
  "wallet_transactions", "ap_wallet_ledger", "reward_wallets", "reward_transactions",
  "payment_links", "payment_link_applications",
]);

const COUNTED = new Set([
  "applications", "agency_partners", "customers", "profiles", "leads", "crm_leads",
  "application_documents", "print_jobs", "insurance_quotations",
]);

/**
 * A query built in one function and ranged at the call site is still paged.
 *
 * The paging helpers take a `(from, to)` closure, so the idiomatic shape is a
 * small builder — `const amountsFor = (…) => supabase.from(…)…` — whose result
 * has `.range(from, to)` applied where it is used. Looking only at the builder's
 * own statement would flag it as unbounded, which would make this script report
 * the fix as a regression.
 */
function isRangedBuilder(text, chainStart) {
  const before = text.slice(0, chainStart);
  const declaration = /(?:const|let|function)\s+([A-Za-z_$][\w$]*)\s*(?:=|\()[^;]*$/.exec(
    before.slice(-400),
  );
  if (!declaration) return false;

  const name = declaration[1];
  // `name(...)…​.range(` anywhere in the file, allowing the call's own arguments.
  return new RegExp(`\\b${name}\\s*\\([^;]*?\\)[^;]*?\\.range\\(`).test(text);
}

function unboundedReads() {
  const hits = [];
  for (const file of sourceFiles(["src/lib", "src/app/api", "src/app/admin"], [".ts", ".tsx"])) {
    const text = read(file);
    for (const match of [...text.matchAll(CHAIN_START)]) {
      const table = match[2];
      const chain = chainText(text, match.index);
      if (!chain.includes(".select(")) continue;
      if (BOUNDED.some((token) => chain.includes(token))) continue;
      if (isRangedBuilder(text, match.index)) continue;
      hits.push({
        file: relative(ROOT, file),
        line: lineOf(text, match.index),
        table,
        kind: FINANCIAL.has(table) ? "financial" : COUNTED.has(table) ? "counted" : "other",
      });
    }
  }
  return hits;
}

/**
 * A file "hand-rolls a table" when it renders a raw <table> or the ui/table
 * wrapper. The wrapper matters: `admin/commissions` uses it, so a `<table`
 * grep alone undercounts.
 */
function handRolledTables() {
  const hits = [];
  for (const file of sourceFiles(["src/app/admin", "src/components/admin"], [".tsx"])) {
    const rel = relative(ROOT, file);
    if (rel.includes("primitives/admin-data-table")) continue;
    const text = read(file);
    if (!/<table|<Table[\s>]/.test(text)) continue;
    hits.push({
      file: rel,
      // A second, hand-maintained layout for small screens that has to be kept
      // in step with the table by hand — the drift Phase A removed twice.
      duplicatesMobileLayout: /(lg|md|sm):hidden/.test(text),
    });
  }
  return hits;
}

const PALETTES =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

function hardcodedColours() {
  const narrow = new RegExp(`\\b(?:bg|text|border|ring)-(?:${PALETTES})-\\d{2,3}\\b`, "g");
  const broad = new RegExp(
    `\\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|shadow|accent|decoration|placeholder)-(?:${PALETTES})-\\d{2,3}\\b`,
    "g",
  );

  let narrowCount = 0;
  let broadCount = 0;
  const files = new Set();

  for (const file of sourceFiles(["src/app/admin", "src/components/admin"], [".tsx"])) {
    const text = read(file);
    const n = text.match(narrow)?.length ?? 0;
    const b = text.match(broad)?.length ?? 0;
    narrowCount += n;
    broadCount += b;
    if (b > 0) files.add(relative(ROOT, file));
  }

  return { narrow: narrowCount, broad: broadCount, files: files.size };
}

const reads = unboundedReads();
const tables = handRolledTables();
const colours = hardcodedColours();

const summary = {
  unboundedReads: {
    total: reads.length,
    financial: reads.filter((r) => r.kind === "financial").length,
    counted: reads.filter((r) => r.kind === "counted").length,
    other: reads.filter((r) => r.kind === "other").length,
  },
  handRolledTables: {
    total: tables.length,
    duplicatingMobileLayout: tables.filter((t) => t.duplicatesMobileLayout).length,
  },
  hardcodedAdminColours: colours,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(process.argv.includes("--detail") ? { summary, reads, tables } : summary, null, 2));
} else {
  console.log("Unbounded reads (src/lib, src/app/api, src/app/admin)");
  console.log(`  total       ${summary.unboundedReads.total}`);
  console.log(`  financial   ${summary.unboundedReads.financial}   (money — a truncated read is a wrong number)`);
  console.log(`  counted     ${summary.unboundedReads.counted}   (drives a count shown in the admin UI)`);
  console.log(`  other       ${summary.unboundedReads.other}`);
  console.log("\nHand-rolled admin tables");
  console.log(`  total                     ${summary.handRolledTables.total}`);
  console.log(`  duplicating mobile layout ${summary.handRolledTables.duplicatingMobileLayout}`);
  console.log("\nHardcoded admin colours");
  console.log(`  narrow pattern  ${colours.narrow}`);
  console.log(`  broad pattern   ${colours.broad}`);
  console.log(`  files           ${colours.files}`);

  if (process.argv.includes("--detail")) {
    console.log("\nFinancial and counted reads:");
    for (const r of reads.filter((x) => x.kind !== "other").sort((a, b) => a.file.localeCompare(b.file))) {
      console.log(`  ${r.kind.padEnd(9)} ${r.table.padEnd(26)} ${r.file}:${r.line}`);
    }
  }
}
