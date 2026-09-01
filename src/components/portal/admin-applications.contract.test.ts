import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

const queue = readCode("src/components/portal/admin-applications.tsx");

/* ─────────────────────────────────────────────────────────────────────────
   Nothing scrolls sideways
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The queue was five counter cards above a ten-column table — application id,
 * customer, service, source, status, payment, amount, agent, created, actions
 * — with three buttons stacked in every row. On a phone it scrolled sideways
 * past the columns that mattered.
 */
describe("an application is a card, not ten cells", () => {
  it("has no table left", () => {
    for (const tag of ["<table", "<thead", "<tbody", "<th ", "<td "]) {
      expect(queue, `${tag} is back`).not.toContain(tag);
    }
  });

  it("renders one card per application", () => {
    expect(queue).toContain("ApplicationCard");
    expect(queue).toMatch(/rows\.map\(\(row\) => \(/);
  });

  it("makes the card itself the link rather than a View button inside it", () => {
    // A row with a "View" button wastes the other 95% of the tap target.
    expect(queue).toContain("<Link href={rowHref(row)} className=\"block p-3.5");
    expect(queue).not.toMatch(/>\s*View\s*</);
  });

  it("drops the opaque application id", () => {
    // "c08ecef1" told nobody anything; the customer's name is the identifier
    // a shop actually recognises.
    expect(queue).not.toContain("shortId");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The counters are the filter
   ───────────────────────────────────────────────────────────────────────── */

/**
 * "102 unassigned" was a number you read and then went hunting for a dropdown
 * to act on. It is the button that shows you those 102 now.
 */
describe("the counts are how you filter", () => {
  it("renders each count as a pressable view", () => {
    expect(queue).toContain("const views = [");
    expect(queue).toContain('aria-pressed={active}');
    for (const label of ["Everything", "Needs assigning", "Payment pending", "In progress", "Completed"]) {
      expect(queue, `the "${label}" view is missing`).toContain(label);
    }
  });

  it("no longer makes you press Apply before a filter takes effect", () => {
    expect(queue).not.toMatch(/>\s*Apply\s*</);
    expect(queue).not.toContain("submitFilters");
  });

  it("folds the rarely-used filters away and says when they are on", () => {
    expect(queue).toContain("showMore");
    expect(queue).toContain("extraFilters");
    expect(queue).toContain("Clear search and filters");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Honest about what is missing
   ───────────────────────────────────────────────────────────────────────── */

describe("the card says what it does not know", () => {
  it("calls out an application nobody is on", () => {
    expect(queue).toContain("Nobody assigned");
  });

  it("shows a disabled WhatsApp rather than a dead link when there is no mobile", () => {
    expect(queue).toContain("No mobile number on this application");
  });

  it("distinguishes an existing invoice from one still to be made", () => {
    expect(queue).toContain("row.invoice_id ? \"Open the invoice\" : \"Generate an invoice\"");
  });
});
