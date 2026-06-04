"use client";

import React from "react";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { contactDetails } from "@/lib/constants";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export function SupportCenter() {
  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({ page: "contact", topic: "Website support center enquiry" })
  );

  return (
    <section id="support" className="bg-slate-50/20 py-12 px-3">
      <div className="container-shell">
        <div className="glass-panel overflow-hidden rounded-[2.25rem] border border-slate-100 p-6 shadow-soft md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            
            {/* Left Header info */}
            <div className="text-left space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-blue-700 shadow-sm">
                Support Desk
              </span>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl leading-tight">
                Need Help? Our Specialists Are Ready
              </h2>
              <p className="text-sm font-semibold text-slate-500 max-w-lg leading-relaxed">
                Form submissons, document checklist updates ya payment verification issues ke liye direct call ya WhatsApp karein.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a 
                  href={`tel:+91${contactDetails.primaryPhone}`} 
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-xs font-black text-white hover:bg-blue-700 transition active:scale-[0.98] shadow-sm"
                >
                  <Phone className="h-4 w-4" />
                  Call Primary Contact
                </a>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex h-11 items-center justify-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-6 text-xs font-black text-white hover:bg-emerald-600 transition active:scale-[0.98] shadow-md shadow-emerald-500/10"
                >
                  <MessageCircle className="h-4.5 w-4.5" />
                  WhatsApp General Help
                </a>
              </div>
            </div>

            {/* Right Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              
              {/* Primary Contact */}
              <div className="rounded-2xl border border-slate-150 bg-white/70 p-4 shadow-sm hover:border-blue-300 transition duration-300 flex flex-col justify-between text-left">
                <div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-450 uppercase mt-3.5 tracking-wider">Primary Contact</h4>
                  <p className="text-base font-black text-slate-800 mt-1">+91 {contactDetails.primaryPhone}</p>
                </div>
                <a 
                  href={`tel:+91${contactDetails.primaryPhone}`} 
                  className="mt-4 text-[10px] font-extrabold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  Call Now →
                </a>
              </div>

              {/* Office Support */}
              <div className="rounded-2xl border border-slate-150 bg-white/70 p-4 shadow-sm hover:border-blue-300 transition duration-300 flex flex-col justify-between text-left">
                <div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-450 uppercase mt-3.5 tracking-wider">Office Support</h4>
                  <p className="text-base font-black text-slate-800 mt-1">+91 {contactDetails.officeSupportPhone}</p>
                </div>
                <a 
                  href={`tel:+91${contactDetails.officeSupportPhone}`} 
                  className="mt-4 text-[10px] font-extrabold text-orange-600 hover:underline inline-flex items-center gap-0.5"
                >
                  Call Office →
                </a>
              </div>

              {/* CIBIL Expert */}
              <div className="rounded-2xl border border-slate-150 bg-white/70 p-4 shadow-sm hover:border-blue-300 transition duration-300 flex flex-col justify-between text-left">
                <div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-450 uppercase mt-3.5 tracking-wider">CIBIL & Finance</h4>
                  <p className="text-base font-black text-slate-800 mt-1">+91 {contactDetails.cibilExpertPhone}</p>
                </div>
                <a 
                  href={`tel:+91${contactDetails.cibilExpertPhone}`} 
                  className="mt-4 text-[10px] font-extrabold text-amber-600 hover:underline inline-flex items-center gap-0.5"
                >
                  Call Advisor →
                </a>
              </div>

              {/* Email Support */}
              <div className="rounded-2xl border border-slate-150 bg-white/70 p-4 shadow-sm hover:border-blue-300 transition duration-300 flex flex-col justify-between text-left">
                <div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-650">
                    <Mail className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-450 uppercase mt-3.5 tracking-wider">Online Desk</h4>
                  <p className="text-sm font-black text-slate-800 mt-1 truncate">{contactDetails.email}</p>
                </div>
                <a 
                  href={`mailto:${contactDetails.email}`} 
                  className="mt-4 text-[10px] font-extrabold text-teal-650 hover:underline inline-flex items-center gap-0.5"
                >
                  Write Email →
                </a>
              </div>

            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
