"use client";

import React from "react";
import { Phone, MessageCircle, Mail, MapPin, ShieldCheck, Clock, Landmark, HelpCircle } from "lucide-react";
import { contactDetails } from "@/lib/constants";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export function SupportCenter() {
  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({ page: "contact", topic: "General customer support enquiry" })
  );

  return (
    <section id="support" className="relative py-16 md:py-24 px-4 overflow-hidden bg-slate-50/50 noise-bg border-t border-slate-100">
      {/* Background Ambient Glows */}
      <div className="ambient-glow ambient-blue w-[350px] h-[350px] -top-20 -left-20" />
      <div className="ambient-glow ambient-purple w-[400px] h-[400px] -bottom-20 -right-20" />

      <div className="container-shell relative z-10">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100/50 uppercase tracking-wider">
            <HelpCircle className="h-3.5 w-3.5" /> Support Desk 4.0
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Need Expert Assistance? <br className="hidden sm:inline" />
            We&apos;re Here to Help
          </h2>
          <p className="mt-3 text-xs md:text-sm font-semibold text-slate-500 max-w-xl mx-auto leading-relaxed">
            Get instant support for digital applications, GST filings, document corrections, and wallet-related issues from our certified compliance officers.
          </p>
        </div>

        {/* 2-Column Premium Grid */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-stretch">
          
          {/* Left Column: Premium Contact Channels Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            
            {/* WhatsApp Card */}
            <div className="glass-liquid-premium rounded-3xl p-6 flex flex-col justify-between group transition-all duration-300">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/60">
                    <MessageCircle className="h-6 w-6 stroke-[2]" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-800">WhatsApp Support</h3>
                <p className="mt-2 text-xs font-semibold text-slate-500 leading-relaxed">
                  Fastest way to submit screenshots, documents, or check active status. Directly handled by verification operators.
                </p>
              </div>
              <div className="mt-6">
                <p className="text-[11px] font-bold text-slate-400 mb-2">Typically replies in under 5 mins</p>
                <a
                  id="btn-support-whatsapp"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition active:scale-[0.98] shadow-sm"
                >
                  <MessageCircle className="h-4 w-4" /> Start WhatsApp Chat
                </a>
              </div>
            </div>

            {/* Direct Calling Support Card */}
            <div className="glass-liquid-premium rounded-3xl p-6 flex flex-col justify-between group transition-all duration-300">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60">
                  <Phone className="h-6 w-6 stroke-[2]" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-800">Direct Call Helpline</h3>
                <p className="mt-2 text-xs font-semibold text-slate-500 leading-relaxed">
                  Call our official front desk lines. Speak to a live customer officer for immediate assistance.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <div className="text-xs font-bold text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary:</span>
                    <a href={`tel:+91${contactDetails.primaryPhone}`} className="hover:text-blue-600 transition" id="link-support-primary-phone">+91 {contactDetails.primaryPhone}</a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Office Support:</span>
                    <a href={`tel:+91${contactDetails.officeSupportPhone}`} className="hover:text-blue-600 transition" id="link-support-office-phone">+91 {contactDetails.officeSupportPhone}</a>
                  </div>
                </div>
                <a
                  id="btn-support-call"
                  href={`tel:+91${contactDetails.primaryPhone}`}
                  className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition active:scale-[0.98] shadow-sm"
                >
                  <Phone className="h-4 w-4" /> Call Helpline
                </a>
              </div>
            </div>

            {/* Finance & CIBIL score expert */}
            <div className="glass-liquid-premium rounded-3xl p-6 flex flex-col justify-between group transition-all duration-300">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100/60">
                  <Landmark className="h-6 w-6 stroke-[2]" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-800">CIBIL & Credit Expert</h3>
                <p className="mt-2 text-xs font-semibold text-slate-500 leading-relaxed">
                  Consult with credit advisors. Clear doubts regarding dispute filings, credit applications, and report rectification.
                </p>
              </div>
              <div className="mt-6">
                <p className="text-[11px] font-bold text-slate-400 mb-2">Direct Line: +91 {contactDetails.cibilExpertPhone}</p>
                <a
                  id="btn-support-cibil"
                  href={`tel:+91${contactDetails.cibilExpertPhone}`}
                  className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white transition active:scale-[0.98] shadow-sm"
                >
                  <Phone className="h-4 w-4" /> Call Credit Advisor
                </a>
              </div>
            </div>

            {/* Secure Email & Portal Helpdesk */}
            <div className="glass-liquid-premium rounded-3xl p-6 flex flex-col justify-between group transition-all duration-300">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/60">
                  <Mail className="h-6 w-6 stroke-[2]" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-800">Email Support Desk</h3>
                <p className="mt-2 text-xs font-semibold text-slate-500 leading-relaxed">
                  For corporate contracts, bulk application support, or official escalations.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <div className="text-xs font-bold text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <a href={`mailto:${contactDetails.email}`} className="hover:text-indigo-600 transition text-slate-800 font-extrabold truncate" id="link-support-email">{contactDetails.email}</a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Response time:</span>
                    <span className="text-indigo-600">Under 2 hours</span>
                  </div>
                </div>
                <a
                  id="btn-support-email-now"
                  href={`mailto:${contactDetails.email}`}
                  className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition active:scale-[0.98] shadow-sm"
                >
                  <Mail className="h-4 w-4" /> Write an Email
                </a>
              </div>
            </div>

          </div>

          {/* Right Column: Google Maps & Office Address Block */}
          <div className="glass-liquid-premium rounded-[2rem] p-6 flex flex-col justify-between overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <MapPin className="h-5 w-5 stroke-[2.5]" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Registered Office Location</span>
              </div>
              
              <div>
                <h3 className="text-lg font-black text-slate-800">RNOS India Private Limited</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">
                  Headquartered in Lucknow, Uttar Pradesh, India. Serving clients nationwide through digital, secure online channels.
                </p>
              </div>
            </div>

            {/* Bottom compliance details */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                100% Secure SSL Data Handling
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                Mon-Sat: 10AM - 6PM
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
