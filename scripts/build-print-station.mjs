#!/usr/bin/env node
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copy the Print Station into public/ so a shop can download it.
 *
 * The program's source of truth is print-station/ — it is tested there and
 * reviewed there. This copies the files a shop actually needs into
 * public/print-station/, where Next serves them, so the install line
 *
 *     irm https://rnos.in/print-station/install.ps1 | iex
 *
 * has something to fetch. Test files, and anything else a shop does not run,
 * are deliberately left behind.
 *
 * Run: node scripts/build-print-station.mjs
 * The copy is checked by print-station/distribution.test.mjs, so it cannot
 * silently fall behind the source.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "print-station");
const target = join(root, "public", "print-station");

/** What a shop downloads. Everything else in print-station/ stays behind. */
export const SHIPPED_FILES = [
  "station.mjs",
  "install.ps1",
  "README.md",
  "Start Print Station.bat",
  "start-print-station.sh",
  "lib/config.mjs",
  "lib/api.mjs",
  "lib/worker.mjs",
  "lib/printer.mjs",
  "lib/page.mjs",
  "lib/log.mjs",
];

export function build({ quiet = false } = {}) {
  rmSync(target, { recursive: true, force: true });
  mkdirSync(join(target, "lib"), { recursive: true });

  for (const file of SHIPPED_FILES) {
    copyFileSync(join(source, file), join(target, file));
    if (!quiet) console.log(`  ${file}`);
  }

  // A test file in public/ would be served to anybody who asked for it. It is
  // harmless, but it is also not the product, so this fails loudly instead.
  const stray = readdirSync(join(target, "lib")).filter((name) => name.includes(".test."));
  if (stray.length) throw new Error(`Test files must not be shipped: ${stray.join(", ")}`);

  const bytes = SHIPPED_FILES.reduce((total, file) => total + statSync(join(target, file)).size, 0);
  if (!quiet) console.log(`\n  ${SHIPPED_FILES.length} files, ${(bytes / 1024).toFixed(1)} KB\n`);
  return SHIPPED_FILES.length;
}

if (process.argv[1] && process.argv[1].endsWith("build-print-station.mjs")) {
  console.log("\n  Building the Print Station download...\n");
  build();
}
