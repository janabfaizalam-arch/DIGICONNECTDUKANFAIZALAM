"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { prefersReducedMotion } from "@/lib/ap/a11y";
import type { PartnerAnnouncementBanner } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";

type AnnouncementSliderProps = {
  banners: PartnerAnnouncementBanner[];
  className?: string;
};

const ROTATE_MS = 6000;

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function Slide({ banner, priority }: { banner: PartnerAnnouncementBanner; priority: boolean }) {
  const alt = banner.title || "DC Partners announcement";
  const href = banner.button_url?.trim() || null;
  const hasOverlay = Boolean(banner.title || banner.description || banner.button_text);

  const overlay = hasOverlay ? (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent p-4 sm:p-6">
      {banner.title ? (
        <p className="text-sm font-bold leading-tight text-white sm:text-lg">{banner.title}</p>
      ) : null}
      {banner.description ? (
        <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-white/85 sm:text-sm">
          {banner.description}
        </p>
      ) : null}
      {banner.button_text && href ? (
        <span className="mt-3 inline-flex rounded-xl px-3.5 py-2 text-xs font-bold text-[#0a1834] [background-image:var(--dcp-g-accent)]">
          {banner.button_text}
        </span>
      ) : null}
    </div>
  ) : null;

  const media = (
    <>
      {/* Phone gets the portrait-friendly crop; desktop gets the wide hero. */}
      <div className="relative aspect-[7/3] w-full overflow-hidden bg-[var(--dcp-surface-3)] md:hidden">
        <Image
          src={banner.mobile_image_url || banner.image_url}
          alt={alt}
          fill
          sizes="100vw"
          className="object-cover"
          priority={priority}
        />
        {overlay}
      </div>
      {/*
        The ratio sets the height until the panel gets wide, then a cap takes
        over: at 1700px a 21:9 banner is 730px tall and owns the whole first
        screen. object-cover crops rather than squashes past the cap.
      */}
      <div className="relative hidden aspect-[16/9] max-h-[240px] w-full overflow-hidden bg-[var(--dcp-surface-3)] md:block">
        <Image
          src={banner.image_url}
          alt={alt}
          fill
          sizes="(max-width: 1600px) 100vw, 1600px"
          className="object-cover"
          priority={priority}
        />
        {overlay}
      </div>
    </>
  );

  if (!href) return media;

  return (
    <Link
      href={href}
      target={isExternalUrl(href) ? "_blank" : undefined}
      rel={isExternalUrl(href) ? "noopener noreferrer" : undefined}
      className="block rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] focus-visible:ring-offset-2"
    >
      {media}
    </Link>
  );
}

/**
 * The offers and announcements rail.
 *
 * All slides are laid out in one flex track and moved with a transform, so
 * changing slide is a compositor job rather than a swap of `<Image>` sources —
 * that is what stops the flash the old one-slide-at-a-time version had, and it
 * keeps the next banner already decoded.
 *
 * Auto-rotation stops while the pointer is over it, while focus is inside it,
 * and entirely when the reader asks for reduced motion.
 */
export function AnnouncementSlider({ banners, className }: AnnouncementSliderProps) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = banners.length;

  useEffect(() => {
    setReduceMotion(prefersReducedMotion());
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (!count) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1 || held || reduceMotion) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [count, held, reduceMotion]);

  if (!count) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Offers and announcements"
      className={cn("dcp-card dcp-solid relative overflow-hidden", className)}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX ?? null;
        touchStartX.current = null;
        if (start == null || end == null) return;
        const delta = end - start;
        if (Math.abs(delta) < 40) return;
        goTo(delta < 0 ? index + 1 : index - 1);
      }}
    >
      <div
        className={cn("flex w-full", !reduceMotion && "transition-transform duration-500 ease-out")}
        style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
      >
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            className="w-full shrink-0"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            // Off-screen slides keep their layout but leave the tab order, so a
            // keyboard never lands on a link that is scrolled out of view.
            aria-hidden={i !== index}
            inert={i !== index}
          >
            <Slide banner={banner} priority={i === 0} />
          </div>
        ))}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous announcement"
            onClick={() => goTo(index - 1)}
            className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--dcp-ink)] shadow-sm backdrop-blur transition duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] md:flex"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next announcement"
            onClick={() => goTo(index + 1)}
            className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--dcp-ink)] shadow-sm backdrop-blur transition duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] md:flex"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>

          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Go to announcement ${i + 1}`}
                aria-current={i === index}
                onClick={() => goTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  i === index ? "w-5 bg-white" : "w-2 bg-white/55 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
