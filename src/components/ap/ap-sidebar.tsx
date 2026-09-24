"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";

import { apNavGroups, isApNavItemActive } from "@/lib/ap/nav";
import { isAuthRoutePath } from "@/lib/auth/auth-routes";
import { cn } from "@/lib/utils";

/**
 * The panel's spine, on a computer.
 *
 * Everything a partner can do, grouped by what they came to do rather than by
 * which table it reads. Groups are always open: a collapsed group is a door
 * closed again, and the point of this sidebar was that the doors were missing.
 *
 * The visual job it now does that it did not before:
 *
 *   - It is a surface, not a margin. A tinted panel with its own hairline and
 *     shadow, so the content beside it reads as sitting on top of the page
 *     rather than beside an empty gutter.
 *   - Every row carries an icon tile. A bare 16px glyph against a white strip
 *     gives the eye nothing to land on; a tile gives each row a consistent
 *     anchor and lets the active row light up without the label moving.
 *   - The active row wears the brand gradient and a matching glow, which is
 *     the same treatment primary buttons get — so "where I am" and "what I can
 *     press" speak one language.
 *   - Group labels sit on a hairline rule rather than floating, which is what
 *     stops the whole column reading as one undifferentiated list.
 */
export function ApSidebar({ canManageTeam = false }: { canManageTeam?: boolean }) {
  const pathname = usePathname();
  if (isAuthRoutePath(pathname)) return null;

  const groups = apNavGroups({ canManageTeam });

  return (
    <aside
      aria-label="DC Partner sections"
      className={cn(
        "sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[252px] shrink-0 overflow-y-auto lg:block",
        "border-r border-[var(--dcp-line)] px-2.5 py-3.5 backdrop-blur-xl",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(241,245,254,0.9)_100%)]",
        "[scrollbar-width:thin]",
      )}
    >
      <nav className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.id}>
            <p className="flex items-center gap-2 px-2 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[var(--dcp-ink-4)]">
              <span className="whitespace-nowrap">{group.label}</span>
              <span aria-hidden className="h-px flex-1 bg-[var(--dcp-line)]" />
            </p>

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isApNavItemActive(pathname, item);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={item.description}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-[11px] py-1.5 pl-1.5 pr-2.5",
                        "text-[12.5px] font-semibold transition-all duration-200",
                        active
                          ? "bg-[var(--dcp-brand-soft)] text-[var(--dcp-brand-deep)] shadow-[inset_0_0_0_1px_rgba(18,104,232,0.14)]"
                          : "text-[var(--dcp-ink-2)] hover:bg-[var(--dcp-surface-2)] hover:text-[var(--dcp-ink)]",
                      )}
                    >
                      <span
                        className={cn(
                          "dcp-chip h-7 w-7 shrink-0",
                          active
                            ? "dcp-chip-filled"
                            : "bg-[var(--dcp-surface-2)] text-[var(--dcp-ink-3)] group-hover:bg-[var(--dcp-brand-soft)] group-hover:text-[var(--dcp-brand-deep)]",
                        )}
                      >
                        <Icon className="h-[15px] w-[15px]" aria-hidden />
                      </span>

                      <span className="truncate">{item.label}</span>

                      {/* A second, non-colour cue for the active row. */}
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute inset-y-1.5 -left-2.5 w-[3px] rounded-r-full bg-[image:var(--dcp-g-brand)]"
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <Link
          href="/ap/all"
          className={cn(
            "mt-0.5 flex items-center gap-2.5 rounded-[11px] border border-dashed border-[var(--dcp-line-2)] py-1.5 pl-1.5 pr-2.5",
            "text-[12.5px] font-semibold text-[var(--dcp-ink-3)] transition-all duration-200",
            "hover:border-[var(--dcp-brand)] hover:bg-[var(--dcp-brand-soft)] hover:text-[var(--dcp-brand-deep)]",
          )}
        >
          <span className="dcp-chip h-7 w-7 shrink-0 bg-[var(--dcp-surface-2)] text-[var(--dcp-ink-3)]">
            <LayoutGrid className="h-[15px] w-[15px]" aria-hidden />
          </span>
          Sab kuch ek jagah
        </Link>
      </nav>
    </aside>
  );
}
