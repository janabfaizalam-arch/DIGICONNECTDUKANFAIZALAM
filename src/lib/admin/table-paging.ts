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

/** `1rem` in the admin surface, which never overrides the root font size. */
const REM_PX = 16;

/** What an unsized column is assumed to want. */
const DEFAULT_COLUMN_PX = 128;

/**
 * A declared column width in pixels.
 *
 * Only `rem` and `px` are understood, because those are the only units the
 * column definitions use. Anything else — a percentage, `auto`, a `calc()` —
 * falls back to the default rather than producing `NaN`, which would poison
 * the whole sum and collapse every column at once.
 */
export function parseWidthPx(width?: string): number {
  if (!width) return DEFAULT_COLUMN_PX;

  const match = /^([\d.]+)\s*(rem|px)$/.exec(width.trim());
  if (!match) return DEFAULT_COLUMN_PX;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_COLUMN_PX;

  return match[2] === "rem" ? value * REM_PX : value;
}

/**
 * Which columns the table draws, and which move to the row's details panel.
 *
 * The table is `table-fixed`, so the declared widths are obeyed rather than
 * negotiated: if they sum to more than the area, the table overflows and the
 * last columns — Actions among them — scroll out of sight. So the decision is
 * made from those widths rather than from a threshold each page guesses:
 *
 *   1. A `primary` column is never removed — it is what identifies the row.
 *   2. A column the admin switched off in the Columns menu is gone entirely;
 *      that was an explicit choice and the panel should not undo it.
 *   3. A column with no `hideBelow` is never collapsed. Declaring one is how a
 *      page says "this may move to the details panel", and the value orders
 *      them: the largest goes first.
 *   4. `hideBelow` is honoured as a floor — below it the column is unreadable
 *      whether or not it fits.
 *   5. Then columns keep moving to the panel, in that same order, until the
 *      remaining widths actually fit.
 *
 * Step 5 is what makes this reusable. A page author only has to get the
 * *order* right; an absolute pixel guess that is too generous can no longer
 * push a column off-screen, which is exactly how the commissions table came to
 * hide its Status column behind a horizontal scrollbar at 1280px.
 *
 * `controlsWidth` covers the expander and selection cells, which carry no
 * column definition but take real space.
 *
 * `areaWidth` of 0 means "not measured yet" and shows everything, so the first
 * paint is the widest layout rather than the narrowest.
 */
export function splitColumnsByWidth<
  T extends { id: string; width?: string; hideBelow?: number; priority?: string },
>(
  columns: T[],
  hiddenIds: ReadonlySet<string>,
  areaWidth: number,
  controlsWidth = 0,
): { visible: T[]; collapsed: T[] } {
  const chosen = columns.filter(
    (column) => column.priority === "primary" || !hiddenIds.has(column.id),
  );

  if (!(areaWidth > 0)) return { visible: [...chosen], collapsed: [] };

  // Largest `hideBelow` first: the column the page was most willing to lose.
  const droppable = chosen
    .filter(
      (column) =>
        column.priority !== "primary" &&
        typeof column.hideBelow === "number" &&
        Number.isFinite(column.hideBelow) &&
        column.hideBelow > 0,
    )
    .sort((a, b) => (b.hideBelow ?? 0) - (a.hideBelow ?? 0));

  const collapsedIds = new Set<string>();

  for (const column of droppable) {
    if (areaWidth < (column.hideBelow ?? 0)) collapsedIds.add(column.id);
  }

  const required = () =>
    chosen.reduce(
      (sum, column) => (collapsedIds.has(column.id) ? sum : sum + parseWidthPx(column.width)),
      controlsWidth,
    );

  for (const column of droppable) {
    if (required() <= areaWidth) break;
    collapsedIds.add(column.id);
  }

  return {
    visible: chosen.filter((column) => !collapsedIds.has(column.id)),
    collapsed: chosen.filter((column) => collapsedIds.has(column.id)),
  };
}
