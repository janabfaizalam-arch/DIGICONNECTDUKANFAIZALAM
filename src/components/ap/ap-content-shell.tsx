"use client";

import { usePathname } from "next/navigation";

import { isAuthRoutePath } from "@/lib/auth/auth-routes";
import { cn } from "@/lib/utils";

/**
 * Reserves space above the floating mobile dock so last-page cards stay scrollable.
 */
export function ApContentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = isAuthRoutePath(pathname);

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
