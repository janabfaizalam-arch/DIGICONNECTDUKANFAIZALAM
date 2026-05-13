"use client";

import { CheckCircle2, MessageCircle, Phone, Printer } from "lucide-react";

import { createInsuranceQuotationWhatsappText, type InsuranceQuotation } from "@/lib/insurance-quotations";

export function InsuranceQuotationActions({ quotation }: { quotation: InsuranceQuotation }) {
  const mobile = quotation.mobile.replace(/\D/g, "").slice(-10);
  const whatsappUrl = `https://wa.me/91${mobile || "7007595931"}?text=${encodeURIComponent(createInsuranceQuotationWhatsappText(quotation))}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row print:hidden">
      <a href="tel:+917007595931" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-blue-700 px-5 text-sm font-bold text-white shadow-sm">
        <Phone className="h-4 w-4" />
        Call Now
      </a>
      <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm">
        <MessageCircle className="h-4 w-4" />
        WhatsApp Now
      </a>
      <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-bold text-white shadow-sm">
        <CheckCircle2 className="h-4 w-4" />
        Accept Quotation
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-blue-100 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm"
      >
        <Printer className="h-4 w-4" />
        Print / Download
      </button>
    </div>
  );
}
