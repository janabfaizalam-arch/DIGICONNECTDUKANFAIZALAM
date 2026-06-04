"use client";

import React, { useState } from "react";
import { ChevronRight, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "DigiConnect Dukan kya hai?",
    answer: "DigiConnect Dukan, RNOS India Pvt Ltd dwara powered ek digital support aur verification assist desk hai. Hum customers ko GST registration, ITR filing, vehicle insurance, loans, passport applications aur PVC smart card printing jaisi online services me expert guidance aur secure form submission support provide karte hain.",
  },
  {
    question: "PVC Smart Card print me kitna time lagta hai?",
    answer: "PVC card print orders apply karne ke 24-48 hours ke andar process ho kar secure ship kar diye jate hain. Aapko email aur dashboard notifications par tracking details and updates milte hain.",
  },
  {
    question: "Kya wallet cashback real money me redeem ho sakta hai?",
    answer: "Wallet cashback points real reward credits hain jinhe aap direct platform par koi bhi nayi paid application select karte waqt up to 50% discount apply karne ke liye redeeam kar sakte hain. Ye directly orders summary ledger me automatically deduct hote hain.",
  },
  {
    question: "Agar documents verification reject ho jaye toh kya hoga?",
    answer: "Agar verification me koi spelling mistake, wrong database registry, ya document issue match hota hai, toh humare experts direct call ya WhatsApp support dwara correct copies review karte hain aur submission resolve karte hain.",
  },
  {
    question: "Payment checkout security kaisi hai?",
    answer: "DigiConnect Dukan safe transactions ke liye industry-standard secure payment gateway (Razorpay) use karta hai. Aap UPI, cards, net banking, ya wallets ke through checkout complete kar sakte hain.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  // SEO schema markup
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return (
    <section className="bg-white py-12 px-3">
      <div className="container-shell max-w-3xl">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-blue-700 shadow-sm border border-blue-100">
            FAQs
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4.5xl leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Aam sawalon ke seedhe aur sahaj jawab.
          </p>
        </div>

        {/* Collapsible Accordion Grid */}
        <div className="space-y-3.5 text-left">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-150 bg-slate-50/20 p-4 transition-all duration-200 hover:border-slate-350"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between gap-4 font-extrabold text-slate-900 text-sm md:text-base outline-none cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                    <span>{faq.question}</span>
                  </span>
                  <ChevronRight className={`h-4.5 w-4.5 text-slate-450 shrink-0 transition-transform duration-250 ${isOpen ? "rotate-90 text-blue-600" : ""}`} />
                </button>
                
                {/* Content Panel */}
                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-40 opacity-100 mt-3 pt-3 border-t border-slate-150/40" : "max-h-0 opacity-0"}`}>
                  <p className="text-xs md:text-sm font-semibold text-slate-650 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Injection of Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </div>
    </section>
  );
}
