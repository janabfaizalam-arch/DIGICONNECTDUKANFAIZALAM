"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeIndianRupee,
  CheckCircle2,
  Coins,
  FileCheck2,
  Gift,
  Headset,
  Infinity as InfinityIcon,
  Landmark,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OfferSlide = {
  eyebrow: string;
  title: string;
  subtitle: string;
  regularItems: Array<{
    label: string;
    value: string;
    strike?: boolean;
  }>;
  priceLabel: string;
  price: string;
  features: Array<{
    label: string;
    icon: LucideIcon;
  }>;
  visual: {
    icon: LucideIcon;
    accent: string;
    chips: string[];
  };
};

const AUTOPLAY_MS = 4000;

const offerSlides: OfferSlide[] = [
  {
    eyebrow: "Mega Business Combo",
    title: "ITR + MSME Combo Offer",
    subtitle: "Start your business, file your tax, and move faster with expert-backed digital processing.",
    regularItems: [
      { label: "ITR Filing", value: "₹1499", strike: true },
      { label: "MSME Registration", value: "₹1499", strike: true },
    ],
    priceLabel: "Combo Price",
    price: "₹699 ONLY",
    features: [
      { label: "Fast Process", icon: Zap },
      { label: "100% Secure", icon: ShieldCheck },
      { label: "Expert Support", icon: Headset },
      { label: "PAN India Service", icon: Landmark },
    ],
    visual: {
      icon: FileCheck2,
      accent: "from-blue-600 to-orange-500",
      chips: ["ITR", "MSME", "Udyam"],
    },
  },
  {
    eyebrow: "Refer & Earn",
    title: "Referral Bonus Offer",
    subtitle: "Invite more users to DigiConnect Dukan and earn instant rewards on every successful referral.",
    regularItems: [
      { label: "New Signup", value: "₹50 Bonus" },
      { label: "Refer Friend", value: "₹50 Bonus" },
    ],
    priceLabel: "Unlimited Rewards",
    price: "₹50 + ₹50",
    features: [
      { label: "Unlimited Rewards", icon: InfinityIcon },
      { label: "Instant Rewards", icon: Coins },
      { label: "Easy Referral", icon: UserPlus },
      { label: "Fast Signup", icon: Zap },
    ],
    visual: {
      icon: Gift,
      accent: "from-orange-500 to-blue-600",
      chips: ["Signup", "Refer", "Earn"],
    },
  },
];

function EmptyCtaArea() {
  return (
    <div className="relative min-h-[9.5rem] overflow-hidden rounded-[1.35rem] border border-white/35 bg-white/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-md md:min-h-[15rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(255,255,255,0.38),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.05))]" />
      <div className="relative flex h-full flex-col justify-end gap-3">
        <div className="h-12 rounded-full border border-white/35 bg-white/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]" />
        <div className="h-12 rounded-full border border-white/25 bg-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.36)]" />
      </div>
    </div>
  );
}

