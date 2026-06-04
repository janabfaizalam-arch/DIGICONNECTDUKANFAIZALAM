"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function QuickServiceGrid() {
  return (
    <section className="bg-white px-3 py-6 md:px-6">
      <div className="container-shell">
        <div className="rounded-[2.25rem] border border-blue-50/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.48))] p-5 shadow-[0_12px_36px_rgba(7,19,38,0.03)] backdrop-blur-md">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between px-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">
                Core Catalog
              </p>
              <h2 className="mt-1.5 text-lg font-black tracking-tight text-slate-900 md:text-xl">
                Quick Service Categories
              </h2>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-0.5 text-xs font-black text-blue-600 hover:underline"
            >
              All Services <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Quick Grid (8 columns desktop, 3 columns mobile) */}
          <div className="grid grid-cols-3 gap-y-6 gap-x-2.5 sm:grid-cols-4 md:grid-cols-8 md:gap-x-4">
            
            {/* 1. GST */}
            <Link href="/services/gst-registration-filing" className="group flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-0.5 active:scale-95">
              <div className="w-[68px] h-[68px] md:w-[76px] md:h-[76px] rounded-2xl flex items-center justify-center border border-white/60 bg-gradient-to-tr from-emerald-500/10 to-teal-500/5 shadow-[0_6px_20px_rgba(16,185,129,0.06)] group-hover:scale-108 group-hover:shadow-[0_8px_24px_rgba(16,185,129,0.14)] transition-all duration-250">
                <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
                  <rect x="16" y="12" width="32" height="40" rx="4" fill="#a7f3d0" opacity="0.8" stroke="#10b981" strokeWidth="2" />
                  <line x1="22" y1="20" x2="38" y2="20" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
                  <line x1="22" y1="28" x2="34" y2="28" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
                  <line x1="22" y1="36" x2="42" y2="36" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="38" cy="40" r="4" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-black text-slate-700 group-hover:text-emerald-700">GST</span>
            </Link>

            {/* 2. ITR */}
            <Link href="/services/itr-filing" className="group flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-0.5 active:scale-95">
              <div className="w-[68px] h-[68px] md:w-[76px] md:h-[76px] rounded-2xl flex items-center justify-center border border-white/60 bg-gradient-to-tr from-blue-500/10 to-indigo-500/5 shadow-[0_6px_20px_rgba(37,99,235,0.06)] group-hover:scale-108 group-hover:shadow-[0_8px_24px_rgba(37,99,235,0.14)] transition-all duration-250">
                <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
                  <rect x="14" y="12" width="36" height="40" rx="5" fill="#bfdbfe" opacity="0.8" stroke="#2563eb" strokeWidth="2" />
                  <line x1="22" y1="22" x2="42" y2="22" stroke="#1d4ed8" strokeWidth="2.5" />
                  <line x1="22" y1="28" x2="36" y2="28" stroke="#1d4ed8" strokeWidth="2" />
                  <path d="M22 38 L30 32 L36 35 L42 29" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-black text-slate-700 group-hover:text-blue-700">ITR</span>
            </Link>

            {/* 3. Passport */}
            <Link href="/services/passport" className="group flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-0.5 active:scale-95">
              <div className="w-[68px] h-[68px] md:w-[76px] md:h-[76px] rounded-2xl flex items-center justify-center border border-white/60 bg-gradient-to-tr from-purple-500/10 to-indigo-500/5 shadow-[0_6px_20px_rgba(139,92,246,0.06)] group-hover:scale-108 group-hover:shadow-[0_8px_24px_rgba(139,92,246,0.14)] transition-all duration-250">
                <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
                  <rect x="18" y="12" width="28" height="40" rx="3.5" fill="#ddd6fe" opacity="0.8" stroke="#7c3aed" strokeWidth="2" />
                  <circle cx="32" cy="32" r="7" stroke="#6d28d9" strokeWidth="1.5" strokeDasharray="3 1.5" />
                  <ellipse cx="32" cy="32" rx="3" ry="7" stroke="#6d28d9" strokeWidth="1" />
                  <text x="32" y="21" fill="#7c3aed" fontSize="5.5" fontWeight="bold" textAnchor="middle">PASSPORT</text>
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-black text-slate-700 group-hover:text-purple-700">Passport</span>
            </Link>

            {/* 4. Licence */}
            <Link href="/services/learning-driving-license" className="group flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-0.5 active:scale-95">
              <div className="w-[68px] h-[68px] md:w-[76px] md:h-[76px] rounded-2xl flex items-center justify-center border border-white/60 bg-gradient-to-tr from-cyan-500/10 to-teal-500/5 shadow-[0_6px_20px_rgba(6,182,212,0.06)] group-hover:scale-108 group-hover:shadow-[0_8px_24px_rgba(6,182,212,0.14)] transition-all duration-250">
                <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
                  <rect x="12" y="18" width="40" height="28" rx="3" fill="#cffafe" opacity="0.8" stroke="#0891b2" strokeWidth="2" />
                  <rect x="16" y="24" width="8" height="8" rx="1" fill="#0891b2" />
                  <line x1="28" y1="25" x2="44" y2="25" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" />
                  <line x1="28" y1="30" x2="40" y2="30" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-black text-slate-700 group-hover:text-cyan-700">Licence</span>
            </Link>

            {/* 5. Insurance */}
            <Link href="/services/insurance" className="group flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-0.5 active:scale-95">
              <div className="w-[68px] h-[68px] md:w-[76px] md:h-[76px] rounded-2xl flex items-center justify-center border border-white/60 bg-gradient-to-tr from-sky-500/10 to-blue-500/5 shadow-[0_6px_20px_rgba(14,165,233,0.06)] group-hover:scale-108 group-hover:shadow-[0_8px_24px_rgba(14,165,233,0.14)] transition-all duration-250">
                <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
                  <path d="M32 11C32 11 46 14 46 25C46 37 32 49 32 49C32 49 18 37 18 25C18 14 32 11 32 11Z" fill="#e0f2fe" opacity="0.8" stroke="#0284c7" strokeWidth="2" />
                  <path d="M26 29L30 33L38 23" stroke="#0284c7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-black text-slate-700 group-hover:text-sky-700">Insurance</span>
            </Link>

            {/* 6. CIBIL */}
            <Link href="/services/cibil-report-analysis-and-credit-health-consultation" className="group flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-0.5 active:scale-95">
              <div className="w-[68px] h-[68px] md:w-[76px] md:h-[76px] rounded-2xl flex items-center justify-center border border-white/60 bg-gradient-to-tr from-orange-500/10 to-amber-500/5 shadow-[0_6px_20px_rgba(249,115,22,0.06)] group-hover:scale-108 group-hover:shadow-[0_8px_24px_rgba(249,115,22,0.14)] transition-all duration-250">
                <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="20" fill="#ffedd5" opacity="0.8" stroke="#ea580c" strokeWidth="2" />
                  <text x="32" y="38" fill="#d97706" fontSize="18" fontWeight="bold" textAnchor="middle">₹</text>
                  <path d="M22 28 L28 22 L34 25 L42 18" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-black text-slate-700 group-hover:text-orange-700">CIBIL</span>
            </Link>

            {/* 7. PVC Card */}
            <Link href="/services/pvc-card" className="group flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-0.5 active:scale-95">
              <div className="w-[68px] h-[68px] md:w-[76px] md:h-[76px] rounded-2xl flex items-center justify-center border border-white/60 bg-gradient-to-tr from-cyan-500/10 to-indigo-500/5 shadow-[0_6px_20px_rgba(6,182,212,0.06)] group-hover:scale-108 group-hover:shadow-[0_8px_24px_rgba(6,182,212,0.14)] transition-all duration-250">
                <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
                  <rect x="14" y="16" width="36" height="30" rx="3" fill="#ecfeff" opacity="0.8" stroke="#0ea5e9" strokeWidth="2" />
                  <circle cx="23" cy="27" r="4.5" fill="#0284c7" />
                  <line x1="31" y1="25" x2="43" y2="25" stroke="#0ea5e9" strokeWidth="2" />
                  <line x1="31" y1="30" x2="40" y2="30" stroke="#0ea5e9" strokeWidth="1.5" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-black text-slate-700 group-hover:text-cyan-700">PVC Card</span>
            </Link>

            {/* 8. All Services */}
            <Link href="/services" className="group flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-0.5 active:scale-95">
              <div className="w-[68px] h-[68px] md:w-[76px] md:h-[76px] rounded-2xl flex items-center justify-center border border-white/60 bg-gradient-to-tr from-rose-500/10 to-pink-500/5 shadow-[0_6px_20px_rgba(244,63,94,0.06)] group-hover:scale-108 group-hover:shadow-[0_8px_24px_rgba(244,63,94,0.14)] transition-all duration-250">
                <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
                  <circle cx="22" cy="22" r="5" fill="#fecdd3" stroke="#e11d48" strokeWidth="2" />
                  <circle cx="32" cy="22" r="5" fill="#fecdd3" stroke="#e11d48" strokeWidth="2" />
                  <circle cx="42" cy="22" r="5" fill="#fecdd3" stroke="#e11d48" strokeWidth="2" />
                  <circle cx="22" cy="32" r="5" fill="#fecdd3" stroke="#e11d48" strokeWidth="2" />
                  <circle cx="32" cy="32" r="5" fill="#fecdd3" stroke="#e11d48" strokeWidth="2" />
                  <circle cx="42" cy="32" r="5" fill="#fecdd3" stroke="#e11d48" strokeWidth="2" />
                  <circle cx="22" cy="42" r="5" fill="#fecdd3" stroke="#e11d48" strokeWidth="2" />
                  <circle cx="32" cy="42" r="5" fill="#fecdd3" stroke="#e11d48" strokeWidth="2" />
                  <circle cx="42" cy="42" r="5" fill="#fecdd3" stroke="#e11d48" strokeWidth="2" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-black text-slate-700 group-hover:text-rose-700">All Services</span>
            </Link>

          </div>
        </div>
      </div>
    </section>
  );
}
