/**
 * Pure helpers behind `AdminDataTable`.
 *
 * Kept out of the component because the test environment is `node` with no
 * DOM, so a React component cannot be rendered here. The parts that actually
 * carry a bug risk — off-by-ones in paging, CSV fields that shift every column
 * after them — are plain functions and are tested as such.
 */

export type PageWindow = {
  /** 1-based, clamped into range. */
  page: number;
  totalPages: number;
  /** Row offsets for a "11–25 of 240" label; both 0 when there is nothing. */
  firstRow: number;
  lastRow: number;
  /** Slice bounds for the current page. */
  from: number;
  to: number;
};

/**
 * Resolve a requested page against reality.
 *
 * A page past the end renders as an empty table, which reads as "your filter
 * matched nothing" rather than "you are past the last page" — so a request for
 * page 9 of 3 is clamped to 3 rather than honoured. Garbage (`?page=abc`,
 * `?page=-4`, `?page=1.7`) lands on page 1 instead of producing NaN offsets
 * that slice to an empty array.
 */
export function resolvePageWindow(
  requestedPage: unknown,
  total: number,
  pageSize: number,
): PageWindow {
  const size = Math.max(1, Math.trunc(Number(pageSize) || 1));
  const rows = Math.max(0, Math.trunc(Number(total) || 0));
  const totalPages = Math.max(1, Math.ceil(rows / size));

  const asked = Number(requestedPage);
  const page = Number.isFinite(asked)
    ? Math.min(Math.max(1, Math.trunc(asked)), totalPages)
    : 1;

  const from = (page - 1) * size;
  const to = Math.min(from + size, rows);

  return {
    page,
    totalPages,
    firstRow: rows === 0 ? 0 : from + 1,
    lastRow: rows === 0 ? 0 : to,
    from,
    to,
  };
}

/**
 * One CSV field.
 *
 * Everything is quoted rather than only the fields that need it: a partner
 * named "Kumar, S" or a note containing a newline would otherwise push every
 * later column into the wrong place, and the file still opens — silently
 * wrong — in Excel.
 */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * A CSV row set, with a UTF-8 BOM.
 *
 * Without the BOM Excel on Windows decodes the file as the system codepage and
 * renders Devanagari names as mojibake — which is most of this directory.
 */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvField).join(",")];
  for (const row of rows) lines.push(row.map(csvField).join(","));
  return `﻿${lines.join("\r\n")}`;
}
