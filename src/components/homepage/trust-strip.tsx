"use client";

import React from "react";
import { Users, CheckCircle, Globe, ShieldCheck } from "lucide-react";

const stats = [
  { label: "Happy Customers", value: "50,000+", icon: Users, theme: "blue" },
  { label: "Success Rate", value: "99%", icon: CheckCircle, theme: "green" },
  { label: "Support Network", value: "PAN India", icon: Globe, theme: "orange" },
  { label: "Razorpay Payments", value: "100% Secure", icon: ShieldCheck, theme: "teal" },
];

export function TrustStrip() {
  return (
    <section className="bg-white py-3 px-3">
      <div className="container-shell">
        <div className="glass-panel rounded-2xl border border-slate-100/80 p-3 shadow-xs bg-slate-50/20">
          <div className="flex flex-wrap items-center justify-around gap-y-4 gap-x-2 md:flex-nowrap">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="flex items-center gap-3 px-4 py-1 hover:bg-white/50 rounded-xl transition duration-200 shrink-0">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs
                    ${stat.theme === "blue" && "bg-blue-50 text-blue-600 border border-blue-100/50"}
                    ${stat.theme === "green" && "bg-emerald-50 text-emerald-600 border border-emerald-100/50"}
                    ${stat.theme === "orange" && "bg-orange-50 text-orange-600 border border-orange-100/50"}
                    ${stat.theme === "teal" && "bg-cyan-50 text-cyan-600 border border-cyan-100/50"}
                  `}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-slate-900 leading-none">{stat.value}</h3>
                    <p className="text-[9px] font-bold text-slate-450 uppercase tracking-wider mt-1">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
