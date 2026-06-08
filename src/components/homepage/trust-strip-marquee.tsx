"use client";

import React from "react";
import { ShieldCheck, Lock, Globe, Headphones, CheckCircle2 } from "lucide-react";

const trustItems = [
  { text: "Secure Payments", icon: ShieldCheck, color: "text-blue-500" },
  { text: "Razorpay Protected", icon: CheckCircle2, color: "text-emerald-500" },
  { text: "SSL Secured", icon: Lock, color: "text-purple-500" },
  { text: "PAN India Services", icon: Globe, color: "text-orange-500" },
  { text: "Expert Support", icon: Headphones, color: "text-cyan-500" },
];

export function TrustStripMarquee() {
  // We duplicate the items to make the marquee scrolling seamless
  const duplicatedItems = [...trustItems, ...trustItems, ...trustItems, ...trustItems];

  return (
    <div className="relative w-full overflow-hidden bg-slate-50/45 backdrop-blur-md border-y border-slate-200/40 py-3.5 print:hidden select-none">
      {/* Visual gradients on left/right edges for premium fade-out effect */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-infinite {
          display: flex;
          width: max-content;
          animation: marquee 30s linear infinite;
        }
      `}} />

      <div className="animate-marquee-infinite gap-12 sm:gap-20">
        {duplicatedItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-center gap-2.5 shrink-0">
              <Icon className={`h-4.5 w-4.5 stroke-[2.5] ${item.color}`} />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {item.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
