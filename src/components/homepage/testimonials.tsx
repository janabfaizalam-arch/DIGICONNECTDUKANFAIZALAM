"use client";

import React, { useState, useEffect } from "react";
import { Star, CheckCircle, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Amit Kumar",
    location: "Lucknow",
    text: "Fast service and proper guidance. Maine PMEGP business loan file prepare karwayi thi. Verification within 2 hours me start ho gayi. Support team WhatsApp pe active rehti hai.",
    rating: 5,
  },
  {
    name: "Shabana Parveen",
    location: "Barabanki",
    text: "DigiConnect Dukan se PVC card order kiya tha. Card quality standard credit card jaisi hai, waterproof aur gloss finish. Deliver bhi direct address pe ho gaya.",
    rating: 5,
  },
  {
    name: "Rohit Verma",
    location: "Kanpur",
    text: "ITR aur GST registration process bahut easy ho gaya. Inka dynamic checkout ledger wallet discount clear dikhata hai. RNOS certified team is highly reliable.",
    rating: 5,
  },
  {
    name: "Priya Singh",
    location: "Delhi",
    text: "Passport application ke liye documents check karwaye the. Ek bhi mistake nahi nikli. First attempt me approved. Professional aur fast service.",
    rating: 5,
  },
  {
    name: "Rajesh Gupta",
    location: "Varanasi",
    text: "CIBIL score bahut low tha. Expert team ne step by step guide kiya aur 3 months me 150+ points improve ho gaye. Highly recommended for finance consultation.",
    rating: 5,
  },
];

const tabs = ["Customer Reviews", "Google Reviews"];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-white py-10 md:py-14 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 flex items-center justify-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            Customer Success
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Verified Reviews
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {tabs.map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(idx)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                activeTab === idx
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Carousel */}
        <div className="relative max-w-2xl mx-auto">
          <div className="relative h-56 md:h-48 flex items-center justify-center">
            {testimonials.map((test, index) => {
              const active = index === activeIndex;
              return (
                <div
                  key={index}
                  className={`absolute inset-0 flex flex-col justify-between p-6 rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-500 text-left ${
                    active
                      ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                      : "opacity-0 translate-y-4 scale-[0.97] pointer-events-none"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-0.5">
                        {Array.from({ length: test.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <Quote className="h-5 w-5 text-slate-200" />
                    </div>
                    <p className="text-xs md:text-sm font-medium text-slate-600 leading-relaxed italic">
                      &ldquo;{test.text}&rdquo;
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                    <div>
                      <span className="text-xs font-bold text-slate-800">{test.name}</span>
                      <span className="text-[10px] font-semibold text-slate-400 ml-2">• {test.location}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">
                      <CheckCircle className="h-3 w-3 stroke-[2.5]" /> Verified
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dot indicators */}
          <div className="mt-5 flex justify-center gap-1.5">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === activeIndex ? "w-6 bg-blue-600" : "w-1.5 bg-slate-200"
                }`}
                aria-label={`Go to review ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
