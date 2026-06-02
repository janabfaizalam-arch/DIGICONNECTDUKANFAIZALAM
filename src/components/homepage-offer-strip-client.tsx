"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { BadgePercent, ArrowRight } from "lucide-react";

import type { HomepageOfferBanner } from "@/lib/homepage-offer-banners";
import { cn } from "@/lib/utils";

// 8 Premium Marketing Creatives designed in HTML/CSS
const fallbackBanners = [
  {
    title: "ITR AY 2026-27 Now Open",
    tag: "TAX Compliance",
    desc: "File Income Tax Return online with expert guided support. Maximize your refunds.",
    cta: "File ITR Now",
    gradient: "from-[#071326] via-[#0d2a52] to-[#1e3a8a]",
    accent: "bg-[#FF8A00]",
    href: "/services/itr-filing",
    icon: "💰"
  },
  {
    title: "GST Registration Offer",
    tag: "GST Services",
    desc: "Register your business online. Get verified GSTIN in 3 days. CA-assisted process.",
    cta: "Apply GSTIN",
    gradient: "from-[#047857] via-[#059669] to-[#10b981]",
    accent: "bg-[#f59e0b]",
    href: "/services/gst-registration-filing",
    icon: "📋"
  },
  {
    title: "PM Vishwakarma Yojana",
    tag: "Govt Scheme",
    desc: "Get toolkit incentives, skill training, and subsidized loan support. Apply now.",
    cta: "Apply Now",
    gradient: "from-[#78350f] via-[#b45309] to-[#f59e0b]",
    accent: "bg-[#1e3a8a]",
    href: "/services/pm-vishwakarma-yojana",
    icon: "🏗️"
  },
  {
    title: "Premium Credit Card Offers",
    tag: "Financials",
    desc: "Apply for HDFC, SBI, ICICI, Axis. Instant digital approvals and reward benefits.",
    cta: "Check Eligibility",
    gradient: "from-[#312e81] via-[#4f46e5] to-[#818cf8]",
    accent: "bg-[#FF8A00]",
    href: "/services/credit-cards",
    icon: "💳"
  },
  {
    title: "Passport Services Made Simple",
    tag: "Documentation",
    desc: "Fresh application and renewal assistance. Quick slot booking & document check.",
    cta: "Apply Passport",
    gradient: "from-[#0f172a] via-[#1e293b] to-[#475569]",
    accent: "bg-[#ea580c]",
    href: "/services/passport",
    icon: "🛂"
  },
  {
    title: "PVC Smart Card Printing",
    tag: "Identity Print",
    desc: "Order high-resolution, waterproof wallet-sized PVC smart card of Aadhaar/PAN.",
    cta: "Order PVC",
    gradient: "from-[#164e63] via-[#0891b2] to-[#06b6d4]",
    accent: "bg-[#FF8A00]",
    href: "/services/pvc-card",
    icon: "🪪"
  },
  {
    title: "MSME Registration Assistance",
    tag: "Business Udyam",
    desc: "Register under MSME online. Unlock exclusive bank credit subsidies & schemes.",
    cta: "Apply MSME",
    gradient: "from-[#500724] via-[#be185d] to-[#db2777]",
    accent: "bg-[#2563eb]",
    href: "/services/msme-registration",
    icon: "🚀"
  },
  {
    title: "All Vehicle Insurance Services",
    tag: "Protection",
    desc: "Instant renewal for car, bike & commercial. Cashless claims & lowest premiums.",
    cta: "Get Quote",
    gradient: "from-[#0c4a6e] via-[#0284c7] to-[#0ea5e9]",
    accent: "bg-[#10b981]",
    href: "/services/insurance",
    icon: "🛡️"
  }
];

export function HomepageOfferStripClient({
  title,
  banners,
}: {
  title: string;
  banners: HomepageOfferBanner[];
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start", duration: 30 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const hasDbBanners = banners && banners.length > 0;
  const listToRender = hasDbBanners ? banners : fallbackBanners;
  const dots = useMemo(() => listToRender.map((_, index) => index), [listToRender]);

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
    if (!emblaApi) return;
    const timer = window.setInterval(() => {
      emblaApi.scrollNext();
    }, 4500);
    return () => window.clearInterval(timer);
  }, [emblaApi]);

  return (
    <section aria-label="Featured offers" className="bg-white px-3 py-4 md:px-6 md:py-6 animate-fade-in">
      <div className="container-shell">
        <div className="overflow-hidden rounded-[24px] border border-blue-50/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.4))] p-4 shadow-[0_8px_32px_rgba(7,19,38,0.04)] backdrop-blur-md">
          {/* Header Row */}
          <div className="mb-4 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                <BadgePercent className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-sm font-black tracking-tight text-[#071326] md:text-base">
                {title || "Featured Offers"}
              </h2>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-0.5 text-xs font-bold text-[#2563EB] hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Embla Carousel viewport */}
          <div className="overflow-hidden rounded-[24px]" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {listToRender.map((banner, index) => (
                <div key={index} className="min-w-0 flex-[0_0_100%] px-1 select-none">
                  {"href" in banner ? (
                    // Fallback local marketing creatives
                    <Link
                      href={banner.href}
                      className="group relative flex h-[190px] md:h-[240px] w-full flex-col justify-between overflow-hidden rounded-[24px] bg-gradient-to-r p-5 text-white border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_36px_rgba(7,19,38,0.12)] cursor-pointer"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient} opacity-95 transition-all duration-500 group-hover:scale-105`} />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(255,255,255,0.1),transparent_40%)] pointer-events-none" />
                      
                      <div className="relative z-10 flex h-full flex-col justify-between">
                        {/* Top bar */}
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] backdrop-blur-sm">
                            {banner.tag}
                          </span>
                          <span className="text-xl leading-none">{banner.icon}</span>
                        </div>

                        {/* Mid-content */}
                        <div className="my-2 max-w-[88%] sm:max-w-[75%] md:max-w-[65%]">
                          <h3 className="text-sm md:text-xl font-black leading-tight tracking-tight text-white transition group-hover:translate-x-0.5">
                            {banner.title}
                          </h3>
                          <p className="mt-1 block truncate text-[10px] md:text-xs font-semibold text-white/70">
                            {banner.desc}
                          </p>
                        </div>

                        {/* Bottom bar */}
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex h-8 items-center justify-center rounded-full ${banner.accent} px-4 py-1.5 text-xs font-black text-white shadow-sm transition-transform active:scale-[0.95]`}>
                            {banner.cta}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-white/40">
                            DigiConnect Dukan
                          </span>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    // Supabase Database-uploaded banners
                    <Link
                      href={banner.link_url || "/services"}
                      className="relative block h-[190px] md:h-[240px] w-full overflow-hidden rounded-[24px] shadow-[0_12px_36px_rgba(7,19,38,0.12)] border border-slate-100/50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.image_url}
                        alt={banner.title || "DigiConnect offer banner"}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-103"
                        draggable={false}
                      />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="mt-3.5 flex justify-center gap-1.5">
            {dots.map((index) => (
              <button
                key={index}
                type="button"
                onClick={() => scrollTo(index)}
                aria-label={`Show offer banner ${index + 1}`}
                className={cn(
                  "h-1 rounded-full bg-blue-100 transition-all duration-300 focus-visible:outline-none",
                  selectedIndex === index ? "w-6 bg-gradient-to-r from-blue-600 to-orange-500" : "w-1"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
