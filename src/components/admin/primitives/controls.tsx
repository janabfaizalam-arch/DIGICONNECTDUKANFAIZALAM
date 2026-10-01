"use client";

/**
 * Admin table controls: search, filters, per-row actions, confirmation.
 *
 * All of these keep their state in the URL rather than in the component. A
 * filtered admin table is something people send to each other ("look at the
 * rejected ones"), reload, and come back to from a detail page — none of which
 * survives component state.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, MoreHorizontal, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Write several query params in one navigation.
 *
 * Two sequential single-param writes do not compose: the second reads the
 * search params captured in its own render, so it overwrites the first instead
 * of adding to it. Anything that changes more than one param at once (sorting
 * sets both the column and the direction) has to go through this.
 */
export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (entries: Record<string, string | null>, options?: { resetPage?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(entries)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (options?.resetPage !== false) params.delete("page");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );
}

/** Write one query param, dropping it when empty and resetting pagination. */
export function useQueryParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (key: string, value: string | null, options?: { resetPage?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);

      // Page 4 of an old filter is rarely page 4 of a new one, and an empty
      // page reads as "no results" rather than "you are past the end".
      if (options?.resetPage !== false) params.delete("page");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );
}

/**
 * Debounced search bound to a query param.
 *
 * Typing is local so the field never stutters; the URL is written 350ms after
 * the last keystroke, which is roughly a pause rather than a gap between
 * letters. Without the debounce a nine-character name is nine server round
 * trips and nine history entries.
 */
export function SearchInput({
  paramKey = "q",
  placeholder = "Search…",
  className,
  delay = 350,
}: {
  paramKey?: string;
  placeholder?: string;
  className?: string;
  delay?: number;
}) {
  const searchParams = useSearchParams();
  const setParam = useQueryParam();
  const urlValue = searchParams.get(paramKey) ?? "";

  const [value, setValue] = useState(urlValue);
  const dirty = useRef(false);

  // Follow the URL when it changes from outside (back button, a cleared
  // filter), but never overwrite what is being typed right now.
  useEffect(() => {
    if (!dirty.current) setValue(urlValue);
  }, [urlValue]);

  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => {
      setParam(paramKey, value.trim() || null);
      dirty.current = false;
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay, paramKey, setParam]);

  return (
    <div className={cn("relative flex-1", className)}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-text-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => {
          dirty.current = true;
          setValue(event.target.value);
        }}
        className="h-10 w-full rounded-ds-md border border-ds-border bg-ds-surface pl-10 pr-9 text-[13px] text-ds-text-primary placeholder:text-ds-text-muted focus:border-ds-focus focus:outline-none focus:ring-2 focus:ring-ds-focus/25"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            dirty.current = false;
            setValue("");
            setParam(paramKey, null);
          }}
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ds-text-muted hover:bg-ds-surface-sunken hover:text-ds-text-primary"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export type FilterOption = { value: string; label: string };

/** A single select filter bound to a query param. */
export function FilterSelect({
  paramKey,
  label,
  options,
  allLabel = "All",
  className,
}: {
  paramKey: string;
  label: string;
  options: FilterOption[];
  allLabel?: string;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const setParam = useQueryParam();
  const value = searchParams.get(paramKey) ?? "";

  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => setParam(paramKey, event.target.value || null)}
      className={cn(
        "h-10 rounded-ds-md border border-ds-border bg-ds-surface px-3 text-[13px] font-medium text-ds-text-primary focus:border-ds-focus focus:outline-none focus:ring-2 focus:ring-ds-focus/25",
        value && "border-ds-primary-border bg-ds-primary-soft text-ds-primary",
        className,
      )}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * The row above a table: search, filters, and whatever the page adds.
 *
 * `activeCount` drives a reset affordance. A filter the admin forgot they set
 * is the usual explanation for "the data is missing".
 */
export function FilterBar({
  children,
  activeCount = 0,
  onReset,
  className,
}: {
  children: ReactNode;
  activeCount?: number;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
      {activeCount > 0 && onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-10 items-center gap-1.5 rounded-ds-md border border-ds-border px-3 text-[13px] font-semibold text-ds-text-secondary hover:bg-ds-surface-sunken"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
        </button>
      ) : null}
    </div>
  );
}

export type ActionItem = {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  /** Renders in the danger colour and is separated from the rest. */
  destructive?: boolean;
  disabled?: boolean;
};

/**
 * Per-row overflow menu.
 *
 * Native popover and anchor positioning are not dependable enough across the
 * browsers this panel runs on, so this is a plain absolutely-positioned menu
 * with the keyboard and dismissal behaviour written out: Escape closes and
 * returns focus to the trigger, an outside click closes, and the trigger
 * reports its own expanded state.
 */
export function ActionMenu({
  items,
  label = "Actions",
  className,
}: {
  items: ActionItem[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!items.length) return null;

  const enabled = items.filter((item) => !item.destructive);
  const destructive = items.filter((item) => item.destructive);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-ds-sm border border-ds-border bg-ds-surface text-ds-text-secondary hover:bg-ds-surface-sunken focus:outline-none focus:ring-2 focus:ring-ds-focus/30"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-44 overflow-hidden rounded-ds-md border border-ds-border bg-ds-surface-elevated py-1 shadow-ds-lg"
        >
          {[enabled, destructive].map((group, groupIndex) =>
            group.length ? (
              <div
                key={groupIndex}
                className={cn(groupIndex === 1 && enabled.length && "mt-1 border-t border-ds-border pt-1")}
              >
                {group.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      setOpen(false);
                      item.onSelect();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium disabled:opacity-50",
                      item.destructive
                        ? "text-ds-danger hover:bg-ds-danger-soft"
                        : "text-ds-text-primary hover:bg-ds-surface-sunken",
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Confirmation before something hard to undo.
 *
 * Brief §48: mass actions and destructive operations are confirmed, never
 * silent. `count` is shown because "delete the selected rows" and "delete 412
 * rows" are different decisions.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  count,
  confirmLabel = "Confirm",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  count?: number;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(8,43,99,0.45)] p-4 sm:items-center"
    >
      <div className="w-full max-w-md rounded-ds-xl border border-ds-border bg-ds-surface-elevated p-5 shadow-ds-lg">
        <h2 id="confirm-dialog-title" className="text-[15px] font-bold text-ds-text-primary">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-ds-text-secondary">{description}</p>
        ) : null}
        {typeof count === "number" ? (
          <p className="mt-3 rounded-ds-md bg-ds-surface-sunken px-3 py-2 text-[13px] font-semibold text-ds-text-primary">
            This affects {count} record{count === 1 ? "" : "s"}.
          </p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 flex-1 rounded-ds-md border border-ds-border text-[13px] font-semibold text-ds-text-secondary hover:bg-ds-surface-sunken disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-ds-md text-[13px] font-semibold text-ds-text-inverted disabled:opacity-60",
              destructive ? "bg-ds-danger" : "bg-ds-primary hover:bg-ds-primary-hover",
            )}
          >
            {busy ? "Working…" : <><Check className="h-3.5 w-3.5" aria-hidden="true" />{confirmLabel}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Shared chevron for disclosure triggers, so they all point the same way. */
export function DisclosureChevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
      aria-hidden="true"
    />
  );
}
