"use client";

import React, { useState } from "react";
import { Phone, MessageCircle, PhoneCall, HelpCircle, ShieldCheck, Clock, Landmark } from "lucide-react";
import { contactDetails } from "@/lib/constants";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

type SupportTab = "whatsapp" | "call" | "callback" | "cibil";

export function SupportCenter() {
  const [activeTab, setActiveTab] = useState<SupportTab>("whatsapp");

  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({ page: "contact", topic: "General customer support enquiry" })
  );

  const callbackWhatsappUrl = `https://wa.me/917007595931?text=${encodeURIComponent(
    "Hi DigiConnect Dukan, I would like to request a callback regarding my application / document query."
  )}`;

  const tabs = [
    { id: "whatsapp", label: "WhatsApp Support", icon: MessageCircle },
    { id: "call", label: "Call Support", icon: Phone },
    { id: "callback", label: "Request Callback", icon: PhoneCall },
    { id: "cibil", label: "Finance/CIBIL Expert", icon: Landmark }
  ] as const;

  return (
    <section id="support" className="bg-white py-10 md:py-12 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 flex items-center justify-center gap-1">
            <HelpCircle className="h-3.5 w-3.5" /> Support Hub
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:text-2xl leading-none">
            Need Help? We&apos;re Ready
          </h2>
          <p className="mt-2 text-xs font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
            Fast support for applications, documents, payment and status queries.
          </p>
        </div>

        {/* Tabbed Support Center Bento Card */}
        <div className="max-w-2xl mx-auto rounded-3xl border border-slate-100 bg-slate-50/50 p-5 md:p-6 shadow-sm">
          
          {/* Chips Selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-4 border-b border-slate-100 no-scrollbar justify-start sm:justify-center">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-9 px-4 shrink-0 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    active
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-white border-slate-200/50 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel Content */}
          <div className="pt-6 text-center">
            {activeTab === "whatsapp" && (
              <div className="space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/30">
                  <MessageCircle className="h-6 w-6 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800">WhatsApp Chat Assistance</h3>
                  <p className="text-[11px] font-semibold text-slate-400 max-w-sm mx-auto leading-normal">
                    Chat directly with our verification operators. Submit documents or share receipt screenshots.
                  </p>
                </div>
                <p className="text-sm font-black text-slate-700 mt-1">+91 {contactDetails.primaryPhone}</p>
                <div className="pt-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 w-full sm:w-auto sm:px-8 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700 transition active:scale-[0.97] shadow-sm"
                  >
                    <MessageCircle className="h-4.5 w-4.5" /> Start Chat Now
                  </a>
                </div>
              </div>
            )}

            {activeTab === "call" && (
              <div className="space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/30">
                  <Phone className="h-6 w-6 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800">Direct Calling Support</h3>
                  <p className="text-[11px] font-semibold text-slate-400 max-w-sm mx-auto leading-normal">
                    Speak directly with our front desk officers for instant answers. Available 10:00 AM - 6:00 PM.
                  </p>
                </div>
                <p className="text-sm font-black text-slate-700 mt-1">+91 {contactDetails.primaryPhone}</p>
                <div className="pt-2">
                  <a
                    href={`tel:+91${contactDetails.primaryPhone}`}
                    className="inline-flex h-11 w-full sm:w-auto sm:px-8 items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-black text-white hover:bg-blue-700 transition active:scale-[0.97] shadow-sm"
                  >
                    <Phone className="h-4.5 w-4.5" /> Place Call
                  </a>
                </div>
              </div>
            )}

            {activeTab === "callback" && (
              <div className="space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-100/30">
                  <PhoneCall className="h-6 w-6 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800">Request Callback</h3>
                  <p className="text-[11px] font-semibold text-slate-400 max-w-sm mx-auto leading-normal">
                    Submit your number and query on WhatsApp. Our back office agent will call you back shortly.
                  </p>
                </div>
                <p className="text-sm font-black text-slate-700 mt-1">+91 {contactDetails.primaryPhone}</p>
                <div className="pt-2">
                  <a
                    href={callbackWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 w-full sm:w-auto sm:px-8 items-center justify-center gap-2 rounded-xl bg-orange-500 text-xs font-black text-white hover:bg-orange-600 transition active:scale-[0.97] shadow-sm"
                  >
                    <PhoneCall className="h-4.5 w-4.5" /> Request a Callback
                  </a>
                </div>
              </div>
            )}

            {activeTab === "cibil" && (
              <div className="space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100/30">
                  <Landmark className="h-6 w-6 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800">Finance & CIBIL score expert</h3>
                  <p className="text-[11px] font-semibold text-slate-400 max-w-sm mx-auto leading-normal">
                    Get consulting from our credit score specialists. Understand dispute filings and credit health reports.
                  </p>
                </div>
                <p className="text-sm font-black text-slate-700 mt-1">+91 {contactDetails.cibilExpertPhone}</p>
                <div className="pt-2">
                  <a
                    href={`tel:+91${contactDetails.cibilExpertPhone}`}
                    className="inline-flex h-11 w-full sm:w-auto sm:px-8 items-center justify-center gap-2 rounded-xl bg-amber-600 text-xs font-black text-white hover:bg-amber-700 transition active:scale-[0.97] shadow-sm"
                  >
                    <Phone className="h-4.5 w-4.5" /> Call CIBIL Expert
                  </a>
                </div>
              </div>
            )}

            {/* Bottom Trust Line */}
            <div className="mt-6 border-t border-slate-100/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-500" /> Mon - Sat, 10:00 AM - 6:00 PM
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secure encrypted data handling
              </span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
