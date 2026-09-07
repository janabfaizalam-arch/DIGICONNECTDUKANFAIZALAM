"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CONTENT_ENGINE_HOME, CONTENT_ENGINE_SCREENS } from "@/lib/content-engine/screens";
import { cn } from "@/lib/utils";

/**
 * The pipeline as navigation.
 *
 * The order of these tabs is the order of the work — mine, angle, write, fact
 * check, design, repurpose, approve, schedule, learn — so somebody who has
 * never used this screen can read the tab bar and understand what the system
 * does before clicking anything.
 */
export function EngineTabs() {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 mb-4 flex gap-1 overflow-x-auto pb-1" aria-label="Content Engine stages">
      {CONTENT_ENGINE_SCREENS.map((screen) => {
        const active =
          screen.href === CONTENT_ENGINE_HOME
            ? pathname === CONTENT_ENGINE_HOME
            : pathname === screen.href || pathname.startsWith(`${screen.href}/`);

        return (
          <Link
            key={screen.href}
            href={screen.href}
            title={screen.description}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
              active
                ? "border-[var(--dc-blue-600)] bg-[var(--dc-blue-600)] text-white"
                : "border-slate-200 bg-white text-[var(--dc-body)] hover:border-[var(--dc-blue-600)]/40 hover:bg-[var(--dc-sky-soft)]",
            )}
          >
            {screen.label}
          </Link>
        );
      })}
    </nav>
  );
}
