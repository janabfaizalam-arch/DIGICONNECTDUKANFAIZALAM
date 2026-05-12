import { ExternalLink, FileCheck2, ShieldCheck } from "lucide-react";

import { CreditCardVisual } from "@/components/credit-card-visual";
import { creditCards } from "@/lib/credit-cards";

const disclaimer =
  "Credit card approval is subject to bank eligibility, verification, credit score and bank terms. DigiConnect Dukan only provides assistance/link access and does not guarantee approval.";

const faqs = [
  {
    question: "Does DigiConnect Dukan guarantee credit card approval?",
    answer: "No. Approval depends on bank eligibility, credit score, documents and bank verification.",
  },
  {
    question: "What documents are usually required?",
    answer: "PAN, Aadhaar, income proof, bank statement and address proof may be required.",
  },
  {
    question: "Is applying online safe?",
    answer: "Apply only through the partner link shown on this page.",
  },
];

function summarize(items: string[]) {
  return items.slice(0, 3).join(", ");
}

export function ServiceCreditCardOffersSection() {
  return (
    <section id="credit-card-offers" className="mt-8 overflow-hidden rounded-3xl border border-blue-100 bg-[radial-gradient(circle_at_12%_0%,rgba(37,99,235,0.14),transparent_34%),radial-gradient(circle_at_92%_8%,rgba(249,115,22,0.14),transparent_30%),linear-gradient(180deg,#ffffff,#f8fbff)] p-4 shadow-[0_18px_46px_rgba(15,23,42,0.08)] md:p-7">
      <div className="max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">Find the right credit card for rewards, cashback, shopping, travel and dining.</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950 md:text-4xl">Credit Cards - All Banks</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 md:text-base">
          Compare popular credit cards and apply through trusted partner links.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {creditCards.map((card) => (
          <article key={card.slug} className="rounded-3xl border border-white/75 bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
            <div className="transition duration-300 md:hover:[transform:perspective(900px)_rotateX(4deg)_rotateY(-4deg)_translateY(-2px)]">
              <CreditCardVisual card={card} />
            </div>

            <div className="p-2 pt-4">
              <div className="flex flex-wrap gap-1.5">
                {card.shortBenefits.map((benefit) => (
                  <span key={benefit} className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-blue-700">
                    {benefit}
                  </span>
                ))}
              </div>

              <h3 className="mt-4 text-lg font-bold leading-tight text-slate-950">{card.name}</h3>
              <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.12em] text-orange-600">
                {card.bankName} • {card.cardNetwork}
              </p>

              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-blue-50/70 p-3">
                  <div className="flex gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                    <p className="font-semibold leading-6 text-slate-700">{card.eligibility[0]}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-orange-50/70 p-3">
                  <div className="flex gap-2">
                    <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                    <p className="font-semibold leading-6 text-slate-700">{summarize(card.documents)}</p>
                  </div>
                </div>
              </div>

              <a
                href={card.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563eb,#f97316)] px-4 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)] transition md:hover:-translate-y-0.5"
              >
                Apply Now
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-7 rounded-3xl border border-orange-100 bg-orange-50/80 p-5">
        <h3 className="text-lg font-bold text-slate-950">Important Disclaimer</h3>
        <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">{disclaimer}</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {faqs.map((faq) => (
          <div key={faq.question} className="rounded-3xl border border-blue-100 bg-white/85 p-5">
            <h3 className="text-sm font-bold leading-6 text-slate-950">{faq.question}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
