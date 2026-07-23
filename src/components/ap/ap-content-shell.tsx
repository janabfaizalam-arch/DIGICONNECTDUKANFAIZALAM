"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const AUTH_PATHS = new Set(["/ap/login", "/ap/forgot-password", "/ap/reset-password"]);

/**
 * Reserves space above the floating mobile dock so last-page cards stay scrollable.
 */
export function ApContentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PATHS.has(pathname);

  return (
    <div
      className={cn(
        !isAuth && "pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-0",
      )}
    >
      {children}
    </div>
  );
}
