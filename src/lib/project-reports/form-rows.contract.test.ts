/**
 * The DPR form's two jobs, pinned so neither eats the other.
 *
 * It asks for five things and lets the business type fill in the rest. That
 * is deliberate and it is what makes a DPR take two minutes. But a bank reads
 * the machinery list against the customer's own quotation, and a unit that
 * mills wheat and presses oil sells more than the template's two products —
 * so those rows have to be editable too.
 *
 * The risk runs both ways. Dropping the editors puts the template's unit in
 * every file whether or not it is the customer's. Putting them on the first
 * screen turns five fields back into forty and nobody uses the form.
 *
 * These assert on source rather than on a rendered DOM: vitest runs
 * `environment: "node"` here, with no browser.
 */

import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

const FORM = "src/components/admin/project-report-form.tsx";
const ROWS = "src/components/admin/project-report-rows.tsx";

const form = readCode(FORM);
const rows = readCode(ROWS);

describe("the rows a DPR is made of are editable", () => {
  it("wires every row list the engine builds its statements from", () => {
    // Capital items set the project cost, products the sales table, raw
    // material the consumption, staff the salary statement. A list that is
    // not here is one the admin cannot correct for the customer in front of
    // them.
    for (const editor of ["CapitalItemRows", "ProductRows", "RawMaterialRows", "StaffRows"]) {
      // Anchored to the end of the tag name: a bare `toContain("<Foo")` also
      // matches `<FooDisabled`, which is exactly how one of these would be
      // switched off.
      expect(form, editor).toMatch(new RegExp(`<${editor}[\\s/>]`));
      expect(rows, editor).toMatch(new RegExp(`export function ${editor}\\(`));
    }
  });

  it("writes each list back to the field the engine reads", () => {
    for (const [editor, field] of [
      ["CapitalItemRows", "capitalItems"],
      ["ProductRows", "products"],
      ["RawMaterialRows", "rawMaterials"],
      ["StaffRows", "staff"],
    ]) {
      expect(form, editor).toMatch(new RegExp(`set\\("${field}"`));
    }
  });

  it("keeps them behind the optional section, so the five-field path stays five fields", () => {
    // The editors must come after the toggle that opens "Aur details
    // (optional)" — in front of it they would be the first thing a new user
    // sees, and the form's whole case is that they are not needed.
    expect(form.indexOf("Aur details")).toBeGreaterThan(0);
    expect(form.indexOf("<CapitalItemRows")).toBeGreaterThan(form.indexOf("Aur details"));
  });

  it("does not offer empty rows before a business has been chosen", () => {
    // Before "DPR banaiye" there are no rows to edit: an empty machinery
    // table would read as a form the admin has to fill in by hand, which is
    // the opposite of what this screen is for.
    expect(form).toMatch(/input\.products\.length > 0 \? \(\s*<>/);
  });
});

describe("the row editors themselves", () => {
  it("let a row be added and removed, not only retyped", () => {
    // A unit with a fifth product, or without the template's third machine,
    // is the ordinary case rather than the exception.
    for (const label of ["Saaman jodiye", "Product jodiye", "Kachcha maal jodiye", "Staff jodiye"]) {
      expect(rows, label).toContain(label);
    }
    expect(rows).toContain("filter((_, i) => i !== index)");
  });

  it("names every field for a screen reader, since the column headings are hidden on a phone", () => {
    const inputs = rows.match(/<(AdminInput|AdminSelect)\b/g) ?? [];
    // NumberBox names its own input with `aria-label={label}` rather than a
    // quoted string, so both spellings count.
    const labelled = rows.match(/aria-label=[{"]/g) ?? [];
    const numbers = rows.match(/<NumberBox\b/g) ?? [];

    expect(labelled.length).toBeGreaterThanOrEqual(inputs.length);
    expect(numbers.length).toBeGreaterThan(0);
    expect(rows).toContain('aria-label={label}');
  });

  it("puts the wide-screen column template behind a media query", () => {
    // An inline `gridTemplateColumns` cannot be put behind one, so the six
    // columns that fit a desktop would squeeze a phone as well. The variable
    // is only read from `md` up.
    expect(rows).toContain("md:[grid-template-columns:var(--dpr-cols)]");
    expect(rows).not.toMatch(/style=\{\{\s*gridTemplateColumns/);
  });

  it("builds on the admin primitives rather than raw palette classes", () => {
    const palette =
      /\b(?:bg|text|border|ring)-(?:slate|gray|zinc|red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|pink|rose|neutral|stone)-\d/;

    expect(rows).not.toMatch(palette);
    expect(rows).toContain("AdminInput");
    expect(rows).toContain("AdminButton");
  });
});
