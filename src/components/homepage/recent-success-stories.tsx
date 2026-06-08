"use client";

import React from "react";
import { CheckCircle } from "lucide-react";

const recentCompletions = [
  { service: "GST Registration", location: "Lucknow", time: "2 hours ago" },
  { service: "ITR Filing", location: "Kanpur", time: "3 hours ago" },
  { service: "Passport Application", location: "Delhi", time: "5 hours ago" },
  { service: "PM Vishwakarma", location: "Barabanki", time: "6 hours ago" },
  { service: "Driving Licence", location: "Varanasi", time: "8 hours ago" },
  { service: "PVC Smart Card", location: "Mumbai", time: "10 hours ago" },
  { service: "CIBIL Analysis", location: "Hyderabad", time: "12 hours ago" },
  { service: "GST Return Filing", location: "Jaipur", time: "1 day ago" },
];

export function RecentSuccessStories() {
  return (
    <section className="bg-slate-50/50 py-10 md:py-14 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600 flex items-center justify-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            Live Activity
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Recently Completed Applications
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Real applications processed by our team — privacy-safe activity feed.
          </p>
        </div>

        {/* Horizontal scroll of completion cards */}
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 snap-x snap-mandatory">
          {recentCompletions.map((item, idx) => (
            <div
              key={idx}
              className="w-[200px] md:w-[220px] shrink-0 snap-start rounded-2xl border border-emerald-100/80 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Completed</span>
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-800 leading-tight">
                {item.service}
              </h4>
              <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                <span>{item.location}</span>
                <span>{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
