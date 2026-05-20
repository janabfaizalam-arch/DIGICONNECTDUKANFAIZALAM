import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CreditCardCard } from "@/components/credit-card-card";
import { creditCards } from "@/lib/credit-cards";

export function CreditCardOffersSection() {
  return (
    <section id="credit-card-offers" className="bg-white px-0 py-8 md:py-12">
      <div className="container-shell">
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-[radial-gradient(circle_at_10%_0%,rgba(37,99,235,0.13),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(249,115,22,0.13),transparent_30%),linear-gradient(180deg,#ffffff,#f8fbff)] p-4 shadow-[0_16px_42px_rgba(15,23,42,0.07)] md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">Find the Right Credit Card for Your Lifestyle</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950 md:text-4xl">Credit Card Offers</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 md:text-base">
                Compare popular cards and view details before applying.
              </p>
              <p className="mt-3 inline-flex rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-extrabold text-blue-700">
                Rewards • Cashback • Travel • Dining • Shopping
              </p>
            </div>
            <Link href="/credit-cards/hdfc-bank-credit-card" className="hidden items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-white md:inline-flex">
              Explore
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 flex snap-x snap-mandatory touch-pan-x gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:pb-0 xl:grid-cols-4">
            {creditCards.map((card) => (
              <CreditCardCard key={card.slug} card={card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
