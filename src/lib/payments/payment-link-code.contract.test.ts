import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

/* ─────────────────────────────────────────────────────────────────────────
   A payment link must survive the trip to the customer
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Codes are minted uppercase and looked up with a case-sensitive `.eq`, so a
 * link that reached the customer lower-cased resolved to no row at all — and
 * the customer was told the payment link did not exist (HTTP 404) rather than
 * being shown the payment page.
 */
describe("payment link code lookup", () => {
  const generate = readSrc("src/app/api/payment-links/generate/route.ts");
  const details = readSrc("src/app/api/payment-links/details/route.ts");

  it("mints codes from an uppercase alphabet", () => {
    expect(generate).toContain('const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"');
    expect(generate).toContain('let code = "APL-"');
  });

  it("folds case and trims before looking a code up", () => {
    expect(details).toContain("rawCode.trim().toUpperCase()");
    expect(details).toContain('.eq("code", code)');
  });

  it("reads the code from the query string before normalising it", () => {
    // The raw value is never passed to the lookup.
    expect(details).toContain('const rawCode = searchParams.get("code")');
    expect(details).not.toMatch(/\.eq\("code", rawCode\)/);
  });

  it("separates a missing link from a failed query", () => {
    // A failed query used to read as "no such link" and send the customer away.
    expect(details).toContain("Could not load this payment link");
    expect(details).toContain("Payment link not found.");
  });

  it("still distinguishes expired and cancelled links from missing ones", () => {
    expect(details).toContain("This payment link has expired.");
    expect(details).toContain("This payment link has been cancelled.");
  });
});
