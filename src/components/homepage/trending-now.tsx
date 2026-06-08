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
  popularityScore: number;
}

const defaultTrending: TrendingItem[] = [
  { slug: "gst-registration", name: "GST Registration", badge: "🔥 Hot", appliedCount: "12.4k applied", rating: 4.9, popularityScore: 98 },
  { slug: "itr-filing", name: "ITR Filing", badge: "⚡ Super Fast", appliedCount: "8.9k applied", rating: 4.8, popularityScore: 94 },
  { slug: "pm-vishwakarma-yojana", name: "PM Vishwakarma", badge: "🛠️ Government", appliedCount: "4.5k applied", rating: 4.9, popularityScore: 89 },
  { slug: "passport", name: "Passport Service", badge: "✈️ Top Choice", appliedCount: "6.2k applied", rating: 4.9, popularityScore: 96 },
  { slug: "msme-registration", name: "MSME Registration", badge: "💼 Business", appliedCount: "5.3k applied", rating: 4.8, popularityScore: 91 },
];

interface ResolvedTrendingItem extends TrendingItem {
  title: string;
  priceLabel: string;
  amount: number;
  badgeText: string;
  shortDescription: string;
}

function getTrendingImage(slug: string) {
  switch (slug) {
    case "gst-registration":
      return "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80";
    case "itr-filing":
      return "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80";
    case "pm-vishwakarma-yojana":
      return "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80";
    case "passport":
      return "https://images.unsplash.com/photo-1544016768-982d1554f0b9?auto=format&fit=crop&w=400&q=80";
    case "msme-registration":
      return "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=400&q=80";
    default:
      return "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80";
  }
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
    <section className="relative overflow-hidden pt-6 pb-10 px-4 bg-white">
      {/* Decorative ambient background */}
      <div className="absolute top-1/2 left-1/4 w-[350px] h-[350px] rounded-full bg-orange-500/5 blur-[90px] pointer-events-none -translate-y-1/2" />

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
              className="w-[280px] shrink-0 snap-start rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md overflow-hidden shadow-[0_12px_32px_rgba(15,23,42,0.04)] hover:shadow-[0_24px_48px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between"
            >
              <div>
                {/* Large visual image */}
                <div className="h-36 relative overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getTrendingImage(item.slug)}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    draggable={false}
                  />
                  {/* Service Badge Overlaid */}
                  <span className="absolute top-3 left-3 rounded-lg bg-white/90 backdrop-blur-md border border-white/40 px-2 py-0.5 text-[9px] font-black text-slate-800 shadow-sm">
                    {item.badge}
                  </span>
                </div>

                {/* Content Details */}
                <div className="p-4">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-[10.5px] font-black text-slate-700">{item.rating}</span>
                    <span className="text-[9.5px] font-semibold text-slate-400">• {item.appliedCount}</span>
                  </div>

                  <h3 className="mt-2 text-sm font-black text-slate-800 leading-snug group-hover:text-blue-600 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  
                  {/* Live Popularity Score */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9.5px] font-bold text-emerald-600">
                      Popularity Index: {item.popularityScore}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Price & Apply button */}
              <div className="p-4 pt-0 border-t border-slate-100/60 mt-2 flex items-center justify-between gap-2">
                <div className="text-left">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase leading-none">Starting Price</span>
                  <span className="text-xs font-black text-slate-800 block mt-1 leading-none">
                    {item.priceLabel}
                  </span>
                </div>
                <Link
                  href={`/services/${item.slug}`}
                  className="h-8 rounded-xl bg-slate-900 hover:bg-slate-850 px-3.5 text-[10.5px] font-black text-white transition-all active:scale-95 flex items-center justify-center shadow-sm"
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
