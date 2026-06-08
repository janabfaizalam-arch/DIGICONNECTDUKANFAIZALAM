"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const categories = [
  {
    title: "Tax & Business",
    href: "/services?category=tax",
    gradient: "from-emerald-50 to-emerald-100/50",
    iconColor: "#059669",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <rect x="10" y="8" width="28" height="32" rx="4" fill="#d1fae5" stroke="#059669" strokeWidth="1.5" />
        <line x1="16" y1="16" x2="28" y2="16" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="16" y1="22" x2="24" y2="22" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="28" x2="32" y2="28" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="30" cy="32" r="3.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
      </svg>
    ),
  },
  {
    title: "Finance",
    href: "/services?category=banking",
    gradient: "from-blue-50 to-blue-100/50",
    iconColor: "#2563eb",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="14" width="32" height="22" rx="3" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
        <line x1="8" y1="22" x2="40" y2="22" stroke="#2563eb" strokeWidth="1.5" />
        <circle cx="32" cy="30" r="3" fill="#2563eb" opacity="0.3" />
        <line x1="14" y1="30" x2="24" y2="30" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Insurance",
    href: "/services?category=insurance",
    gradient: "from-cyan-50 to-cyan-100/50",
    iconColor: "#0891b2",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <path d="M24 8C24 8 36 11 36 20C36 30 24 40 24 40C24 40 12 30 12 20C12 11 24 8 24 8Z" fill="#cffafe" stroke="#0891b2" strokeWidth="1.5" />
        <path d="M19 22L22 25L29 18" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Gov IDs",
    href: "/services?category=licence",
    gradient: "from-orange-50 to-orange-100/50",
    iconColor: "#ea580c",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <rect x="10" y="14" width="28" height="20" rx="3" fill="#ffedd5" stroke="#ea580c" strokeWidth="1.5" />
        <circle cx="19" cy="23" r="3.5" fill="#ea580c" opacity="0.3" />
        <line x1="26" y1="21" x2="34" y2="21" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="26" y1="26" x2="31" y2="26" stroke="#ea580c" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Licenses",
    href: "/services/learning-driving-license",
    gradient: "from-purple-50 to-purple-100/50",
    iconColor: "#7c3aed",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="14" width="32" height="22" rx="4" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" />
        <rect x="12" y="19" width="8" height="8" rx="2" fill="#7c3aed" opacity="0.2" />
        <line x1="24" y1="20" x2="36" y2="20" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="24" y1="25" x2="32" y2="25" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="12" y1="31" x2="36" y2="31" stroke="#7c3aed" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
  },
  {
    title: "Passport",
    href: "/services/passport",
    gradient: "from-indigo-50 to-indigo-100/50",
    iconColor: "#4f46e5",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <rect x="14" y="8" width="20" height="32" rx="3" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="6" stroke="#4f46e5" strokeWidth="1" strokeDasharray="2.5 1.5" />
        <ellipse cx="24" cy="24" rx="2.5" ry="6" stroke="#4f46e5" strokeWidth="0.8" />
        <text x="24" y="15" fill="#4f46e5" fontSize="4.5" fontWeight="bold" textAnchor="middle">PASSPORT</text>
      </svg>
    ),
  },
  {
    title: "Schemes",
    href: "/services/pm-vishwakarma-yojana",
    gradient: "from-amber-50 to-amber-100/50",
    iconColor: "#d97706",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <path d="M24 6L28 16H40L30 22L34 34L24 26L14 34L18 22L8 16H20L24 6Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "All Services",
    href: "/services",
    gradient: "from-slate-50 to-slate-100/50",
    iconColor: "#475569",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <rect x="10" y="10" width="10" height="10" rx="3" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
        <rect x="28" y="10" width="10" height="10" rx="3" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
        <rect x="10" y="28" width="10" height="10" rx="3" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
        <rect x="28" y="28" width="10" height="10" rx="3" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
      </svg>
    ),
  },
];

export function QuickServiceGrid() {
  return (
    <section className="bg-white px-3 py-6 md:py-10">
      <div className="container-shell">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Categories</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 md:text-xl">
              Quick Service Categories
            </h2>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Grid — 4 cols desktop, 2 cols mobile */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className={`group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br ${cat.gradient} p-5 md:p-6 text-center transition-all duration-200 hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-sm transition-transform group-hover:scale-105">
                {cat.icon}
              </div>
              <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">
                {cat.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
