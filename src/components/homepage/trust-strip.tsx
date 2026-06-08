"use client";

import React, { useEffect, useRef, useState } from "react";
import { Users, CheckCircle2, ClipboardCheck, Globe, Headphones, Sparkles } from "lucide-react";

const stats = [
  { 
    label: "Applications Processed", 
    value: 50000, 
    prefix: "", 
    suffix: "+", 
    isNumeric: true,
    icon: ClipboardCheck, 
    color: "bg-blue-50/70 text-blue-600 border-blue-100/40" 
  },
  { 
    label: "Happy Customers", 
    value: 15000, 
    prefix: "", 
    suffix: "+", 
    isNumeric: true,
    icon: Users, 
    color: "bg-purple-50/70 text-purple-600 border-purple-100/40" 
  },
  { 
    label: "Success Rate", 
    value: 99.3, 
    prefix: "", 
    suffix: "%", 
    isNumeric: true,
    icon: CheckCircle2, 
    color: "bg-emerald-50/70 text-emerald-600 border-emerald-100/40" 
  },
  { 
    label: "Coverage", 
    text: "PAN India", 
    isNumeric: false,
    icon: Globe, 
    color: "bg-orange-50/70 text-orange-600 border-orange-100/40" 
  },
  { 
    label: "Support", 
    text: "24×7", 
    isNumeric: false,
    icon: Headphones, 
    color: "bg-cyan-50/70 text-cyan-600 border-cyan-100/40" 
  },
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
          const duration = 1800; // 1.8 seconds transition
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
      { threshold: 0.15 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-xl md:text-2xl font-black text-slate-800 leading-none tracking-tight">
      {prefix}{displayValue}{suffix}
    </div>
  );
}

export function TrustStrip() {
  return (
    <section className="bg-white py-12 px-4 relative overflow-hidden">
      {/* Soft overlay ambient glow */}
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />

      <div className="container-shell max-w-[1600px] mx-auto relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 flex items-center justify-center gap-1">
            <Sparkles className="h-3.5 w-3.5 fill-blue-100 text-blue-500" /> Trust Metrics
          </p>
          <h2 className="mt-1.5 text-xl md:text-2xl font-black tracking-tight text-slate-850 leading-tight">
            Trusted by Thousands Across India
          </h2>
        </div>

        {/* Stats Grid - 5 columns on desktop, flex-wrap on mobile */}
        <div className="grid grid-cols-2 gap-3.5 md:flex md:flex-wrap md:justify-center md:gap-5 max-w-6xl mx-auto">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="group relative glass-liquid-premium rounded-2xl p-5 text-center flex-1 min-w-[150px] md:max-w-[210px] flex flex-col justify-between border-white/50"
              >
                <span className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl border ${stat.color} transition-transform duration-350 group-hover:scale-105`}>
                  <Icon className="h-5 w-5 stroke-[2]" />
                </span>

                <div className="mt-5">
                  {stat.isNumeric ? (
                    <AnimatedCounter
                      value={stat.value as number}
                      prefix={stat.prefix}
                      suffix={stat.suffix as string}
                    />
                  ) : (
                    <div className="text-xl md:text-2xl font-black text-slate-800 leading-none tracking-tight">
                      {stat.text}
                    </div>
                  )}
                </div>

                <p className="mt-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
