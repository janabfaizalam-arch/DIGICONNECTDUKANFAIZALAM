import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { crc32, createZip, dosDateTime } from "./zip";

/**
 * The partner download has to open on a shop's computer.
 *
 * A zip that Node can read but Windows Explorer refuses is worse than no zip
 * at all, so the archive is checked against the operating system's own unzip
 * rather than against another copy of the same assumptions.
 */

describe("crc32", () => {
  it("matches the known value for a standard input", () => {
    expect(crc32(Buffer.from("123456789")).toString(16)).toBe("cbf43926");
  });

  it("is zero for empty content, as the format requires", () => {
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });
});

describe("dosDateTime", () => {
  it("encodes a date the format can represent", () => {
    const { date } = dosDateTime(new Date(2026, 8, 2));
    expect(date >> 9).toBe(46); // 2026 - 1980
    expect((date >> 5) & 0xf).toBe(9);
    expect(date & 0x1f).toBe(2);
  });

  it("clamps a pre-1980 date instead of writing a negative year", () => {
    // The epoch is the format's, not ours. A negative year would produce a
    // file Explorer refuses to open.
    expect(dosDateTime(new Date(1970, 0, 1)).date >> 9).toBe(0);
  });
});

describe("createZip", () => {
  const bundle = () =>
    createZip([
      { name: "config.json", content: JSON.stringify({ agentToken: "dcp_secret", serverUrl: "https://rnos.in" }) },
      { name: "station.mjs", content: "console.log('hi');\n" },
      { name: "lib/worker.mjs", content: "export const repeated = 1;\n".repeat(300) },
      { name: "empty.txt", content: "" },
    ]);

  it("is accepted by the operating system's own unzip", () => {
    const folder = mkdtempSync(join(tmpdir(), "zip-"));
    writeFileSync(join(folder, "b.zip"), bundle());

    const report = execSync(`unzip -t ${join(folder, "b.zip")}`).toString();
    expect(report).toContain("No errors detected");
  });

  it("restores every file's exact bytes, nested folders included", () => {
    const folder = mkdtempSync(join(tmpdir(), "zip-"));
    writeFileSync(join(folder, "b.zip"), bundle());
    execSync(`cd ${folder} && unzip -o -q b.zip`);

    expect(JSON.parse(readFileSync(join(folder, "config.json"), "utf8")).agentToken).toBe("dcp_secret");
    expect(readFileSync(join(folder, "lib", "worker.mjs"), "utf8")).toHaveLength(27 * 300);
    expect(readFileSync(join(folder, "empty.txt"), "utf8")).toBe("");
  });

  it("stores a file rather than shipping a compressed copy that grew", () => {
    // Tiny inputs routinely inflate under deflate, and an entry larger than
    // its own input makes strict unzip implementations complain.
    const zip = createZip([{ name: "a.txt", content: "x" }]);
    expect(zip.readUInt16LE(8)).toBe(0); // compression method: stored
  });

  it("deflates content large enough to benefit", () => {
    const zip = createZip([{ name: "a.txt", content: "y".repeat(5000) }]);
    expect(zip.readUInt16LE(8)).toBe(8); // deflate
    expect(zip.length).toBeLessThan(2000);
  });

  it("marks names as UTF-8 so a non-English filename survives", () => {
    const zip = createZip([{ name: "PEHLE YE PADHIYE.txt", content: "hi" }]);
    expect(zip.readUInt16LE(6) & 0x0800).toBe(0x0800);
  });

  it("counts every entry in the directory at the end", () => {
    const zip = bundle();
    const eocd = zip.length - 22;
    expect(zip.readUInt32LE(eocd)).toBe(0x06054b50);
    expect(zip.readUInt16LE(eocd + 10)).toBe(4);
  });

  it("produces a valid, empty archive rather than throwing on no entries", () => {
    const zip = createZip([]);
    expect(zip).toHaveLength(22);
    expect(zip.readUInt16LE(10)).toBe(0);
  });
});
