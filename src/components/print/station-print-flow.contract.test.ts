import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

const flow = readCode("src/components/print/station-print-flow.tsx");

/* ─────────────────────────────────────────────────────────────────────────
   The PIN screen is not a dead end
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The screen that shows the pickup PIN was the last one, with nothing on it
 * but the PIN. A customer with a second page to print had no way forward, and
 * the browser's back button leaves the shop's page altogether — "done" is
 * state on this page, not a route, so back goes wherever they came from.
 */
describe("a customer can start a second print", () => {
  it("offers the way out on the done screen", () => {
    expect(flow).toContain("Print another file");
    expect(flow).toContain("onClick={startAnother}");
  });

  it("clears the finished order rather than navigating", () => {
    const reset = flow.slice(flow.indexOf("const startAnother"), flow.indexOf("if (done)"));
    for (const call of ["setDone(null)", "setFile(null)", "setUploaded(null)", "setError(null)"]) {
      expect(reset, `${call} is missing from startAnother`).toContain(call);
    }
  });

  it("keeps the mobile number, which the same customer already typed", () => {
    const reset = flow.slice(flow.indexOf("const startAnother"), flow.indexOf("if (done)"));
    expect(reset).not.toContain("setMobile(");
  });
});
