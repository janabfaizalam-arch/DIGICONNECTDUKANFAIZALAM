import Link from "next/link";
import { ArrowRight, CreditCard } from "lucide-react";

import type { CreditCardOffer } from "@/lib/credit-cards";

export function CreditCardCard({ card }: { card: CreditCardOffer }) {
  return (
    <Link
      href={`/credit-cards/${card.slug}`}
      className="group flex min-h-[11.5rem] min-w-[15.5rem] flex-col rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition md:min-w-0 md:hover:-translate-y-1 md:hover:border-orange-100"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 group-hover:bg-orange-50 group-hover:text-orange-600">
          <CreditCard className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-orange-700">
          {card.bank}
        </span>
      </div>
      <h3 className="mt-4 text-base font-bold leading-snug text-slate-950">{card.name}</h3>
      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{card.overview}</p>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-extrabold text-blue-700">
        View Details
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
