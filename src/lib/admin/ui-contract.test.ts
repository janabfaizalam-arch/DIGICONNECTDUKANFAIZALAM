/**
 * Contracts for the admin UI foundation.
 *
 * These are the rules the UI audit established, pinned so they cannot drift
 * back one pull request at a time. They assert on source rather than on a
 * rendered DOM because the vitest environment is `node` with no browser; the
 * rendered checks live in the Playwright pass.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function adminTsxFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith(".tsx")) out.push(full);
    }
  };
  walk(join(ROOT, "src/app/admin"));
  walk(join(ROOT, "src/components/admin"));
  return out;
}

const files = adminTsxFiles();
const read = (path: string) => readFileSync(path, "utf8");

describe("admin typography floor", () => {
  /** Every `text-[Npx]` in a file, as numbers. */
  const sizesIn = (file: string) =>
    (read(file).match(/text-\[(\d+(?:\.\d+)?)px\]/g) ?? []).map((match) =>
      Number(/(\d+(?:\.\d+)?)/.exec(match)?.[1]),
    );

  it("has nothing below 10px anywhere in the admin surface", () => {
    // The audit found 61 instances at 9px and 9.5px, most uppercase with wide
    // letter-spacing — the hardest text in the panel to read, and in several
    // cases it was the field label. All of them are now at 11px.
    const offenders = files.flatMap((file) =>
      sizesIn(file)
        .filter((size) => size < 10)
        .map((size) => `${file.replace(ROOT + "/", "")}: ${size}px`),
    );

    expect(offenders).toEqual([]);
  });

  it("holds the navigation, page header and controls to an 11px floor", () => {
    // These are the surfaces every admin screen inherits, so they are held to
    // the stricter floor first. The remaining 10px text lives in individual
    // screens and moves up as each one is verified — raising 235 instances
    // across thirty-odd unverified screens in one pass is how a type change
    // silently breaks a table cell.
    const foundation = [
      "src/components/admin/admin-shell.tsx",
      "src/components/admin/primitives/controls-ui.tsx",
      "src/components/admin/primitives/layout.tsx",
      "src/components/admin/primitives/states.tsx",
      "src/components/admin/admin-workspace-switch.tsx",
    ].map((relative) => join(ROOT, relative));

    const offenders = foundation.flatMap((file) =>
      sizesIn(file)
        .filter((size) => size < 11)
        .map((size) => `${file.replace(ROOT + "/", "")}: ${size}px`),
    );

    expect(offenders).toEqual([]);
  });
});

describe("design tokens", () => {
  const tokens = read(join(ROOT, "src/app/admin-design-tokens.css"));

  it("honours prefers-reduced-motion", () => {
    // The audit found no handling of this anywhere. For a vestibular disorder
    // an animation is not decoration.
    expect(tokens).toContain("prefers-reduced-motion");
    expect(tokens).toContain("animation-duration: 0.01ms !important");
    expect(tokens).toContain("transition-duration: 0.01ms !important");
  });

  it("defines one motion scale rather than ad-hoc durations", () => {
    for (const token of ["--ds-motion-fast", "--ds-motion-base", "--ds-motion-slow", "--ds-ease"]) {
      expect(tokens).toContain(token);
    }
  });

  it("defines control heights, with a 44px touch target available", () => {
    expect(tokens).toContain("--ds-control-sm");
    expect(tokens).toContain("--ds-control-md");
    // 2.75rem = 44px, the comfortable minimum for a touch target.
    expect(tokens).toMatch(/--ds-control-lg:\s*2\.75rem/);
  });

  it("keeps a single radius and shadow scale", () => {
    for (const token of ["--ds-radius-sm", "--ds-radius-md", "--ds-radius-lg", "--ds-radius-xl"]) {
      expect(tokens).toContain(token);
    }
    for (const token of ["--ds-shadow-sm", "--ds-shadow-md", "--ds-shadow-lg"]) {
      expect(tokens).toContain(token);
    }
  });

  it("exposes the new scales as Tailwind utilities", () => {
    // Without the @theme mapping the tokens exist but nothing can use them,
    // which is how a design system ends up at 6.8% adoption.
    const theme = tokens.slice(tokens.indexOf("@theme"));
    expect(theme).toContain("--spacing-ds-control-md");
    expect(theme).toContain("--transition-duration-ds-fast");
  });
});

