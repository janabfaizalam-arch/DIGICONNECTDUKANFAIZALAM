"use client";

import React, { useState, useMemo } from "react";
import { ChevronRight, HelpCircle, Search, Sparkles } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
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
    answer: "GST Registration typically takes 3-7 working days after all required documents are verified by our CA/CS team. Our experts ensure proper documentation to avoid rejections and speed up portal processing.",
  },
  {
    question: "Is there a refund policy?",
    answer: "Yes, we have a transparent refund policy. If an application cannot be processed due to verification constraints or our error, a refund is processed. Please refer to our Refund Policy page for details.",
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
    <section id="faq" className="bg-white py-12 px-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-blue-500/5 blur-[90px] pointer-events-none" />

      <div className="container-shell max-w-3xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 fill-blue-100 text-blue-500" /> FAQ Accordion
          </p>
          <h2 className="mt-1.5 text-xl md:text-2xl font-black tracking-tight text-slate-850">
            Frequently Asked Questions
          </h2>
        </div>

        {/* AI-connected Search Filter */}
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs instantly..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white/70 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-450 focus:ring-4 focus:ring-blue-100/50 shadow-inner"
          />
        </div>

        {/* Accordion Container */}
        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`glass-liquid-premium rounded-2xl transition-all duration-350 border-white/50 ${
                  isOpen ? "border-blue-400/40 shadow-sm" : "hover:border-slate-300/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between gap-3.5 p-4 font-black text-slate-750 text-xs md:text-sm outline-none cursor-pointer text-left select-none"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className={`h-4.5 w-4.5 shrink-0 transition-colors ${isOpen ? "text-blue-500" : "text-slate-350"}`} />
                    <span>{faq.question}</span>
                  </span>
                  <ChevronRight className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-350 ${isOpen ? "rotate-90 text-blue-600" : ""}`} />
                </button>

                {/* Instant smooth grid animation */}
                <div
                  className="grid transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4.5 pl-11">
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">
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
          <p className="text-center text-xs font-semibold text-slate-400 py-10">No matching questions found.</p>
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
