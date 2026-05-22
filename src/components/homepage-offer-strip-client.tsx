"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { BadgePercent } from "lucide-react";

import type { HomepageOfferBanner } from "@/lib/homepage-offer-banners";
import { cn } from "@/lib/utils";

function isExternalLink(link: string) {
  return /^https?:\/\//i.test(link);
}

export function HomepageOfferStripClient({
  title,
  banners,
}: {
  title: string;
  banners: HomepageOfferBanner[];
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: banners.length > 1, align: "start", duration: 28 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dots = useMemo(() => banners.map((_, index) => index), [banners]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || banners.length <= 1) return;

    const timer = window.setInterval(() => {
      emblaApi.scrollNext();
    }, 4200);

    return () => window.clearInterval(timer);
  }, [banners.length, emblaApi]);

  return (
    <section aria-label="Homepage offer strip" className="bg-white px-4 pb-7 pt-2 md:px-8 md:pb-9">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex items-center gap-2 px-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-600">
            <BadgePercent className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-sm font-extrabold text-slate-950 md:text-base">{title}</h2>
        </div>

        {banners.length ? (
          <div className="overflow-hidden rounded-[1.35rem] border border-blue-100 bg-slate-50 shadow-[0_12px_30px_rgba(37,99,235,0.08)]" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {banners.map((banner, index) => {
                const image = (
                  <div className="relative aspect-[2/1] w-full overflow-hidden bg-[linear-gradient(135deg,#eff6ff,#fff7ed)] md:aspect-[4.4/1]">
                    <Image
                      src={banner.image_url}
                      alt={banner.title || "DigiConnect offer banner"}
                      fill
                      priority={index === 0}
                      sizes="(min-width: 768px) 1280px, 100vw"
                      className="object-cover"
                    />
                  </div>
                );

                return (
                  <article key={banner.id} className="min-w-0 flex-[0_0_100%]">
                    {banner.link_url ? (
                      isExternalLink(banner.link_url) ? (
                        <a href={banner.link_url} target="_blank" rel="noopener noreferrer" aria-label={banner.title || "Open offer"}>
                          {image}
                        </a>
                      ) : (
                        <Link href={banner.link_url} aria-label={banner.title || "Open offer"}>
                          {image}
                        </Link>
                      )
                    ) : (
                      image
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-blue-100 bg-blue-50/45 px-5 py-7 text-center text-sm font-semibold text-slate-600">
            New offers will appear here soon.
          </div>
        )}

        {banners.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5">
            {dots.map((index) => (
              <button
                key={index}
                type="button"
                onClick={() => scrollTo(index)}
                aria-label={`Show offer banner ${index + 1}`}
                className={cn(
                  "h-1.5 rounded-full bg-blue-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                  selectedIndex === index ? "w-6 bg-gradient-to-r from-blue-600 to-orange-500" : "w-1.5",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
