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

  it("shows a reference that says something instead of a uuid fragment", () => {
    // "c08ecef1" told nobody anything. "AAD-260830-C08E" carries the service
    // and the day, and can be read down a phone.
    expect(queue).not.toContain("shortId");
    expect(queue).toContain("applicationReference(row)");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Act without opening it
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Moving one file forward used to be: open it, find the sidebar, change the
 * dropdown, press Save Changes, go back. For a queue of a hundred that is
 * five hundred clicks.
 */
describe("status and assignment change from the list", () => {
  it("patches the application in place", () => {
    expect(queue).toContain("/api/admin/applications/${target}");
    expect(queue).toContain('method: "PATCH"');
    expect(queue).toContain("assignedAgentId");
  });

  it("offers the real status list rather than a hand-written one", () => {
    // A second copy of the statuses drifts from the one the rest of the panel
    // validates against.
    expect(queue).toContain("APPLICATION_STATUS_OPTIONS.map");
  });

  it("refreshes the list so the card shows what was saved", () => {
    expect(queue).toContain("router.refresh()");
  });

  it("blocks a second change while one is in flight", () => {
    expect(queue).toContain("disabled={saving !== null}");
  });

  it("says when a save failed rather than looking like it worked", () => {
    expect(queue).toContain('error(caught instanceof Error ? caught.message : "Could not save.")');
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
