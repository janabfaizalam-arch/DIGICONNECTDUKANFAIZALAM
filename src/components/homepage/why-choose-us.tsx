"use client";

import React from "react";
import { Gauge, ShieldCheck, UsersRound, Sparkles, MessageCircle, Headphones } from "lucide-react";

const cards = [
  {
    title: "Fast Processing",
    description: "Clear next steps, documents verification, and rapid application processing.",
    icon: Gauge,
    color: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    title: "Secure Documents",
    description: "Your critical forms and KYC uploads are encrypted and handled with absolute care.",
    icon: ShieldCheck,
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    title: "PAN India Service",
    description: "Secure, structured digital support and documentation helper active across all states.",
    icon: Sparkles,
    color: "bg-orange-50 text-orange-700 border-orange-100",
  },
  {
    title: "Expert Support",
    description: "Our certified specialist teams check spellings and databases to reduce rejection risks.",
    icon: UsersRound,
    color: "bg-purple-50 text-purple-700 border-purple-100",
  },
  {
    title: "Trusted Platform",
    description: "Fully verified integrations, secure checkout via Razorpay, and direct wallet cashback.",
    icon: MessageCircle,
    color: "bg-pink-50 text-pink-700 border-pink-100",
  },
  {
    title: "Dedicated Assistance",
    description: "Real-time updates, call support, and instant chat verification on WhatsApp.",
    icon: Headphones,
    color: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
];

export function WhyChooseUs() {
  return (
    <section className="bg-slate-50/30 py-12 px-3">
      <div className="container-shell">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-blue-700 shadow-sm border border-blue-100">
            About & Trust
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4.5xl leading-tight">
            Professional digital assistance by RNoS
          </h2>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            DigiConnect Dukan provides secure, expert-guided submission support for Tax, Insurance, Loans and Gov ID documents.
          </p>
        </div>

        {/* 3D Glass Cards grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="group flex flex-col justify-between rounded-3xl border border-slate-150 bg-white/70 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)] backdrop-blur-md transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(37,99,235,0.06)] duration-300 text-left"
              >
                <div>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${card.color} shadow-sm transition-transform duration-250 group-hover:scale-105`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-extrabold text-slate-950 mt-4 leading-tight">
                    {card.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-500 font-semibold mt-2">
                    {card.description}
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
