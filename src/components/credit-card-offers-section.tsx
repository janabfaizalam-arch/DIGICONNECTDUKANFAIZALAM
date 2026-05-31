"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

const featuredCards = [
  {
    bankName: "HDFC Bank",
    subtitle: "Credit Card",
    slug: "hdfc-bank-credit-card",
    applyUrl: "https://wee.bnking.in/c/MDM5ZTBjN",
    bgLogo: "bg-[#004c8f]",
    textLogo: "H",
    textColor: "text-[#004c8f]",
  },
  {
    bankName: "SBI Card",
    subtitle: "Credit Card",
    slug: "sbi-simplyclick-credit-card",
    applyUrl: "https://wee.bnking.in/c/NDRlNzc3Z",
    bgLogo: "bg-[#00549c]",
    textLogo: "S",
    textColor: "text-[#00549c]",
  },
  {
    bankName: "ICICI Bank",
    subtitle: "Credit Card",
    slug: "icici-bank-credit-card",
    applyUrl: "https://wee.bnking.in/c/OTc5NTNhY",
    bgLogo: "bg-[#f58220]",
    textLogo: "I",
    textColor: "text-[#f58220]",
  },
  {
    bankName: "Axis Bank",
    subtitle: "Credit Card",
    slug: "axis-bank-credit-card-ck",
    applyUrl: "https://wee.bnking.in/c/MTUwNTNiY",
    bgLogo: "bg-[#97144d]",
    textLogo: "A",
    textColor: "text-[#97144d]",
  },
];

export function CreditCardOffersSection() {
  return (
    <section id="credit-card-offers" className="bg-white px-3 py-4 md:px-6 md:py-6 animate-fade-in">
      <div className="container-shell">
        <div className="overflow-hidden rounded-[24px] border border-blue-100/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.75),rgba(255,255,255,0.45))] p-4 shadow-[0_8px_32px_rgba(7,19,38,0.04)] backdrop-blur-md">
          {/* Header */}
          <div className="mb-3.5 flex items-center justify-between px-1">
            <h2 className="text-sm font-black tracking-tight text-[#071326] md:text-base">
              Credit Card Offers
            </h2>
            <Link
              href="/services"
              className="inline-flex items-center gap-0.5 text-xs font-bold text-[#2563EB] hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Carousel container */}
          <div className="flex snap-x snap-mandatory touch-pan-x gap-3 overflow-x-auto overscroll-x-contain pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 md:grid-cols-4 sm:overflow-visible sm:pb-0">
            {featuredCards.map((card) => (
              <a
                key={card.slug}
                href={card.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block w-[155px] min-w-[155px] sm:w-auto h-[96px] p-3 rounded-2xl bg-white border border-slate-100/70 shadow-[0_4px_12px_rgba(7,19,38,0.03)] hover:shadow-[0_6px_16px_rgba(7,19,38,0.05)] hover:border-blue-100/40 transition-all duration-200 active:scale-95 overflow-hidden snap-start select-none"
              >
                {/* Brand Logo Badge & Name */}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${card.bgLogo} flex items-center justify-center font-black text-white text-xs shrink-0 shadow-inner`}>
                    {card.textLogo}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black text-[#071326] truncate leading-tight">
                      {card.bankName}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5 leading-none">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                {/* Apply CTA at Bottom */}
                <div className="absolute left-3 bottom-3">
                  <span className={`text-[10px] font-black tracking-wide ${card.textColor}`}>
                    Apply Now →
                  </span>
                </div>

                {/* Decorative layered bottom-right waves */}
                <div className="absolute right-0 bottom-0 w-8 h-8 bg-[#071326] rounded-tl-full opacity-[0.06] pointer-events-none transition-all duration-300 group-hover:scale-110" />
                <div className="absolute right-0 bottom-0 w-5 h-5 bg-[#FF8A00] rounded-tl-full opacity-[0.08] pointer-events-none transition-all duration-300 group-hover:scale-110" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
