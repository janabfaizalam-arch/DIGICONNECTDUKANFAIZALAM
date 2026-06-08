"use client";

import React, { useState, useMemo } from "react";
import { ChevronRight, HelpCircle, Search } from "lucide-react";

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
    answer: "Wallet cashback points real reward credits hain jinhe aap direct platform par koi bhi nayi paid application select karte waqt up to 50% discount apply karne ke liye redeem kar sakte hain. Ye directly orders summary ledger me automatically deduct hote hain.",
  },
  {
    question: "Agar documents verification reject ho jaye toh kya hoga?",
    answer: "Agar verification me koi spelling mistake, wrong database registry, ya document issue match hota hai, toh humare experts direct call ya WhatsApp support dwara correct copies review karte hain aur submission resolve karte hain.",
  },
  {
    question: "Payment checkout security kaisi hai?",
    answer: "DigiConnect Dukan safe transactions ke liye industry-standard secure payment gateway (Razorpay) use karta hai. Aap UPI, cards, net banking, ya wallets ke through checkout complete kar sakte hain.",
  },
  {
    question: "How long does GST Registration take?",
    answer: "GST Registration typically takes 3-7 working days after all required documents are verified. Our team ensures proper documentation to avoid rejections and speed up the process.",
  },
  {
    question: "Is there a refund policy?",
    answer: "Yes, we have a clear refund policy. If a service cannot be processed due to our error, a full refund is initiated. Please check our Refund Policy page for detailed terms.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter(
      faq => faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q)
    );
  }, [searchQuery]);

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
    <section className="bg-slate-50/50 py-10 md:py-14 px-3">
      <div className="container-shell max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">FAQs</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Quick answers to common questions.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
          />
        </div>

        {/* Accordion */}
        <div className="space-y-2.5">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border bg-white transition-all duration-200 ${
                  isOpen ? "border-blue-100 shadow-sm" : "border-slate-100 hover:border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between gap-3 p-4 font-bold text-slate-800 text-sm outline-none cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className={`h-4 w-4 shrink-0 transition ${isOpen ? "text-blue-600" : "text-slate-300"}`} />
                    <span>{faq.question}</span>
                  </span>
                  <ChevronRight className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90 text-blue-600" : ""}`} />
                </button>

                {/* Expandable content using grid trick for smooth height animation */}
                <div
                  className="grid transition-all duration-300"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pl-11">
                      <p className="text-xs md:text-sm font-medium text-slate-500 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredFaqs.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">No matching questions found.</p>
        )}

        {/* Schema injection */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </div>
    </section>
  );
}
