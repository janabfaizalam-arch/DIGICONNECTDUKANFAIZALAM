import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { ServiceCard } from "@/components/service-card";
import { getPublicCategoriesWithCounts, getPublicFeaturedServices } from "@/lib/services";

export async function ServicesSection() {
  const serviceCategories = await getPublicCategoriesWithCounts();

  return (
    <section id="services" className="section-pad">
      <div className="container-shell space-y-10">
        <div className="reveal-on-scroll mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700 shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            Premium Services
          </p>
          <h2 className="mt-4 text-3xl font-bold text-slate-950 md:text-4xl">Apply online with fast document assistance</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            DigiConnect Dukan brings Tax & Business, All Vehicle Insurance, Finance & Banking, and Gov ID form submission into one clean service experience.
          </p>
        </div>

        {await Promise.all(serviceCategories.map(async (category) => {
          const services = await getPublicFeaturedServices(category.slug);

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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
