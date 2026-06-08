import React from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { getPublicFeaturedServices } from "@/lib/services";

export async function FeaturedServices() {
  const services = await getPublicFeaturedServices();

  return (
    <section className="bg-white py-8 md:py-12 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Top Picks</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 md:text-xl">
              Featured Services
            </h2>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
          >
            All Services <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Horizontal Carousel */}
        <div className="no-scrollbar -mx-4 flex gap-3.5 overflow-x-auto px-4 pb-4 snap-x snap-mandatory">
          {services.map((service) => {
            const Icon = service.icon || Star;

            return (
              <div
                key={service.slug}
                className="w-[240px] md:w-[280px] shrink-0 snap-start snap-always"
              >
                <div className="group relative h-full rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between">
                  {/* Top */}
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-105">
                        <Icon className="h-5 w-5" />
                      </span>
                      {service.badge && (
                        <span className="rounded-full bg-orange-50 border border-orange-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-600">
                          {service.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-sm font-bold leading-snug text-slate-800 group-hover:text-blue-700 line-clamp-2">
                      {service.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {service.shortDescription}
                    </p>
                  </div>

                  {/* Bottom CTA */}
                  <div className="mt-5">
                    <Link
                      href={`/services/${service.slug}`}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-[0.98]"
                    >
                      {service.amount > 0 ? `Apply • ₹${service.amount}` : "Enquire Now"}
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
