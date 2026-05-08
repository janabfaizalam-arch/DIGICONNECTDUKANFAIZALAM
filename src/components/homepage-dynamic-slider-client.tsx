"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { HomepageSlide } from "@/lib/homepage-slides";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 4000;

type HomepageDynamicSliderClientProps = {
  slides: HomepageSlide[];
};

const ctaPositionClasses: Record<HomepageSlide["cta_position"], string> = {
  "bottom-left": "justify-start",
  "bottom-right": "justify-end",
  "bottom-center": "justify-center",
  "center-left": "justify-start",
  "center-right": "justify-end",
  hidden: "hidden",
};

function isExternalUrl(url: string) {
  return url.startsWith("https://");
}

function SlideCta({ slide }: { slide: HomepageSlide }) {
  const buttons = [
    {
      label: slide.cta_primary_label,
      url: slide.cta_primary_url,
      className:
        "bg-gradient-to-r from-blue-700 to-orange-500 text-white shadow-[0_18px_42px_rgba(15,23,42,0.24)] hover:from-blue-800 hover:to-orange-600",
    },
    {
      label: slide.cta_secondary_label,
      url: slide.cta_secondary_url,
      className:
        "border border-white/60 bg-white/82 text-slate-950 shadow-[0_16px_36px_rgba(15,23,42,0.18)] backdrop-blur-md hover:bg-white",
    },
  ].filter((button): button is { label: string; url: string; className: string } =>
    Boolean(button.label?.trim() && button.url?.trim()),
  );

  if (!buttons.length || slide.cta_position === "hidden") {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 px-4 py-3 sm:flex-row md:px-6",
        ctaPositionClasses[slide.cta_position],
      )}
    >
      {buttons.map((button) => {
        const className = cn(
          "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-center text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:min-h-12 md:px-6",
          button.className,
        );

        if (isExternalUrl(button.url)) {
          return (
            <a key={`${button.label}-${button.url}`} href={button.url} target="_blank" rel="noreferrer" className={className}>
              {button.label}
            </a>
          );
        }

        return (
          <Link key={`${button.label}-${button.url}`} href={button.url} className={className}>
            {button.label}
          </Link>
        );
      })}
    </div>
  );
}

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

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

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

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollPrev();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollNext();
    }
  }

  return (
    <section
      aria-label="Homepage promotions"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative px-3 pb-5 pt-3 outline-none sm:px-5 md:pb-8 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="relative overflow-hidden rounded-xl bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14)] ring-1 ring-blue-100 md:rounded-3xl">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {slides.map((slide, index) => {
                const hasCopy = Boolean(slide.title?.trim() || slide.subtitle?.trim());

                return (
                  <article key={slide.id} className="relative min-w-0 flex-[0_0_100%]">
                    <div className="relative bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_46%,#fff7ed_100%)]">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[radial-gradient(circle_at_18%_12%,rgba(37,99,235,0.1),transparent_30%),radial-gradient(circle_at_86%_78%,rgba(249,115,22,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,255,0.96))] sm:aspect-[8/3] md:rounded-3xl">
                      <Image
                        src={slide.mobile_image_url || slide.image_url}
                        alt={slide.title || "DigiConnect Dukan promotional poster"}
                        fill
                        priority={index === 0}
                        loading={index === 0 ? undefined : "lazy"}
                        sizes="100vw"
                        className="object-contain object-center p-1 sm:hidden"
                      />
                      <Image
                        src={slide.image_url}
                        alt=""
                        fill
                        priority={index === 0}
                        loading={index === 0 ? undefined : "lazy"}
                        sizes="(max-width: 1440px) 96vw, 1440px"
                        className="hidden object-contain object-center p-2 sm:block"
                      />

                      {hasCopy ? (
                        <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-slate-950/48 via-slate-950/10 to-transparent p-4 text-white md:p-8">
                          {slide.title ? <h2 className="max-w-3xl text-2xl font-black leading-tight md:text-5xl">{slide.title}</h2> : null}
                          {slide.subtitle ? <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/88 md:text-lg">{slide.subtitle}</p> : null}
                        </div>
                      ) : null}
                      </div>
                      <SlideCta slide={slide} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {slides.length > 1 ? (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-4 md:flex">
                <button
                  type="button"
                  aria-label="Previous homepage promotion"
                  onClick={scrollPrev}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/82 text-blue-700 shadow-lg backdrop-blur transition hover:bg-white hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next homepage promotion"
                  onClick={scrollNext}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/82 text-blue-700 shadow-lg backdrop-blur transition hover:bg-white hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>

              <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/50 bg-slate-950/22 px-3 py-2 backdrop-blur md:bottom-5">
                {scrollSnaps.map((index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Go to homepage promotion ${index + 1}`}
                    onClick={() => scrollTo(index)}
                    className={cn(
                      "relative h-2.5 overflow-hidden rounded-full bg-white/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                      selectedIndex === index ? "w-12" : "w-2.5 hover:bg-white/80",
                    )}
                  >
                    {selectedIndex === index ? (
                      <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-orange-400" style={{ width: `${progress}%` }} />
                    ) : null}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <p className="sr-only" aria-live="polite">
            Showing homepage promotion {selectedIndex + 1} of {slides.length}: {slides[selectedIndex]?.title ?? "Promotional poster"}
          </p>
        </div>
      </div>
    </section>
  );
}
