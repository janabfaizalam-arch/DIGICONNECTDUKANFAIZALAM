import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseWidthPx, resolvePageWindow, splitColumnsByWidth } from "@/lib/admin/table-paging";

const source = readFileSync(
  join(process.cwd(), "src/lib/admin/commissions-data.ts"),
  "utf8",
);

/**
 * The page window is slice bounds (`to` exclusive); `.range()` wants an
 * inclusive end. This is the conversion the data layer performs, mirrored here
 * so the arithmetic can be checked without a database.
 */
const rangeEndFor = (from: number, to: number) => Math.max(from, to - 1);

describe("page window → PostgREST range", () => {
  it("asks for exactly the rows the page shows", () => {
    const { from, to } = resolvePageWindow(1, 240, 25);

    expect({ from, to }).toEqual({ from: 0, to: 25 });
    // 0..24 inclusive is 25 rows — not 0..25, which would fetch 26 and leak a
    // row from the next page onto this one.
    expect(rangeEndFor(from, to)).toBe(24);
  });

  it("walks pages without gaps or overlaps", () => {
    const seen: number[] = [];

    for (let page = 1; page <= 4; page += 1) {
      const { from, to } = resolvePageWindow(page, 100, 25);
      for (let row = from; row <= rangeEndFor(from, to); row += 1) seen.push(row);
    }

    // Every row of a 100-row set, exactly once.
    expect(seen).toHaveLength(100);
    expect(new Set(seen).size).toBe(100);
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(99);
  });

  it("stops at the final row on a short last page", () => {
    const { from, to } = resolvePageWindow(3, 55, 25);

    expect(from).toBe(50);
    expect(rangeEndFor(from, to)).toBe(54);
  });

  it("does not invert the range when the result set is empty", () => {
    // from 0, to 0 would ask PostgREST for range(0, -1), which is not a valid
    // descending range and errors rather than returning nothing.
    const { from, to } = resolvePageWindow(1, 0, 25);

    expect(rangeEndFor(from, to)).toBeGreaterThanOrEqual(from);
  });

  it("clamps a page past the end instead of rendering an empty ledger", () => {
    // An empty table reads as "there are no commissions", which for a financial
    // ledger is a materially different statement from "you are past the end".
    const { page, from } = resolvePageWindow(9, 55, 25);

    expect(page).toBe(3);
    expect(from).toBe(50);
  });
});

describe("the ledger query", () => {
  it("selects named columns rather than everything", () => {
    // `select("*, applications(...), profiles(...)")` pulled every column of
    // three tables — the agent's mobile among them — into a payload the ledger
    // never rendered.
    //
    // Asserted against the SELECT constant, not the file: the prose above
    // quotes the old shape, and a whole-file match would read that back.
    const select = /const SELECT =\s*([\s\S]*?);/.exec(source)?.[1] ?? "";

    expect(select).not.toBe("");
    expect(select).not.toContain("*");
    expect(select).toContain("applications(service_name)");
    expect(select).toContain("profiles(full_name, email)");
  });

  it("is always bounded by a range", () => {
    expect(source).toContain(".range(");
  });

  it("counts with head so no rows cross the wire for the total", () => {
    expect(source).toContain('count: "exact", head: true');
  });

  it("orders newest first, so paging is stable", () => {
    expect(source).toContain('order("created_at", { ascending: false })');
  });

  it("applies the status filter to the count as well as the page", () => {
    // A filtered page against an unfiltered total would show "1–25 of 4,000"
    // over three rows.
    const countFn = source.slice(source.indexOf("countAdminCommissions"));
    expect(countFn).toContain('status !== "all"');
    expect(countFn).toContain('eq("status", status)');
  });
});

describe("ledger column widths fit the admin content area", () => {
  /**
   * The declared widths, read from the table component.
   *
   * `AdminDataTable` is `table-fixed`, so these are obeyed rather than
   * negotiated: a set that sums past the area does not squeeze, it overflows,
   * and Actions ends up behind a horizontal scrollbar. Phase A hit exactly that
   * on two screens, so the values are checked here rather than assumed.
   */
  const table = readFileSync(
    join(process.cwd(), "src/app/admin/commissions/commissions-table.tsx"),
    "utf8",
  );

  const columns = [...table.matchAll(/id:\s*"([a-z]+)",([\s\S]*?)cell:/g)].map(([, id, body]) => ({
    id,
    width: /width:\s*"([^"]+)"/.exec(body)?.[1],
    hideBelow: Number(/hideBelow:\s*(\d+)/.exec(body)?.[1] ?? 0) || undefined,
    priority: /priority:\s*"primary"/.test(body) ? "primary" : undefined,
  }));

  /** The expander cell, which this table draws once anything collapses. */
  const CONTROLS = 36;

  const widthOf = (cols: { width?: string }[]) =>
    cols.reduce((sum, c) => sum + parseWidthPx(c.width), CONTROLS);

  it("reads all six columns from the component", () => {
    expect(columns.map((c) => c.id)).toEqual([
      "agent",
      "service",
      "amount",
      "status",
      "earned",
      "actions",
    ]);
    expect(columns.every((c) => c.width)).toBe(true);
  });

  it("fits every real AdminShell content width", () => {
    // 1068 / 908 / 652 are the measured table areas at 1440 / 1280 / 1024 with
    // the 280px sidebar.
    for (const areaWidth of [1068, 908, 652]) {
      const { visible } = splitColumnsByWidth(columns, new Set<string>(), areaWidth, CONTROLS);

      expect(widthOf(visible)).toBeLessThanOrEqual(areaWidth);
    }
  });

  it("keeps the agent, amount, status and actions columns at every width", () => {
    // Who, how much, what state, and the control to act on it — the row is
    // useless without any of them, so none declares a hideBelow.
    for (const areaWidth of [652, 908, 1068]) {
      const shown = splitColumnsByWidth(columns, new Set<string>(), areaWidth, CONTROLS).visible.map(
        (c) => c.id,
      );

      expect(shown).toEqual(expect.arrayContaining(["agent", "amount", "status", "actions"]));
    }
  });

  it("loses no column: anything collapsed is still reachable in the details panel", () => {
    for (const areaWidth of [652, 908, 1068]) {
      const { visible, collapsed } = splitColumnsByWidth(columns, new Set<string>(), areaWidth, CONTROLS);

      expect([...visible, ...collapsed]).toHaveLength(columns.length);
    }
  });
});
