"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import type { HomepageSlide, HomepageSlideCtaPosition } from "@/lib/homepage-slides";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 5000;
const PROGRESS_TICK_MS = 160;

type HomepageDynamicSliderClientProps = {
  slides: HomepageSlide[];
  /** Image-led compact carousel for embedding inside the Option 3 hero */
  compact?: boolean;
};

function isExternalLink(url: string) {
  return /^https?:\/\//i.test(url);
}

function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return null;
  }
  return trimmed;
}

function CtaLink({
  href,
  label,
  variant,
}: {
  href: string;
  label: string;
  variant: "primary" | "secondary";
}) {
  const className = cn(
    "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
    variant === "primary"
      ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-[0.98]"
      : "border border-slate-200 bg-white/95 text-slate-800 hover:border-blue-200 hover:bg-white",
  );

  if (isExternalLink(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function overlayAlign(position: HomepageSlideCtaPosition | null | undefined) {
  switch (position) {
    case "bottom-right":
    case "center-right":
      return "items-end text-right";
    case "bottom-center":
      return "items-center text-center";
    case "center-left":
    case "bottom-left":
    default:
      return "items-start text-left";
  }
}

export function HomepageDynamicSliderClient({ slides, compact = false }: HomepageDynamicSliderClientProps) {
  const limitedSlides = useMemo(() => slides.slice(0, 5), [slides]);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: limitedSlides.length > 1,
    duration: 28,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const startedAtRef = useRef(Date.now());
  const pausedAtRef = useRef<number | null>(null);
  const scrollSnaps = useMemo(() => limitedSlides.map((_, index) => index), [limitedSlides]);

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
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
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
    if (!emblaApi || limitedSlides.length <= 1 || prefersReducedMotion) return;

    const tick = window.setInterval(() => {
      if (isPaused) {
        pausedAtRef.current ??= Date.now();
        return;
      }
      if (pausedAtRef.current) {
        startedAtRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      if (Date.now() - startedAtRef.current >= AUTOPLAY_MS) {
        emblaApi.scrollNext();
      }
    }, PROGRESS_TICK_MS);

    return () => window.clearInterval(tick);
  }, [emblaApi, isPaused, prefersReducedMotion, limitedSlides.length]);

  if (!limitedSlides.length) return null;

  if (compact) {
    return (
      <section
        aria-roledescription="carousel"
        aria-label="Homepage campaign visuals"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative w-full overflow-hidden bg-[var(--home-navy)]"
      >
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {limitedSlides.map((slide, index) => {
              const src = slide.mobile_image_url || slide.image_url;
              const alt = slide.title?.trim() || "DigiConnect Dukan campaign visual";
              return (
                <article key={slide.id} className="relative min-w-0 flex-[0_0_100%]">
                  <div className="relative aspect-[5/4] w-full sm:aspect-[4/3] md:aspect-[5/4] md:max-h-[380px]">
                    <Image
                      src={src}
                      alt={alt}
                      fill
                      priority={index === 0}
                      loading={index === 0 ? undefined : "lazy"}
                      decoding="async"
                      sizes="(max-width: 768px) 100vw, 560px"
                      className="select-none object-cover object-center"
                      draggable={false}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        {limitedSlides.length > 1 ? (
          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
            {scrollSnaps.map((index) => (
              <button
                key={index}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => scrollTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  selectedIndex === index ? "w-5 bg-white" : "w-2 bg-white/45",
                )}
              />
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Homepage banners"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
      className="relative w-full overflow-hidden bg-white"
    >
      <div className="mx-auto w-full max-w-[1200px] px-0 sm:px-4 md:px-6">
        <div className="relative overflow-hidden bg-slate-900 sm:rounded-2xl md:rounded-3xl">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {limitedSlides.map((slide, index) => {
                const primaryUrl = sanitizeUrl(slide.cta_primary_url);
                const secondaryUrl = sanitizeUrl(slide.cta_secondary_url);
                const primaryLabel = slide.cta_primary_label?.trim() || (primaryUrl ? "Learn more" : null);
                const secondaryLabel = slide.cta_secondary_label?.trim() || null;
                const showOverlayContent = Boolean(slide.title?.trim() || slide.subtitle?.trim() || primaryUrl || secondaryUrl);
                const hideOverlay = slide.cta_position === "hidden" && !slide.title?.trim() && !slide.subtitle?.trim();
                const mobileSrc = slide.mobile_image_url || slide.image_url;
                const alt = slide.title?.trim() ? slide.title.trim() : "DigiConnect Dukan promotional banner";

                return (
                  <article key={slide.id} className="relative min-w-0 flex-[0_0_100%]" aria-roledescription="slide">
                    {/* Mobile: compact image + HTML content below (readable) */}
                    <div className="md:hidden">
                      <div className="relative aspect-[5/4] w-full overflow-hidden bg-slate-950 sm:aspect-[4/3]">
                        <Image
                          src={mobileSrc}
                          alt={alt}
                          fill
                          priority={index === 0}
                          loading={index === 0 ? undefined : "lazy"}
                          decoding="async"
                          sizes="100vw"
                          className="select-none object-cover object-center"
                          draggable={false}
                        />
                      </div>
                      {showOverlayContent && !hideOverlay ? (
                        <div className="space-y-3 bg-gradient-to-b from-slate-50 to-white px-4 py-4">
                          {slide.title?.trim() ? (
                            <h2 className="text-lg font-black leading-snug tracking-tight text-slate-900">
                              {slide.title.trim()}
                            </h2>
                          ) : null}
                          {slide.subtitle?.trim() ? (
                            <p className="line-clamp-2 text-sm font-semibold leading-relaxed text-slate-600">
                              {slide.subtitle.trim()}
                            </p>
                          ) : null}
                          {(primaryUrl && primaryLabel) || (secondaryUrl && secondaryLabel) ? (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {primaryUrl && primaryLabel ? (
                                <CtaLink href={primaryUrl} label={primaryLabel} variant="primary" />
                              ) : null}
                              {secondaryUrl && secondaryLabel ? (
                                <CtaLink href={secondaryUrl} label={secondaryLabel} variant="secondary" />
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {/* Desktop: controlled-height visual with HTML overlay CTAs */}
                    <div className="relative hidden md:block">
                      <div className="relative h-[min(48vw,480px)] max-h-[520px] min-h-[380px] w-full overflow-hidden bg-slate-950">
                        <Image
                          src={slide.image_url}
                          alt={alt}
                          fill
                          priority={index === 0}
                          loading={index === 0 ? undefined : "lazy"}
                          decoding="async"
                          sizes="(min-width: 1200px) 1200px, 100vw"
                          className="select-none object-cover object-center"
                          draggable={false}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent" />

                        {showOverlayContent && !hideOverlay ? (
                          <div
                            className={cn(
                              "absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 p-6 lg:p-8",
                              overlayAlign(slide.cta_position),
                            )}
                          >
                            {slide.title?.trim() ? (
                              <h2 className="max-w-xl text-2xl font-black leading-tight tracking-tight text-white drop-shadow lg:text-3xl">
                                {slide.title.trim()}
                              </h2>
                            ) : null}
                            {slide.subtitle?.trim() ? (
                              <p className="max-w-lg line-clamp-2 text-sm font-semibold leading-relaxed text-white/90 lg:text-base">
                                {slide.subtitle.trim()}
                              </p>
                            ) : null}
                            {(primaryUrl && primaryLabel) || (secondaryUrl && secondaryLabel) ? (
                              <div
                                className={cn(
                                  "pointer-events-auto flex flex-wrap gap-2 pt-1",
                                  slide.cta_position === "bottom-center" && "justify-center",
                                  (slide.cta_position === "bottom-right" || slide.cta_position === "center-right") &&
                                    "justify-end",
                                )}
                              >
                                {primaryUrl && primaryLabel ? (
                                  <CtaLink href={primaryUrl} label={primaryLabel} variant="primary" />
                                ) : null}
                                {secondaryUrl && secondaryLabel ? (
                                  <CtaLink href={secondaryUrl} label={secondaryLabel} variant="secondary" />
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {limitedSlides.length > 1 ? (
            <>
              <div className="absolute inset-x-0 bottom-3 z-20 hidden items-center justify-center gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollPrev()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaused((p) => !p)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label={isPaused || prefersReducedMotion ? "Play banner autoplay" : "Pause banner autoplay"}
                >
                  {isPaused || prefersReducedMotion ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollNext()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label="Next banner"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="absolute inset-x-0 bottom-2 z-20 flex items-center justify-center md:bottom-auto md:top-3 md:justify-end md:px-4">
                <div className="flex items-center gap-1.5 rounded-full bg-black/25 px-2 py-1.5 backdrop-blur-sm md:bg-black/30">
                  {scrollSnaps.map((index) => {
                    const active = selectedIndex === index;
                    return (
                      <button
                        key={index}
                        type="button"
                        aria-label={`Go to slide ${index + 1}`}
                        aria-current={active ? "true" : undefined}
                        onClick={() => scrollTo(index)}
                        className={cn(
                          "h-2 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                          active ? "w-5 bg-white" : "w-2 bg-white/45 hover:bg-white/70",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          <p className="sr-only" aria-live="polite">
            Showing banner {selectedIndex + 1} of {limitedSlides.length}
            {limitedSlides[selectedIndex]?.title ? `: ${limitedSlides[selectedIndex]?.title}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
