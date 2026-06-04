"use client";

import React from "react";
import { MessageCircle, Phone, TrendingUp, Check, ShieldCheck } from "lucide-react";
import { buildWhatsAppUrl, buildServiceWhatsAppMessage } from "@/lib/whatsapp";

export function CibilFinanceCenter() {
  const whatsappUrl = buildWhatsAppUrl(
    buildServiceWhatsAppMessage({
      serviceName: "CIBIL Report Analysis & Credit Health Consultation",
      category: "Finance & Banking",
      action: "support",
      page: "/services/cibil-report-analysis-and-credit-health-consultation"
    }),
    "918287002983"
  );

  return (
    <section className="bg-white py-10 px-3">
      <div className="container-shell">
        <div className="glass-panel overflow-hidden rounded-[2.25rem] border border-orange-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,247,237,0.4))] p-6 shadow-soft md:p-10 relative">
          
          {/* Subtle backgrounds */}
          <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-80 h-80 rounded-full bg-orange-300/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-80 h-80 rounded-full bg-blue-300/10 blur-[100px] pointer-events-none" />

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center relative z-10">
            
            {/* Left Content Column */}
            <div className="space-y-5 text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-100 px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-orange-600 shadow-sm">
                <TrendingUp className="h-3.5 w-3.5" />
                Credit Health Desk
              </span>
              
              <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl leading-tight">
                CIBIL & Finance Advisory Center
              </h2>
              
              <p className="text-sm font-semibold text-slate-500 max-w-xl">
                Credit score low hai ya multiple card rejections ho rahe hain? Connect with our dedicated bureau experts to fix negative remarks, check loan eligibility, and clean your credit history.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 pt-2 text-xs font-bold text-slate-700">
                {[
                  "Complete CIBIL Report Analysis",
                  "Credit Repair & Score Building",
                  "Mudra & PMEGP Loan Consultation",
                  "Credit Card Approval Guidance",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Expert Profile Column */}
            <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm flex flex-col justify-between text-left">
              <div className="flex items-start gap-4">
                {/* 3D-like circular avatar badge */}
                <div className="relative shrink-0 w-14 h-14 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 border-2 border-white shadow-md flex items-center justify-center text-white font-black text-lg">
                  CF
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">CIBIL & Finance Expert</h3>
                  <p className="text-xs font-bold text-slate-450 uppercase mt-0.5">Certified Credit Analyst</p>
                  <p className="mt-2 text-xs font-bold text-slate-500 leading-normal">
                    Helped 5,000+ businesses secure capital and improve bureau standings.
                  </p>
                </div>
              </div>

              {/* Quick Actions Group */}
              <div className="mt-6 space-y-3">
                <a
                  href="tel:+918287002983"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 text-xs font-black text-white hover:bg-slate-900 transition active:scale-[0.98] shadow-sm"
                >
                  <Phone className="h-4 w-4 text-orange-400" />
                  Call Expert: +91 8287002983
                </a>
                
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-emerald-100 bg-emerald-500 text-xs font-black text-white hover:bg-emerald-600 transition active:scale-[0.98] shadow-md shadow-emerald-500/10"
                >
                  <MessageCircle className="h-4.5 w-4.5" />
                  Connect on WhatsApp
                </a>
              </div>

              {/* Secure tag */}
              <div className="mt-4 flex items-center gap-1.5 justify-center text-[10px] font-bold text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                100% Encrypted & Safe Document Reviews
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
