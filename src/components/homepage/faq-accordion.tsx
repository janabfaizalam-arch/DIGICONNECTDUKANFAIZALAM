"use client";

import React, { useState, useMemo } from "react";
import { ChevronRight, HelpCircle, Search, MessageCircle, Headphones } from "lucide-react";
import {
  FIRST_SERVICE_CASHBACK_PERCENT,
  REPEAT_CASHBACK_PERCENT,
  MAX_WALLET_REDEEM_PERCENT,
} from "@/lib/reward-rules";
import { HomepageSection } from "@/components/homepage/ui";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Built-in questions.
 *
 * These are the fallback, not the source of truth: when the homepage_faqs
 * table has rows, admin-managed questions replace this list entirely. Keeping
 * them means the section still reads sensibly on a deployment where the CMS
 * has not been populated yet.
 */
const FALLBACK_FAQS: FaqItem[] = [
  {
    question: "What is DigiConnect Dukan?",
    answer:
      "DigiConnect Dukan is the customer brand of RNOS India Private Limited. We provide private digital assistance for services such as GST registration support, ITR filing help, passport and licence documentation, vehicle insurance assistance, and PVC smart card printing. We are not an official government portal.",
  },
  {
    question: "How do I track my application?",
    answer:
      "Sign in to your DigiConnect Dukan customer account and open Applications. Status updates, missing-document requests, and receipts are shown there. For privacy, we do not expose application records through public ID lookup on the homepage.",
  },
  {
    question: "How do wallet rewards work?",
    answer: `Eligible paid services can earn wallet cashback per the current reward configuration (commonly ${FIRST_SERVICE_CASHBACK_PERCENT}% on a first eligible service and ${REPEAT_CASHBACK_PERCENT}% thereafter). Wallet credits can typically be redeemed up to ${MAX_WALLET_REDEEM_PERCENT}% of a new order. Exact eligibility is shown in your wallet ledger.`,
  },
  {
    question: "Are payments secure?",
    answer:
      "Checkout uses Razorpay for UPI, cards, net banking, and supported wallets. DigiConnect Dukan does not store your full card details on our servers.",
  },
  {
    question: "What if documents need correction?",
    answer:
      "If verification finds missing or incorrect documents, our team contacts you through the dashboard and support channels (call/WhatsApp) so you can upload corrected files before further processing.",
  },
  {
    question: "Is there a refund policy?",
    answer:
      "Yes. Refunds follow our published Refund / Cancellation Policy when an application cannot be processed due to verification constraints or our error. Please review the policy page for timelines and exclusions.",
  },
];

export function FaqAccordion({ items }: { items?: FaqItem[] } = {}) {
  // Admin-managed questions win outright; an empty CMS falls back to the
  // built-in list rather than rendering an empty section.
  const faqs = items?.length ? items : FALLBACK_FAQS;
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({ page: "faq", topic: "FAQ follow-up question" }),
  );

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter(
      (faq) => faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: filteredFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <HomepageSection id="faq" surface="sky">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.2fr] lg:gap-12">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--dc-blue-600)]">Help centre</p>
          <h2 className="mt-2 text-[1.65rem] font-black tracking-tight text-[var(--dc-ink)] sm:text-[2rem] md:text-[2.25rem]">
            Frequently asked questions
          </h2>
          <p className="mt-3 max-w-md text-[15px] font-semibold leading-relaxed text-[var(--dc-body)] sm:text-base">
            Clear answers about private digital assistance, payments, tracking and support.
          </p>

          <div className="mt-6 rounded-[1.5rem] border border-[var(--dc-blue-500)]/15 bg-white p-5 shadow-[0_12px_32px_rgba(7,31,77,0.05)] md:p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--dc-teal-soft)] text-[var(--dc-teal)]">
              <Headphones className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-extrabold text-[var(--dc-ink)]">Still need help?</h3>
            <p className="mt-2 text-[15px] font-semibold leading-relaxed text-[var(--dc-body)]">
              Chat with DigiConnect support on WhatsApp for screenshots, status questions and document guidance.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--dc-teal)] px-4 text-[15px] font-black text-white sm:w-auto"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp support
            </a>
          </div>
        </div>

        <div>
          <div className="relative mb-4">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dc-muted)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOpenIndex(0);
              }}
              placeholder="Search FAQs..."
              aria-label="Search frequently asked questions"
              className="h-12 w-full rounded-xl border border-[var(--dc-blue-500)]/15 bg-white pl-10 pr-4 text-[15px] font-semibold text-[var(--dc-ink)] outline-none transition placeholder:text-[var(--dc-muted)] focus:border-[var(--dc-blue-500)] focus:ring-4 focus:ring-[var(--dc-blue-500)]/15"
            />
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              const panelId = `faq-panel-${idx}`;
              const buttonId = `faq-button-${idx}`;
              return (
                <div
                  key={faq.question}
                  className={`rounded-[1.25rem] bg-white transition ${
                    isOpen
                      ? "shadow-[0_10px_28px_rgba(7,31,77,0.07)] ring-2 ring-[var(--dc-orange-500)]/35"
                      : "ring-1 ring-slate-200/80"
                  }`}
                >
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(idx)}
                    className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 p-4 text-left text-base font-black text-[var(--dc-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-600)] md:p-5"
                  >
                    <span className="flex items-center gap-2.5">
                      <HelpCircle
                        className={`h-5 w-5 shrink-0 ${isOpen ? "text-[var(--dc-orange-500)]" : "text-[var(--dc-muted)]"}`}
                        aria-hidden="true"
                      />
                      <span>{faq.question}</span>
                    </span>
                    <ChevronRight
                      className={`h-5 w-5 shrink-0 text-[var(--dc-muted)] transition-transform ${isOpen ? "rotate-90 text-[var(--dc-blue-600)]" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="px-4 pb-5 pl-12 md:px-5 md:pl-14">
                        <p className="text-[15px] font-semibold leading-relaxed text-[var(--dc-body)]">{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredFaqs.length === 0 ? (
            <p className="py-10 text-center text-[15px] font-semibold text-[var(--dc-muted)]">No matching questions found.</p>
          ) : null}

          {filteredFaqs.length > 0 ? (
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
          ) : null}
        </div>
      </div>
    </HomepageSection>
  );
}
