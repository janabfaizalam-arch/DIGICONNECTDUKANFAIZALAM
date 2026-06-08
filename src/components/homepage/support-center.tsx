"use client";

import React from "react";
import { Phone, MessageCircle, PhoneCall } from "lucide-react";
import { contactDetails } from "@/lib/constants";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const contacts = [
  {
    label: "Primary Support",
    phone: contactDetails.primaryPhone,
    color: "bg-blue-50 text-blue-600 border-blue-100",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
  },
  {
    label: "Office Support",
    phone: contactDetails.officeSupportPhone,
    color: "bg-orange-50 text-orange-600 border-orange-100",
    buttonColor: "bg-orange-500 hover:bg-orange-600",
  },
  {
    label: "CIBIL & Finance Expert",
    phone: contactDetails.cibilExpertPhone,
    color: "bg-amber-50 text-amber-600 border-amber-100",
    buttonColor: "bg-amber-600 hover:bg-amber-700",
  },
];

export function SupportCenter() {
  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({ page: "contact", topic: "Website support centre enquiry" })
  );

  return (
    <section id="support" className="bg-white py-10 md:py-14 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 flex items-center justify-center gap-1.5">
            <PhoneCall className="h-3.5 w-3.5" />
            Support
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Need Help? We&apos;re Ready
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Direct call or WhatsApp for form submissions, document queries, or payment support.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid gap-3 sm:grid-cols-3 max-w-3xl mx-auto">
          {contacts.map((contact) => (
            <div
              key={contact.label}
              className="rounded-2xl border border-slate-100 bg-white p-5 text-center transition hover:shadow-md hover:-translate-y-0.5"
            >
              <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl ${contact.color}`}>
                <Phone className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {contact.label}
              </p>
              <p className="mt-1.5 text-base font-black text-slate-800">
                +91 {contact.phone}
              </p>
              <a
                href={`tel:+91${contact.phone}`}
                className={`mt-4 flex h-9 items-center justify-center gap-1.5 rounded-xl ${contact.buttonColor} text-xs font-bold text-white transition active:scale-[0.98]`}
              >
                <Phone className="h-3.5 w-3.5" />
                Call Now
              </a>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            <MessageCircle className="h-4.5 w-4.5" />
            WhatsApp Support
          </a>
          <a
            href={`tel:+91${contactDetails.primaryPhone}`}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <PhoneCall className="h-4.5 w-4.5 text-blue-600" />
            Request Callback
          </a>
        </div>
      </div>
    </section>
  );
}
