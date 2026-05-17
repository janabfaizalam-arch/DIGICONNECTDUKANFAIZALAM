import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { ServiceCard } from "@/components/service-card";
import { getPublicCategoriesWithCounts, getPublicFeaturedServices, getPublicHomepageServices } from "@/lib/services";
import type { ServiceItem } from "@/lib/services-data";

export async function ServicesSection() {
  const serviceCategories = await getPublicCategoriesWithCounts();
  const featuredServices: ServiceItem[] = await getPublicHomepageServices(6);

  return (
    <section id="services" className="section-pad scroll-mt-20">
      <div className="container-shell space-y-8 md:space-y-10">
        <div className="reveal-on-scroll mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-700 shadow-soft md:px-4 md:py-2 md:text-xs">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            Premium Services
          </p>
          <h2 className="mt-3 text-2xl font-bold text-slate-950 md:mt-4 md:text-4xl">Apply online with fast document assistance</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 md:mt-3 md:text-base md:leading-7">
            DigiConnect Dukan brings Tax & Business, All Vehicle Insurance, Finance & Banking, and Gov ID form submission into one clean service experience.
          </p>
        </div>

        {featuredServices.length ? (
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">Featured</p>
                <h3 className="mt-1 text-xl font-bold text-slate-950 md:text-2xl">Most requested services</h3>
              </div>
              <Link href="/services" className="hidden text-sm font-extrabold text-blue-700 sm:inline-flex">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {featuredServices.map((service) => (
                <ServiceCard key={service.slug} service={service} compact />
              ))}
            </div>
          </div>
        ) : null}

        {await Promise.all(serviceCategories.map(async (category) => {
          const services = (await getPublicFeaturedServices(category.slug)).filter((service) => service.slug !== "pan-card");

          return (
            <div key={category.slug} className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">{category.title}</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">{category.heading}</h3>
                </div>
                <Link href={`/services/${category.slug}`} className="premium-button premium-button-white">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                {services.map((service) => (
                  <ServiceCard key={service.slug} service={service} />
                ))}
              </div>
            </div>
          );
        }))}
      </div>
    </section>
  );
}
