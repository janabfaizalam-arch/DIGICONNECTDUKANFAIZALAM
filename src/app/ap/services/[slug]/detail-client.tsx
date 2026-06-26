"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, FileText, CheckCircle, Clock, Info, ShieldAlert, BadgeHelp, HelpCircle, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/portal-data";
import type { AgentService } from "@/lib/agent-services";
import { cn } from "@/lib/utils";

interface ServiceDetailClientProps {
  service: AgentService;
}

export function ServiceDetailClient({ service }: ServiceDetailClientProps) {
  const [showScore, setShowScore] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    documents: true,
    processing: true,
    fees: true,
    description: true,
    eligibility: true,
    notes: true,
    faq: false,
  });

  useEffect(() => {
    try {
      const storedShowScore = localStorage.getItem("digipartner_show_score");
      if (storedShowScore !== null) {
        setShowScore(storedShowScore === "true");
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const payoutAmount = service.payout_type === "percentage"
    ? Math.round((service.customer_fee * service.payout_percentage) / 100)
    : service.agent_payout;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/ap/services" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-650 hover:text-slate-900 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Catalog
      </Link>

      {/* Hero Banner */}
      <div className="rounded-2xl border border-slate-200/50 bg-white p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="space-y-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
            {service.category || "Gov ID & Forms"}
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {service.title}
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-2xl font-medium">
            {service.description || "Guides customers through eligibility check and documentation collection."}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold uppercase text-slate-400">Customer Price</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {formatCurrency(service.customer_fee)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold uppercase text-emerald-600">Partner Score</p>
              <p className="mt-1 text-lg font-black text-emerald-600">
                {showScore ? payoutAmount : "••••"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold uppercase text-indigo-650">Processing Time</p>
              <p className="mt-1 text-lg font-extrabold text-indigo-600 truncate">
                {service.processing_time || "48 Hours"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <p className="text-[10px] font-bold uppercase text-orange-605">Featured</p>
              <p className="mt-1 text-lg font-extrabold text-orange-600">
                {service.is_featured ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Service variants if any */}
      {service.variants && service.variants.length > 0 && (
        <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-blue-500" />
            Available Service Variants
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {service.variants.map((v) => (
              <div key={v.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{v.name}</h3>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs bg-white rounded-lg p-2.5 border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-400 text-[9px] uppercase">Price</p>
                      <p className="font-black text-slate-800 text-[13px]">{formatCurrency(v.price)}</p>
                    </div>
                    <div>
                      <p className="font-bold text-emerald-650 text-[9px] uppercase">Score</p>
                      <p className="font-black text-emerald-650 text-[13px]">{showScore ? v.score : "••••"}</p>
                    </div>
                    <div>
                      <p className="font-bold text-indigo-605 text-[9px] uppercase">TAT</p>
                      <p className="font-extrabold text-indigo-650 text-[13px] truncate">{v.processing_time}</p>
                    </div>
                  </div>
                  {v.restrictions && v.restrictions.type !== "india" && (
                    <div className="mt-2 text-[10px] font-bold text-amber-700 bg-amber-50 rounded border border-amber-200 px-2 py-1 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Area Restricted: {v.restrictions.districts && v.restrictions.districts.length > 0 ? `District ${v.restrictions.districts.join(", ")}` : "Selected Areas"} (PIN: {v.restrictions.pincodes?.join(", ")})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Details Sections */}
      <div className="space-y-4">
        {/* Section 1: Required Documents */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <button
            onClick={() => toggleSection("documents")}
            className="w-full px-6 py-4 flex items-center justify-between font-bold text-slate-905 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-450" />
              Required Documents
            </span>
            {openSections.documents ? <ChevronUp className="h-5 w-5 text-slate-450" /> : <ChevronDown className="h-5 w-5 text-slate-450" />}
          </button>
          {openSections.documents && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50">
              {service.required_documents_list && service.required_documents_list.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 pt-2">
                  {service.required_documents_list.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2.5 rounded-xl bg-white border border-slate-200/60 p-3 text-xs font-semibold text-slate-800">
                      <CheckCircle className={cn("h-4 w-4 shrink-0", doc.required ? "text-emerald-500" : "text-slate-300")} />
                      <span className="min-w-0 flex-1 truncate">{doc.name}</span>
                      <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                        {doc.type}
                      </span>
                      {doc.required && (
                        <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          Required
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : service.required_documents ? (
                <p className="text-xs font-semibold leading-relaxed text-slate-700 whitespace-pre-line pt-2">{service.required_documents}</p>
              ) : (
                <p className="text-xs font-semibold text-slate-450 italic pt-2">No document requirements loaded for this service.</p>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Processing Time */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <button
            onClick={() => toggleSection("processing")}
            className="w-full px-6 py-4 flex items-center justify-between font-bold text-slate-905 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-450" />
              Processing Time
            </span>
            {openSections.processing ? <ChevronUp className="h-5 w-5 text-slate-450" /> : <ChevronDown className="h-5 w-5 text-slate-450" />}
          </button>
          {openSections.processing && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50">
              <div className="text-xs font-semibold leading-relaxed text-slate-700 space-y-2 pt-2">
                <p>Standard processing duration: <strong className="text-indigo-600">{service.processing_time || "48 Hours"}</strong></p>
                {service.instructions && (
                  <div className="bg-white border border-slate-100 rounded-xl p-3.5 mt-2">
                    <p className="font-bold text-slate-800 mb-1">Process Guidelines:</p>
                    <p className="whitespace-pre-line font-medium text-slate-600">{service.instructions}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Government Fee */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <button
            onClick={() => toggleSection("fees")}
            className="w-full px-6 py-4 flex items-center justify-between font-bold text-slate-905 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Info className="h-5 w-5 text-slate-450" />
              Government Fee
            </span>
            {openSections.fees ? <ChevronUp className="h-5 w-5 text-slate-450" /> : <ChevronDown className="h-5 w-5 text-slate-450" />}
          </button>
          {openSections.fees && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50">
              <div className="grid gap-3 sm:grid-cols-3 text-xs font-semibold text-slate-700 pt-2">
                <div className="bg-white border border-slate-200/60 rounded-xl p-3">
                  <p className="text-slate-400 font-bold text-[9px] uppercase">Gov Fee Status</p>
                  <p className="text-xs font-black text-slate-800 capitalize mt-1">
                    {service.government_fee_type === "not_applicable"
                      ? "Not Applicable"
                      : service.government_fee_type === "included"
                      ? "Included in Price"
                      : "Extra / Paid Separately"}
                  </p>
                </div>
                {service.government_fee_type !== "not_applicable" && (
                  <div className="bg-white border border-slate-200/60 rounded-xl p-3">
                    <p className="text-slate-400 font-bold text-[9px] uppercase">Government Fee Amount</p>
                    <p className="text-xs font-black text-slate-800 mt-1">{formatCurrency(service.government_fee_amount)}</p>
                  </div>
                )}
                <div className="bg-white border border-slate-200/60 rounded-xl p-3">
                  <p className="text-slate-400 font-bold text-[9px] uppercase">Processing Fee</p>
                  <p className="text-xs font-black text-slate-800 mt-1">{formatCurrency(service.processing_fee)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Eligibility */}
        {service.eligibility && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection("eligibility")}
              className="w-full px-6 py-4 flex items-center justify-between font-bold text-slate-905 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-slate-450" />
                Eligibility
              </span>
              {openSections.eligibility ? <ChevronUp className="h-5 w-5 text-slate-450" /> : <ChevronDown className="h-5 w-5 text-slate-450" />}
            </button>
            {openSections.eligibility && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs font-semibold leading-relaxed text-slate-700 whitespace-pre-line pt-2">{service.eligibility}</p>
              </div>
            )}
          </div>
        )}

        {/* Section 5: Important Notes & Terms */}
        {(service.important_notes || service.terms) && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection("notes")}
              className="w-full px-6 py-4 flex items-center justify-between font-bold text-slate-905 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-slate-450" />
                Important Notes
              </span>
              {openSections.notes ? <ChevronUp className="h-5 w-5 text-slate-450" /> : <ChevronDown className="h-5 w-5 text-slate-450" />}
            </button>
            {openSections.notes && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs font-semibold leading-relaxed text-slate-700 pt-2">
                {service.important_notes && (
                  <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3.5">
                    <p className="font-bold text-amber-800 flex items-center gap-1.5 mb-1.5">
                      <Info className="h-4 w-4" /> Important Notes
                    </p>
                    <p className="text-amber-900 font-semibold whitespace-pre-line">{service.important_notes}</p>
                  </div>
                )}
                {service.terms && (
                  <div>
                    <p className="font-bold text-slate-800 mb-1.5">Terms and Conditions:</p>
                    <p className="whitespace-pre-line font-medium text-slate-600">{service.terms}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* FAQs Section */}
        {service.faq && service.faq.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection("faq")}
              className="w-full px-6 py-4 flex items-center justify-between font-bold text-slate-905 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-slate-450" />
                Frequently Asked Questions (FAQs)
              </span>
              {openSections.faq ? <ChevronUp className="h-5 w-5 text-slate-450" /> : <ChevronDown className="h-5 w-5 text-slate-450" />}
            </button>
            {openSections.faq && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3 pt-2">
                {service.faq.map((f, i) => (
                  <div key={i} className="bg-white border border-slate-200/60 rounded-xl p-3 text-xs">
                    <p className="font-bold text-slate-900 mb-1 flex items-start gap-1">
                      <BadgeHelp className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>{f.question}</span>
                    </p>
                    <p className="font-semibold text-slate-550 pl-5 leading-normal">{f.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Action bar */}
      <div className="rounded-2xl border border-slate-200/50 bg-white p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400">Ready to proceed?</p>
          <p className="text-sm font-black text-[#0F172A] mt-0.5">Submit customer application instantly.</p>
        </div>
        <Link
          href={`/ap/applications/new?serviceId=${service.id}`}
          className="inline-flex h-11 items-center justify-center gap-2 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all duration-150 shadow-md shadow-blue-500/10 hover:scale-[1.01]"
        >
          <span>Apply Now</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
