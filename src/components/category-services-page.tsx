import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { ServiceCard } from "@/components/service-card";
import { getServicesByCategory, type ServiceCategory } from "@/lib/services-data";

export function CategoryServicesPage({ category }: { category: ServiceCategory }) {
  const services = getServicesByCategory(category.slug);
  const Icon = category.icon;

  return (
    <main className="min-h-screen px-4 py-7 md:px-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/services" className="inline-flex items-center gap-2 text-sm font-extrabold text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Back to categories
        </Link>

        <section className="mt-6 glass-panel overflow-hidden rounded-[1.75rem] p-6 md:p-10">
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">{category.title}</p>
              <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">{category.heading}</h1>
              <p className="mt-4 text-base leading-8 text-slate-600 md:text-lg">{category.description}</p>
              <p className="mt-4 inline-flex rounded-full bg-white/70 px-4 py-2 text-sm font-extrabold text-slate-800">
                Fast Service - Same Day Process Available
              </p>
            </div>
            <div className="hidden h-28 w-28 items-center justify-center rounded-[2rem] bg-[linear-gradient(135deg,#2563eb,#f97316)] text-white shadow-[0_20px_50px_rgba(37,99,235,0.2)] lg:flex">
              <Icon className="h-12 w-12" />
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </section>

        <section className="mt-10 rounded-[1.5rem] bg-slate-950 p-6 text-white md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Need help choosing?</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">Call / WhatsApp Now and our team will guide you with documents, price, and process.</p>
            </div>
            <Link href="/services" className="premium-button premium-button-white">
              Explore All Categories
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
