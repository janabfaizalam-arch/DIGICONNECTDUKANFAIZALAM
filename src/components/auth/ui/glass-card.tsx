import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The floating Apple-style glass panel that hosts each auth form. */
export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "auth-glass-card rounded-[28px] p-6 sm:p-8",
        className,
      )}
    >
      <div className="relative z-[1] flex flex-col gap-6">{children}</div>
    </section>
  );
}

type AuthHeadingProps = {
  title: string;
  subtitle?: ReactNode;
  align?: "center" | "left";
};

/** Card header: title + optional subtitle, animation handled by parent stagger. */
export function AuthHeading({ title, subtitle, align = "center" }: AuthHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", align === "center" ? "items-center text-center" : "items-start text-left")}>
      <h1 className="text-[26px] font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-[28px]">
        {title}
      </h1>
      {subtitle ? (
        <p className="max-w-[320px] text-sm font-medium leading-relaxed text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}
