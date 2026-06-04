"use client";

import React from "react";
import Link from "next/link";
import { ReceiptText, Landmark, ShieldCheck, CarFront, FileText, Building2, ArrowRight } from "lucide-react";

const categories = [
  {
    title: "Tax & GST",
    description: "GST registrations, monthly filing support, and ITR return filing.",
    icon: ReceiptText,
    href: "/services?category=tax",
    color: "from-emerald-500/10 to-teal-500/5 text-emerald-700 border-emerald-100",
    size: "col-span-1 row-span-1",
    tag: "Taxation",
  },
  {
    title: "Finance & Credit",
    description: "CIBIL report improvement roadmap, credit card applications, and banking services.",
    icon: Landmark,
    href: "/services?category=banking",
    color: "from-blue-500/10 to-indigo-500/5 text-blue-700 border-blue-100",
    size: "col-span-1 md:col-span-2 row-span-1",
    tag: "Advisory",
  },
  {
    title: "All Vehicle Insurance",
    description: "Third-party & comprehensive quotes and instant renewals for cars, bikes & transport vehicles.",
    icon: ShieldCheck,
    href: "/services?category=insurance",
    color: "from-cyan-500/10 to-blue-500/5 text-cyan-700 border-cyan-100",
    size: "col-span-1 row-span-1",
    tag: "Protection",
  },
  {
    title: "Govt ID & Schemes",
    description: "Passport applications, Learner Driving License bookings, Voter ID cards, and official state program listings.",
    icon: CarFront,
    href: "/services?category=licence",
    color: "from-orange-500/10 to-amber-500/5 text-orange-700 border-orange-100",
    size: "col-span-1 md:col-span-2 row-span-1",
    tag: "Gov ID Support",
  },
  {
    title: "Smart Cards & PVC",
    description: "Waterproof glossy PVC cards for Aadhaar, Voter ID, eShram, and Labour credentials.",
    icon: FileText,
    href: "/services?category=cards",
    color: "from-purple-500/10 to-indigo-500/5 text-purple-700 border-purple-100",
    size: "col-span-1 row-span-1",
    tag: "Printing",
  },
  {
    title: "Business & Company",
    description: "Private Limited & OPC incorporation, MSME Udyam, Class 3 DSC tokens, and ISO certification filings.",
    icon: Building2,
    href: "/services?category=company",
    color: "from-pink-500/10 to-rose-500/5 text-pink-700 border-pink-100",
    size: "col-span-1 row-span-1",
    tag: "Corporate",
  },
];

export function ServiceCategories() {
  return (
    <section className="bg-white py-10 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between px-2">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">
              Structured Directory
            </p>
            <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-900 md:text-2xl">
              Service Sectors
            </h2>
          </div>
          <Link
            href="/services"
            className="mt-2 md:mt-0 inline-flex items-center gap-0.5 text-xs font-black text-blue-600 hover:underline text-left"
          >
            Explore Directory <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Bento Grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 auto-rows-fr">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <Link
                key={idx}
                href={cat.href}
                className={`group flex flex-col justify-between rounded-3xl border border-slate-150 bg-slate-50/20 p-5 hover:bg-white hover:border-blue-300 hover:shadow-md transition duration-300 text-left ${cat.size}`}
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-gradient-to-tr ${cat.color} shadow-sm group-hover:scale-105 transition`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8.5px] font-black text-slate-450 uppercase tracking-wider">
                      {cat.tag}
                    </span>
                  </div>
                  
                  <h3 className="text-sm font-black text-slate-950 mt-4 leading-tight">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1.5 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-1 text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">
                  Browse Services
                  <ArrowRight className="h-3 w-3 transition duration-200 group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
