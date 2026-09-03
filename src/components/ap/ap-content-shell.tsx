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
        // min-w-0 matters: without it a wide table inside pushes the whole
        // flex row out and takes the sidebar off screen with it.
        "min-w-0 flex-1",
        !isAuth && "pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-0",
      )}
    >
      {children}
    </div>
  );
}
