import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, sep } from "path";
import { describe, expect, it } from "vitest";

/**
 * Tailwind ships eleven steps per hue — 50, then 100 through 900, then 950.
 * Anything else is not a dimmer or brighter variant, it is **nothing**: the
 * class matches no rule, so `text-slate-450` renders text with no colour at
 * all and `bg-emerald-350` paints no background.
 *
 * Nothing warns about it. It compiles, it lints, it ships, and the element
 * just quietly loses its styling — which is how the wizard's step connector
 * and its completed-step ticks came to be invisible, among three hundred
 * others across the app.
 *
 * The steps below are the whole vocabulary. A value between them means
 * someone wanted a shade Tailwind does not have; pick a neighbour, or define
 * a token in globals.css and use `text-[var(--token)]`.
 */
const VALID_STEPS = new Set([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);

const HUES = [
  "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow",
  "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet",
  "purple", "fuchsia", "pink", "rose",
];

const UTILITIES = [
  "bg", "text", "border", "ring", "from", "to", "via", "fill", "stroke",
  "shadow", "divide", "outline", "decoration", "accent", "caret", "placeholder",
];

const PATTERN = new RegExp(
  String.raw`\b(?:${UTILITIES.join("|")})-(?:${HUES.join("|")})-(\d{2,3})\b`,
  "g",
);

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("Tailwind colour steps", () => {
  it("uses only steps Tailwind actually defines", () => {
    const root = process.cwd();
    const offenders: string[] = [];

    for (const file of listSourceFiles(join(root, "src"))) {
      const source = readFileSync(file, "utf8");
      const lines = source.split("\n");

      lines.forEach((line, index) => {
        PATTERN.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = PATTERN.exec(line))) {
          if (!VALID_STEPS.has(Number(match[1]))) {
            const path = relative(root, file).split(sep).join("/");
            offenders.push(`${path}:${index + 1}  ${match[0]}`);
          }
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  it("recognises an invalid step when it sees one", () => {
    // Guards the guard: a pattern that matched nothing would pass silently.
    PATTERN.lastIndex = 0;
    const found = [...'className="text-slate-450 bg-emerald-350 text-slate-500"'.matchAll(PATTERN)]
      .map((m) => Number(m[1]))
      .filter((step) => !VALID_STEPS.has(step));

    expect(found).toEqual([450, 350]);
  });
});
