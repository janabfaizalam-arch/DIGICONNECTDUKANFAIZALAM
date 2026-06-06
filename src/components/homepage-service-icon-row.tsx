"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HomepageServiceIconRow() {
  return (
    <section id="popular-services" className="bg-white px-3 py-4 md:px-6 md:py-6">
      {/* Scoped CSS for organic wave floating animation */}
      <style jsx global>{`
        @keyframes float-soft-icon {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        .animate-float-icon-1 { animation: float-soft-icon 3.6s ease-in-out infinite; }
        .animate-float-icon-2 { animation: float-soft-icon 3.6s ease-in-out infinite 0.4s; }
        .animate-float-icon-3 { animation: float-soft-icon 3.6s ease-in-out infinite 0.8s; }
        .animate-float-icon-4 { animation: float-soft-icon 3.6s ease-in-out infinite 1.2s; }
        .animate-float-icon-5 { animation: float-soft-icon 3.6s ease-in-out infinite 1.6s; }
        .animate-float-icon-6 { animation: float-soft-icon 3.6s ease-in-out infinite 2.0s; }
        .animate-float-icon-7 { animation: float-soft-icon 3.6s ease-in-out infinite 2.4s; }
        .animate-float-icon-8 { animation: float-soft-icon 3.6s ease-in-out infinite 2.8s; }
        .animate-float-icon-9 { animation: float-soft-icon 3.6s ease-in-out infinite 3.2s; }
      `}</style>

      <div className="container-shell">
        <div className="liquid-card rounded-[24px] border border-blue-50/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.75),rgba(255,255,255,0.45))] p-4 shadow-[0_8px_32px_rgba(7,19,38,0.04)] backdrop-blur-md">
          {/* Section Header */}
          <div className="mb-4 flex items-center justify-between px-1">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#FF8A00]">
                Quick Links
              </p>
              <h2 className="mt-0.5 text-base font-black tracking-tight text-[#071326] md:text-lg">
                Popular Services
              </h2>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-0.5 text-xs font-bold text-[#2563EB] hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* 3 Rows x 3 Columns Mobile Grid / 9 Columns Desktop Grid */}
          <div className="grid grid-cols-3 gap-y-5 gap-x-2 md:grid-cols-9 md:gap-x-4 md:py-2">
            
            {/* 1. GST (3D Government Document) */}
            <Link href="/services/gst-registration" className="group flex flex-col items-center text-center transition-all duration-200 active:scale-90 animate-float-icon-1">
              <div className="w-[72px] h-[72px] md:w-20 md:h-20 rounded-full flex items-center justify-center border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.3))] shadow-[0_4px_16px_rgba(7,19,38,0.04)] backdrop-blur-sm group-hover:scale-105 group-hover:shadow-[0_6px_22px_rgba(37,99,235,0.12)] transition duration-300">
                <svg width="44" height="44" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_3px_6px_rgba(5,150,105,0.15)]">
                  <defs>
                    <linearGradient id="gstDocGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ecfdf5" />
                      <stop offset="100%" stopColor="#a7f3d0" />
                    </linearGradient>
                    <linearGradient id="gstGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                  </defs>
                  {/* Document Sheet Shadow Depth */}
                  <rect x="18" y="14" width="30" height="38" rx="4" fill="#047857" opacity="0.15" transform="rotate(-3 33 33)" />
                  {/* Main Document Sheet */}
                  <rect x="16" y="12" width="30" height="38" rx="4" fill="url(#gstDocGrad)" stroke="#10b981" strokeWidth="1.8" />
                  {/* Text lines */}
                  <line x1="22" y1="20" x2="38" y2="20" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
                  <line x1="22" y1="26" x2="34" y2="26" stroke="#047857" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                  <line x1="22" y1="32" x2="40" y2="32" stroke="#047857" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                  {/* Gold Seal */}
                  <circle cx="37" cy="38" r="5" fill="url(#gstGoldGrad)" stroke="#b45309" strokeWidth="0.8" />
                  <polygon points="37,35 39,39 35,39" fill="#ffffff" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-extrabold leading-tight text-slate-700 md:text-[11px] group-hover:text-emerald-700">GST</span>
            </Link>

            {/* 2. ITR (3D Tax Report Clipboard) */}
            <Link href="/services/itr-filing" className="group flex flex-col items-center text-center transition-all duration-200 active:scale-90 animate-float-icon-2">
              <div className="w-[72px] h-[72px] md:w-20 md:h-20 rounded-full flex items-center justify-center border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.3))] shadow-[0_4px_16px_rgba(7,19,38,0.04)] backdrop-blur-sm group-hover:scale-105 group-hover:shadow-[0_6px_22px_rgba(37,99,235,0.12)] transition duration-300">
                <svg width="44" height="44" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_3px_6px_rgba(37,99,235,0.15)]">
                  <defs>
                    <linearGradient id="clipBack" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#78350f" />
                      <stop offset="100%" stopColor="#451a03" />
                    </linearGradient>
                    <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#eff6ff" />
                    </linearGradient>
                    <linearGradient id="chartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  {/* Clipboard Backboard */}
                  <rect x="15" y="11" width="34" height="42" rx="5" fill="url(#clipBack)" stroke="#92400e" strokeWidth="1.2" />
                  {/* White Paper Sheet */}
                  <rect x="19" y="17" width="26" height="32" rx="2" fill="url(#paperGrad)" />
                  {/* Paper Clipboard Clip */}
                  <path d="M26 11H38V15H26V11Z" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
                  {/* Tax Chart Line */}
                  <path d="M23 41 L28 35 L33 38 L40 28" stroke="url(#chartGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Little Green checkmark indicator */}
                  <circle cx="40" cy="28" r="3" fill="#10b981" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-extrabold leading-tight text-slate-700 md:text-[11px] group-hover:text-blue-700">ITR</span>
            </Link>

            {/* 3. Passport (3D Passport Booklet) */}
            <Link href="/services/passport" className="group flex flex-col items-center text-center transition-all duration-200 active:scale-90 animate-float-icon-3">
              <div className="w-[72px] h-[72px] md:w-20 md:h-20 rounded-full flex items-center justify-center border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.3))] shadow-[0_4px_16px_rgba(7,19,38,0.04)] backdrop-blur-sm group-hover:scale-105 group-hover:shadow-[0_6px_22px_rgba(37,99,235,0.12)] transition duration-300">
                <svg width="44" height="44" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_3px_6px_rgba(15,23,42,0.18)]">
                  <defs>
                    <linearGradient id="passBook" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e3a8a" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <linearGradient id="passGold" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="100%" stopColor="#ca8a04" />
                    </linearGradient>
                  </defs>
                  {/* Passport Page Edge Stack (gives 3D thickness) */}
                  <rect x="20" y="12" width="28" height="40" rx="3" fill="#e2e8f0" />
                  {/* Main Passport Cover */}
                  <rect x="17" y="12" width="28" height="40" rx="3" fill="url(#passBook)" stroke="#1e293b" strokeWidth="1" />
                  {/* Spine Highlight */}
                  <line x1="19" y1="13" x2="19" y2="51" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" />
                  {/* Gold Emblem Globe */}
                  <circle cx="31" cy="32" r="6" stroke="url(#passGold)" strokeWidth="1.2" strokeDasharray="3 2" />
                  <ellipse cx="31" cy="32" rx="2.5" ry="6" stroke="url(#passGold)" strokeWidth="1" />
                  {/* Emblem Crest */}
                  <circle cx="31" cy="32" r="2" fill="url(#passGold)" />
                  {/* PASSPORT text */}
                  <text x="31" y="21" fill="url(#passGold)" fontSize="5" fontWeight="bold" textAnchor="middle" letterSpacing="0.08em">PASSPORT</text>
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-extrabold leading-tight text-slate-700 md:text-[11px] group-hover:text-indigo-900">Passport</span>
            </Link>

            {/* 4. Driving Licence (3D Licence Card) */}
            <Link href="/services/learning-driving-license" className="group flex flex-col items-center text-center transition-all duration-200 active:scale-90 animate-float-icon-4">
              <div className="w-[72px] h-[72px] md:w-20 md:h-20 rounded-full flex items-center justify-center border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.3))] shadow-[0_4px_16px_rgba(7,19,38,0.04)] backdrop-blur-sm group-hover:scale-105 group-hover:shadow-[0_6px_22px_rgba(37,99,235,0.12)] transition duration-300">
                <svg width="44" height="44" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_3px_6px_rgba(6,182,212,0.15)]">
                  <defs>
                    <linearGradient id="licCard" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ecfeff" />
                      <stop offset="100%" stopColor="#c5e2f6" />
                    </linearGradient>
                    <linearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="100%" stopColor="#ca8a04" />
                    </linearGradient>
                  </defs>
                  {/* 3D Card Stack Base Shadow */}
                  <rect x="13" y="18" width="38" height="28" rx="3" fill="#0891b2" opacity="0.1" transform="rotate(3 32 32)" />
                  {/* Card Body */}
                  <rect x="13" y="18" width="38" height="28" rx="3" fill="url(#licCard)" stroke="#0ea5e9" strokeWidth="1.6" />
                  {/* Top Flag Blue Strip */}
                  <path d="M14 19H50V23H14V19Z" fill="#2563eb" />
                  {/* Card Microchip */}
                  <rect x="18" y="27" width="7" height="6" rx="1.2" fill="url(#chipGrad)" stroke="#854d0e" strokeWidth="0.5" />
                  {/* Face photo outline */}
                  <rect x="40" y="26" width="7" height="9" rx="1" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
                  {/* Signal wave lines */}
                  <line x1="29" y1="28" x2="35" y2="28" stroke="#0369a1" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="29" y1="32" x2="33" y2="32" stroke="#0369a1" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-extrabold leading-tight text-slate-700 md:text-[11px] group-hover:text-sky-700">Licence</span>
            </Link>

            {/* 5. CM YUVA (New Premium 3D Icon!) */}
            <Link href="/services/cm-yuva-entrepreneur-loan-assistance" className="group flex flex-col items-center text-center transition-all duration-200 active:scale-90 animate-float-icon-9">
              <div className="w-[72px] h-[72px] md:w-20 md:h-20 rounded-full flex items-center justify-center border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.3))] shadow-[0_4px_16px_rgba(7,19,38,0.04)] backdrop-blur-sm group-hover:scale-105 group-hover:shadow-[0_6px_22px_rgba(249,115,22,0.12)] transition duration-300">
                <svg width="44" height="44" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_4px_8px_rgba(249,115,22,0.22)]">
                  <defs>
                    <linearGradient id="yuvaBack" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fff7ed" />
                      <stop offset="50%" stopColor="#ffedd5" />
                      <stop offset="100%" stopColor="#fed7aa" />
                    </linearGradient>
                    <linearGradient id="goldCoins" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                    <linearGradient id="govTheme" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                  
                  {/* Government Building (Symbolizing Scheme/Trust) */}
                  <path d="M12 44H52V47H12V44Z" fill="url(#govTheme)" opacity="0.25" />
                  <path d="M16 34H20V44H16V34Z" fill="url(#govTheme)" opacity="0.18" />
                  <path d="M24 34H28V44H24V34Z" fill="url(#govTheme)" opacity="0.18" />
                  <path d="M36 34H40V44H36V34Z" fill="url(#govTheme)" opacity="0.18" />
                  <path d="M44 34H48V44H48V34Z" fill="url(#govTheme)" opacity="0.18" />
                  <polygon points="12,34 32,22 52,34" fill="url(#govTheme)" opacity="0.22" />

                  {/* Business Growth Chart / Trend line */}
                  <path d="M15 40L25 32L35 36L49 22" stroke="#f97316" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                  <polygon points="49,22 43,21 48,27" fill="#f97316" />
                  <circle cx="49" cy="22" r="3.5" fill="#f97316" />

                  {/* Loan Approval Document */}
                  <rect x="26" y="16" width="20" height="26" rx="2" fill="#ffffff" stroke="#2563eb" strokeWidth="1.6" />
                  <line x1="30" y1="22" x2="42" y2="22" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="30" y1="27" x2="38" y2="27" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
                  {/* Checkmark stamp */}
                  <circle cx="39" cy="33" r="4" fill="#10b981" />
                  <path d="M37 33L38.5 34.5L41 31.5" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Rupee Symbol (3D Glossy Gold Coin) */}
                  <circle cx="19" cy="23" r="8" fill="url(#goldCoins)" stroke="#ca8a04" strokeWidth="1" />
                  <text x="19" y="27" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle">₹</text>

                  {/* Young Entrepreneur Silhouette */}
                  <path d="M8 50C8 46 12 43 18 43C19.5 43 21 43.3 22.3 43.8C20.3 45.4 19 47.8 19 50H8Z" fill="#1e293b" opacity="0.8" />
                  <circle cx="16" cy="36" r="4.5" fill="#1e293b" opacity="0.8" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-extrabold leading-tight text-slate-700 md:text-[11px] group-hover:text-orange-600">CM YUVA</span>
            </Link>

            {/* 6. Insurance (3D Shield) */}
            <Link href="/services/insurance" className="group flex flex-col items-center text-center transition-all duration-200 active:scale-90 animate-float-icon-5">
              <div className="w-[72px] h-[72px] md:w-20 md:h-20 rounded-full flex items-center justify-center border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.3))] shadow-[0_4px_16px_rgba(7,19,38,0.04)] backdrop-blur-sm group-hover:scale-105 group-hover:shadow-[0_6px_22px_rgba(37,99,235,0.12)] transition duration-300">
                <svg width="44" height="44" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_3px_6px_rgba(20,184,166,0.15)]">
                  <defs>
                    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ccfbf1" />
                      <stop offset="100%" stopColor="#99f6e4" />
                    </linearGradient>
                    <linearGradient id="metallicRim" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0d9488" />
                      <stop offset="100%" stopColor="#115e59" />
                    </linearGradient>
                  </defs>
                  {/* Shield Back Shadow */}
                  <path d="M32 11C32 11 46 14 46 25C46 37 32 49 32 49C32 49 18 37 18 25C18 14 32 11 32 11Z" fill="#14b8a6" opacity="0.1" transform="translate(1, 2)" />
                  {/* Shield Body */}
                  <path d="M32 11C32 11 46 14 46 25C46 37 32 49 32 49C32 49 18 37 18 25C18 14 32 11 32 11Z" fill="url(#shieldGrad)" stroke="url(#metallicRim)" strokeWidth="2.2" strokeLinejoin="round" />
                  {/* Inner details */}
                  <path d="M32 15C32 15 41 17.5 41 25C41 34 32 43 32 43C32 43 23 34 23 25C23 17.5 32 15 32 15Z" stroke="#0d9488" strokeWidth="1.2" opacity="0.5" fill="none" />
                  {/* Tick icon in center */}
                  <path d="M26 29L30 33L38 23" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-extrabold leading-tight text-slate-700 md:text-[11px] group-hover:text-teal-700">Insurance</span>
            </Link>

            {/* 6. Credit Cards (3D Premium Card Stack) */}
            <Link href="/services/credit-cards" className="group flex flex-col items-center text-center transition-all duration-200 active:scale-90 animate-float-icon-6">
              <div className="w-[72px] h-[72px] md:w-20 md:h-20 rounded-full flex items-center justify-center border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.3))] shadow-[0_4px_16px_rgba(7,19,38,0.04)] backdrop-blur-sm group-hover:scale-105 group-hover:shadow-[0_6px_22px_rgba(37,99,235,0.12)] transition duration-300">
                <svg width="44" height="44" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_3px_6px_rgba(99,102,241,0.18)]">
                  <defs>
                    <linearGradient id="navyCard" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#1e1b4b" />
                    </linearGradient>
                    <linearGradient id="goldCard" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#b45309" />
                    </linearGradient>
                  </defs>
                  {/* Under Card (Gold) rotated */}
                  <rect x="20" y="22" width="28" height="18" rx="2" fill="url(#goldCard)" stroke="#92400e" strokeWidth="0.8" transform="rotate(-15 34 31)" />
                  {/* Main Premium Card (Indigo/Navy) */}
                  <rect x="16" y="20" width="30" height="19" rx="2.5" fill="url(#navyCard)" stroke="#4338ca" strokeWidth="1.2" transform="rotate(8 31 29)" />
                  {/* Spine/sheen effect line */}
                  <path d="M19 22L44 26" stroke="#818cf8" strokeWidth="1" opacity="0.6" transform="rotate(8 31 29)" />
                  {/* Metallic chip */}
                  <rect x="20" y="27" width="5" height="4" rx="0.5" fill="#fef08a" transform="rotate(8 31 29)" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-extrabold leading-tight text-slate-700 md:text-[11px] group-hover:text-indigo-700">Credit Cards</span>
            </Link>

            {/* 7. PVC Cards (3D ID Card) */}
            <Link href="/services/pvc-card" className="group flex flex-col items-center text-center transition-all duration-200 active:scale-90 animate-float-icon-7">
              <div className="w-[72px] h-[72px] md:w-20 md:h-20 rounded-full flex items-center justify-center border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.3))] shadow-[0_4px_16px_rgba(7,19,38,0.04)] backdrop-blur-sm group-hover:scale-105 group-hover:shadow-[0_6px_22px_rgba(37,99,235,0.12)] transition duration-300">
                <svg width="44" height="44" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_3px_6px_rgba(6,182,212,0.15)]">
                  <defs>
                    <linearGradient id="pvcDocGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#e0f2fe" />
                    </linearGradient>
                  </defs>
                  {/* PVC Base shadow */}
                  <rect x="14" y="16" width="36" height="30" rx="3.5" fill="#0284c7" opacity="0.15" transform="rotate(-6 32 31)" />
                  {/* PVC Card Shape */}
                  <rect x="14" y="16" width="36" height="30" rx="3.5" fill="url(#pvcDocGrad)" stroke="#0284c7" strokeWidth="1.8" />
                  {/* Profile Header Band */}
                  <path d="M15 17H49V21H15V17Z" fill="#0284c7" />
                  {/* Portrait Placeholder */}
                  <rect x="18" y="24" width="8" height="10" rx="1" fill="#94a3b8" />
                  {/* Line details */}
                  <line x1="29" y1="26" x2="45" y2="26" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="29" y1="30" x2="41" y2="30" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="29" y1="34" x2="38" y2="34" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
                  {/* Gold holographic seal */}
                  <circle cx="43" cy="38" r="3" fill="#eab308" opacity="0.85" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-extrabold leading-tight text-slate-700 md:text-[11px] group-hover:text-cyan-700">PVC Cards</span>
            </Link>

            {/* 8. All Services (3D App Launcher) */}
            <Link href="/services" className="group flex flex-col items-center text-center transition-all duration-200 active:scale-90 animate-float-icon-8">
              <div className="w-[72px] h-[72px] md:w-20 md:h-20 rounded-full flex items-center justify-center border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.3))] shadow-[0_4px_16px_rgba(7,19,38,0.04)] backdrop-blur-sm group-hover:scale-105 group-hover:shadow-[0_6px_22px_rgba(37,99,235,0.12)] transition duration-300">
                <svg width="44" height="44" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_3px_6px_rgba(249,115,22,0.15)]">
                  <defs>
                    <linearGradient id="orbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffedd5" />
                      <stop offset="100%" stopColor="#ff9f43" />
                    </linearGradient>
                    <linearGradient id="orbBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>
                  {/* Floating Glass spheres grid (App Launcher Grid) */}
                  <circle cx="21" cy="21" r="4.5" fill="url(#orbGrad)" stroke="url(#orbBorder)" strokeWidth="1.2" />
                  <circle cx="32" cy="21" r="4.5" fill="url(#orbGrad)" stroke="url(#orbBorder)" strokeWidth="1.2" />
                  <circle cx="43" cy="21" r="4.5" fill="url(#orbGrad)" stroke="url(#orbBorder)" strokeWidth="1.2" />
                  
                  <circle cx="21" cy="32" r="4.5" fill="url(#orbGrad)" stroke="url(#orbBorder)" strokeWidth="1.2" />
                  <circle cx="32" cy="32" r="4.5" fill="url(#orbGrad)" stroke="url(#orbBorder)" strokeWidth="1.2" />
                  <circle cx="43" cy="32" r="4.5" fill="url(#orbGrad)" stroke="url(#orbBorder)" strokeWidth="1.2" />
                  
                  <circle cx="21" cy="43" r="4.5" fill="url(#orbGrad)" stroke="url(#orbBorder)" strokeWidth="1.2" />
                  <circle cx="32" cy="43" r="4.5" fill="url(#orbGrad)" stroke="url(#orbBorder)" strokeWidth="1.2" />
                  <circle cx="43" cy="43" r="4.5" fill="url(#orbGrad)" stroke="url(#orbBorder)" strokeWidth="1.2" />
                </svg>
              </div>
              <span className="mt-2.5 block text-[10px] font-extrabold leading-tight text-slate-700 md:text-[11px] group-hover:text-orange-700">All Services</span>
            </Link>

          </div>
        </div>
      </div>
    </section>
  );
}
