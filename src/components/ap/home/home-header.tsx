import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { PartnerHomeIdentity } from "@/lib/ap/home-types";
import { speakINR } from "@/lib/ap/a11y";

type HomeHeaderProps = {
  identity: PartnerHomeIdentity;
};

/**
 * The page's opening: who you are on the left, the one number that matters on
 * the right.
 *
 * This is the only place the partner's name, code and tier appear, and the only
 * hero figure on the page — every other number is a KPI tile or a chart. The
 * hero uses proportional figures, not tabular: at 40px+ `tabular-nums` pads
 * every digit to the width of a zero and the number reads loose.
 */
export function HomeHeader({ identity }: HomeHeaderProps) {
  return (
    <section
      aria-label="Partner summary"
      className="relative overflow-hidden rounded-[22px] border border-[#0f2f6b]/10 bg-[linear-gradient(135deg,#082b63_0%,#0d4795_55%,#1268e8_100%)] px-4 py-5 text-white shadow-[0_18px_40px_-28px_rgba(8,43,99,0.9)] sm:px-6 sm:py-6"
    >
      {/* Decorative wash. aria-hidden: it carries no information. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[#ff6800]/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-12 h-52 w-52 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/90 ring-1 ring-inset ring-white/20">
              {identity.partnerTypeLabel}
            </span>
            {identity.tierName ? (
              <span className="rounded-full bg-[#ff6800] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                {identity.tierName}
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 text-xl font-bold leading-tight tracking-tight sm:text-2xl">{identity.name}</h1>

          {identity.partnerCode ? (
            <p className="mt-1 font-mono text-xs font-semibold tracking-wide text-white/65">
              {identity.partnerCode}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">
            {identity.heroLabel}
          </p>
          <p className="mt-1 text-[40px] font-bold leading-none tracking-tight sm:text-[46px]">
            <span aria-hidden>{identity.heroValue}</span>
            <span className="sr-only">{speakINR(identity.heroValue.replace(/[^0-9.-]/g, ""))}</span>
          </p>
          <p className="mt-1.5 text-xs font-medium text-white/70">{identity.heroCaption}</p>

          <Link
            href="/ap/payments/collect"
            className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-bold text-[#0d4795] transition duration-150 hover:bg-white/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d4795]"
          >
            Collect a payment
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
