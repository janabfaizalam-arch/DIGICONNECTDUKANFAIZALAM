import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { countPdfPages, scanPageCount } from "@/lib/print/pdf-pages";

/**
 * A 7-page PDF whose page objects live in compressed object streams, the way
 * most phones, Word and browsers save PDFs today. The old byte-scan found 0
 * pages here and billed the customer for 1 while the printer printed 7.
 */
const fixture = readFileSync(join(process.cwd(), "src/test/fixtures/seven-pages-object-streams.pdf"));

describe("counting pages for billing", () => {
  it("the byte scan alone is blind to object streams", () => {
    expect(scanPageCount(fixture)).toBe(0);
  });

  it("the real parser bills every page", async () => {
    expect(await countPdfPages(fixture)).toBe(7);
  });
});
