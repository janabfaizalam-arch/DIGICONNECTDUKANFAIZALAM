import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CreditCardVisual } from "@/components/credit-card-visual";
import type { CreditCardOffer } from "@/lib/credit-cards";

export function CreditCardCard({ card }: { card: CreditCardOffer }) {
  return (
    <Link
      href={`/credit-cards/${card.slug}`}
      className="group block min-w-[min(19rem,86vw)] snap-start rounded-3xl border border-white/70 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.07)] transition-colors duration-200 md:min-w-0 md:shadow-[0_14px_34px_rgba(15,23,42,0.08)] md:transition md:duration-300 md:hover:-translate-y-1"
    >
      <div className="transition duration-300 md:group-hover:[transform:perspective(900px)_rotateX(4deg)_rotateY(-5deg)_translateY(-2px)]">
        <CreditCardVisual card={card} />
      </div>
      <div className="px-1 pb-1 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {card.shortBenefits.map((benefit) => (
            <span key={benefit} className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-blue-700">
              {benefit}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-950">{card.name}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {card.bankName} • {card.cardNetwork}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-700">
            View Details
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
