import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The Labour Card page renders inside `MotionRoot`, which is `LazyMotion` with
 * `strict` on. Under strict mode `motion.div` throws at render — the page went
 * completely white the first time this rule was broken, because the directory
 * and the checker were still importing `motion` directly while the page around
 * them had just been wrapped.
 *
 * The fix is one character (`m` instead of `motion`) and the failure is total,
 * which is exactly the combination worth a test.
 */
const DIRECTORY = "src/components/services/labour-card";

describe("labour card motion imports", () => {
  const files = readdirSync(DIRECTORY).filter(
    (file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx"),
  );

  it("finds the components it is meant to be checking", () => {
    expect(files.length).toBeGreaterThan(3);
  });

  for (const file of files) {
    it(`${file} uses m, not motion, from framer-motion`, () => {
      const source = readFileSync(path.join(DIRECTORY, file), "utf8");
      if (!source.includes("framer-motion")) return;

      expect(source, "imports `motion` — use `m` under LazyMotion strict").not.toMatch(
        /import\s*\{[^}]*\bmotion\b[^}]*\}\s*from\s*"framer-motion"/,
      );
      expect(source, "renders <motion.*> — use <m.*> under LazyMotion strict").not.toMatch(
        /<motion\.\w/,
      );
    });
  }
});
