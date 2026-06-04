"use client";

import React from "react";
import { Users, CheckCircle, Globe, ShieldAlert } from "lucide-react";

const stats = [
  { label: "Satisfied Customers", value: "50,000+", icon: Users, theme: "blue" },
  { label: "Success Rate", value: "99%", icon: CheckCircle, theme: "green" },
  { label: "PAN India Support", value: "Active", icon: Globe, theme: "orange" },
  { label: "Secure Payments", value: "Razorpay", icon: ShieldAlert, theme: "teal" },
];

export function TrustStrip() {
  return (
    <section className="bg-white py-4 px-3">
      <div className="container-shell">
        <div className="glass-panel rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-2">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="flex items-center gap-3.5 px-3 py-1.5 rounded-xl hover:bg-slate-50/50 transition">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm
                    ${stat.theme === "blue" && "bg-blue-50 text-blue-600 border border-blue-100"}
                    ${stat.theme === "green" && "bg-emerald-50 text-emerald-600 border border-emerald-100"}
                    ${stat.theme === "orange" && "bg-orange-50 text-orange-600 border border-orange-100"}
                    ${stat.theme === "teal" && "bg-cyan-50 text-cyan-600 border border-cyan-100"}
                  `}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-none">{stat.value}</h3>
                    <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mt-1">{stat.label}</p>
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
