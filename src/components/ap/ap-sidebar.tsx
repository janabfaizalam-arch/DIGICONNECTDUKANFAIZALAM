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
 * which table it reads. It replaces a seven-link centre bar that hid two
 * thirds of the panel behind a menu nobody opened — a partner should be able
 * to see the whole of their own workspace without clicking anything.
 *
 * Groups are always open. A collapsed group is a door closed again, and the
 * entire point here was that the doors were missing.
 */
export function ApSidebar({ canManageTeam = false }: { canManageTeam?: boolean }) {
  const pathname = usePathname();
  if (isAuthRoutePath(pathname)) return null;

  const groups = apNavGroups({ canManageTeam });

  return (
    <aside
      aria-label="Digi Partner sections"
      className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[248px] shrink-0 overflow-y-auto border-r border-slate-200/70 bg-white/60 px-3 py-4 lg:block"
    >
      <nav className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.id}>
            <p className="px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              {group.label}
            </p>
            <ul className="mt-1.5 space-y-0.5">
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
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-bold transition-colors duration-150",
                        active
                          ? "bg-[var(--dc-blue-deep,#0f5db8)] text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-400")} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <Link
          href="/ap/all"
          className="mt-1 flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 px-2.5 py-2 text-[12.5px] font-bold text-slate-500 transition hover:border-slate-400 hover:text-slate-800"
        >
          <LayoutGrid className="h-4 w-4 shrink-0 text-slate-400" />
          Sab kuch ek jagah
        </Link>
      </nav>
    </aside>
  );
}
