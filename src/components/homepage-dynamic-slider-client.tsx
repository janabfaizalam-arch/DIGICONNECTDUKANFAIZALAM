"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

import type { HomepageSlide } from "@/lib/homepage-slides";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 4000;
const PROGRESS_TICK_MS = 160;

type HomepageDynamicSliderClientProps = {
  slides: HomepageSlide[];
};

function isExternalLink(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function HomepageDynamicSliderClient({ slides }: HomepageDynamicSliderClientProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: slides.length > 1, duration: 30 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
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
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

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
    if (!emblaApi || slides.length <= 1 || prefersReducedMotion) {
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
    }, PROGRESS_TICK_MS);

    return () => window.clearInterval(tick);
  }, [emblaApi, isPaused, prefersReducedMotion, slides.length]);

  return (
    <section
      aria-label="Homepage banners"
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative w-full overflow-hidden bg-white outline-none"
    >
      <div className="relative overflow-hidden w-full bg-slate-900">
        <div className="overflow-hidden w-full" ref={emblaRef}>
          <div className="flex touch-pan-y w-full">
            {slides.map((slide, index) => {
              const clickLink = slide.cta_primary_url?.trim();
              const banner = (
                <div className="relative w-full overflow-hidden bg-slate-950 aspect-[2/1] md:aspect-[1920/720]">
                  <Image
                    src={slide.mobile_image_url || slide.image_url}
                    alt={slide.title || "DigiConnect Dukan banner"}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? undefined : "lazy"}
                    decoding="async"
                    sizes="100vw"
                    className="select-none object-cover object-center sm:hidden"
                    draggable={false}
                  />
                  <Image
                    src={slide.image_url}
                    alt={slide.title || "DigiConnect Dukan banner"}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? undefined : "lazy"}
                    decoding="async"
                    sizes="(min-width: 1600px) 1600px, 100vw"
                    className="hidden select-none object-cover object-center sm:block"
                    draggable={false}
                  />
                </div>
              );

              return (
                <article key={slide.id} className="relative min-w-0 flex-[0_0_100%] w-full">
                  {clickLink ? (
                    isExternalLink(clickLink) ? (
                      <a href={clickLink} target="_blank" rel="noopener noreferrer" aria-label="Open offer banner" className="block w-full">
                        {banner}
                      </a>
                    ) : (
                      <Link href={clickLink} aria-label="Open offer banner" className="block w-full">
                        {banner}
                      </Link>
                    )
                  ) : (
                    banner
                  )}
                </article>
              );
            })}
          </div>
        </div>

        {slides.length > 1 ? (
          <div className="absolute inset-x-0 bottom-6 flex items-center justify-center px-3 z-20">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/15 border border-white/15 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]">
              {scrollSnaps.map((index) => {
                const active = selectedIndex === index;
                return (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Go to slide ${index + 1}`}
                    onClick={() => scrollTo(index)}
                    className={cn(
                      "relative h-2 rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white cursor-pointer",
                      active 
                        ? "w-8 bg-white shadow-[0_2px_8px_rgba(255,255,255,0.4)]" 
                        : "w-2 bg-white/35 hover:bg-white/60"
                    )}
                  >
                    {active ? (
                      <span 
                        className="absolute inset-y-0 left-0 rounded-full bg-white/40" 
                        style={{ 
                          width: `${progress}%`,
                          transition: progress === 0 ? "none" : "width 160ms linear"
                        }} 
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <p className="sr-only" aria-live="polite">
          Showing banner {selectedIndex + 1} of {slides.length}: {slides[selectedIndex]?.title ?? "Banner"}
        </p>
      </div>
    </section>
  );
}
