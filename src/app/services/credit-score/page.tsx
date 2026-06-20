// ============================================================
// Credit Service Page — Customer Credit Score & Report Check
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import type { Metadata } from "next";
import { Sparkles, Shield, Clock, HelpCircle, Activity } from "lucide-react";
import { CreditScoreForm } from "@/components/credit/credit-score-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check Credit Score & Credit Report | DigiConnect Dukan",
  description: "Pull your official TransUnion CIBIL and CRIF credit score instantly. Secure RBI-compliant check with downloadable PDF reports and score analytics.",
  alternates: {
    canonical: "/services/credit-score",
  },
};

const trustItems = [
  { label: "Instant Access", text: "Report ready in 30 seconds", icon: Clock },
  { label: "Secure Gateway", text: "256-bit bank-grade encryption", icon: Shield },
  { label: "Soft Enquiry", text: "Does not impact your score", icon: Activity },
];

const faqs = [
  {
    question: "Will this check impact my credit score?",
    answer: "No. This credit score query is registered as a 'soft enquiry'. Unlike hard enquiries made by banks during loan applications, soft enquiries have absolutely zero impact on your credit score.",
  },
  {
    question: "How long does it take to get the report?",
    answer: "The process is fully automated. Once payment is verified, the system fetches your credit details from the bureau and downloads the PDF report in real-time, taking less than 30 seconds.",
  },
  {
    question: "What bureaus are supported?",
    answer: "We query official partner bureau data, providing detailed credit report files and credit histories in an easy-to-read layout.",
  },
];

export default function CreditScoreServicePage() {
  return (
    <main className="min-h-screen bg-slate-950 font-sans text-slate-100 overflow-x-hidden relative">
      {/* Radiant glow spots */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-blue-600/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 relative">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          
          {/* Hero left text block */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-cyan-400">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              RBI Compliant Bureau Connection
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl leading-[1.1] text-white">
              Instant Credit Score & Detailed Report<br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Know Your Credit Health
              </span>
            </h1>
            
            <p className="max-w-xl mx-auto lg:mx-0 text-slate-400 text-sm leading-relaxed md:text-base">
              Apply for loans with confidence. Fetch your credit bureau file, check for past defaults, review active overdraft card limits, and get detailed PDF reports in seconds.
            </p>

            {/* Trust items grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/5">
              {trustItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex flex-col items-center lg:items-start gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
                    <Icon className="w-5 h-5 text-cyan-400 mb-1" />
                    <span className="text-xs font-bold text-white">{item.label}</span>
                    <span className="text-[10px] text-slate-400 text-center lg:text-left">{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Embedded form right block */}
          <div className="relative">
            <CreditScoreForm />
          </div>

        </div>

        {/* FAQ Section */}
        <section className="mt-24 max-w-4xl mx-auto border-t border-white/5 pt-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-400 mt-2">Answers to common queries regarding bureau report checks</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {faqs.map((faq, index) => (
              <div key={index} className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                  {faq.question}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
