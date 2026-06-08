import React from "react";
import { CheckCircle2, Coins } from "lucide-react";
import { getActiveHomepageSlides } from "@/lib/homepage-slides";
import { HomepageDynamicSliderClient } from "../homepage-dynamic-slider-client";

export async function HeroSearchSection() {
  const slides = await getActiveHomepageSlides();

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Full-width Admin Slider */}
      <div className="w-full">
        <div className="relative overflow-hidden">
          <HomepageDynamicSliderClient slides={slides} />
        </div>
      </div>

      {/* Floating Glass Cards overlay (desktop only) */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none z-20">
        
        {/* Left Floating Card */}
        <div className="absolute left-[8%] top-[25%] bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-3.5 shadow-[0_8px_32px_rgba(15,23,42,0.06)] flex items-center gap-3 animate-float-slow max-w-[210px]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5.5 w-5.5 stroke-[2.5]" />
          </span>
          <div className="text-left">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">CA Filed</p>
            <h4 className="text-xs font-black text-slate-800 mt-1 leading-none">ITR Return Filing</h4>
            <p className="text-[10px] font-bold text-emerald-600 mt-1 leading-none">✓ Successful</p>
          </div>
        </div>

        {/* Right Floating Card */}
        <div className="absolute right-[8%] top-[35%] bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-3.5 shadow-[0_8px_32px_rgba(15,23,42,0.06)] flex items-center gap-3 animate-float-medium max-w-[210px]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Coins className="h-5.5 w-5.5" />
          </span>
          <div className="text-left">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">Wallet Reward</p>
            <h4 className="text-xs font-black text-slate-800 mt-1 leading-none">₹200 Cashback</h4>
            <p className="text-[10px] font-bold text-blue-600 mt-1 leading-none">Points Credited</p>
          </div>
        </div>

      </div>
    </section>
  );
}
