"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Star, FileText, Award, KeyRound, BadgeCheck, ShieldAlert, CreditCard, FileSpreadsheet } from "lucide-react";

interface ServiceItem {
  title: string;
  slug: string;
  category: string;
  categorySlug: string;
  shortDescription: string;
  amount: number;
  badge: string;
}

const fallbackServicesList: ServiceItem[] = [
  { slug: "gst-registration", title: "GST Registration", shortDescription: "Get GSTIN in 3-5 days with expert CA review", amount: 499, category: "Tax & GST", categorySlug: "tax", badge: "" },
  { slug: "itr-filing", title: "ITR Filing", shortDescription: "File accurate tax returns & claim max refund", amount: 299, category: "Tax & GST", categorySlug: "tax", badge: "" },
  { slug: "driving-licence", title: "Driving Licence", shortDescription: "Quick LL/DL slot scheduling & prep help", amount: 350, category: "Government ID", categorySlug: "licence", badge: "" },
  { slug: "passport", title: "Passport Application", shortDescription: "Error-free application & fast appointment slots", amount: 450, category: "Government ID", categorySlug: "licence", badge: "" },
  { slug: "pm-vishwakarma-yojana", title: "PM Vishwakarma", shortDescription: "Artisan benefits, training & ₹15k toolkit", amount: 0, category: "Loans & Schemes", categorySlug: "loans", badge: "" },
  { slug: "cibil-report-analysis-and-credit-health-consultation", title: "CIBIL Score Analysis", shortDescription: "Fix remarks & boost score 100+ points", amount: 199, category: "Finance & Credit", categorySlug: "banking", badge: "" },
  { slug: "pvc-card", title: "PVC Smart Card", shortDescription: "High-quality waterproof credit card style print", amount: 99, category: "Cards & Printing", categorySlug: "cards", badge: "" },
  { slug: "eshram-card-registration", title: "e-Shram Registration", shortDescription: "UAN card registration & direct govt benefits", amount: 80, category: "Loans & Schemes", categorySlug: "loans", badge: "" },
  { slug: "credit-cards", title: "Credit Cards Comparison", shortDescription: "Zero joining fee, high reward cards from top banks", amount: 0, category: "Finance & Credit", categorySlug: "banking", badge: "" },
  { slug: "insurance", title: "Vehicle Insurance", shortDescription: "Two-wheeler/four-wheeler instant renewal quotes", amount: 0, category: "Insurance", categorySlug: "insurance", badge: "" }
];

function getServiceIcon(slug: string) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "gst-registration": FileText,
    "itr-filing": FileSpreadsheet,
    "driving-licence": Award,
    "passport": KeyRound,
    "pm-vishwakarma-yojana": BadgeCheck,
    "cibil-report-analysis-and-credit-health-consultation": ShieldAlert,
    "pvc-card": CreditCard,
    "eshram-card-registration": BadgeCheck,
    "credit-cards": CreditCard,
    "insurance": ShieldAlert,
  };
  return iconMap[slug] || Star;
}

