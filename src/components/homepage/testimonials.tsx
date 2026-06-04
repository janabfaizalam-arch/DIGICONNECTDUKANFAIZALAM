"use client";

import React, { useState, useEffect } from "react";
import { Star, CheckCircle, Quote, Sparkles } from "lucide-react";

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
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-slate-50/50 py-12 px-3 overflow-hidden">
      <div className="container-shell">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-blue-700 shadow-sm border border-blue-100">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            Customer Success
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4.5xl leading-tight">
            Verified Reviews
          </h2>
        </div>

        {/* Carousel Slider */}
        <div className="relative max-w-2xl mx-auto">
          <div className="relative h-56 md:h-48 flex items-center justify-center">
            {testimonials.map((test, index) => {
              const active = index === activeIndex;
              return (
                <div
                  key={index}
                  className={`absolute inset-0 flex flex-col justify-between p-6 rounded-3xl border border-slate-150 bg-white shadow-md transition-all duration-500 text-left ${
                    active 
                      ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" 
                      : "opacity-0 translate-y-4 scale-95 pointer-events-none"
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
                    <p className="text-xs md:text-sm font-semibold text-slate-650 leading-relaxed italic">
                      &ldquo;{test.text}&rdquo;
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-xs font-black text-slate-800">{test.name}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-2">• {test.location}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">
                      <CheckCircle className="h-3 w-3 stroke-[3]" /> Verified customer
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots Indicator */}
          <div className="mt-5 flex justify-center gap-1.5">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === activeIndex ? "w-5 bg-blue-600" : "w-1.5 bg-slate-300"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
