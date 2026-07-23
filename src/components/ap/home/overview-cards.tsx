import Link from "next/link";

import type { PartnerOverviewCard } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";

type OverviewCardsProps = {
  cards: PartnerOverviewCard[];
};

function toneClass(tone: PartnerOverviewCard["tone"]) {
  if (tone === "pending") return "border-amber-200 bg-amber-50/40";
  if (tone === "success") return "border-emerald-200 bg-emerald-50/40";
  if (tone === "urgent") return "border-rose-200 bg-rose-50/40";
  return "border-slate-200/80 bg-white";
}

export function OverviewCards({ cards }: OverviewCardsProps) {
  if (!cards.length) return null;

  return (
    <section aria-label="Overview" className="space-y-3 px-4 md:px-6">
      <h2 className="text-sm font-extrabold text-slate-900">Overview</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((card) => {
          const body = (
            <div
              className={cn(
                "h-full rounded-2xl border p-3.5 shadow-sm transition",
                toneClass(card.tone),
                card.href && "hover:border-blue-300 hover:shadow-md",
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
              <p className="mt-1.5 truncate text-xl font-extrabold tabular-nums text-slate-950">{card.value}</p>
            </div>
          );

          if (!card.href) {
            return (
              <div key={card.key}>{body}</div>
            );
          }

          return (
            <Link
              key={card.key}
              href={card.href}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded-2xl"
            >
              {body}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
