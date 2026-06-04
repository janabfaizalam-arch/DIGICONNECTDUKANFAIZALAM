import React from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { getPublicFeaturedServices } from "@/lib/services";

export async function FeaturedServices() {
  const services = await getPublicFeaturedServices();

  return (
    <section className="bg-white py-8 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between px-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">
              Curated Picks
            </p>
            <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-900 md:text-2xl">
              Featured Support Services
            </h2>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-0.5 text-xs font-black text-blue-600 hover:underline"
          >
            All Services <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Swiper List */}
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory">
          {services.map((service, index) => {
            const Icon = service.icon || Star;
            // Let's create beautiful dynamic gradients
            const gradients = [
              "from-blue-600/90 to-indigo-700/90",
              "from-emerald-600/90 to-teal-700/90",
              "from-orange-500/90 to-amber-650/90",
              "from-purple-600/90 to-indigo-800/90",
              "from-rose-500/90 to-pink-650/90",
            ];
            const gradient = gradients[index % gradients.length];

            return (
              <div 
                key={service.slug} 
                className="w-[260px] md:w-[300px] shrink-0 snap-start snap-always"
              >
                <div className={`relative h-[280px] rounded-3xl overflow-hidden p-6 text-white bg-gradient-to-br ${gradient} border border-white/10 shadow-lg flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-xl duration-300`}>
                  {/* Subtle glass texture overlay */}
                  <div className="absolute inset-0 bg-white/5 opacity-40 backdrop-blur-[1px] pointer-events-none" />
                  
                  <div>
                    {/* Badge */}
                    <div className="flex justify-between items-start">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white border border-white/10">
                        <Icon className="h-5 w-5" />
                      </span>
                      {service.badge && (
                        <span className="rounded-full bg-white/15 border border-white/10 px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider">
                          {service.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-5 text-base font-black leading-snug tracking-tight text-white line-clamp-2">
                      {service.title}
                    </h3>
                    <p className="mt-2 text-xs text-white/70 leading-relaxed font-semibold line-clamp-3">
                      {service.shortDescription}
                    </p>
                  </div>

                  <div className="mt-auto">
                    <Link
                      href={`/services/${service.slug}`}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-white px-4 text-xs font-black text-slate-900 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
                    >
                      {service.amount > 0 ? `Apply • ₹${service.amount}` : "Enquiry Now"}
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
