"use client";

/**
 * AdminDataTable — one table for the admin panel.
 *
 * Twenty-seven admin files hand-roll a table today, each with its own column
 * markup, sort handling, empty state and, in six cases, a separately
 * maintained `lg:hidden` mobile layout that has to be kept in sync by hand.
 * This replaces that.
 *
 * ── Server-driven by design ───────────────────────────────────────────────
 * The component renders a page of rows; it never holds the dataset. Sorting,
 * paging, search and filters are URL parameters that the server component
 * reads and turns into a bounded query, so a table over 50,000 applications
 * transfers fifty rows, not fifty thousand. Anything that sorts or filters
 * client-side quietly stops working at exactly the scale where it matters.
 *
 * ── Where state lives ─────────────────────────────────────────────────────
 * Page, sort, search and filters go in the URL: they are what someone means
 * when they send a colleague a link, and they must survive a reload and a
 * trip to a detail page and back.
 *
 * Column visibility and order go in localStorage instead. They are a personal
 * preference about one person's screen — putting them in the URL would mean
 * sharing a filtered view also imposes which columns the other person sees.
 *
 * ── Responsive ────────────────────────────────────────────────────────────
 * Below `lg` the same column definitions render as cards: `primary` columns
 * become the card heading, the rest become labelled rows. Pages do not write
 * a second layout. `renderMobileCard` is there for the rare screen where the
 * generated card genuinely reads worse.
 */

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown, Columns3, Download } from "lucide-react";

import { cn } from "@/lib/utils";
import { resolvePageWindow, splitColumnsByWidth, toCsv } from "@/lib/admin/table-paging";

/** The expander cell is `w-9`, the selection cell `w-10`. */
const EXPANDER_COLUMN_PX = 36;
const SELECT_COLUMN_PX = 40;
import { DisclosureChevron, useQueryParam, useQueryParams } from "./controls";
import { ErrorState, NoResultsState, TableLoadingState } from "./states";

export type SortDirection = "asc" | "desc";

export type AdminColumn<Row> = {
  /** Stable key — used for sorting, visibility and persistence. */
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Sorting is server-side; this only decides whether the header is a button. */
  sortable?: boolean;
  /**
   * `primary` columns survive on a phone and cannot be hidden — they are what
   * identifies the row. Everything else defaults to `secondary`.
   */
  priority?: "primary" | "secondary";
  align?: "left" | "right";
  /**
   * A CSS width for the column, e.g. "12rem".
   *
   * Without one the browser distributes space by content, which lets a long
   * email claim half the table and squeezes a partner code into three wrapped
   * lines. Widths are hints — the table still scrolls if the sum exceeds the
   * viewport — but they stop one long cell from deforming every other column.
   */
  width?: string;
  /**
   * Keep the cell on one line. For codes, amounts, dates and counts, where a
   * wrap is always worse than the column being a little wider.
   */
  nowrap?: boolean;
  /**
   * Drop this column out of the table when the table's own area is narrower
   * than this many pixels, and show its value in the row's details panel
   * instead.
   *
   * Measured against the table container, not the viewport, because the admin
   * sidebar takes 280px: a 1440px window leaves roughly 1068px here, and a
   * 1280px window roughly 908px. Sizing against the viewport would promise
   * space the table does not have.
   *
   * Nothing is lost when a column drops — every hidden value appears in the
   * expander, which is the difference between a responsive table and one that
   * quietly stops showing data.
   */
  hideBelow?: number;
  /** Pinned to the right edge so it stays reachable while the table scrolls. */
  sticky?: boolean;
  /** Plain value for CSV. Without it the column is skipped on export, because
   *  a React node has no sensible text form. */
  exportValue?: (row: Row) => string | number | null | undefined;
  className?: string;
};

export type BulkAction<Row> = {
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  onSelect: (rows: Row[]) => void;
};

type Props<Row> = {
  /** A stable id for this table — the localStorage key for column preferences. */
  tableId: string;
  rows: Row[];
  columns: AdminColumn<Row>[];
  getRowId: (row: Row) => string;

  /** Total matching rows on the server, for pagination. */
  total: number;
  page: number;
  pageSize: number;

  sortColumn?: string | null;
  sortDirection?: SortDirection;

  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;

  toolbar?: ReactNode;
  emptyState?: ReactNode;
  caption?: string;

  selectable?: boolean;
  bulkActions?: BulkAction<Row>[];

  /** Export the current page as CSV. Omit to hide the button. */
  exportFileName?: string;

  onRowClick?: (row: Row) => void;
  renderMobileCard?: (row: Row) => ReactNode;
};

