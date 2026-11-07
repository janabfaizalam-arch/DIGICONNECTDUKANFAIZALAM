import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Device frames for the concept mockups. Pure markup and CSS, so they render
 * on the server and cost nothing to hydrate.
 */

export function BrowserFrame({
  url,
  children,
  className,
  tone = "light",
}: {
  url: string;
  children: ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] ring-1",
        dark ? "bg-[#0b1630] ring-white/10" : "bg-white ring-slate-900/10",
        "shadow-[0_30px_60px_-20px_rgba(1,29,95,0.45),0_12px_24px_-12px_rgba(1,29,95,0.25)]",
        className,
      )}
    >
      <div className={cn("flex items-center gap-2 px-3 py-2", dark ? "bg-white/[0.04]" : "bg-slate-50")} aria-hidden="true">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span
          className={cn(
            "mx-auto max-w-[70%] truncate rounded-md px-3 py-0.5 text-[10px] font-medium",
            dark ? "bg-white/[0.06] text-white/75" : "bg-white text-slate-600 ring-1 ring-slate-200",
          )}
        >
          {url}
        </span>
        <span className="w-[42px]" />
      </div>
      <div className="aspect-[16/10]">{children}</div>
    </div>
  );
}

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-[2rem] bg-[#0b1220] p-[7px] ring-1 ring-white/10",
        "shadow-[0_30px_60px_-18px_rgba(1,29,95,0.55),0_10px_20px_-10px_rgba(1,29,95,0.35)]",
        className,
      )}
    >
      <div className="relative aspect-[9/19.2] overflow-hidden rounded-[1.6rem] bg-white">
        <span aria-hidden="true" className="absolute left-1/2 top-1.5 z-10 h-[14px] w-[34%] -translate-x-1/2 rounded-full bg-[#0b1220]" />
        <div className="h-full pt-5">{children}</div>
      </div>
    </div>
  );
}

/** The address bar text for a concept: never a real domain. */
export const conceptUrl = (slug: string) => `concept.rnos.in/${slug}`;
