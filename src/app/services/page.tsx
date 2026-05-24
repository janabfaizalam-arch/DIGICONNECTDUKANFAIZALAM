import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { ServiceCard } from "@/components/service-card";
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

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [categories, services] = await Promise.all([getPublicCategoriesWithCounts(), getPublicServices()]);
  const params = await searchParams;
  const selectedSlug = categories.some((category) => category.slug === params.category) ? params.category : "all";
  const activeCategory = selectedSlug === "all" ? null : categories.find((category) => category.slug === selectedSlug) ?? null;
  const groupedServices = categories
    .map((category) => ({
      category,
      services: services.filter((service) => service.categorySlug === category.slug),
    }))
    .filter((group) => group.services.length);
  const visibleGroups = activeCategory
    ? groupedServices.filter((group) => group.category.slug === activeCategory.slug)
    : groupedServices;

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <section className="glass-panel overflow-hidden rounded-[1.75rem] p-6 md:p-10">
          <div className="relative z-10 max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/65 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
              Digital Services Portal
            </p>
            <h1 className="mt-5 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">All services, organized by category</h1>
            <p className="mt-4 text-base leading-8 text-slate-600 md:text-lg">
              Premium online apply support for business registration, insurance service, finance service, government services, and document assistance across India.
            </p>
          </div>
        </section>

        <section aria-label="Service category filters" className="mt-6">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
            <Link
              href="/services"
              className={`inline-flex h-11 shrink-0 items-center rounded-full px-5 text-xs font-extrabold shadow-sm transition duration-150 ${
                selectedSlug === "all" ? "bg-gradient-to-r from-blue-700 to-indigo-600 text-white" : "border border-slate-200 bg-white/70 text-slate-700 hover:bg-white hover:text-slate-950 hover:border-slate-300"
              }`}
            >
              All Services
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/services?category=${category.slug}`}
                className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-extrabold shadow-sm transition duration-150 ${
                  selectedSlug === category.slug ? "bg-gradient-to-r from-blue-700 to-indigo-600 text-white" : "border border-slate-200 bg-white/70 text-slate-700 hover:bg-white hover:text-slate-950 hover:border-slate-300"
                }`}
              >
                {category.title}
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${selectedSlug === category.slug ? "bg-white/20" : "bg-blue-50 text-blue-700"}`}>
                  {category.serviceCount}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.slug}
                href={`/services?category=${category.slug}`}
                className="liquid-card flex items-center gap-3 rounded-2xl p-4 transition md:hover:-translate-y-0.5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-950">{category.title}</span>
                  <span className="block truncate text-xs font-semibold text-slate-500">{category.description}</span>
                </span>
              </Link>
            );
          })}
        </section>

        <section className="mt-9 space-y-8">
          {visibleGroups.length ? visibleGroups.map(({ category, services: categoryServices }) => (
            <div key={category.slug}>
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">{activeCategory ? "Filtered Services" : "Category"}</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">{category.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{category.description}</p>
                </div>
                <Link href={`/services/${category.slug}`} className="text-sm font-extrabold text-blue-700">Open category page</Link>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {categoryServices.map((service) => (
                  <ServiceCard key={service.slug} service={service} />
                ))}
              </div>
            </div>
          )) : (
            <div className="rounded-[1.5rem] border border-dashed border-blue-100 bg-blue-50/45 p-8 text-center">
              <p className="text-lg font-bold text-slate-950">No services available</p>
              <p className="mt-2 text-sm text-slate-600">Active services will appear here after catalog publishing.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
