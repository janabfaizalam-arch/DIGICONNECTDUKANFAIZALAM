import React from "react";
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
      </div>
    </section>
  );
}
