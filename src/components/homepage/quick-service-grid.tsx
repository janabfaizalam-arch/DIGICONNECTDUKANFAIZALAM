"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Store, ReceiptText, Globe, CarFront, ShieldCheck, CreditCard, IdCard, LayoutGrid } from "lucide-react";

const quickServices = [
  {
    title: "GST Registration",
    href: "/services/gst-registration",
    icon: Store,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-50/40",
    borderColor: "group-hover:border-emerald-200/50",
    anim: "animate-float-slow"
  },
  {
    title: "ITR Filing",
    href: "/services/itr-filing",
    icon: ReceiptText,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50/40",
    borderColor: "group-hover:border-blue-200/50",
    anim: "animate-float-medium"
  },
  {
    title: "Passport Service",
    href: "/services/passport",
    icon: Globe,
    iconColor: "text-indigo-500",
    bgColor: "bg-indigo-50/40",
    borderColor: "group-hover:border-indigo-200/50",
    anim: "animate-float-slow"
  },
  {
    title: "Driving Licence",
    href: "/services/learning-driving-license",
    icon: CarFront,
    iconColor: "text-purple-500",
    bgColor: "bg-purple-50/40",
    borderColor: "group-hover:border-purple-200/50",
    anim: "animate-float-medium"
  },
  {
    title: "Vehicle Insurance",
    href: "/services/insurance",
    icon: ShieldCheck,
    iconColor: "text-cyan-500",
    bgColor: "bg-cyan-50/40",
    borderColor: "group-hover:border-cyan-200/50",
    anim: "animate-float-slow"
  },
  {
    title: "Credit Cards",
    href: "/services/credit-cards",
    icon: CreditCard,
    iconColor: "text-rose-500",
    bgColor: "bg-rose-50/40",
    borderColor: "group-hover:border-rose-200/50",
    anim: "animate-float-medium"
  },
  {
    title: "PVC Smart Card",
    href: "/services/pvc-card",
    icon: IdCard,
    iconColor: "text-orange-500",
    bgColor: "bg-orange-50/40",
    borderColor: "group-hover:border-orange-200/50",
    anim: "animate-float-slow"
  },
  {
    title: "See All Services",
    href: "/services",
    icon: LayoutGrid,
    iconColor: "text-slate-600",
    bgColor: "bg-slate-50/60",
    borderColor: "group-hover:border-slate-300/50",
    anim: ""
  }
];

export function QuickServiceGrid() {
  return (
    <section className="bg-white px-4 pt-6 pb-8 md:pb-12 relative overflow-hidden">
      {/* Soft background light reflections */}
      <div className="absolute top-0 right-1/4 w-[250px] h-[250px] rounded-full bg-blue-500/5 blur-[80px] pointer-events-none" />
      
      <div className="container-shell max-w-[1600px] mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">Categories</p>
            <h2 className="mt-1 text-xl md:text-2xl font-black tracking-tight text-slate-800">
              Quick Services Grid
            </h2>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-0.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
          >
            See All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 3D Glass Cards Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-6">
          {quickServices.map((service, index) => {
            const Icon = service.icon;
            const isLast = index === quickServices.length - 1;
            
            return (
              <Link
                key={service.title}
                href={service.href}
                className={`group glass-liquid-premium rounded-2xl p-5 md:p-6 text-center flex flex-col items-center justify-center gap-3.5 select-none transition-all duration-350 cursor-pointer border-white/40 ${service.borderColor} ${isLast ? "border-slate-300/30" : ""}`}
              >
                {/* Icon wrapper with floating effect */}
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${service.bgColor} shadow-inner transition-all duration-350 group-hover:scale-110 ${service.anim}`}>
                  <Icon className={`h-6 w-6 stroke-[2] ${service.iconColor}`} />
                </div>
                <span className="text-xs font-black text-slate-750 group-hover:text-blue-600 transition-colors leading-none">
                  {service.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
