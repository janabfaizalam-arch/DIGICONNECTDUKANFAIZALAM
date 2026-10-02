import { describe, expect, it } from "vitest";

import { csvField, parseWidthPx, resolvePageWindow, splitColumnsByWidth, toCsv } from "./table-paging";

describe("resolvePageWindow", () => {
  it("describes an ordinary middle page", () => {
    const window = resolvePageWindow(2, 240, 25);

    expect(window).toMatchObject({
      page: 2,
      totalPages: 10,
      firstRow: 26,
      lastRow: 50,
      from: 25,
      to: 50,
    });
  });

  it("stops the last page at the final row, not at a full page", () => {
    const window = resolvePageWindow(3, 55, 25);

    expect(window.page).toBe(3);
    expect(window.lastRow).toBe(55);
    expect(window.to).toBe(55);
  });

  it("clamps a page past the end rather than showing an empty table", () => {
    // Otherwise ?page=9 on a 3-page list reads as "nothing matched".
    const window = resolvePageWindow(9, 55, 25);

    expect(window.page).toBe(3);
    expect(window.firstRow).toBe(51);
  });

  it("clamps a page below one", () => {
    expect(resolvePageWindow(0, 100, 25).page).toBe(1);
    expect(resolvePageWindow(-7, 100, 25).page).toBe(1);
  });

  it("falls back to page one for input that is not a number", () => {
    for (const value of ["abc", "", null, undefined, NaN, {}]) {
      expect(resolvePageWindow(value, 100, 25).page).toBe(1);
    }
  });

  it("truncates a fractional page instead of producing fractional offsets", () => {
    const window = resolvePageWindow("2.9", 240, 25);

    expect(window.page).toBe(2);
    expect(Number.isInteger(window.from)).toBe(true);
  });

  it("reports zeroes, and one page, when there is nothing to show", () => {
    const window = resolvePageWindow(1, 0, 25);

    expect(window).toMatchObject({ page: 1, totalPages: 1, firstRow: 0, lastRow: 0, from: 0, to: 0 });
  });

  it("survives a nonsense page size", () => {
    expect(resolvePageWindow(1, 10, 0).totalPages).toBe(10);
    expect(resolvePageWindow(1, 10, -5).totalPages).toBe(10);
  });

  it("gives slice bounds that reassemble the dataset exactly once", () => {
    const rows = Array.from({ length: 57 }, (_, index) => index);
    const seen: number[] = [];

    for (let page = 1; page <= resolvePageWindow(1, rows.length, 10).totalPages; page += 1) {
      const window = resolvePageWindow(page, rows.length, 10);
      seen.push(...rows.slice(window.from, window.to));
    }

    expect(seen).toEqual(rows);
  });
});

describe("csvField", () => {
  it("quotes every field", () => {
    expect(csvField("plain")).toBe('"plain"');
    expect(csvField(42)).toBe('"42"');
  });

  it("doubles embedded quotes so the field does not terminate early", () => {
    expect(csvField('He said "yes"')).toBe('"He said ""yes"""');
  });

  it("keeps a comma inside one field", () => {
    // Unquoted, this would become two columns and shift the rest of the row.
    expect(csvField("Kumar, S")).toBe('"Kumar, S"');
  });

  it("keeps a newline inside one field", () => {
    expect(csvField("line one\nline two")).toBe('"line one\nline two"');
  });

  it("writes an empty field for null and undefined, not the word", () => {
    expect(csvField(null)).toBe('""');
    expect(csvField(undefined)).toBe('""');
  });

  it("preserves a leading zero, which matters for mobile numbers", () => {
    expect(csvField("09455062648")).toBe('"09455062648"');
  });
});

describe("toCsv", () => {
  it("starts with a BOM so Excel reads it as UTF-8", () => {
    const csv = toCsv(["Name"], [["मुस्कान पचौरी"]]);

    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("मुस्कान पचौरी");
  });

  it("separates rows with CRLF", () => {
    const csv = toCsv(["A", "B"], [["1", "2"], ["3", "4"]]);

    expect(csv).toBe('﻿"A","B"\r\n"1","2"\r\n"3","4"');
  });

  it("emits only the header when there are no rows", () => {
    expect(toCsv(["A"], [])).toBe('﻿"A"');
  });
});

