"use client";

import React, { useEffect, useRef, useState } from "react";
import { Users, CheckCircle, Clock, Globe } from "lucide-react";

const stats = [
  { label: "Customers", value: 50000, suffix: "+", icon: Users, color: "bg-blue-50 text-blue-600" },
  { label: "Success Rate", value: 99.8, suffix: "%", icon: CheckCircle, color: "bg-emerald-50 text-emerald-600" },
  { label: "Support", value: "24x7", suffix: "", icon: Clock, color: "bg-orange-50 text-orange-600", isText: true },
  { label: "Coverage", value: "PAN India", suffix: "", icon: Globe, color: "bg-purple-50 text-purple-600", isText: true },
];

function AnimatedCounter({ value, suffix, isText }: { value: number | string; suffix: string; isText?: boolean }) {
  const [displayValue, setDisplayValue] = useState(isText ? String(value) : "0");
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isText || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const numValue = Number(value);
          const duration = 1200;
          const startTime = Date.now();

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

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
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, isText]);

  return (
    <div ref={ref} className="text-2xl md:text-3xl font-black text-slate-900 leading-none">
      {displayValue}{suffix}
    </div>
  );
}

export function TrustStrip() {
  return (
    <section className="bg-slate-50/50 py-10 md:py-16 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">Trust Metrics</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Trusted by Thousands Across India
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="group rounded-2xl border border-slate-100 bg-white p-5 md:p-6 text-center transition hover:shadow-md hover:-translate-y-0.5"
              >
                <span className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl ${stat.color} transition-transform group-hover:scale-105`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="mt-4">
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    isText={"isText" in stat && stat.isText}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
