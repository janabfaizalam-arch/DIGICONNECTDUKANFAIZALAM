import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CreditCardCard } from "@/components/credit-card-card";
import { creditCards } from "@/lib/credit-cards";

export function CreditCardOffersSection() {
  return (
    <section id="credit-card-offers" className="bg-white px-0 pb-8 pt-3 md:pb-12 md:pt-6">
      <div className="container-shell">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-950 md:text-3xl">Credit Card Offers</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 md:text-base">
              Choose the card and view details before applying.
            </p>
          </div>
          <Link href="/credit-cards/hdfc-bank-credit-card" className="hidden items-center gap-1.5 text-sm font-extrabold text-blue-700 md:inline-flex">
            Explore
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:pb-0">
          {creditCards.map((card) => (
            <CreditCardCard key={card.slug} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
