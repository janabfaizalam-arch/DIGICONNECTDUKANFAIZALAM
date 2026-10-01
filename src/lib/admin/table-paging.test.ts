import { describe, expect, it } from "vitest";

import { csvField, resolvePageWindow, toCsv } from "./table-paging";

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