describe("parseWidthPx", () => {
  it("reads the units the column definitions actually use", () => {
    expect(parseWidthPx("10.5rem")).toBe(168);
    expect(parseWidthPx("128px")).toBe(128);
  });

  it("falls back rather than returning NaN for anything else", () => {
    // A NaN would poison the sum and collapse every droppable column at once.
    for (const width of [undefined, "", "auto", "50%", "calc(100% - 2rem)", "-4rem", "0rem"]) {
      expect(Number.isFinite(parseWidthPx(width))).toBe(true);
      expect(parseWidthPx(width)).toBeGreaterThan(0);
    }
  });
});

describe("splitColumnsByWidth", () => {
  /** The real partner directory tiering, which is what this has to get right. */
  const partnerColumns = [
    { id: "partner", priority: "primary", width: "10.5rem" },
    { id: "mobile", hideBelow: 600, width: "6.5rem" },
    { id: "email", hideBelow: 760, width: "8rem" },
    { id: "code", hideBelow: 520, width: "10rem" },
    { id: "tier", hideBelow: 700, width: "7rem" },
    { id: "applications", hideBelow: 640, width: "6rem" },
    { id: "status", width: "5.5rem" },
    { id: "kyc", hideBelow: 560, width: "5.5rem" },
    { id: "settlement", width: "6.5rem" },
    { id: "actions", width: "8rem" },
  ];

  /** The expander cell, which every one of these tables ends up drawing. */
  const CONTROLS = 36;

  const ids = (columns: { id: string }[]) => columns.map((column) => column.id);
  const none = new Set<string>();
  const widthOf = (columns: { width?: string }[]) =>
    columns.reduce((sum, column) => sum + parseWidthPx(column.width), CONTROLS);

  it("fits the area at every width — the whole point", () => {
    // `table-fixed` obeys these widths, so a sum over the area is not a
    // squeeze, it is a horizontal scrollbar with Actions behind it.
    for (const areaWidth of [560, 652, 760, 908, 1068, 1440]) {
      const { visible } = splitColumnsByWidth(partnerColumns, none, areaWidth, CONTROLS);

      expect(widthOf(visible)).toBeLessThanOrEqual(areaWidth);
    }
  });

  it("loses no column: every input ends up in exactly one list", () => {
    // If a column were dropped from both lists its value would be unreachable,
    // which is the failure mode the details panel exists to prevent.
    for (const areaWidth of [0, 320, 652, 908, 1068, 1500]) {
      const { visible, collapsed } = splitColumnsByWidth(partnerColumns, none, areaWidth, CONTROLS);
      const seen = [...ids(visible), ...ids(collapsed)].sort();

      expect(seen).toEqual(ids(partnerColumns).sort());
      expect(new Set(seen).size).toBe(partnerColumns.length);
    }
  });

  it("shows everything before the area has been measured", () => {
    // areaWidth 0 is the first paint, before the ResizeObserver reports.
    // Starting wide and narrowing reads as a layout settling; starting narrow
    // and widening reads as columns appearing out of nowhere.
    const { visible, collapsed } = splitColumnsByWidth(partnerColumns, none, 0, CONTROLS);

    expect(ids(visible)).toEqual(ids(partnerColumns));
    expect(collapsed).toEqual([]);
  });

  it("gives up the most expendable column first", () => {
    const at = (areaWidth: number) =>
      ids(splitColumnsByWidth(partnerColumns, none, areaWidth, CONTROLS).visible);

    // 1068px — the real table area at a 1440px viewport with the sidebar.
    // Everything but Email, which the page ranked first to go.
    expect(at(1068)).toEqual([
      "partner", "mobile", "code", "applications", "status", "kyc", "settlement", "actions",
    ]);
    // 908px — a 1280px viewport, the width that used to clip.
    expect(at(908)).toEqual(["partner", "mobile", "code", "status", "kyc", "settlement", "actions"]);
    // 652px — a 1024px viewport.
    expect(at(652)).toEqual(["partner", "status", "settlement", "actions"]);
  });

  it("widens monotonically: a bigger area never shows less", () => {
    let previous = new Set<string>();

    for (const areaWidth of [560, 620, 652, 760, 880, 908, 1000, 1068, 1200, 1440]) {
      const shown = new Set(ids(splitColumnsByWidth(partnerColumns, none, areaWidth, CONTROLS).visible));

      for (const id of previous) expect(shown.has(id)).toBe(true);
      previous = shown;
    }
  });

  it("honours an explicit floor even when the column would fit", () => {
    // hideBelow is a readability limit, not only a space one: below it the
    // column is kept out whether or not there is room.
    const roomy = [
      { id: "partner", priority: "primary", width: "6rem" },
      { id: "notes", hideBelow: 900, width: "6rem" },
    ];

    expect(ids(splitColumnsByWidth(roomy, none, 899, CONTROLS).visible)).toEqual(["partner"]);
    expect(ids(splitColumnsByWidth(roomy, none, 900, CONTROLS).visible)).toEqual(["partner", "notes"]);
  });

  it("never collapses a column with no threshold, however narrow the area", () => {
    // Declaring hideBelow is how a page opts a column in to moving. Status,
    // settlement and actions never do.
    const { visible } = splitColumnsByWidth(partnerColumns, none, 120, CONTROLS);

    expect(ids(visible)).toEqual(["partner", "status", "settlement", "actions"]);
  });

  it("keeps the actions column reachable at every width", () => {
    // Actions is sticky and carries View/Verify. Collapsing it into the
    // details panel would put the row's only control behind an expander.
    for (const areaWidth of [0, 200, 652, 908, 1068, 1600]) {
      expect(ids(splitColumnsByWidth(partnerColumns, none, areaWidth, CONTROLS).visible)).toContain(
        "actions",
      );
    }
  });

  it("counts the control cells, which carry no column definition", () => {
    // The expander and the select-all checkbox take real space; ignoring them
    // lets the table pick a layout its own expander then overflows.
    const columns = [
      { id: "partner", priority: "primary", width: "10rem" },
      { id: "extra", hideBelow: 100, width: "6rem" },
    ];

    expect(ids(splitColumnsByWidth(columns, none, 260, 0).visible)).toEqual(["partner", "extra"]);
    expect(ids(splitColumnsByWidth(columns, none, 260, 76).visible)).toEqual(["partner"]);
  });

  it("removes an admin-hidden column entirely rather than moving it to the panel", () => {
    // Switching a column off in the Columns menu is an explicit choice; the
    // details panel must not quietly undo it.
    const hidden = new Set(["email", "kyc"]);
    const { visible, collapsed } = splitColumnsByWidth(partnerColumns, hidden, 1600, CONTROLS);

    expect(ids(visible)).not.toContain("email");
    expect(ids(collapsed)).not.toContain("email");
    expect(ids(visible)).not.toContain("kyc");
    expect(ids(collapsed)).not.toContain("kyc");
    expect(visible.length + collapsed.length).toBe(partnerColumns.length - 2);
  });

  it("keeps a primary column even when the admin switches it off", () => {
    // Without the row's identifier the details panel is a list of values with
    // nothing to attach them to.
    const { visible } = splitColumnsByWidth(partnerColumns, new Set(["partner"]), 1600, CONTROLS);

    expect(ids(visible)).toContain("partner");
  });

  it("holds the declared column order in both lists", () => {
    const { visible, collapsed } = splitColumnsByWidth(partnerColumns, none, 908, CONTROLS);

    const order = ids(partnerColumns);
    const rank = (list: { id: string }[]) => ids(list).map((id) => order.indexOf(id));

    expect(rank(visible)).toEqual([...rank(visible)].sort((a, b) => a - b));
    expect(rank(collapsed)).toEqual([...rank(collapsed)].sort((a, b) => a - b));
  });

  it("stops collapsing when nothing droppable is left, rather than looping", () => {
    // An area narrower than the undroppable columns cannot be satisfied. The
    // table overflows — but it returns, and the row still renders.
    const { visible, collapsed } = splitColumnsByWidth(partnerColumns, none, 40, CONTROLS);

    expect(ids(visible)).toEqual(["partner", "status", "settlement", "actions"]);
    expect(collapsed).toHaveLength(6);
  });

  it("handles an empty column set", () => {
    expect(splitColumnsByWidth([], none, 900, CONTROLS)).toEqual({ visible: [], collapsed: [] });
  });
});
