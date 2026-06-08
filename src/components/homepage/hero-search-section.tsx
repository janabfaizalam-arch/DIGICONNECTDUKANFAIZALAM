import React from "react";
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
    </section>
  );
}
