import { HomepageDynamicSliderClient } from "@/components/homepage-dynamic-slider-client";
import { getActiveHomepageSlides } from "@/lib/homepage-slides";

export async function HomepageDynamicSlider() {
  const slides = await getActiveHomepageSlides();

  if (!slides.length) {
    return null;
  }

  return <HomepageDynamicSliderClient slides={slides} />;
}
