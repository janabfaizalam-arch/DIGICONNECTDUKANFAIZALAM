import React from "react";
import { getActiveHomepageSlides } from "@/lib/homepage-slides";
import { HomepageDynamicSliderClient } from "../homepage-dynamic-slider-client";

export async function HeroSearchSection() {
  const slides = await getActiveHomepageSlides();

  if (!slides || slides.length === 0) {
    return null;
  }

  return (
    <div className="w-full relative z-10">
      <HomepageDynamicSliderClient slides={slides} />
    </div>
  );
}
