"use client";

import React from "react";
import { ShieldCheck, Lock, Award, Zap, Coins, Sparkles, FileCheck, Globe } from "lucide-react";

interface BentoItem {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  spanClass: string;
}

const bentoFeatures: BentoItem[] = [
  {
    title: "Secure Payments",
    subtitle: "Razorpay Protected",
    description: "All transactions are encrypted and processed securely via Razorpay payment gateway. Supports UPI, NetBanking & major cards.",
    icon: ShieldCheck,
    colorClass: "bg-emerald-50 text-emerald-600 border-emerald-100/30",
    spanClass: "md:col-span-2"
  },
  {
    title: "Data Privacy",
    subtitle: "SSL Protected",
    description: "Your document uploads and personal registries are protected by SSL security protocols.",
    icon: Lock,
    colorClass: "bg-blue-50 text-blue-600 border-blue-100/30",
    spanClass: "md:col-span-1"
  },
  {
    title: "Expert Team",
    subtitle: "Certified CA/CS Specialists",
    description: "Our back-office legal associates verify submissions to prevent RTO or GST rejects.",
    icon: Award,
    colorClass: "bg-purple-50 text-purple-600 border-purple-100/30",
    spanClass: "md:col-span-1"
  },
  {
    title: "Fast Processing",
    subtitle: "Guided File Creation",
    description: "Clear next-step notifications on your dashboard, fast-tracked appointments, and direct WhatsApp updates to minimize processing delays.",
    icon: Zap,
    colorClass: "bg-orange-50 text-orange-600 border-orange-100/30",
    spanClass: "md:col-span-2"
  },
  {
    title: "Wallet Rewards",
    subtitle: "20% Cashback",
    description: "Earn 20% cashback in your DigiWallet on every paid service completed.",
    icon: Coins,
    colorClass: "bg-amber-50 text-amber-600 border-amber-100/30",
    spanClass: "md:col-span-1"
  },
  {
    title: "AI Assisted Search",
    subtitle: "Typo Tolerant Search",
    description: "Quick matching for abbreviations and spelling errors ensures zero friction.",
    icon: Sparkles,
    colorClass: "bg-cyan-50 text-cyan-600 border-cyan-100/30",
    spanClass: "md:col-span-1"
  },
  {
    title: "Government Compliance",
    subtitle: "Official Schemes Support",
    description: "Verified form layouts aligned with active departments ensure compliance rules.",
    icon: FileCheck,
    colorClass: "bg-indigo-50 text-indigo-600 border-indigo-100/30",
    spanClass: "md:col-span-1"
  },
  {
    title: "PAN India Service",
    subtitle: "National Digital Scale",
    description: "Providing high-speed digital assistance across all 28 states and union territories. Supporting business registrations and citizen documents from Lucknow to Mumbai.",
    icon: Globe,
    colorClass: "bg-rose-50 text-rose-600 border-rose-100/30",
    spanClass: "md:col-span-3"
  }
];

export function WhyChooseUs() {
  return (
    <section className="bg-white py-12 px-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-10 w-80 h-80 rounded-full bg-blue-500/5 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-orange-500/5 blur-[90px] pointer-events-none" />

      <div className="container-shell max-w-[1600px] mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">Why DigiConnect</p>
          <h2 className="mt-1.5 text-xl md:text-2xl font-black tracking-tight text-slate-850">
            Apple-Grade Bento Security & Design
          </h2>
        </div>

        {/* Bento Box Layout Grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 max-w-5xl mx-auto">
          {bentoFeatures.map((item, idx) => {
            const Icon = item.icon;
            
            return (
              <div
                key={idx}
                className={`glass-liquid-premium rounded-3xl p-6 text-left flex flex-col justify-between border-white/50 transition-all duration-350 hover:border-blue-400/30 ${item.spanClass}`}
              >
                <div>
                  {/* Icon */}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${item.colorClass} mb-4`}>
                    <Icon className="h-5 w-5 stroke-[2]" />
                  </div>

                  {/* Title & Subtitle */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide leading-none">
                      {item.subtitle}
                    </span>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight leading-tight">
                      {item.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="mt-3 text-xs leading-relaxed text-slate-450 font-semibold">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
