import { describe, expect, it, vi } from "vitest";

import {
  POSTGREST_DEFAULT_MAX_ROWS,
  countRows,
  readPages,
  sumPages,
  toAmount,
  type ReadPage,
} from "./paged-read";

/**
 * A stand-in for PostgREST, including the behaviour this module exists for.
 *
 * The important detail is `maxRows`: a request for a wider range than the
 * server's `db.max_rows` comes back **truncated and without an error**. That
 * silence is the whole bug, so the fake reproduces it rather than erroring,
 * which would make the tests pass for the wrong reason.
 */
function fakeTable<T>(rows: T[], { maxRows = POSTGREST_DEFAULT_MAX_ROWS } = {}) {
  const calls: Array<{ from: number; to: number }> = [];

  const readPage: ReadPage<T> = async (from, to) => {
    calls.push({ from, to });
    const requested = to - from + 1;
    const allowed = Math.min(requested, maxRows);
    return { data: rows.slice(from, from + allowed), error: null };
  };

  return { readPage, calls };
}

/** A single unbounded read, which is what the fixed code replaces. */
async function readUnbounded<T>(rows: T[], maxRows = POSTGREST_DEFAULT_MAX_ROWS) {
  return rows.slice(0, maxRows);
}

const money = (count: number, each = 100) =>
  Array.from({ length: count }, (_, index) => ({ id: index, amount: each }));

describe("sumPages", () => {
  it("totals a dataset larger than PostgREST will return in one request", async () => {
    // The case that motivates all of this: 2,500 payouts at a 1,000-row cap.
    const rows = money(2_500);
    const { readPage } = fakeTable(rows);

    const { total, rowCount, complete } = await sumPages(readPage, (row) => row.amount, {
      label: "test",
    });

    expect(total).toBe(250_000);
    expect(rowCount).toBe(2_500);
    expect(complete).toBe(true);

    // And the unbounded read it replaces is wrong — silently, with no error.
    const truncated = await readUnbounded(rows);
    expect(truncated.reduce((sum, row) => sum + row.amount, 0)).toBe(100_000);
  });

  it("is exact at the cap boundary", async () => {
    // 1,000 rows is where an unbounded read stops being obviously fine, and
    // 1,001 is where it starts being wrong. Both must total correctly.
    for (const count of [999, 1_000, 1_001]) {
      const { readPage } = fakeTable(money(count));
      const { total, complete } = await sumPages(readPage, (row) => row.amount, { label: "test" });

      expect(total).toBe(count * 100);
      expect(complete).toBe(true);
    }
  });

  it("asks for one more page when the last one is exactly full", async () => {
    // A page of exactly pageSize is indistinguishable from "there is more", so
    // stopping there would drop a final short page.
    const { readPage, calls } = fakeTable(money(1_000));
    await sumPages(readPage, (row) => row.amount, { label: "test" });

    expect(calls).toEqual([
      { from: 0, to: 999 },
      { from: 1_000, to: 1_999 },
    ]);
  });

  it("returns zero for an empty table, and says so completely", async () => {
    const { readPage } = fakeTable<{ amount: number }>([]);
    const { total, rowCount, complete } = await sumPages(readPage, (row) => row.amount, {
      label: "test",
    });

    expect({ total, rowCount, complete }).toEqual({ total: 0, rowCount: 0, complete: true });
  });

  it("handles a single row", async () => {
    const { readPage } = fakeTable(money(1, 4_250));
    const { total, rowCount } = await sumPages(readPage, (row) => row.amount, { label: "test" });

    expect({ total, rowCount }).toEqual({ total: 4_250, rowCount: 1 });
  });

  it("skips a malformed amount instead of poisoning the total", async () => {
    // One NaN would otherwise make every later addition NaN, turning a slightly
    // wrong card into a blank one.
    const { readPage } = fakeTable([
      { amount: 100 },
      { amount: Number.NaN },
      { amount: 250 },
      { amount: Number.POSITIVE_INFINITY },
    ]);

    const { total, rowCount } = await sumPages(readPage, (row) => row.amount, { label: "test" });

    expect(total).toBe(350);
    expect(rowCount).toBe(4);
  });

  it("reports incomplete rather than a partial total when a page fails", async () => {
    const readPage: ReadPage<{ amount: number }> = async (from) =>
      from === 0
        ? { data: money(1_000), error: null }
        : { data: null, error: { message: "connection reset" } };

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { total, complete } = await sumPages(readPage, (row) => row.amount, { label: "payouts" });
    spy.mockRestore();

    // The number is what it managed to read — but `complete` says not to trust it.
    expect(total).toBe(100_000);
    expect(complete).toBe(false);
  });

  it("reports incomplete when the ceiling is reached", async () => {
    const { readPage } = fakeTable(money(5_000));

    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { complete, rowCount } = await sumPages(readPage, (row) => row.amount, {
      label: "test",
      maxRows: 2_000,
    });
    spy.mockRestore();

    expect(rowCount).toBe(2_000);
    expect(complete).toBe(false);
  });
});

describe("readPages", () => {
  it("returns every row exactly once, in order", async () => {
    const rows = Array.from({ length: 2_345 }, (_, index) => ({ id: index }));
    const { readPage } = fakeTable(rows);

    const { rows: read, complete } = await readPages(readPage, { label: "test" });

    expect(read).toHaveLength(2_345);
    expect(read.map((row) => row.id)).toEqual(rows.map((row) => row.id));
    expect(new Set(read.map((row) => row.id)).size).toBe(2_345);
    expect(complete).toBe(true);
  });

  it("respects a smaller page size without losing rows", async () => {
    const { readPage, calls } = fakeTable(Array.from({ length: 250 }, (_, i) => ({ id: i })));
    const { rows } = await readPages(readPage, { label: "test", pageSize: 100 });

    expect(rows).toHaveLength(250);
    expect(calls).toHaveLength(3);
  });

  it("returns what it has, marked incomplete, when a page fails", async () => {
    const readPage: ReadPage<{ id: number }> = async (from) =>
      from === 0 ? { data: [{ id: 1 }], error: null } : { data: null, error: { message: "boom" } };

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { rows, complete } = await readPages(readPage, { label: "test", pageSize: 1 });
    spy.mockRestore();

    expect(rows).toEqual([{ id: 1 }]);
    expect(complete).toBe(false);
  });
});

describe("countRows", () => {
  it("passes the server's count through", async () => {
    const { count, ok } = await countRows(async () => ({ count: 48_219, error: null }), "apps");

    // The point of a head count: the number is far past db.max_rows and still
    // exact, because no rows crossed the wire.
    expect({ count, ok }).toEqual({ count: 48_219, ok: true });
  });

  it("treats a null count as zero", async () => {
    const { count, ok } = await countRows(async () => ({ count: null, error: null }), "apps");

    expect({ count, ok }).toEqual({ count: 0, ok: true });
  });

  it("reports failure rather than a confident zero", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { count, ok } = await countRows(
      async () => ({ count: null, error: { message: "denied" } }),
      "apps",
    );
    spy.mockRestore();

    expect({ count, ok }).toEqual({ count: 0, ok: false });
  });
});

describe("toAmount", () => {
  it("reads a numeric column that arrived as a string", async () => {
    // PostgREST serialises `numeric` as a string often enough that `+` would
    // concatenate instead of adding.
    expect(toAmount("1234.56")).toBe(1234.56);
    expect(toAmount(1234.56)).toBe(1234.56);
  });

  it("falls back to zero rather than NaN", () => {
    for (const value of [null, undefined, "", "abc", {}, Number.NaN]) {
      expect(toAmount(value)).toBe(0);
    }
  });
});
