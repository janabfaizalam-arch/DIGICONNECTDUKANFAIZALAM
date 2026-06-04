"use client";

import React from "react";
import { CreditCard, Check, ArrowRight } from "lucide-react";

const cards = [
  {
    bankName: "HDFC Bank",
    cardName: "Millennia Credit Card",
    eligibility: "Salaried / Self-Employed",
    income: "₹15,000 / month",
    joiningFee: "₹1,000 (Refundable)",
    applyUrl: "https://wee.bnking.in/c/MDM5ZTBjN",
    color: "from-blue-600 to-indigo-800",
    benefit: "5% Cashback on Shopping",
    logoText: "HDFC",
  },
  {
    bankName: "SBI Card",
    cardName: "SimplyCLICK Card",
    eligibility: "Salaried / Self-Employed",
    income: "₹20,000 / month",
    joiningFee: "₹499 (Waived off)",
    applyUrl: "https://wee.bnking.in/c/NDRlNzc3Z",
    color: "from-cyan-600 to-sky-800",
    benefit: "10x Points on Partners",
    logoText: "SBI",
  },
  {
    bankName: "ICICI Bank",
    cardName: "Coral Credit Card",
    eligibility: "Salaried / Self-Employed",
    income: "₹25,000 / month",
    joiningFee: "₹500 (Waived off)",
    applyUrl: "https://wee.bnking.in/c/OTc5NTNhY",
    color: "from-orange-500 to-amber-700",
    benefit: "Buy 1 Get 1 Movie Tickets",
    logoText: "ICICI",
  },
  {
    bankName: "Axis Bank",
    cardName: "Neo Credit Card",
    eligibility: "Salaried / Self-Employed",
    income: "₹15,000 / month",
    joiningFee: "₹250 (Lifetime Free)",
    applyUrl: "https://wee.bnking.in/c/MTUwNTNiY",
    color: "from-pink-600 to-rose-800",
    benefit: "10% Off on Food/Zomato",
    logoText: "AXIS",
  },
];

export function CreditCardOffers() {
  return (
    <section className="bg-white py-8 px-3">
      <div className="container-shell">
        {/* Section Header */}
        <div className="mb-6 flex items-center justify-between px-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">
              Exclusive Access
            </p>
            <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-900 md:text-2xl">
              Credit Card Offers
            </h2>
          </div>
          <a
            href="https://wa.me/918287002983?text=Hello%20I%20am%20interested%20in%20applying%20for%20a%20Credit%20Card."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-xs font-black text-blue-600 hover:underline"
          >
            Card Expert Help <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Responsive Grid of Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="group flex flex-col justify-between rounded-3xl border border-slate-150 bg-slate-50/30 p-5 shadow-sm hover:shadow-md transition hover:-translate-y-0.5 duration-300 relative overflow-hidden"
            >
              {/* Top Bank logo block */}
              <div>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-black tracking-widest uppercase text-white px-2.5 py-1 rounded-lg bg-gradient-to-r ${card.color} shadow-sm`}>
                    {card.logoText}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <CreditCard className="h-4 w-4" />
                  </span>
                </div>

                <h3 className="mt-4 text-base font-extrabold text-slate-950 leading-tight">
                  {card.cardName}
                </h3>
                <p className="text-[11px] font-bold text-slate-450 mt-1">{card.bankName}</p>

                {/* Benefits / Offers list */}
                <div className="mt-4 space-y-2 border-t border-slate-150/50 pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>{card.benefit}</span>
                  </div>
                  
                  <div className="text-[10px] font-bold text-slate-500 space-y-1">
                    <p className="flex justify-between">
                      <span>Min Income:</span>
                      <span className="text-slate-700 font-extrabold">{card.income}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Joining Fee:</span>
                      <span className="text-slate-700 font-extrabold">{card.joiningFee}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6">
                <a
                  href={card.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-950 text-xs font-black text-white hover:bg-slate-900 transition active:scale-[0.98]"
                >
                  Apply Online
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
