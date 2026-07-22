"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { resolveAdminBreadcrumbs } from "@/lib/admin/nav";

export function AdminBreadcrumbs() {
  const pathname = usePathname() || "/admin";
  const crumbs = resolveAdminBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] font-semibold text-slate-500">
      {crumbs.map((crumb, index) => {
        const last = index === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} className="inline-flex min-w-0 items-center gap-1">
            {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" aria-hidden /> : null}
            {crumb.href && !last ? (
              <Link href={crumb.href} className="truncate hover:text-slate-800">
                {crumb.label}
              </Link>
            ) : (
              <span className={last ? "truncate text-slate-800" : "truncate"}>{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
