"use client";

import React from "react";
import { Headphones, Globe, Wallet, ShieldCheck, Zap, BarChart3 } from "lucide-react";

const features = [
  {
    title: "Expert Support",
    description: "Certified specialists review every application to minimize rejection risks.",
    icon: Headphones,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "PAN India Coverage",
    description: "Digital services available and accessible across all Indian states and territories.",
    icon: Globe,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Wallet Cashback",
    description: "Earn 20% cashback in your DigiWallet on every paid service automatically.",
    icon: Wallet,
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Secure Processing",
    description: "Industry-standard encryption with Razorpay secure payment gateway.",
    icon: ShieldCheck,
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "Fast Turnaround",
    description: "Clear next steps, document verification, and rapid application processing.",
    icon: Zap,
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "Application Tracking",
    description: "Real-time updates on your dashboard, WhatsApp, and email notifications.",
    icon: BarChart3,
    color: "bg-cyan-50 text-cyan-600",
  },
];

export function WhyChooseUs() {
  return (
    <section className="bg-slate-50/50 py-10 md:py-16 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">Why DigiConnect</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl leading-tight">
            Professional Digital Assistance by RNOS
          </h2>
          <p className="mt-3 text-sm font-medium text-slate-500 max-w-lg mx-auto">
            Secure, expert-guided submission support for Tax, Insurance, Loans and Government documents.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="group rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-200 hover:border-blue-100 hover:shadow-md hover:-translate-y-0.5"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${feature.color} transition-transform group-hover:scale-105`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-bold text-slate-800 mt-4 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-400 mt-2">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
