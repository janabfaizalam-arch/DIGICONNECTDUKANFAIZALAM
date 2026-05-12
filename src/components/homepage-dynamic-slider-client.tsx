"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

import type { HomepageSlide } from "@/lib/homepage-slides";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 4000;

type HomepageDynamicSliderClientProps = {
  slides: HomepageSlide[];
};

export function HomepageDynamicSliderClient({ slides }: HomepageDynamicSliderClientProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: slides.length > 1, duration: 30 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const startedAtRef = useRef(Date.now());
  const pausedAtRef = useRef<number | null>(null);
  const scrollSnaps = useMemo(() => slides.map((_, index) => index), [slides]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setProgress(0);
      startedAtRef.current = Date.now();
      pausedAtRef.current = null;
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || slides.length <= 1) {
      return;
    }

    const tick = window.setInterval(() => {
      if (isPaused) {
        pausedAtRef.current ??= Date.now();
        return;
      }

      if (pausedAtRef.current) {
        startedAtRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }

      const elapsed = Date.now() - startedAtRef.current;
      const nextProgress = Math.min((elapsed / AUTOPLAY_MS) * 100, 100);
      setProgress(nextProgress);

      if (elapsed >= AUTOPLAY_MS) {
        emblaApi.scrollNext();
      }
    }, 80);

    return () => window.clearInterval(tick);
  }, [emblaApi, isPaused, slides.length]);

  return (
    <section
      aria-label="Homepage offer banners"
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative bg-white outline-none"
    >
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_46%,#fff7ed_100%)]">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {slides.map((slide, index) => (
              <article key={slide.id} className="relative min-w-0 flex-[0_0_100%]">
                <div className="relative aspect-[2/1] w-full overflow-hidden bg-slate-100 md:flex md:h-[clamp(520px,46vw,650px)] md:aspect-auto md:items-center md:justify-center md:bg-[radial-gradient(circle_at_14%_12%,rgba(37,99,235,0.16),transparent_30%),radial-gradient(circle_at_88%_16%,rgba(249,115,22,0.14),transparent_28%),linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7ed_100%)] md:p-4">
                  <Image
                    src={slide.mobile_image_url || slide.image_url}
                    alt={slide.title || "DigiConnect Dukan offer banner"}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? undefined : "lazy"}
                    sizes="100vw"
                    className="object-cover object-center sm:hidden"
                  />
                  <Image
                    src={slide.image_url}
                    alt={slide.title || "DigiConnect Dukan offer banner"}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? undefined : "lazy"}
                    sizes="100vw"
                    className="hidden object-contain object-center sm:block"
                  />
                </div>
              </article>
            ))}
          </div>
        </div>

        {slides.length > 1 ? (
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5 px-3">
            {scrollSnaps.map((index) => (
              <button
                key={index}
                type="button"
                aria-label={`Go to homepage offer ${index + 1}`}
                onClick={() => scrollTo(index)}
                className={cn(
                  "relative h-1.5 overflow-hidden rounded-full bg-white/65 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                  selectedIndex === index ? "w-5" : "w-1.5 hover:bg-white",
                )}
              >
                {selectedIndex === index ? (
                  <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-600 to-orange-400" style={{ width: `${progress}%` }} />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        <p className="sr-only" aria-live="polite">
          Showing homepage offer {selectedIndex + 1} of {slides.length}: {slides[selectedIndex]?.title ?? "Offer banner"}
        </p>
      </div>
    </section>
  );
}
