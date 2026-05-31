import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CreditCardCard } from "@/components/credit-card-card";
import { creditCards } from "@/lib/credit-cards";

export function CreditCardOffersSection() {
  return (
    <section id="credit-card-offers" className="bg-white px-0 py-5 md:py-10">
      <div className="container-shell">
        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-[radial-gradient(circle_at_10%_0%,rgba(37,99,235,0.1),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(249,115,22,0.1),transparent_30%),linear-gradient(180deg,#ffffff,#f8fbff)] p-3 shadow-[0_12px_32px_rgba(15,23,42,0.05)] md:rounded-3xl md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">Find the Right Credit Card</p>
              <h2 className="mt-1.5 text-xl font-bold text-slate-950 md:text-3xl">Credit Card Offers</h2>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-600 md:text-sm md:leading-6">
                Compare popular cards and view details before applying.
              </p>
            </div>
            <Link href="/credit-cards/hdfc-bank-credit-card" className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2 text-xs font-extrabold text-white md:text-sm">
              Explore
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 flex snap-x snap-mandatory touch-pan-x gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:pb-0 xl:grid-cols-4">
            {creditCards.map((card) => (
              <CreditCardCard key={card.slug} card={card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
