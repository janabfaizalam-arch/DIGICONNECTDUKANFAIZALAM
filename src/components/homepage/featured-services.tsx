"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Check, ArrowRight, Store, ReceiptText, ShieldCheck, CreditCard, Globe, Landmark } from "lucide-react";
import { getServiceBySlug } from "@/lib/services-data";

interface ServiceItem {
  slug: string;
  title: string;
  category: string;
  amount: number;
  priceLabel: string;
  rating: number;
  ratingCount: string;
  benefits: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const fallbackFeatured: Omit<ServiceItem, "icon">[] = [
  {
    slug: "gst-registration",
    title: "GST Registration",
    category: "Tax & GST Compliance",
    amount: 2499,
    priceLabel: "₹2,499",
    rating: 4.9,
    ratingCount: "1,240 reviews",
    benefits: [
      "Legitimize your business & sell online",
      "Claim Input Tax Credit (ITC) safely",
      "Expert CA-assisted document validation"
    ]
  },
  {
    slug: "itr-filing",
    title: "ITR Filing",
    category: "Income Tax return",
    amount: 699,
    priceLabel: "₹699",
    rating: 4.8,
    ratingCount: "850 reviews",
    benefits: [
      "File accurate salary or business tax returns",
      "Claim maximum eligible deductions",
      "Expert review to avoid notice queries"
    ]
  },
  {
    slug: "pm-vishwakarma-yojana",
    title: "PM Vishwakarma",
    category: "Government Schemes",
    amount: 250,
    priceLabel: "₹250",
    rating: 4.9,
    ratingCount: "420 reviews",
    benefits: [
      "Artisan benefits registration support",
      "Toolkit incentive of ₹15,000 file preparation",
      "Official certificate & skill card guidance"
    ]
  },
  {
    slug: "credit-cards",
    title: "Credit Cards",
    category: "Banking & Credit",
    amount: 0,
    priceLabel: "Enquiry Now",
    rating: 4.8,
    ratingCount: "980 reviews",
    benefits: [
      "Compare top cashbacks & reward cards",
      "Zero joining fee eligibility support",
      "Fast processing with lead bank channels"
    ]
  },
  {
    slug: "passport",
    title: "Passport Application",
    category: "Passport & Licence",
    amount: 2499,
    priceLabel: "₹2,499",
    rating: 4.9,
    ratingCount: "630 reviews",
    benefits: [
      "Fresh & reissue application slots scheduling",
      "Complete document review to prevent rejections",
      "Fast appointment date allocation support"
    ]
  },
  {
    slug: "cibil-report-increase",
    title: "CIBIL score & Analysis",
    category: "Banking & Credit",
    amount: 2600,
    priceLabel: "₹2,600",
    rating: 4.8,
    ratingCount: "510 reviews",
    benefits: [
      "TransUnion membership & credit score query",
      "Negative remark disputing instruction file",
      "Detailed health report review & repair guidelines"
    ]
  }
];

function getIconBySlug(slug: string) {
  switch (slug) {
    case "gst-registration": return Store;
    case "itr-filing": return ReceiptText;
    case "pm-vishwakarma-yojana": return ShieldCheck;
    case "credit-cards": return CreditCard;
    case "passport": return Globe;
    case "cibil-report-increase": return Landmark;
    default: return Star;
  }
}

export function FeaturedServices() {
  const [items, setItems] = useState<ServiceItem[]>([]);

  useEffect(() => {
    // Resolve dynamic prices/details from service database fallbacks
    const resolved = fallbackFeatured.map(item => {
      const details = getServiceBySlug(item.slug);
      return {
        ...item,
        title: details?.title || item.title,
        priceLabel: details?.priceLabel || item.priceLabel,
        amount: details?.amount || item.amount,
        benefits: details?.benefits?.slice(0, 3) || item.benefits,
        icon: getIconBySlug(item.slug)
      };
    });
    setItems(resolved);
  }, []);

  return (
    <section id="featured-services" className="bg-slate-50/30 py-12 px-4 relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 right-1/4 w-[350px] h-[350px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[350px] h-[350px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      <div className="container-shell max-w-[1600px] mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-blue-100 text-blue-500" />
              Featured Services
            </p>
            <h2 className="mt-1 text-xl md:text-2xl font-black tracking-tight text-slate-800">
              Profitable Premium Solutions
            </h2>
          </div>
          <Link
            href="/services"
            className="flex items-center gap-0.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
          >
            All Services <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Responsive Grid/Carousel */}
        {/* Mobile: horizontal snap scroll; Desktop: 3-column bento grid */}
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:gap-6 lg:px-0 lg:mx-0">
          {items.map((service) => {
            const IconComponent = service.icon;
            
            return (
              <div
                key={service.slug}
                className="w-[290px] sm:w-[320px] shrink-0 snap-start snap-always lg:w-auto flex"
              >
                <div className="glass-liquid-premium rounded-3xl p-6 flex flex-col justify-between w-full hover:border-blue-400/40 border-white/50">
                  
                  {/* Card Top */}
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        {service.category}
                      </span>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-black text-slate-700">{service.rating}</span>
                        <span className="text-[9px] font-semibold text-slate-400">({service.ratingCount.split(" ")[0]})</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50/50 text-blue-600">
                        <IconComponent className="h-5.5 w-5.5 stroke-[2]" />
                      </div>
                      <h3 className="text-base font-black text-slate-800 tracking-tight leading-snug">
                        {service.title}
                      </h3>
                    </div>

                    {/* Bulleted Benefits list */}
                    <ul className="mt-5 space-y-2.5">
                      {service.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-500">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 stroke-[3]" />
                          <span className="leading-snug">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Bottom / Action */}
                  <div className="mt-8 pt-4 border-t border-slate-200/50 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">Starting from</span>
                      <span className="text-sm font-black text-slate-800 block mt-1.5 leading-none">
                        {service.priceLabel}
                      </span>
                    </div>
                    
                    <Link
                      href={`/services/${service.slug}`}
                      className="h-10 rounded-xl bg-slate-900 hover:bg-slate-850 px-4 text-xs font-black text-white transition-all active:scale-[0.96] flex items-center justify-center gap-1.5 shadow-sm relative overflow-hidden animate-shine-glass group"
                    >
                      Apply Now
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
