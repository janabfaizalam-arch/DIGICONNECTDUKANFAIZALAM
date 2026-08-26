/**
 * Minimal, dependency-free XLSX (SpreadsheetML) writer.
 *
 * Produces a real Office Open XML workbook — the kind Excel, LibreOffice and
 * Google Sheets open natively — without pulling a spreadsheet library into the
 * bundle. Only what admin exports need is supported: one or more sheets, a
 * frozen bold header row, auto-filter, column widths, and text/number cells.
 *
 * Node-only: it uses `node:zlib` to deflate the zip entries.
 */

import { deflateRawSync } from "node:zlib";

export type XlsxCell = string | number | boolean | null | undefined;

export type XlsxColumn = {
  header: string;
  /** Approximate character width for the column. */
  width?: number;
};

export type XlsxSheet = {
  name: string;
  columns: XlsxColumn[];
  rows: XlsxCell[][];
};

// ── XML helpers ────────────────────────────────────────────────────────────

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/** Control characters XML 1.0 forbids outright (tab, LF and CR stay). */
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

export function escapeXml(value: string) {
  return value
    .replace(INVALID_XML_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 0 → "A", 25 → "Z", 26 → "AA". */
export function columnLetter(index: number) {
  let remaining = index + 1;
  let letters = "";
  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + modulo) + letters;
    remaining = Math.floor((remaining - modulo) / 26);
  }
  return letters;
}

/** Excel rejects sheet names containing []:*?/\, blank names, and names over 31 chars. */
export function sanitizeSheetName(name: string, fallback = "Sheet1") {
  const cleaned = name.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31).trim();
  return cleaned || fallback;
}

// ── Worksheet XML ──────────────────────────────────────────────────────────

function cellXml(reference: string, value: XlsxCell, styleId: number) {
  const style = styleId ? ` s="${styleId}"` : "";

  if (value === null || value === undefined || value === "") {
    return `<c r="${reference}"${style}/>`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${reference}"${style}><v>${value}</v></c>`;
  }

  if (typeof value === "boolean") {
    return `<c r="${reference}"${style} t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  const text = escapeXml(String(value));
  return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
}

function rowXml(rowNumber: number, cells: XlsxCell[], styleId: number) {
  const body = cells
    .map((cell, index) => cellXml(`${columnLetter(index)}${rowNumber}`, cell, styleId))
    .join("");
  return `<row r="${rowNumber}">${body}</row>`;
}

function worksheetXml(sheet: XlsxSheet) {
  const columnCount = Math.max(
    sheet.columns.length,
    ...sheet.rows.map((row) => row.length),
    1,
  );
  const lastColumn = columnLetter(columnCount - 1);
  const lastRow = sheet.rows.length + 1;

  const cols = sheet.columns.length
    ? `<cols>${sheet.columns
        .map((column, index) => {
          const width = Math.min(Math.max(column.width ?? 18, 6), 80);
          return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
        })
        .join("")}</cols>`
    : "";

  const headerRow = rowXml(1, sheet.columns.map((column) => column.header), 1);
  const bodyRows = sheet.rows.map((row, index) => rowXml(index + 2, row, 0)).join("");

  return [
    XML_DECLARATION,
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    `<dimension ref="A1:${lastColumn}${lastRow}"/>`,
    '<sheetViews><sheetView workbookViewId="0">',
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>',
    "</sheetView></sheetViews>",
    '<sheetFormatPr defaultRowHeight="15"/>',
    cols,
    `<sheetData>${headerRow}${bodyRows}</sheetData>`,
    `<autoFilter ref="A1:${lastColumn}${lastRow}"/>`,
    "</worksheet>",
  ].join("");
}

// ── Workbook parts ─────────────────────────────────────────────────────────

function contentTypesXml(sheetCount: number) {
  const overrides = Array.from({ length: sheetCount }, (_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join("");

  return [
    XML_DECLARATION,
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    overrides,
    "</Types>",
  ].join("");
}

const ROOT_RELS_XML = [
  XML_DECLARATION,
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
  "</Relationships>",
].join("");

function workbookXml(sheetNames: string[]) {
  const sheets = sheetNames
    .map(
      (name, index) =>
        `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("");

  return [
    XML_DECLARATION,
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    `<sheets>${sheets}</sheets>`,
    "</workbook>",
  ].join("");
}

function workbookRelsXml(sheetCount: number) {
  const sheetRels = Array.from({ length: sheetCount }, (_, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  ).join("");

  return [
    XML_DECLARATION,
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    sheetRels,
    `<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
    "</Relationships>",
  ].join("");
}

/** Two cell formats: 0 = body text, 1 = the dark bold header band. */
const STYLES_XML = [
  XML_DECLARATION,
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
  '<fonts count="2">',
  '<font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>',
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>',
  "</fonts>",
  '<fills count="3">',
  '<fill><patternFill patternType="none"/></fill>',
  '<fill><patternFill patternType="gray125"/></fill>',
  '<fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill>',
  "</fills>",
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>',
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
  '<cellXfs count="2">',
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>',
  "</cellXfs>",
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
  "</styleSheet>",
].join("");

// ── ZIP container ──────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc = CRC_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

type ZipEntry = { path: string; data: Buffer };

/**
 * Build a ZIP archive with deflated entries. Timestamps are pinned so identical
 * input always produces byte-identical output.
 */
function zip(entries: ZipEntry[]) {
  const DOS_TIME = 0;
  const DOS_DATE = 0x2821; // 2000-01-01
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.path, "utf8");
    const compressed = deflateRawSync(entry.data, { level: 9 });
    const checksum = crc32(entry.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // deflate
    localHeader.writeUInt16LE(DOS_TIME, 10);
    localHeader.writeUInt16LE(DOS_DATE, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length

    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(8, 10); // deflate
    centralHeader.writeUInt16LE(DOS_TIME, 12);
    centralHeader.writeUInt16LE(DOS_DATE, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra
    centralHeader.writeUInt16LE(0, 32); // comment
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + compressed.length;
  }

  const central = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(central.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, central, endRecord]);
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Serialize one or more sheets into a downloadable .xlsx buffer. */
export function buildXlsx(sheets: XlsxSheet[]): Buffer {
  if (!sheets.length) {
    throw new Error("buildXlsx requires at least one sheet.");
  }

  const names = sheets.map((sheet, index) => sanitizeSheetName(sheet.name, `Sheet${index + 1}`));

  const entries: ZipEntry[] = [
    { path: "[Content_Types].xml", data: Buffer.from(contentTypesXml(sheets.length), "utf8") },
    { path: "_rels/.rels", data: Buffer.from(ROOT_RELS_XML, "utf8") },
    { path: "xl/workbook.xml", data: Buffer.from(workbookXml(names), "utf8") },
    { path: "xl/_rels/workbook.xml.rels", data: Buffer.from(workbookRelsXml(sheets.length), "utf8") },
    { path: "xl/styles.xml", data: Buffer.from(STYLES_XML, "utf8") },
    ...sheets.map((sheet, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      data: Buffer.from(worksheetXml(sheet), "utf8"),
    })),
  ];

  return zip(entries);
}

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
