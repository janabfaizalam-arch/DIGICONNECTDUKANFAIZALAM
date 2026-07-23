import Link from "next/link";

import type { PartnerOverviewCard } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";

type OverviewCardsProps = {
  cards: PartnerOverviewCard[];
};

function toneClass(tone: PartnerOverviewCard["tone"]) {
  if (tone === "pending") return "border-amber-200/80 bg-amber-50/50";
  if (tone === "success") return "border-emerald-200/80 bg-emerald-50/50";
  if (tone === "urgent") return "border-rose-200/80 bg-rose-50/50";
  return "border-slate-200/70 bg-white";
}

export function OverviewCards({ cards }: OverviewCardsProps) {
  if (!cards.length) return null;

  return (
    <section aria-label="Overview" className="space-y-2.5 px-4 md:px-6">
      <h2 className="text-[13px] font-bold tracking-tight text-slate-900">Overview</h2>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
        {cards.map((card) => {
          const body = (
            <div
              className={cn(
                "h-full rounded-[16px] border p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200",
                toneClass(card.tone),
                card.href && "hover:border-blue-200 hover:shadow-[0_8px_20px_-12px_rgba(37,99,235,0.28)]",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{card.label}</p>
              <p className="mt-1 truncate text-lg font-bold tabular-nums tracking-tight text-slate-950 md:text-xl">
                {card.value}
              </p>
            </div>
          );

          if (!card.href) {
            return <div key={card.key}>{body}</div>;
          }

          return (
            <Link
              key={card.key}
              href={card.href}
              className="block rounded-[16px] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {body}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
