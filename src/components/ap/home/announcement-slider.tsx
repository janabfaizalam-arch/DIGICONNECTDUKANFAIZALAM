"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PartnerAnnouncementBanner } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";

type AnnouncementSliderProps = {
  banners: PartnerAnnouncementBanner[];
};

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export function AnnouncementSlider({ banners }: AnnouncementSliderProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = banners.length;

  const goTo = useCallback(
    (next: number) => {
      if (!count) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(() => goTo(index + 1), 5500);
    return () => window.clearInterval(timer);
  }, [count, goTo, index, paused]);

  if (!count) return null;

  const current = banners[index];
  const href = current.button_url?.trim() || null;

  const slideInner = (
    <div className="relative aspect-[21/9] w-full min-h-[140px] overflow-hidden bg-slate-100 sm:min-h-[180px] md:min-h-[220px]">
      <Image
        src={current.image_url}
        alt={current.title || "Partner announcement"}
        fill
        priority={index === 0}
        sizes="100vw"
        className={cn("object-cover", current.mobile_image_url ? "hidden md:block" : "block")}
      />
      {current.mobile_image_url ? (
        <Image
          src={current.mobile_image_url}
          alt={current.title || "Partner announcement"}
          fill
          sizes="100vw"
          className="object-cover md:hidden"
        />
      ) : null}
      {(current.title || current.description || current.button_text) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 via-slate-950/25 to-transparent p-4 sm:p-6">
          {current.title ? (
            <p className="text-sm font-extrabold text-white sm:text-lg">{current.title}</p>
          ) : null}
          {current.description ? (
            <p className="mt-1 line-clamp-2 text-xs font-medium text-white/85 sm:text-sm">{current.description}</p>
          ) : null}
          {current.button_text && href ? (
            <span className="mt-3 inline-flex rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">
              {current.button_text}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <section
      aria-label="Partner announcements"
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
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
      {href ? (
        <Link
          href={href}
          target={isExternalUrl(href) ? "_blank" : undefined}
          rel={isExternalUrl(href) ? "noopener noreferrer" : undefined}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          {slideInner}
        </Link>
      ) : (
        slideInner
      )}

      {count > 1 ? (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Go to announcement ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={cn(
                "h-2 w-2 rounded-full transition",
                i === index ? "bg-white" : "bg-white/50 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
