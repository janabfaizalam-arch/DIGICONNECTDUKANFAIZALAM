import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

/**
 * The lockfile the deployment actually installs from.
 *
 * This repository carries two: `package-lock.json` and `pnpm-lock.yaml`.
 * Vercel picks pnpm and runs `pnpm install --frozen-lockfile`, which fails —
 * before a single file is compiled — when `pnpm-lock.yaml` disagrees with
 * `package.json`. A dependency added with `npm install` updates only the npm
 * lockfile, so it passes `npm ci`, passes `npm run build`, passes every test,
 * and then breaks the deployment with:
 *
 *   ERR_PNPM_OUTDATED_LOCKFILE ... specifiers in the lockfile don't match
 *   specifiers in package.json: * 1 dependencies were added
 *
 * That is exactly how @mediapipe/tasks-vision shipped a red deploy, twice,
 * while every local check passed. This is the check that was missing.
 *
 * Adding a dependency: `pnpm add <name>`, or edit package.json and run
 * `pnpm install`. Commit pnpm-lock.yaml with it either way.
 */

/** Every `name: { specifier }` pair in the lockfile's root importer. */
function lockedSpecifiers(lock: string): Map<string, string> {
  const start = lock.indexOf("\n  .:\n");
  if (start === -1) return new Map();
  const end = lock.indexOf("\npackages:", start);
  const block = lock.slice(start, end === -1 ? undefined : end);

  const found = new Map<string, string>();
  let name: string | null = null;

  for (const line of block.split("\n")) {
    const declared = /^ {6}('?)(.+?)\1:$/.exec(line);
    if (declared) {
      name = declared[2];
      continue;
    }
    const specifier = /^ {8}specifier:\s*(.+?)\s*$/.exec(line);
    if (specifier && name) {
      found.set(name, specifier[1].replace(/^'(.*)'$/, "$1"));
      name = null;
    }
  }

  return found;
}

describe("pnpm-lock.yaml matches package.json", () => {
  const manifest = JSON.parse(readCode("package.json")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const declared = { ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) };
  const locked = lockedSpecifiers(readCode("pnpm-lock.yaml"));

  it("finds the lockfile's own list, so the checks below mean something", () => {
    // Without this, a parser that silently returns nothing would make every
    // other assertion here pass on an empty set.
    expect(locked.size).toBeGreaterThan(20);
    expect(locked.get("next")).toBe(declared.next);
  });

  it("lists every dependency the manifest declares", () => {
    const missing = Object.keys(declared).filter((name) => !locked.has(name));
    expect(
      missing,
      `not in pnpm-lock.yaml — run \`pnpm install\` and commit it: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("agrees with the manifest on every version range", () => {
    const wrong = Object.entries(declared)
      .filter(([name, wanted]) => locked.has(name) && locked.get(name) !== wanted)
      .map(([name, wanted]) => `${name}: package.json ${wanted}, lockfile ${locked.get(name)}`);
    expect(wrong, `run \`pnpm install\` and commit pnpm-lock.yaml — ${wrong.join("; ")}`).toEqual([]);
  });

  it("carries the dependency whose absence broke the deployment", () => {
    expect(locked.get("@mediapipe/tasks-vision")).toBe(declared["@mediapipe/tasks-vision"]);
  });
});
