"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Flame, ChevronRight } from "lucide-react";
import { getServiceBySlug } from "@/lib/services-data";

interface TrendingItem {
  slug: string;
  name: string;
  badge: string;
  appliedCount: string;
  rating: number;
}

const defaultTrending: TrendingItem[] = [
  { slug: "gst-registration", name: "GST Registration", badge: "🔥 Hot", appliedCount: "12,400+ applications", rating: 4.9 },
  { slug: "itr-filing", name: "ITR Filing", badge: "⚡ Super Fast", appliedCount: "8,900+ filings", rating: 4.8 },
  { slug: "pm-vishwakarma-yojana", name: "PM Vishwakarma Yojana", badge: "🛠️ Government", appliedCount: "4,500+ registered", rating: 4.9 },
  { slug: "passport", name: "Passport Service", badge: "✈️ Top Choice", appliedCount: "6,200+ processed", rating: 4.9 },
  { slug: "msme-registration", name: "MSME Registration", badge: "💼 Business", appliedCount: "5,300+ certified", rating: 4.8 },
];

interface ResolvedTrendingItem extends TrendingItem {
  title: string;
  priceLabel: string;
  amount: number;
  badgeText: string;
  shortDescription: string;
}

export function TrendingNow() {
  const [items, setItems] = useState<ResolvedTrendingItem[]>([]);

  useEffect(() => {
    // Resolve full service details from servicesData
    const resolved = defaultTrending.map(t => {
      const details = getServiceBySlug(t.slug);
      return {
        ...t,
        title: details?.title || t.name,
        priceLabel: details?.priceLabel || "Enquiry Now",
        amount: details?.amount || 0,
        badgeText: details?.badge || "Popular",
        shortDescription: details?.shortDescription || ""
      };
    });
    setItems(resolved);
  }, []);

  return (
    <section className="relative overflow-hidden py-10 px-4 bg-white">
      {/* Decorative ambient background */}
      <div className="absolute top-1/2 left-1/4 w-[350px] height-[350px] rounded-full bg-orange-500/5 blur-[90px] pointer-events-none -translate-y-1/2" />

      <div className="container-shell max-w-[1600px] mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-wider text-orange-500 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 fill-orange-500" />
              Live Activity
            </p>
            <h2 className="mt-1 text-xl md:text-2xl font-black tracking-tight text-slate-800">
              Trending Now
            </h2>
          </div>
          <Link
            href="/services"
            className="flex items-center gap-0.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
          >
            All Services <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Horizontal Scrolling Grid */}
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory scroll-smooth">
          {items.map((item) => (
            <div
              key={item.slug}
              className="w-[260px] md:w-[280px] shrink-0 snap-start rounded-2xl border border-slate-100 bg-slate-50/20 hover:bg-white p-4.5 shadow-[0_4px_16px_rgba(15,23,42,0.01)] hover:shadow-[0_16px_32px_rgba(15,23,42,0.03)] border-slate-200/40 transition-all duration-300 hover:translate-y-[-2px] flex flex-col justify-between"
            >
              <div>
                {/* Header: Badge & Rating */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-block rounded-lg bg-orange-50 border border-orange-100/50 px-2 py-0.5 text-[9px] font-black text-orange-600">
                    {item.badge}
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-[10.5px] font-black text-slate-700">{item.rating}</span>
                  </div>
                </div>

                {/* Service Name */}
                <h3 className="mt-3.5 text-sm font-black text-slate-850 group-hover:text-blue-600 leading-snug">
                  {item.title}
                </h3>
                
                {/* Applied Count info */}
                <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
                  {item.appliedCount}
                </p>
              </div>

              {/* Price & Apply button */}
              <div className="mt-5 pt-3 border-t border-slate-100/70 flex items-center justify-between gap-2">
                <div className="text-left">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase leading-none">Starting Price</span>
                  <span className="text-xs font-black text-slate-850 block mt-1 leading-none">
                    {item.priceLabel}
                  </span>
                </div>
                <Link
                  href={`/services/${item.slug}`}
                  className="h-8 rounded-lg bg-slate-900 hover:bg-slate-850 px-3 text-[10.5px] font-black text-white transition-all active:scale-95 flex items-center justify-center shadow-sm"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
