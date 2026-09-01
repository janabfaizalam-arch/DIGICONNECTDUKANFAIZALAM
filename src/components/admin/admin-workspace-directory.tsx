"use client";

import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { getAdminWorkspace, type AdminWorkspaceId } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

/**
 * Everything in this workspace, on one screen, with a search box.
 *
 * The panel's real problem was never a missing feature — it was that
 * twenty-five screens had no link anywhere and the rest were spread over a
 * sidebar you had to already know. This is the answer to "yeh kahan hai": one
 * page listing every screen in the workspace, grouped, each with a line saying
 * what it is for, and a filter that searches those lines as well as the names.
 *
 * It is generated from the same `ADMIN_WORKSPACES` map the sidebar uses, so a
 * screen added to the nav appears here automatically and one that is missing
 * from the nav fails the contract test before it can hide.
 */
export function AdminWorkspaceDirectory({
  workspace: workspaceId,
  className,
}: {
  workspace: AdminWorkspaceId;
  className?: string;
}) {
  const workspace = getAdminWorkspace(workspaceId);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return workspace.groups;

    return workspace.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          `${item.label} ${item.description} ${group.label}`.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.items.length);
  }, [workspace, query]);

  const total = workspace.groups.reduce((count, group) => count + group.items.length, 0);

  return (
    <section className={cn("space-y-4", className)} aria-label={`${workspace.label} sections`}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dc-body)]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search all ${total} screens — try "slides", "payout", "GST"`}
          aria-label="Search admin screens"
          className="lg-field h-12 w-full rounded-2xl pl-10 pr-3.5 text-[13.5px] font-semibold text-[var(--dc-ink)] outline-none transition placeholder:font-medium placeholder:text-[var(--dc-body)] focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)]/40"
        />
      </div>

      {groups.length ? (
        groups.map((group) => {
          const GroupIcon = group.icon;

          return (
            <div key={group.id}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.65rem] text-white"
                  style={{ background: "var(--dc-grad-blue)" }}
                >
                  <GroupIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[14px] font-extrabold leading-tight text-[var(--dc-ink)]">{group.label}</h2>
                  <p className="text-[12px] font-medium leading-snug text-[var(--dc-body)]">{group.blurb}</p>
                </div>
              </div>

              <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link href={item.href} className="group block h-full">
                        <div
                          className={cn(
                            "lg-card lg-raise flex h-full items-start gap-3 p-3.5",
                            item.emphasis && "ring-1 ring-[var(--dc-flame)]/30",
                            item.unfinished && "opacity-80",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.7rem]",
                              item.emphasis
                                ? "text-white"
                                : "bg-[var(--dc-ink)]/6 text-[var(--dc-blue-mid)]",
                            )}
                            style={item.emphasis ? { background: "var(--dc-grad-flame)" } : undefined}
                          >
                            <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-[13.5px] font-extrabold text-[var(--dc-ink)]">
                                {item.label}
                              </span>
                              <ArrowUpRight
                                className="h-3.5 w-3.5 shrink-0 text-[var(--dc-body)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                                aria-hidden="true"
                              />
                            </span>
                            <span className="mt-0.5 block text-[12px] font-medium leading-[1.45] text-[var(--dc-body)]">
                              {item.description}
                            </span>
                            {/* Said plainly rather than hidden. A screen that
                                quietly loses what you type is worse than one
                                you were warned about. */}
                            {item.unfinished ? (
                              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--dc-amber)]/15 px-2 py-0.5 text-[10.5px] font-extrabold text-[var(--dc-flame)]">
                                Not connected yet
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      ) : (
        <div className="rounded-[1.25rem] border border-dashed border-[var(--dc-ink)]/15 bg-white/60 p-8 text-center">
          <p className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">Nothing matches “{query}”.</p>
          <p className="mt-1.5 text-[12.5px] font-medium text-[var(--dc-body)]">
            Try a shorter word — the search looks at what each screen does, not just its name.
          </p>
        </div>
      )}
    </section>
  );
}
