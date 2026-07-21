import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
  padding?: "none" | "sm" | "md" | "lg";
};

const paddingMap = {
  none: "",
  sm: "p-3.5 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
} as const;

/**
 * Premium liquid-glass surface used across the Digi Partner OS.
 * Matches the Clear Liquid Glass language from the auth design system.
 */
export function GlassPanel({ children, className, as: Tag = "div", padding = "md" }: GlassPanelProps) {
  return (
    <Tag
      className={cn(
        "rounded-[22px] border border-white/70 bg-white/70 shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur-xl",
        "ring-1 ring-slate-900/[0.03]",
        paddingMap[padding],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