export function AdminDataTable<Row>({
  tableId,
  rows,
  columns,
  getRowId,
  total,
  page,
  pageSize,
  sortColumn,
  sortDirection = "asc",
  loading = false,
  error = null,
  onRetry,
  toolbar,
  emptyState,
  caption,
  selectable = false,
  bulkActions = [],
  exportFileName,
  onRowClick,
  renderMobileCard,
}: Props<Row>) {
  const setParam = useQueryParam();
  const setParams = useQueryParams();
  const headingId = useId();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  /**
   * The table's own width, watched rather than read once: the sidebar
   * collapses, the window resizes, and a column set chosen at first paint
   * would be wrong immediately afterwards. 0 until measured, which renders the
   * widest set first and settles on the first observer callback.
   */
  const [areaWidth, setAreaWidth] = useState(0);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [columnsOpen, setColumnsOpen] = useState(false);

  const storageKey = `admin-table:${tableId}:hidden-columns`;

  // Preferences are read after mount so the server and client render the same
  // markup; reading localStorage during render would mismatch and hydrate wrong.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setHidden(new Set(JSON.parse(stored) as string[]));
    } catch {
      // Private mode, blocked storage, or corrupt JSON. The table works
      // without preferences; it must not fail to render because of them.
    }
  }, [storageKey]);

  const persistHidden = useCallback(
    (next: Set<string>) => {
      setHidden(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // Same as above — a lost preference is not worth an error.
      }
    },
    [storageKey],
  );

  // A row that scrolled out of the result set is no longer selectable, and
  // acting on an id that is not on screen is how bulk actions surprise people.
  useEffect(() => {
    setSelected((current) => {
      if (!current.size) return current;
      const visible = new Set(rows.map(getRowId));
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [rows, getRowId]);

  // Which columns are drawn, and which move to the row's details panel.
  // The rule lives in table-paging so it can be tested without a DOM.
  //
  // The expander and selection cells carry no column definition but take real
  // space, so they are reserved here. The expander is reserved unconditionally:
  // whether it appears depends on whether anything collapsed, and leaving it
  // out of the sum lets the table choose a layout that its own expander then
  // overflows.
  const controlsWidth = EXPANDER_COLUMN_PX + (selectable ? SELECT_COLUMN_PX : 0);

  const { visible: visibleColumns, collapsed: collapsedColumns } = useMemo(
    () => splitColumnsByWidth(columns, hidden, areaWidth, controlsWidth),
    [columns, hidden, areaWidth, controlsWidth],
  );

  // The mobile card lists everything the admin chose, since it has the room.
  const chosenColumns = useMemo(
    () => columns.filter((column) => column.priority === "primary" || !hidden.has(column.id)),
    [columns, hidden],
  );

  const expandable = collapsedColumns.length > 0;

  useEffect(() => {
    const node = areaRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setAreaWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // A row cannot stay open on a width where it has nothing extra to show.
  useEffect(() => {
    if (!expandable) setExpanded(new Set());
  }, [expandable]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(getRowId(row))),
    [rows, selected, getRowId],
  );

  const { totalPages, firstRow, lastRow } = resolvePageWindow(page, total, pageSize);

  function toggleSort(columnId: string) {
    const next: SortDirection = sortColumn === columnId && sortDirection === "asc" ? "desc" : "asc";
    // Both params in one navigation — see useQueryParams.
    setParams({ sort: columnId, dir: next });
  }

  function exportCsv() {
    const exportable = visibleColumns.filter((column) => column.exportValue);
    // Selected rows when there is a selection, otherwise the page on screen —
    // exporting rows the admin cannot see is how a "download" leaks.
    const source = selectedRows.length ? selectedRows : rows;
    const csv = toCsv(
      exportable.map((column) => column.header),
      source.map((row) => exportable.map((column) => column.exportValue!(row))),
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const allOnPageSelected = rows.length > 0 && rows.every((row) => selected.has(getRowId(row)));

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      {(toolbar || exportFileName || columns.some((c) => c.priority !== "primary")) && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>

          <div className="relative flex items-center gap-2">
            {columns.some((column) => column.priority !== "primary") ? (
              <>
                <button
                  type="button"
                  onClick={() => setColumnsOpen((open) => !open)}
                  aria-expanded={columnsOpen}
                  aria-haspopup="true"
                  className="inline-flex h-10 items-center gap-1.5 rounded-ds-md border border-ds-border bg-ds-surface px-3 text-[13px] font-semibold text-ds-text-secondary hover:bg-ds-surface-sunken"
                >
                  <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
                  Columns
                  <DisclosureChevron open={columnsOpen} />
                </button>
                {columnsOpen ? (
                  <div className="absolute right-0 top-11 z-30 w-56 rounded-ds-md border border-ds-border bg-ds-surface-elevated p-1.5 shadow-ds-lg">
                    {columns.map((column) => {
                      const locked = column.priority === "primary";
                      return (
                        <label
                          key={column.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-ds-sm px-2 py-1.5 text-[13px] text-ds-text-primary hover:bg-ds-surface-sunken",
                            locked && "cursor-not-allowed opacity-55",
                          )}
                        >
                          <input
                            type="checkbox"
                            disabled={locked}
                            checked={locked || !hidden.has(column.id)}
                            onChange={(event) => {
                              const next = new Set(hidden);
                              if (event.target.checked) next.delete(column.id);
                              else next.add(column.id);
                              persistHidden(next);
                            }}
                            className="h-3.5 w-3.5 accent-[var(--ds-primary)]"
                          />
                          {column.header}
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : null}

            {exportFileName ? (
              <button
                type="button"
                onClick={exportCsv}
                disabled={!rows.length}
                className="inline-flex h-10 items-center gap-1.5 rounded-ds-md border border-ds-border bg-ds-surface px-3 text-[13px] font-semibold text-ds-text-secondary hover:bg-ds-surface-sunken disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Bulk action bar — only once something is selected. */}
      {selectable && selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-ds-md border border-ds-primary-border bg-ds-primary-soft px-3 py-2">
          <span className="text-[13px] font-bold text-ds-primary">
            {selected.size} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            {bulkActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => action.onSelect(selectedRows)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-ds-sm border px-2.5 text-[12px] font-semibold",
                  action.destructive
                    ? "border-ds-danger-border bg-ds-danger-soft text-ds-danger"
                    : "border-ds-border bg-ds-surface text-ds-text-primary hover:bg-ds-surface-sunken",
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="h-8 rounded-ds-sm px-2.5 text-[12px] font-semibold text-ds-text-secondary hover:bg-ds-surface"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-ds-xl border border-ds-border bg-ds-surface shadow-ds-sm">
        {error ? (
          <ErrorState detail={error} onRetry={onRetry} className="rounded-none border-0" />
        ) : loading ? (
          <TableLoadingState rows={Math.min(pageSize, 8)} columns={visibleColumns.length || 4} />
        ) : !rows.length ? (
          emptyState ?? (
            <NoResultsState description="Nothing matches the current search and filters." />
          )
        ) : (
          <>
            {/* Desktop table */}
            <div ref={areaRef} className="hidden touch-pan-y overflow-x-auto lg:block">
              {/*
                  table-fixed so the column widths below are obeyed rather than
                  treated as hints. With the browser's automatic layout a single
                  long email claims whatever space it wants and squeezes a
                  partner code into three wrapped lines, which is what this
                  table did before the widths were added.
                */}
              <table className="w-full table-fixed border-collapse text-left">
                {caption ? <caption className="sr-only">{caption}</caption> : null}
                <thead>
                  <tr className="border-b border-ds-border bg-ds-surface-sunken">
                    {expandable ? (
                      <th scope="col" className="w-9 px-2 py-2.5">
                        <span className="sr-only">Expand row</span>
                      </th>
                    ) : null}

                    {selectable ? (
                      <th scope="col" className="w-10 px-3 py-2.5">
                        <input
                          type="checkbox"
                          aria-label="Select all rows on this page"
                          checked={allOnPageSelected}
                          onChange={(event) =>
                            setSelected(
                              event.target.checked ? new Set(rows.map(getRowId)) : new Set(),
                            )
                          }
                          className="h-3.5 w-3.5 accent-[var(--ds-primary)]"
                        />
                      </th>
                    ) : null}

                    {visibleColumns.map((column) => {
                      const active = sortColumn === column.id;
                      return (
                        <th
                          key={column.id}
                          scope="col"
                          aria-sort={
                            active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"
                          }
                          style={column.width ? { width: column.width } : undefined}
                          className={cn(
                            "bg-ds-surface-sunken px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ds-text-muted",
                            column.align === "right" && "text-right",
                            column.nowrap && "whitespace-nowrap",
                            // Pinned so the row's controls stay reachable while
                            // the rest of the table scrolls under them.
                            column.sticky && "sticky right-0 z-10 shadow-[-8px_0_8px_-8px_rgba(16,33,61,0.12)]",
                          )}
                        >
                          {column.sortable ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(column.id)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-ds-sm hover:text-ds-text-primary focus:outline-none focus:ring-2 focus:ring-ds-focus/30",
                                active && "text-ds-primary",
                              )}
                            >
                              {column.header}
                              {active ? (
                                sortDirection === "asc" ? (
                                  <ArrowUp className="h-3 w-3" aria-hidden="true" />
                                ) : (
                                  <ArrowDown className="h-3 w-3" aria-hidden="true" />
                                )
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-50" aria-hidden="true" />
                              )}
                            </button>
                          ) : (
                            column.header
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => {
                    const id = getRowId(row);
                    const open = expanded.has(id);
                    return (
                      <Fragment key={id}>
                      <tr
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        className={cn(
                          "border-b border-ds-border",
                          selected.has(id) ? "bg-ds-primary-soft" : "hover:bg-ds-surface-sunken",
                          onRowClick && "cursor-pointer",
                          open && "border-b-0",
                        )}
                      >
                        {expandable ? (
                          <td className="px-2 py-3" onClick={(event) => event.stopPropagation()}>
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-label={open ? "Hide further details" : "Show further details"}
                              onClick={() =>
                                setExpanded((current) => {
                                  const next = new Set(current);
                                  if (next.has(id)) next.delete(id);
                                  else next.add(id);
                                  return next;
                                })
                              }
                              className="flex h-6 w-6 items-center justify-center rounded-ds-sm text-ds-text-muted hover:bg-ds-surface-sunken hover:text-ds-text-primary focus:outline-none focus:ring-2 focus:ring-ds-focus/30"
                            >
                              <ChevronRight
                                className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")}
                                aria-hidden="true"
                              />
                            </button>
                          </td>
                        ) : null}

                        {selectable ? (
                          <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select row ${id}`}
                              checked={selected.has(id)}
                              onChange={(event) => {
                                const next = new Set(selected);
                                if (event.target.checked) next.add(id);
                                else next.delete(id);
                                setSelected(next);
                              }}
                              className="h-3.5 w-3.5 accent-[var(--ds-primary)]"
                            />
                          </td>
                        ) : null}

                        {visibleColumns.map((column) => (
                          <td
                            key={column.id}
                            style={column.width ? { width: column.width } : undefined}
                            className={cn(
                              "px-3 py-3 text-[13px] text-ds-text-secondary",
                              column.align === "right" && "text-right",
                              column.nowrap && "whitespace-nowrap",
                              column.sticky &&
                                cn(
                                  "sticky right-0 z-10 shadow-[-8px_0_8px_-8px_rgba(16,33,61,0.12)]",
                                  selected.has(id) ? "bg-ds-primary-soft" : "bg-ds-surface",
                                ),
                              column.className,
                            )}
                          >
                            {column.cell(row)}
                          </td>
                        ))}
                      </tr>

                      {/*
                        Everything the current width could not fit. Rendered
                        only when opened, so a table of fifty rows does not
                        also render fifty hidden panels.
                      */}
                      {expandable && open ? (
                        <tr className="border-b border-ds-border bg-ds-surface-sunken">
                          <td
                            colSpan={visibleColumns.length + (selectable ? 1 : 0) + 1}
                            className="px-4 py-3"
                          >
                            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                              {collapsedColumns.map((column) => (
                                <div key={column.id} className="min-w-0">
                                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-ds-text-muted">
                                    {column.header}
                                  </dt>
                                  <dd className="mt-0.5 text-[13px] text-ds-text-secondary">
                                    {column.cell(row)}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </td>
                        </tr>
                      ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards — generated from the same columns. */}
            <div className="divide-y divide-ds-border lg:hidden" aria-labelledby={headingId}>
              <span id={headingId} className="sr-only">
                {caption ?? "Results"}
              </span>
              {rows.map((row) => {
                const id = getRowId(row);
                if (renderMobileCard) return <div key={id}>{renderMobileCard(row)}</div>;

                // The card lists every column the admin chose; hideBelow is a
                // table-layout concern and does not apply here.
                const primary = chosenColumns.filter((column) => column.priority === "primary");
                const rest = chosenColumns.filter((column) => column.priority !== "primary");

                return (
                  <div
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn("space-y-2 p-4", onRowClick && "cursor-pointer")}
                  >
                    {primary.map((column) => (
                      <div key={column.id} className="text-[14px] font-bold text-ds-text-primary">
                        {column.cell(row)}
                      </div>
                    ))}
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {rest.map((column) => (
                        <div key={column.id} className="min-w-0">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-ds-text-muted">
                            {column.header}
                          </dt>
                          <dd className="truncate text-[13px] text-ds-text-secondary">
                            {column.cell(row)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!error && !loading && total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ds-text-muted">
          <span>
            {firstRow}–{lastRow} of {total.toLocaleString("en-IN")}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setParam("page", page - 1 <= 1 ? null : String(page - 1), { resetPage: false })}
              className="h-9 rounded-ds-md border border-ds-border bg-ds-surface px-3 font-semibold text-ds-text-primary hover:bg-ds-surface-sunken disabled:opacity-45"
            >
              Previous
            </button>
            <span className="px-1.5 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setParam("page", String(page + 1), { resetPage: false })}
              className="h-9 rounded-ds-md border border-ds-border bg-ds-surface px-3 font-semibold text-ds-text-primary hover:bg-ds-surface-sunken disabled:opacity-45"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
