"use client";

import React, { useEffect, useRef, useState } from "react";
import { Users, CheckCircle, ClipboardCheck, HandCoins, Sparkles } from "lucide-react";

const stats = [
  { label: "Applications Processed", value: 15000, prefix: "", suffix: "+", icon: ClipboardCheck, color: "bg-blue-50 text-blue-600 border border-blue-100/50" },
  { label: "Success Rate", value: 99.9, prefix: "", suffix: "%", icon: CheckCircle, color: "bg-emerald-50 text-emerald-600 border border-emerald-100/50" },
  { label: "Wallet Cashback Paid", value: 500000, prefix: "₹", suffix: "+", icon: HandCoins, color: "bg-orange-50 text-orange-600 border border-orange-100/50" },
  { label: "Happy Customers", value: 50000, prefix: "", suffix: "+", icon: Users, color: "bg-purple-50 text-purple-600 border border-purple-100/50" },
];

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix: string;
}

function AnimatedCounter({ value, prefix = "", suffix }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const numValue = Number(value);
          const duration = 1500;
          const startTime = Date.now();

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart

            const current = numValue * eased;

            if (numValue >= 1000) {
              setDisplayValue(Math.floor(current).toLocaleString("en-IN"));
            } else if (numValue % 1 !== 0) {
              setDisplayValue(current.toFixed(1));
            } else {
              setDisplayValue(Math.floor(current).toString());
            }

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-2xl md:text-3xl font-black text-slate-900 leading-none tracking-tight">
      {prefix}{displayValue}{suffix}
    </div>
  );
}

export function TrustStrip() {
  return (
    <section className="bg-slate-50/50 py-8 md:py-10 px-3 relative overflow-hidden">
      {/* Visual glow overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.015),transparent_60%)] pointer-events-none" />

      <div className="container-shell relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 fill-blue-100 text-blue-600" /> Trust metrics
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 leading-tight">
            Trusted by Thousands Across India
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 max-w-5xl mx-auto">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-2xl border border-slate-100/85 bg-white/70 backdrop-blur-md p-4 md:p-5 text-center transition-all duration-300 hover:border-blue-200/60 hover:shadow-[0_12px_24px_rgba(37,99,235,0.04)] hover:-translate-y-1"
              >
                {/* Visual Glass highlights */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-50/0 to-blue-50/5 opacity-0 group-hover:opacity-100 transition duration-350 pointer-events-none" />

                <span className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl ${stat.color} transition-transform duration-300 group-hover:scale-105`}>
                  <Icon className="h-5.5 w-5.5 stroke-[2]" />
                </span>

                <div className="mt-4">
                  <AnimatedCounter
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                  />
                </div>

                <p className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">
                  {stat.label}
                </p>

                {/* Micro accent visual line */}
                <div className="absolute bottom-0 inset-x-8 h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-blue-500/40 group-hover:to-blue-500/10 transition-all duration-300 rounded-full" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
