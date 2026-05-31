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
      aria-label="Homepage offer banners"
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative bg-white outline-none"
    >
      <div className="relative overflow-hidden rounded-2xl mx-3 md:mx-0 md:rounded-none bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_46%,#fff7ed_100%)]">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {slides.map((slide, index) => {
              const clickLink = slide.cta_primary_url?.trim();
              const banner = (
                <div className="relative w-full overflow-hidden bg-slate-100 aspect-[16/9] max-h-[320px] md:max-h-[540px] md:aspect-[21/9]">
                  <Image
                    src={slide.mobile_image_url || slide.image_url}
                    alt={slide.title || "DigiConnect Dukan offer banner"}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? undefined : "lazy"}
                    decoding="async"
                    sizes="100vw"
                    className="select-none object-contain object-center sm:hidden"
                    draggable={false}
                  />
                  <Image
                    src={slide.image_url}
                    alt={slide.title || "DigiConnect Dukan offer banner"}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? undefined : "lazy"}
                    decoding="async"
                    sizes="(min-width: 1280px) 1280px, 100vw"
                    className="hidden select-none object-contain object-center sm:block"
                    draggable={false}
                  />
                </div>
              );

              return (
                <article key={slide.id} className="relative min-w-0 flex-[0_0_100%]">
                  {clickLink ? (
                    isExternalLink(clickLink) ? (
                      <a href={clickLink} target="_blank" rel="noopener noreferrer" aria-label="Open homepage offer">
                        {banner}
                      </a>
                    ) : (
                      <Link href={clickLink} aria-label="Open homepage offer">
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
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5 px-3">
            {scrollSnaps.map((index) => (
              <button
                key={index}
                type="button"
                aria-label={`Go to homepage offer ${index + 1}`}
                onClick={() => scrollTo(index)}
                className={cn(
                  "relative h-1.5 overflow-hidden rounded-full bg-white/65 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                  selectedIndex === index ? "w-5" : "w-1.5 md:hover:bg-white",
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
