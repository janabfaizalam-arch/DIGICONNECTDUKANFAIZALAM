import Link from "next/link";
import { Plus, Wallet2 } from "lucide-react";

import type { PartnerHomeIdentity } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";
import { speakINR } from "@/lib/ap/a11y";

type HomeHeaderProps = {
  identity: PartnerHomeIdentity;
  className?: string;
};

/**
 * The page's opening: who you are on the left, the one number that matters on
 * the right.
 *
 * The only place the partner's name, code and tier appear, and the only hero
 * figure on the page. Built on the navy gradient rather than a flat block so
 * it reads as the masthead of a product and not the top row of a table, with
 * two soft brand blooms and a fine grid giving the surface something to catch
 * light on.
 *
 * The figure uses proportional numerals, not tabular: at 48px `tabular-nums`
 * pads every digit to the width of a zero and the number reads loose.
 */
export function HomeHeader({ identity, className }: HomeHeaderProps) {
  return (
    <section
      aria-label="Partner summary"
      className={cn(
        "relative isolate overflow-hidden rounded-[16px] text-white shadow-[0_14px_36px_-22px_rgba(6,26,66,0.8)]",
        className,
      )}
      style={{ backgroundImage: "var(--dcp-g-navy)" }}
    >
      {/* Decoration. aria-hidden: it carries no information. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-[#ff6800]/30 blur-[90px]" />
        <div className="absolute -bottom-32 left-1/4 h-56 w-56 rounded-full bg-[#3b8bff]/35 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(70% 120% at 30% 0%, #000 20%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(70% 120% at 30% 0%, #000 20%, transparent 75%)",
          }}
        />
      </div>

      <div className="flex flex-col gap-3.5 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-white/12 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/90 ring-1 ring-inset ring-white/20">
              {identity.partnerTypeLabel}
            </span>
            {identity.tierName ? (
              <span
                className="rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#0a1834] shadow-[0_4px_12px_-4px_rgba(255,104,0,0.75)]"
                style={{ backgroundImage: "var(--dcp-g-accent)" }}
              >
                {identity.tierName}
              </span>
            ) : null}
          </div>

          <h1 className="mt-2 text-[22px] font-bold leading-[1.1] tracking-[-0.015em] sm:text-[28px] lg:text-[32px]">
            {identity.name}
          </h1>

          {identity.partnerCode ? (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-white/12 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-white/80 ring-1 ring-inset ring-white/15">
              {identity.partnerCode}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/70 sm:justify-end">
            <Wallet2 className="h-3 w-3" aria-hidden />
            {identity.heroLabel}
          </p>

          <p className="mt-1 text-[34px] font-bold leading-none tracking-[-0.02em] sm:text-[38px]">
            <span aria-hidden>{identity.heroValue}</span>
            <span className="sr-only">{speakINR(identity.heroValue.replace(/[^0-9.-]/g, ""))}</span>
          </p>

          <p className="mt-1.5 text-[11.5px] font-medium text-white/70">{identity.heroCaption}</p>

          <Link
            href="/ap/applications/new"
            prefetch
            className="dcp-btn mt-3 bg-white text-[var(--dcp-brand-deep)] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)] hover:bg-white/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New application
          </Link>
        </div>
      </div>
    </section>
  );
}