function FloatingReward({ className, children }: { className?: string; children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      animate={prefersReducedMotion ? undefined : { y: [0, -12, 0], rotate: [-2, 2, -2] }}
      transition={{ duration: 5.6, ease: "easeInOut", repeat: Infinity }}
      className={cn(
        "absolute flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/75 text-orange-500 shadow-[0_18px_42px_rgba(15,23,42,0.18)] backdrop-blur",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function HomepageOfferCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true, duration: 32 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const startedAtRef = useRef(Date.now());
  const pausedAtRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const scrollSnaps = useMemo(() => offerSlides.map((_, index) => index), []);

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
    if (!emblaApi || prefersReducedMotion) {
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
  }, [emblaApi, isPaused, prefersReducedMotion]);

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
      aria-label="DigiConnect Dukan promotional offers"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative isolate overflow-hidden px-0 pb-5 pt-3 outline-none sm:pt-4 md:pb-8"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(37,99,235,0.24),transparent_28rem),radial-gradient(circle_at_88%_12%,rgba(249,115,22,0.18),transparent_24rem),linear-gradient(180deg,rgba(248,251,255,0.96),rgba(235,245,255,0.78))]" />
      <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-5 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.6rem] border border-white/50 bg-slate-950 shadow-[0_28px_75px_rgba(15,23,42,0.22)] md:rounded-[2rem]">
          <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(115deg,rgba(255,255,255,0.2),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(249,115,22,0.28),transparent_26%),radial-gradient(circle_at_18%_78%,rgba(37,99,235,0.3),transparent_28%)]" />
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {offerSlides.map((slide, index) => {
                const VisualIcon = slide.visual.icon;
                const isActive = selectedIndex === index;

                return (
                  <article key={slide.title} className="relative min-w-0 flex-[0_0_100%]">
                    <div className="relative min-h-[40rem] overflow-hidden bg-[linear-gradient(132deg,#061a44_0%,#0a3e8e_47%,#f97316_140%)] px-4 py-5 text-white sm:min-h-[34rem] sm:px-7 md:min-h-[35rem] md:px-9 md:py-7 lg:min-h-[33rem]">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.24),transparent_25rem),radial-gradient(circle_at_92%_78%,rgba(255,122,0,0.34),transparent_24rem)]" />
                      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-orange-400/25 blur-3xl md:h-96 md:w-96" />
                      <div className="absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl md:h-80 md:w-80" />

                      <FloatingReward className="right-[9%] top-[18%]">
                        <BadgeIndianRupee className="h-6 w-6" />
                      </FloatingReward>
                      <FloatingReward className="bottom-[20%] right-[30%] hidden text-blue-600 sm:flex">
                        <Coins className="h-6 w-6" />
                      </FloatingReward>
                      <FloatingReward className="left-[5%] top-[52%] hidden text-orange-500 md:flex">
                        <Sparkles className="h-6 w-6" />
                      </FloatingReward>

                      <motion.div
                        animate={isActive && !prefersReducedMotion ? { scale: 1.012 } : { scale: 1 }}
                        transition={{ duration: 1.1, ease: "easeOut" }}
                        className="relative z-20 grid min-h-[37.5rem] gap-5 sm:min-h-[31.5rem] lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch"
                      >
                        <div className="flex min-w-0 flex-col">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="rounded-2xl border border-white/45 bg-white/92 px-3 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
                              <Image
                                src="/digiconnect-dukan-logo-original.png"
                                alt="DigiConnect Dukan"
                                width={405}
                                height={275}
                                priority={index === 0}
                                loading={index === 0 ? undefined : "lazy"}
                                sizes="(max-width: 640px) 118px, 160px"
                                className="h-auto w-[7.4rem] sm:w-[10rem]"
                              />
                            </div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/24 bg-white/14 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-orange-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur">
                              <Sparkles className="h-3.5 w-3.5 text-orange-300" />
                              {slide.eyebrow}
                            </span>
                          </div>

                          <motion.div
                            key={`${slide.title}-copy`}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.42, ease: "easeOut" }}
                            className="mt-7"
                          >
                            <h2 className="max-w-3xl text-balance text-[2.25rem] font-black leading-[0.95] tracking-normal text-white sm:text-5xl md:text-6xl">
                              {slide.title}
                            </h2>
                            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-blue-50/90 sm:text-base md:text-lg">
                              {slide.subtitle}
                            </p>
                          </motion.div>

                          <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {slide.regularItems.map((item) => (
                              <div
                                key={item.label}
                                className="rounded-[1.15rem] border border-white/28 bg-white/92 p-4 text-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                              >
                                <p className="text-sm font-black uppercase tracking-[0.08em] text-blue-800">{item.label}</p>
                                <div className="mt-2 flex items-center gap-3">
                                  <span
                                    className={cn(
                                      "text-2xl font-black text-slate-950",
                                      item.strike && "line-through decoration-red-600 decoration-[3px]",
                                    )}
                                  >
                                    {item.value}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 flex flex-wrap items-stretch gap-3">
                            <div className="flex min-h-20 flex-1 items-center justify-between gap-4 rounded-[1.25rem] bg-[linear-gradient(135deg,#facc15,#fb923c)] px-5 py-3 text-slate-950 shadow-[0_20px_45px_rgba(249,115,22,0.28)]">
                              <span className="text-sm font-black uppercase tracking-[0.08em] sm:text-base">{slide.priceLabel}</span>
                              <span className="text-3xl font-black leading-none text-white drop-shadow-[0_3px_0_rgba(154,52,18,0.45)] sm:text-5xl">
                                {slide.price}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {slide.features.map(({ label, icon: Icon }) => (
                              <div key={label} className="rounded-2xl border border-white/16 bg-white/12 px-3 py-3 text-center backdrop-blur">
                                <Icon className="mx-auto h-5 w-5 text-orange-300" />
                                <p className="mt-2 text-xs font-black uppercase leading-tight text-white">{label}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="relative grid gap-4 md:grid-cols-[1fr_0.68fr] lg:grid-cols-1">
                          <div className="relative min-h-[15rem] overflow-hidden rounded-[1.6rem] border border-white/28 bg-white/14 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_22px_55px_rgba(15,23,42,0.18)] backdrop-blur-md">
                            <div className={cn("absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br opacity-80 blur-2xl", slide.visual.accent)} />
                            <motion.div
                              aria-hidden="true"
                              animate={isActive && !prefersReducedMotion ? { y: [0, -10, 0] } : undefined}
                              transition={{ duration: 4.8, ease: "easeInOut", repeat: Infinity }}
                              className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-[2rem] bg-gradient-to-br from-white to-blue-50 text-blue-700 shadow-[0_20px_55px_rgba(15,23,42,0.2)]"
                            >
                              <VisualIcon className="h-16 w-16" />
                            </motion.div>
                            <div className="relative mt-6 flex flex-wrap justify-center gap-2">
                              {slide.visual.chips.map((chip) => (
                                <span key={chip} className="rounded-full border border-white/28 bg-white/16 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-white">
                                  {chip}
                                </span>
                              ))}
                            </div>
                            <div className="relative mt-6 grid grid-cols-3 gap-2">
                              {[0, 1, 2].map((item) => (
                                <div key={item} className="flex aspect-square items-center justify-center rounded-full bg-white/88 text-orange-500 shadow-lg">
                                  <CheckCircle2 className="h-6 w-6" />
                                </div>
                              ))}
                            </div>
                          </div>

                          <EmptyCtaArea />
                        </div>
                      </motion.div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center justify-between gap-4 sm:bottom-5 sm:left-6 sm:right-6">
            <div className="flex items-center gap-2">
              {scrollSnaps.map((index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to offer slide ${index + 1}`}
                  onClick={() => scrollTo(index)}
                  className={cn(
                    "relative h-2.5 overflow-hidden rounded-full bg-white/28 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                    selectedIndex === index ? "w-12" : "w-2.5 hover:bg-white/50",
                  )}
                >
                  {selectedIndex === index ? (
                    <span className="absolute inset-y-0 left-0 rounded-full bg-orange-400" style={{ width: `${progress}%` }} />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Previous promotional offer"
                onClick={scrollPrev}
                className="h-10 w-10 border border-white/24 bg-white/14 text-white backdrop-blur hover:bg-white/22"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Next promotional offer"
                onClick={scrollNext}
                className="h-10 w-10 border border-white/24 bg-white/14 text-white backdrop-blur hover:bg-white/22"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            Showing promotion {selectedIndex + 1} of {offerSlides.length}: {offerSlides[selectedIndex]?.title}
          </p>

          <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 h-1 bg-white/12">
            <div className="h-full bg-gradient-to-r from-orange-400 via-white to-blue-300 transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