describe("control primitives", () => {
  const controls = read(join(ROOT, "src/components/admin/primitives/controls-ui.tsx"));

  it("gives every control the same keyboard focus treatment", () => {
    // 36 focus styles across 270 hand-rolled buttons was the audit figure, so
    // most controls were invisible to a keyboard user.
    expect(controls).toContain("focus-visible:ring-2");
    expect(controls).toContain("focus-visible:ring-ds-focus");
  });

  it("uses focus-visible rather than focus, so a mouse click leaves no ring", () => {
    expect(controls).not.toMatch(/[^-]focus:ring-2/);
  });

  it("defaults buttons to type=button", () => {
    // An unspecified type submits the surrounding form. More than one filter
    // control in this panel reloaded the page for exactly that reason.
    expect(controls).toContain('props.type ?? "button"');
  });

  it("carries a danger variant, so a destructive action is never a style choice", () => {
    expect(controls).toContain("danger:");
    expect(controls).toContain("bg-ds-danger");
  });

  it("announces loading and invalid states rather than only showing them", () => {
    // Colour and a spinner are not available to a screen reader.
    expect(controls).toContain("aria-busy");
    expect(controls).toContain("aria-invalid");
    expect(controls).toContain('role="alert"');
  });

  it("builds every control on tokens, not on raw palette classes", () => {
    const palette =
      /\b(?:bg|text|border|ring)-(?:slate|gray|zinc|blue|emerald|amber|red|rose|indigo|orange|green|sky|violet|purple|teal|cyan|neutral|stone|yellow)-\d/g;

    expect(controls.match(palette) ?? []).toEqual([]);
  });
});

describe("page containers", () => {
  const pages = files.filter((file) => file.endsWith("/page.tsx") && file.includes("/app/admin/"));

  it("found the admin pages", () => {
    expect(pages.length).toBeGreaterThan(70);
  });

  it("no page hand-rolls the container widths PageContainer owns", () => {
    // 26 pages wrote `mx-auto max-w-7xl` and 15 wrote `mx-auto max-w-5xl`, each
    // repeating a decision that belongs in one place. A page that needs a
    // genuinely different width can still say so — this only pins the two the
    // primitive now owns.
    const offenders = pages.filter((file) =>
      /className="mx-auto (?:w-full )?max-w-(?:7xl|5xl)/.test(read(file)),
    );

    expect(offenders.map((f) => f.replace(ROOT + "/", ""))).toEqual([]);
  });

  it("keeps the two page widths distinct", () => {
    const tokens = read(join(ROOT, "src/app/admin-design-tokens.css"));

    // Collapsing these to one width would either cramp the tables or stretch a
    // one-column form across a 1280px monitor.
    expect(tokens).toMatch(/--ds-page-max:\s*80rem/);
    expect(tokens).toMatch(/--ds-page-max-form:\s*64rem/);
  });

  it("offers both widths through the primitive", () => {
    const layout = read(join(ROOT, "src/components/admin/primitives/layout.tsx"));

    expect(layout).toContain("--ds-page-max-form");
    expect(layout).toContain('width = "wide"');
  });
});

describe("page headers", () => {
  it("offers one back affordance instead of fifteen", () => {
    // 15 pages hand-rolled their own, each with its own icon spacing and hit
    // area, so a detail screen in one corner of the panel looked nothing like
    // a detail screen in another.
    const shell = read(join(ROOT, "src/components/admin/admin-shell.tsx"));

    expect(shell).toContain("backHref");
    expect(shell).toContain('backLabel = "Back"');
    expect(shell).toContain("focus-visible:ring-ds-focus");
  });

  it("keeps the converted pages on the shared header", () => {
    // These nine wrote their own <h1> in seven different type treatments —
    // text-xl through text-3xl, font-bold through font-black, and three
    // different greys.
    const converted = [
      "src/app/admin/coupons/page.tsx",
      "src/app/admin/credit-reports/page.tsx",
      "src/app/admin/credit-reports/[id]/page.tsx",
      "src/app/admin/labour-schemes/page.tsx",
      "src/app/admin/leads/pipeline/page.tsx",
    ];

    for (const relative of converted) {
      const source = read(join(ROOT, relative));
      expect(source, relative).toContain("AdminPageHeader");
      // And no longer carry a hand-rolled page title.
      expect(source, relative).not.toMatch(/<h1[^>]*className="[^"]*text-(?:xl|2xl|3xl)/);
    }
  });

  it("leaves the invoice letterhead alone", () => {
    // offline-invoices/[id] has an <h1> reading "DigiConnect Dukan" beside a
    // logo: that is a printed document's letterhead, not a page header, and
    // converting it would be wrong.
    const invoice = read(join(ROOT, "src/app/admin/offline-invoices/[id]/page.tsx"));

    expect(invoice).toContain("DigiConnect Dukan");
    expect(invoice).not.toContain("AdminPageHeader");
  });
});
