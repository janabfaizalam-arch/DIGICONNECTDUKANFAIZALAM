/**
 * Reading more rows than PostgREST will hand back in one request.
 *
 * PostgREST caps an unbounded `select` at `db.max_rows` — 1000 by default —
 * and returns the truncated set **with no error**. A `sum` or a `length` over
 * that result is therefore not wrong in a way anything notices: the page
 * renders, the number looks plausible, and it is understated. For a payout
 * queue or a revenue card that is a wrong business figure, not a slow page.
 *
 * Three ways out, in order of preference:
 *
 *   1. **A database aggregate** — an RPC that returns the number already
 *      summed. Nothing crosses the wire that can be truncated. `dashboard-data`
 *      already does this via `admin_dashboard_payment_totals` and friends.
 *   2. **`countRows`** — `count: "exact", head: true` when only a count is
 *      needed. The count comes from PostgreSQL and ignores `db.max_rows`
 *      entirely, because no rows are transferred.
 *   3. **`sumPages` / `readPages`** — page through with `.range()` when the
 *      rows themselves are needed. Correct, but it transfers everything.
 *
 * Reach for 3 only when 1 and 2 do not fit. This module exists so that choice
 * is made once and is testable, rather than re-derived per call site.
 */

/** PostgREST's default `db.max_rows`. Pages are sized to it deliberately. */
export const POSTGREST_DEFAULT_MAX_ROWS = 1000;

/** The shape every Supabase list query resolves to. */
export type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/**
 * Runs one page. `from` and `to` are inclusive, matching `.range()`.
 *
 * Callers pass a closure rather than a query object because a PostgREST query
 * builder is single-use — reusing one across pages silently returns the first
 * page every time, which would loop until the ceiling.
 */
export type ReadPage<T> = (from: number, to: number) => PromiseLike<PageResult<T>>;

export type PagedOptions = {
  /** Identifies the read in logs. */
  label: string;
  pageSize?: number;
  /**
   * Hard stop, so a growing table cannot turn one page render into an
   * unbounded crawl. Hitting it marks the result incomplete rather than
   * pretending the data ended.
   */
  maxRows?: number;
};

export type PagedResult<T> = {
  rows: T[];
  /**
   * False when the read stopped early — the ceiling was hit, or a page failed.
   *
   * This is the part that matters for money. Both existing helpers in this
   * codebase log and return what they have, so a partial sum is indistinguishable
   * from a complete one at the call site. Returning the flag lets a caller
   * decide whether showing a number at all is honest.
   */
  complete: boolean;
};

/**
 * Every row matching a query, a page at a time.
 *
 * A page shorter than `pageSize` is the last page — PostgREST returns what
 * exists in the range, so a short page means the range ran past the end.
 */
export async function readPages<T>(
  readPage: ReadPage<T>,
  { label, pageSize = POSTGREST_DEFAULT_MAX_ROWS, maxRows = 200_000 }: PagedOptions,
): Promise<PagedResult<T>> {
  const size = Math.max(1, Math.trunc(pageSize));
  const rows: T[] = [];

  for (let from = 0; from < maxRows; from += size) {
    const { data, error } = await readPage(from, from + size - 1);

    if (error) {
      console.error("[paged-read] page failed", { label, from, error: error.message });
      return { rows, complete: false };
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < size) return { rows, complete: true };
  }

  console.warn("[paged-read] hit the row ceiling; result is partial", { label, maxRows });
  return { rows, complete: false };
}

/**
 * A sum over every matching row.
 *
 * Kept separate from `readPages` so a total never needs the whole set resident
 * at once — the rows are added as each page arrives and then dropped.
 */
export async function sumPages<T>(
  readPage: ReadPage<T>,
  amountOf: (row: T) => number,
  { label, pageSize = POSTGREST_DEFAULT_MAX_ROWS, maxRows = 200_000 }: PagedOptions,
): Promise<{ total: number; rowCount: number; complete: boolean }> {
  const size = Math.max(1, Math.trunc(pageSize));
  let total = 0;
  let rowCount = 0;

  for (let from = 0; from < maxRows; from += size) {
    const { data, error } = await readPage(from, from + size - 1);

    if (error) {
      console.error("[paged-read] page failed", { label, from, error: error.message });
      return { total, rowCount, complete: false };
    }

    const page = data ?? [];
    for (const row of page) {
      const amount = amountOf(row);
      // A NaN would poison the running total for every later row, turning one
      // malformed value into a blank card rather than a slightly wrong one.
      if (Number.isFinite(amount)) total += amount;
      rowCount += 1;
    }

    if (page.length < size) return { total, rowCount, complete: true };
  }

  console.warn("[paged-read] hit the row ceiling; total is partial", { label, maxRows });
  return { total, rowCount, complete: false };
}

/**
 * How many rows match, without transferring any.
 *
 * `count: "exact", head: true` is answered by PostgreSQL, so `db.max_rows`
 * does not apply — this is the right tool whenever only the count is wanted,
 * and it stays O(1) over the wire however large the table grows.
 */
export async function countRows(
  runCount: () => PromiseLike<{ count: number | null; error: { message: string } | null }>,
  label: string,
): Promise<{ count: number; ok: boolean }> {
  const { count, error } = await runCount();

  if (error) {
    console.error("[paged-read] count failed", { label, error: error.message });
    return { count: 0, ok: false };
  }

  return { count: count ?? 0, ok: true };
}

/**
 * Numeric coercion for a value that arrived as JSON.
 *
 * `numeric` columns come back from PostgREST as strings often enough that
 * `row.amount + 0` silently concatenates instead of adding.
 */
export function toAmount(value: unknown): number {
  const amount = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(amount) ? amount : 0;
}
