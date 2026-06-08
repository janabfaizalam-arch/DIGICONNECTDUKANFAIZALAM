import React from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { getPublicServiceBySlug } from "@/lib/services";
import { getServiceBySlug } from "@/lib/services-data";

function getShortBenefit(slug: string, fallback: string) {
  const benefits: Record<string, string> = {
    "gst-registration": "Get GSTIN in 3-5 days with expert CA review",
    "itr-filing": "File accurate tax returns & claim max refund",
    "driving-licence": "Quick LL/DL slot scheduling & prep help",
    "passport": "Error-free application & fast appointment slots",
    "pm-vishwakarma-yojana": "Artisan benefits, training & ₹15k toolkit",
    "cibil-report-analysis-and-credit-health-consultation": "Fix remarks & boost score 100+ points",
    "pvc-card": "High-quality waterproof credit card style print",
    "eshram-card-registration": "UAN card registration & direct govt benefits",
    "credit-cards": "Zero joining fee, high reward cards from top banks",
    "insurance": "Two-wheeler/four-wheeler instant renewal quotes",
  };
  return benefits[slug] || fallback;
}

export async function FeaturedServices() {
  const slugs = [
    "gst-registration",
    "itr-filing",
    "driving-licence",
    "passport",
    "pm-vishwakarma-yojana",
    "cibil-report-analysis-and-credit-health-consultation",
    "pvc-card",
    "eshram-card-registration",
    "credit-cards",
    "insurance"
  ];

  const servicesDataResolved = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const dbService = await getPublicServiceBySlug(slug);
        if (dbService) return dbService;
      } catch (err) {
        console.warn(`Failed to fetch db service ${slug}:`, err);
      }
      return getServiceBySlug(slug) || null;
    })
  );

  const services = servicesDataResolved.filter(Boolean);

  return (
    <section className="bg-white py-10 md:py-14 px-3 overflow-hidden">
      <div className="container-shell">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 flex items-center gap-1">
              <Star className="h-3 w-3 fill-blue-600" /> Top Picks
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

        {/* Horizontal Snap Scroll Container */}
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory scroll-smooth">
          {services.map((service) => {
            if (!service) return null;
            const Icon = service.icon || Star;
            const benefit = getShortBenefit(service.slug, service.shortDescription);
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
                      {service.badge && (
                        <span className="rounded-full bg-orange-50 border border-orange-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-orange-600 shadow-sm animate-pulse-subtle">
                          {service.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3.5 text-sm font-black text-slate-800 group-hover:text-blue-700 transition leading-snug line-clamp-1">
                      {service.title}
                    </h3>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500 leading-normal line-clamp-2">
                      {benefit}
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
          })}
        </div>
      </div>
    </section>
  );
}
