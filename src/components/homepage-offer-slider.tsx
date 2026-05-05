"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BadgePercent, MessageCircle, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { createServiceWhatsAppMessage, getCategoryBySlug, getServiceBySlug, type ServiceItem } from "@/lib/services-data";

type OfferSlide = {
  title: string;
  slug?: string;
  shortDescription: string;
  oldPrice?: string;
  offerPrice?: string;
  priceLabel: string;
  cta: "Apply Now" | "Enquiry Now";
  href?: string;
  icon: ServiceItem["icon"];
};

const fixedOfferSlugs = ["pan-card", "gst-registration", "itr-filing", "msme-certificate", "passport-assistance"];

function getFixedOffer(slug: string): OfferSlide | null {
  const service = getServiceBySlug(slug);

  if (!service) {
    return null;
  }

  return {
    title: service.title,
    slug: service.slug,
    shortDescription: service.shortDescription,
    oldPrice: service.oldPrice,
    offerPrice: service.offerPrice,
    priceLabel: service.offerPrice ?? service.priceLabel,
    cta: "Apply Now",
    href: `/services/${service.slug}`,
    icon: service.icon,
  };
}

function makeEnquiryHref(title: string) {
  return generateWhatsAppLink("917007595931", createServiceWhatsAppMessage(title));
}

export function HomepageOfferSlider() {
  const slides = useMemo<OfferSlide[]>(() => {
    const insuranceCategory = getCategoryBySlug("insurance");
    const financeCategory = getCategoryBySlug("finance-banking");
    const offers = fixedOfferSlugs.map(getFixedOffer).filter((item): item is OfferSlide => Boolean(item));

    return [
      ...offers,
      {
        title: "All Vehicle Insurance",
        shortDescription: "Bike, car, commercial, renewal, and claim assistance in one place.",
        priceLabel: "Enquiry Now",
        cta: "Enquiry Now",
        href: makeEnquiryHref("All Vehicle Insurance"),
        icon: insuranceCategory?.icon ?? BadgePercent,
      },
      {
        title: "Government Subsidy Loans",
        shortDescription: "PMEGP, Mudra, Vishwakarma, MSME, agriculture, and self-employment loan guidance.",
        priceLabel: "Enquiry Now",
        cta: "Enquiry Now",
        href: makeEnquiryHref("Government Subsidy Loans"),
        icon: financeCategory?.icon ?? BadgePercent,
      },
    ];
  }, []);

  const [activeIndex, setActiveIndex] = useState(0);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const activeSlide = slides[activeIndex];
  const autoplayDelayMs = 3000;
  const lastInteractionRef = useRef(0);

  function goToSlide(index: number) {
    const nextIndex = (index + slides.length) % slides.length;
    lastInteractionRef.current = Date.now();
    setActiveIndex(nextIndex);
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      const recentlyInteracted = Date.now() - lastInteractionRef.current < 1200;

      if (!recentlyInteracted) {
        setActiveIndex((current) => (current + 1) % slides.length);
      }
    }, autoplayDelayMs);

    return () => window.clearInterval(interval);
  }, [slides.length]);

  function handlePointerDown(clientX: number) {
    setDragStart(clientX);
    setDragOffset(0);
    lastInteractionRef.current = Date.now();
  }

  function handlePointerMove(clientX: number) {
    if (dragStart === null) {
      return;
    }

    setDragOffset(clientX - dragStart);
  }

  function handlePointerEnd() {
    if (dragStart === null) {
      return;
    }

    if (dragOffset > 42) {
      goToSlide(activeIndex - 1);
    } else if (dragOffset < -42) {
      goToSlide(activeIndex + 1);
    }

    setDragStart(null);
    setDragOffset(0);
  }

  return (
    <section className="px-0 pb-6 md:pb-10">
      <div className="container-shell">
        <div className="glass-panel overflow-hidden rounded-[1.75rem] border border-white/10 p-4 shadow-liquid md:rounded-[2rem] md:p-6">
          <div className="relative z-10 grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
            <div className="px-1 md:px-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">
                <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                Limited Time Offers
              </p>
              <h2 className="mt-4 text-2xl font-bold leading-tight text-slate-950 md:text-4xl">
                Best deals for fast online services
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
                Save on popular DigiConnect Dukan services, or send a WhatsApp enquiry for insurance and government subsidy loan guidance.
              </p>
            </div>

            <div className="min-w-0">
              <div
                className="overflow-hidden rounded-[1.45rem]"
                onPointerDown={(event) => handlePointerDown(event.clientX)}
                onPointerMove={(event) => handlePointerMove(event.clientX)}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onTouchStart={(event) => handlePointerDown(event.touches[0]?.clientX ?? 0)}
                onTouchMove={(event) => handlePointerMove(event.touches[0]?.clientX ?? 0)}
                onTouchEnd={handlePointerEnd}
              >
                <div
                  className={cn("flex transition-transform duration-500 ease-out", dragStart !== null && "transition-none")}
                  style={{
                    transform: `translateX(calc(-${activeIndex * 100}% + ${dragOffset}px))`,
                  }}
                >
                  {slides.map((slide) => {
                    const Icon = slide.icon;

                    return (
                      <article key={slide.title} className="min-w-full px-0.5">
                        <div className="liquid-card grid min-h-[18.5rem] gap-5 rounded-[1.45rem] p-5 sm:min-h-[17rem] sm:grid-cols-[1fr_auto] sm:items-center md:p-6">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.2)]">
                                <Icon className="h-5 w-5" />
                              </span>
                              <span className="rounded-full border border-orange-200/80 bg-orange-50/85 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-orange-700">
                                Limited Time Offer
                              </span>
                            </div>
                            <h3 className="mt-5 text-2xl font-bold leading-tight text-slate-950 md:text-3xl">{slide.title}</h3>
                            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 md:text-base">{slide.shortDescription}</p>
                            <div className="mt-5 flex flex-wrap items-baseline gap-3">
                              {slide.oldPrice ? <span className="text-sm font-bold text-slate-400 line-through">{slide.oldPrice}</span> : null}
                              <span className="text-2xl font-extrabold text-orange-600">{slide.offerPrice ?? slide.priceLabel}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 sm:w-44">
                            {slide.cta === "Apply Now" && slide.href ? (
                              <Link href={slide.href} className="premium-button premium-button-blue">
                                Apply Now
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            ) : (
                              <a href={slide.href} target="_blank" rel="noreferrer" className="premium-button premium-button-whatsapp">
                                Enquiry Now
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.title}
                      type="button"
                      aria-label={`Go to ${slide.title} offer`}
                      onClick={() => goToSlide(index)}
                      className={cn(
                        "h-2.5 rounded-full transition-all",
                        activeIndex === index ? "w-8 bg-orange-500" : "w-2.5 bg-slate-300 hover:bg-blue-300",
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous offer"
                    onClick={() => goToSlide(activeIndex - 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/75 text-blue-700 shadow-soft transition hover:-translate-y-0.5 hover:text-orange-600"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next offer"
                    onClick={() => goToSlide(activeIndex + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/75 text-blue-700 shadow-soft transition hover:-translate-y-0.5 hover:text-orange-600"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="sr-only" aria-live="polite">
                Showing offer {activeIndex + 1} of {slides.length}: {activeSlide.title}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
