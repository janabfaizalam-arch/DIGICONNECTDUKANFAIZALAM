"use client";

import React from "react";
import Link from "next/link";
import { ReceiptText, Landmark, ShieldCheck, Building2, FileText, ArrowRight } from "lucide-react";

const categories = [
  {
    title: "Tax & GST",
    description: "GST Registration, ITR Filing, GST Returns",
    icon: ReceiptText,
    href: "/services?category=tax",
    color: "bg-emerald-50 text-emerald-600",
    count: "8+ services",
  },
  {
    title: "Business",
    description: "Company Registration, MSME, DSC, ISO",
    icon: Building2,
    href: "/services?category=company",
    color: "bg-indigo-50 text-indigo-600",
    count: "6+ services",
  },
  {
    title: "Finance",
    description: "CIBIL Analysis, Credit Cards, Loans",
    icon: Landmark,
    href: "/services?category=banking",
    color: "bg-blue-50 text-blue-600",
    count: "10+ services",
  },
  {
    title: "Government",
    description: "Passport, Driving Licence, Voter ID",
    icon: FileText,
    href: "/services?category=licence",
    color: "bg-orange-50 text-orange-600",
    count: "12+ services",
  },
  {
    title: "Insurance",
    description: "Bike, Car, Truck & Commercial Vehicle",
    icon: ShieldCheck,
    href: "/services?category=insurance",
    color: "bg-cyan-50 text-cyan-600",
    count: "5+ services",
  },
];

export function ServiceCategories() {
  return (
    <section className="bg-white py-10 md:py-14 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Browse</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 md:text-xl">
              Popular Categories
            </h2>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
          >
            Explore All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Category Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.title}
                href={cat.href}
                className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-200 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <div>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${cat.color} transition-transform group-hover:scale-105`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 mt-3 group-hover:text-blue-700">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{cat.count}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
