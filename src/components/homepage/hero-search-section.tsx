import React from "react";
import { Search, Sparkles } from "lucide-react";
import { getActiveHomepageSlides } from "@/lib/homepage-slides";
import { HomepageDynamicSliderClient } from "../homepage-dynamic-slider-client";

export async function HeroSearchSection() {
  const slides = await getActiveHomepageSlides();

  return (
    <section className="relative overflow-hidden bg-white pb-6 pt-1 md:pb-8">
      {/* 3D decorative background elements */}
      <div className="absolute top-10 left-10 -z-10 h-64 w-64 rounded-full bg-blue-150/15 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 -z-10 h-64 w-64 rounded-full bg-orange-150/10 blur-[80px] pointer-events-none" />

      {/* Main Slider */}
      <div className="container-shell">
        <div className="relative rounded-[2rem] overflow-hidden border border-slate-100 shadow-[0_8px_32px_rgba(15,23,42,0.02)]">
          <HomepageDynamicSliderClient slides={slides} />
          
          {/* Subtle overlay accent */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Premium Floating Search Prompt Bar */}
        <div className="relative -mt-6 z-20 mx-auto max-w-2xl px-4">
          <div className="rounded-2xl border border-white/40 bg-white/75 p-3.5 shadow-[0_16px_36px_rgba(7,19,38,0.06)] backdrop-blur-xl flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Search className="h-4.5 w-4.5" />
              </span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 leading-tight">AI Service Finder</h4>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">Fuzzy search over 23+ Tax, Loan & PVC Card services</p>
              </div>
            </div>
            <a 
              href="#ai-finder" 
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-4 text-xs font-extrabold text-white hover:bg-slate-900 transition active:scale-95 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-orange-400" />
              Start Search
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
