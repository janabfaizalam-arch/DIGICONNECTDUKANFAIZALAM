"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Category chips for the project gallery.
 *
 * The cards themselves are rendered on the server; this only sets
 * `data-filter` on the gallery, and CSS (written next to the gallery) hides
 * the cards that do not match. The choice is kept in `?category=`, so a link
 * from a capability or a shared URL opens the right filter.
 */
export function ProjectFilter({
  categories,
  counts,
  total,
  children,
}: {
  categories: { id: string; label: string }[];
  counts: Record<string, number>;
  total: number;
  children: ReactNode;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const fromUrl = params.get("category");
  const valid = fromUrl && categories.some((category) => category.id === fromUrl) ? fromUrl : "all";
  const [filter, setFilter] = useState(valid);

  useEffect(() => setFilter(valid), [valid]);

  const choose = (id: string) => {
    setFilter(id);
    const next = new URLSearchParams(params.toString());
    if (id === "all") next.delete("category");
    else next.set("category", id);
    const query = next.toString();
    // Native history keeps the URL shareable without a server round trip;
    // Next.js syncs useSearchParams with it.
    window.history.replaceState(null, "", `${pathname}${query ? `?${query}` : ""}#projects`);
  };

  const shown = filter === "all" ? total : counts[filter] ?? 0;
  const chips = [{ id: "all", label: "All work" }, ...categories];

  return (
    <div>
      <div role="group" aria-label="Filter projects by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {chips.map((chip) => {
          const on = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={on}
              onClick={() => choose(chip.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-300 active:scale-[0.97]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)] focus-visible:ring-offset-2",
                on
                  ? "bg-[var(--dc-ink)] text-white shadow-[0_8px_20px_-8px_rgba(16,33,61,0.6)]"
                  : "bg-white text-[var(--dc-body)] ring-1 ring-slate-900/10 hover:ring-slate-900/25",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="sr-only">
        {shown} {shown === 1 ? "project" : "projects"} shown
      </p>
      <div className="pf-gallery mt-10" data-filter={filter}>
        {children}
      </div>
    </div>
  );
}