function getGradientBadge(slug: string): { label: string; bgClass: string } | null {
  const badgeMap: Record<string, { label: string; bgClass: string }> = {
    "gst-registration": { label: "Trending", bgClass: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" },
    "itr-filing": { label: "Most Popular", bgClass: "bg-gradient-to-r from-orange-500 to-amber-600 text-white" },
    "driving-licence": { label: "Fast Approval", bgClass: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white" },
    "passport": { label: "Fast Approval", bgClass: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white" },
    "pm-vishwakarma-yojana": { label: "Trending", bgClass: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" },
    "cibil-report-analysis-and-credit-health-consultation": { label: "Most Popular", bgClass: "bg-gradient-to-r from-orange-500 to-amber-600 text-white" },
    "pvc-card": { label: "Best Value", bgClass: "bg-gradient-to-r from-purple-500 to-pink-600 text-white" },
    "eshram-card-registration": { label: "Best Value", bgClass: "bg-gradient-to-r from-purple-500 to-pink-600 text-white" },
    "credit-cards": { label: "Most Popular", bgClass: "bg-gradient-to-r from-orange-500 to-amber-600 text-white" },
    "insurance": { label: "Best Value", bgClass: "bg-gradient-to-r from-purple-500 to-pink-600 text-white" }
  };
  return badgeMap[slug] || null;
}

function ServiceSkeletonCard() {
  return (
    <div className="w-[260px] md:w-[290px] shrink-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.01)] animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-xl bg-slate-100" />
        <div className="h-4 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-3/4 rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />
      </div>
      <div className="mt-6 pt-3 border-t border-slate-50 flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-2.5 w-6 rounded bg-slate-100" />
          <div className="h-3.5 w-10 rounded bg-slate-100" />
        </div>
        <div className="h-9 w-24 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

export function FeaturedServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchFeatured() {
      try {
        const response = await fetch("/api/featured-services");
        const data = await response.json();
        if (active) {
          if (data?.success && data?.services?.length > 0) {
            setServices(data.services);
          } else {
            setServices(fallbackServicesList);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch featured services, loading fallback list:", err);
        if (active) setServices(fallbackServicesList);
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchFeatured();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="featured-services" className="bg-white py-8 md:py-10 px-3 overflow-hidden">
      <div className="container-shell">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-blue-600 text-blue-600" /> Top Picks
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:text-2xl leading-none">
              Featured Services
            </h2>
          </div>
          <Link
            href="/featured-services"
            className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:underline transition"
          >
            All Services <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Horizontal Snap Scroll Container - Mobile Swipe Carousel */}
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory scroll-smooth">
          {loading ? (
            /* Render 6 skeleton cards while loading */
            Array.from({ length: 6 }).map((_, i) => <ServiceSkeletonCard key={i} />)
          ) : services.length === 0 ? (
            /* Guarantee never blank fallback state */
            fallbackServicesList.map((service) => {
              const Icon = getServiceIcon(service.slug);
              const badge = getGradientBadge(service.slug);
              const isPaid = service.amount > 0;
              return (
                <div key={service.slug} className="w-[260px] md:w-[290px] shrink-0 snap-start snap-always">
                  <div className="group relative flex h-[240px] flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.02)] transition-all duration-300 hover:border-blue-200 hover:shadow-[0_12px_32px_rgba(37,99,235,0.06)] hover:-translate-y-1">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-blue-50/0 to-blue-50/10 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50/70 text-blue-600 transition-transform group-hover:scale-105">
                          <Icon className="h-5 w-5 stroke-[2]" />
                        </span>
                        {badge && (
                          <span className={`rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider shadow-sm ${badge.bgClass}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3.5 text-sm font-black text-slate-800 group-hover:text-blue-700 transition leading-snug line-clamp-1">
                        {service.title}
                      </h3>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500 leading-normal line-clamp-2">
                        {service.shortDescription}
                      </p>
                    </div>
                    <div className="mt-4 border-t border-slate-50 pt-3 flex items-center justify-between gap-2 z-10">
                      <div className="text-left">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Price</p>
                        <p className="text-xs font-black text-slate-700 leading-tight">
                          {isPaid ? `₹${service.amount}` : "Enquiry"}
                        </p>
                      </div>
                      <Link
                        href={`/services/${service.slug}`}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-slate-900 px-3.5 text-[11px] font-extrabold text-white transition hover:bg-slate-800 active:scale-[0.97]"
                      >
                        {isPaid ? "Apply Now" : "Enquire"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            /* Dynamic Service List Rendering */
            services.map((service) => {
              const Icon = getServiceIcon(service.slug);
              const badge = getGradientBadge(service.slug);
              const isPaid = service.amount > 0;

              return (
                <div
                  key={service.slug}
                  className="w-[260px] md:w-[290px] shrink-0 snap-start snap-always"
                >
                  <div className="group relative flex h-[240px] flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.02)] transition-all duration-300 hover:border-blue-200 hover:shadow-[0_12px_32px_rgba(37,99,235,0.06)] hover:-translate-y-1">
                    
                    {/* Subtle Top glow on hover */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-blue-50/0 to-blue-50/10 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />

                    {/* Card Body */}
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50/70 text-blue-600 transition-transform group-hover:scale-105">
                          <Icon className="h-5 w-5 stroke-[2]" />
                        </span>
                        {badge && (
                          <span className={`rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider shadow-sm ${badge.bgClass}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3.5 text-sm font-black text-slate-800 group-hover:text-blue-700 transition leading-snug line-clamp-1">
                        {service.title}
                      </h3>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500 leading-normal line-clamp-2">
                        {service.shortDescription}
                      </p>
                    </div>

                    {/* Card Bottom / Price & CTA */}
                    <div className="mt-4 border-t border-slate-50 pt-3 flex items-center justify-between gap-2 z-10">
                      <div className="text-left">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Price</p>
                        <p className="text-xs font-black text-slate-700 leading-tight">
                          {isPaid ? `₹${service.amount}` : "Enquiry"}
                        </p>
                      </div>
                      
                      <Link
                        href={`/services/${service.slug}`}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-slate-900 px-3.5 text-[11px] font-extrabold text-white transition hover:bg-slate-800 active:scale-[0.97]"
                      >
                        {isPaid ? "Apply Now" : "Enquire"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
