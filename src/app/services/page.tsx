import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { CategoryCard, ServiceCard } from "@/components/service-card";
import { getPublicCategoriesWithCounts, getPublicServices } from "@/lib/services";

export const metadata: Metadata = {
  title: "Services | DigiConnect Dukan",
  description:
    "Explore Tax & Business, All Vehicle Insurance, Finance & Banking, and Gov ID form submission services from DigiConnect Dukan by RNOS India Pvt Ltd.",
  keywords: [
    "DigiConnect Dukan services",
    "Tax and Business services",
    "All Vehicle Insurance",
    "Government subsidy loans",
    "Gov ID form submission",
  ],
  alternates: {
    canonical: "/services",
  },
};

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const [categories, services] = await Promise.all([getPublicCategoriesWithCounts(), getPublicServices()]);

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <section className="glass-panel overflow-hidden rounded-[1.75rem] p-6 md:p-10">
          <div className="relative z-10 max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/65 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
              Digital Services Portal
            </p>
            <h1 className="mt-5 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">Choose your service category</h1>
            <p className="mt-4 text-base leading-8 text-slate-600 md:text-lg">
              Premium online apply support for business registration, insurance service, finance service, government services, and document assistance across India.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.slug}
              title={category.title}
              description={category.description}
              href={`/services/${category.slug}`}
              icon={category.icon}
              count={category.serviceCount}
            />
          ))}
        </section>

        <section className="mt-10">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">All Services</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">Active DigiConnect services</h2>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {services.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
