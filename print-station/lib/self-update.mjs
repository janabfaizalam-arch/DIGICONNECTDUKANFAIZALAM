import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, sep } from "node:path";

/**
 * Update the connector in place, from the website.
 *
 * The partner presses "Update install karo" in their panel; on its next poll
 * the connector downloads the current program files (with its own key — the
 * key itself is never part of the download, so updating never logs a shop
 * out), writes them over its own folder, and exits with RESTART_CODE so the
 * keepalive starts the new version a couple of seconds later.
 *
 * Each file is written beside its target and renamed into place, so a power
 * cut mid-update leaves every file either old or new, never half-written.
 * Only plain relative paths inside the program folder are accepted.
 */
export const RESTART_CODE = 75;

const NEVER_OVERWRITE = new Set(["config.json"]);

export function isSafeRelativePath(path) {
  const value = String(path ?? "");
  if (!value || isAbsolute(value) || value.includes("\0")) return false;
  if (!/^[A-Za-z0-9 _.\-/]+$/.test(value)) return false;
  const clean = normalize(value);
  return !clean.split(sep).includes("..") && !clean.split("/").includes("..");
}

export function applyUpdate({ files, folder, write = writeFileSync, rename = renameSync, mkdir = mkdirSync }) {
  const entries = Object.entries(files ?? {});
  if (!entries.length) throw new Error("The update had no files.");

  for (const [path] of entries) {
    if (!isSafeRelativePath(path)) throw new Error(`Refusing an unsafe path in the update: ${path}`);
  }

  let written = 0;
  for (const [path, content] of entries) {
    if (NEVER_OVERWRITE.has(path) || typeof content !== "string") continue;
    const target = join(folder, path);
    mkdir(dirname(target), { recursive: true });
    write(`${target}.new`, content, "utf8");
    rename(`${target}.new`, target);
    written += 1;
  }
  return written;
}

/** "2.10.0" > "2.9.3". Unparseable parts count as 0. */
export function isNewer(latest, current) {
  const parts = (value) => String(value ?? "0.0.0").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const a = parts(latest);
  const b = parts(current);
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) > (b[index] ?? 0);
  }
  return false;
}
