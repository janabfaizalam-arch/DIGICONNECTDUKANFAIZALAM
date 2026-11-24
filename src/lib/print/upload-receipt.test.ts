import { describe, expect, it } from "vitest";

import { issueUploadReceipt, readUploadReceipt, safeFileName } from "@/lib/print/upload-receipt";
import { scanPageCount } from "@/lib/print/pdf-pages";

const KEY = "test-key";
const facts = { path: "uploads/abc/file.pdf", pages: 12, size: 1000, mime: "application/pdf", name: "file.pdf" };

describe("the upload receipt", () => {
  it("round-trips what the server measured", () => {
    const receipt = issueUploadReceipt(facts, 1_000, KEY)!;
    expect(readUploadReceipt(receipt, 2_000, KEY)).toEqual(facts);
  });

  it("refuses a receipt whose pages were edited", () => {
    const receipt = issueUploadReceipt(facts, 1_000, KEY)!;
    const [payload, sig] = receipt.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), pages: 1 }),
    ).toString("base64url");
    expect(readUploadReceipt(`${forged}.${sig}`, 2_000, KEY)).toBeNull();
  });

  it("refuses a receipt pointing outside uploads/, an old one, or one signed with another key", () => {
    expect(readUploadReceipt(issueUploadReceipt({ ...facts, path: "other/x" }, 1_000, KEY), 2_000, KEY)).toBeNull();
    expect(readUploadReceipt(issueUploadReceipt(facts, 0, KEY), 3 * 60 * 60 * 1000, KEY)).toBeNull();
    expect(readUploadReceipt(issueUploadReceipt(facts, 1_000, "other"), 2_000, KEY)).toBeNull();
    expect(readUploadReceipt("garbage", 2_000, KEY)).toBeNull();
    expect(readUploadReceipt(undefined, 2_000, KEY)).toBeNull();
  });

  it("issues nothing without a signing secret", () => {
    expect(issueUploadReceipt(facts, 1_000, "")).toBeNull();
  });
});

describe("file names in storage paths", () => {
  it("cannot climb directories or carry control characters", () => {
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("a\\b\\c.pdf")).toBe("c.pdf");
    expect(safeFileName("..hidden")).toBe("hidden");
    expect(safeFileName("")).toBe("file");
    expect(safeFileName("bill\u0000 copy.pdf")).not.toContain("\u0000");
  });
});

describe("the byte-scan page floor", () => {
  it("counts page objects without counting the page tree", () => {
    const pdf = Buffer.from("<< /Type /Pages /Kids [1 0 R 2 0 R] /Count 2 >> << /Type /Page >> << /Type /Page >>");
    expect(scanPageCount(pdf)).toBe(2);
  });

  it("reads the page tree count when page objects are compressed away", () => {
    expect(scanPageCount(Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 37 >>"))).toBe(37);
  });
});
