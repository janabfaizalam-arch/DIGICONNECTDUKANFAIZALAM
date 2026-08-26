import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

import { afterAll, describe, expect, it } from "vitest";

import {
  buildXlsx,
  columnLetter,
  crc32,
  escapeXml,
  sanitizeSheetName,
  XLSX_CONTENT_TYPE,
} from "./xlsx";

/** Read a zip archive back into { path: contents } using only the central directory. */
function unzip(archive: Buffer): Record<string, string> {
  const eocdSignature = 0x06054b50;
  let eocd = archive.length - 22;
  while (eocd >= 0 && archive.readUInt32LE(eocd) !== eocdSignature) eocd -= 1;
  expect(eocd).toBeGreaterThanOrEqual(0);

  const entryCount = archive.readUInt16LE(eocd + 10);
  let cursor = archive.readUInt32LE(eocd + 16);
  const out: Record<string, string> = {};

  for (let index = 0; index < entryCount; index += 1) {
    expect(archive.readUInt32LE(cursor)).toBe(0x02014b50);
    const method = archive.readUInt16LE(cursor + 10);
    const storedCrc = archive.readUInt32LE(cursor + 16);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localOffset = archive.readUInt32LE(cursor + 42);
    const name = archive.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");

    expect(archive.readUInt32LE(localOffset)).toBe(0x04034b50);
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = archive.subarray(dataStart, dataStart + compressedSize);

    expect(method).toBe(8);
    const data = inflateRawSync(compressed);
    expect(crc32(data)).toBe(storedCrc);

    out[name] = data.toString("utf8");
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return out;
}

describe("xlsx helpers", () => {
  it("maps column indexes to spreadsheet letters past Z", () => {
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(25)).toBe("Z");
    expect(columnLetter(26)).toBe("AA");
    expect(columnLetter(51)).toBe("AZ");
    expect(columnLetter(701)).toBe("ZZ");
  });

  it("escapes XML metacharacters and drops characters XML forbids", () => {
    expect(escapeXml('Kumar & Sons <"Ltd">')).toBe(
      "Kumar &amp; Sons &lt;&quot;Ltd&quot;&gt;",
    );
    expect(escapeXml(`a${String.fromCharCode(7)}b${String.fromCharCode(0)}c`)).toBe("abc");
    // Tab, newline and carriage return are legal XML and must survive.
    expect(escapeXml("a\tb\nc\r")).toBe("a\tb\nc\r");
  });

  it("keeps sheet names inside Excel's naming rules", () => {
    expect(sanitizeSheetName("Digi Partners")).toBe("Digi Partners");
    expect(sanitizeSheetName("Q1/Q2 [2026]")).toBe("Q1 Q2  2026");
    expect(sanitizeSheetName("   ")).toBe("Sheet1");
    expect(sanitizeSheetName("x".repeat(40)).length).toBe(31);
  });
});

describe("buildXlsx", () => {
  const workbook = buildXlsx([
    {
      name: "Digi Partners",
      columns: [{ header: "Name", width: 24 }, { header: "Earned" }, { header: "Active" }],
      rows: [
        ["Kumar & Sons <Ltd>", 1250.5, true],
        ["मुस्कान पचौरी", 0, false],
        ["", null, undefined],
      ],
    },
  ]);

  it("emits a zip container Excel recognises", () => {
    expect(workbook.subarray(0, 2).toString("utf8")).toBe("PK");
    expect(XLSX_CONTENT_TYPE).toContain("spreadsheetml.sheet");
  });

  it("writes every part the OOXML package requires", () => {
    const files = unzip(workbook);
    expect(Object.keys(files).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    expect(files["xl/workbook.xml"]).toContain('name="Digi Partners"');
    expect(files["xl/_rels/workbook.xml.rels"]).toContain("worksheets/sheet1.xml");
    expect(files["xl/_rels/workbook.xml.rels"]).toContain("styles.xml");
  });

  it("writes headers, typed cells, escaped text and unicode", () => {
    const sheet = unzip(workbook)["xl/worksheets/sheet1.xml"];

    expect(sheet).toContain('<t xml:space="preserve">Name</t>');
    expect(sheet).toContain('<t xml:space="preserve">Kumar &amp; Sons &lt;Ltd&gt;</t>');
    expect(sheet).toContain('<t xml:space="preserve">मुस्कान पचौरी</t>');
    // Numbers stay numeric so Excel can sum them; booleans use t="b".
    expect(sheet).toContain("<v>1250.5</v>");
    expect(sheet).toContain('t="b"><v>1</v>');
    // Blank cells carry no inline string.
    expect(sheet).toContain('<c r="A4"/>');
    // 3 columns × (1 header + 3 body rows).
    expect(sheet).toContain('<dimension ref="A1:C4"/>');
    expect(sheet).toContain('<autoFilter ref="A1:C4"/>');
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain('width="24"');
  });

  it("is deterministic for identical input", () => {
    const again = buildXlsx([
      {
        name: "Digi Partners",
        columns: [{ header: "Name", width: 24 }, { header: "Earned" }, { header: "Active" }],
        rows: [
          ["Kumar & Sons <Ltd>", 1250.5, true],
          ["मुस्कान पचौरी", 0, false],
          ["", null, undefined],
        ],
      },
    ]);
    expect(again.equals(workbook)).toBe(true);
  });

  it("rejects an empty workbook", () => {
    expect(() => buildXlsx([])).toThrow(/at least one sheet/);
  });
});

describe("buildXlsx archive integrity", () => {
  const dir = mkdtempSync(join(tmpdir(), "xlsx-test-"));

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("passes an external zip integrity check", () => {
    const file = join(dir, "partners.xlsx");
    writeFileSync(file, buildXlsx([
      { name: "Sheet", columns: [{ header: "A" }], rows: [["one"], ["two"]] },
    ]));

    // The check is only meaningful where `unzip` exists; elsewhere the
    // round-trip assertions above already cover the archive structure.
    try {
      execFileSync("unzip", ["-v"], { stdio: "ignore" });
    } catch {
      return;
    }

    const output = execFileSync("unzip", ["-t", file], { encoding: "utf8" });
    expect(output).toContain("No errors detected");
  });
});
