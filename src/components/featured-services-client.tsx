"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Search, Star, ArrowLeft } from "lucide-react";
import { getServiceBySlug } from "@/lib/services-data";

interface SimpleService {
  title: string;
  slug: string;
  category: string;
  categorySlug: string;
  shortDescription: string;
  amount: number;
  badge: string;
}

interface FeaturedServicesClientProps {
  initialServices: SimpleService[];
}

const CATEGORY_CHIPS = [
  { label: "All", slug: "all" },
  { label: "Tax & GST", slug: "tax" },
  { label: "Government ID", slug: "government" },
  { label: "Finance", slug: "finance" },
  { label: "Insurance", slug: "insurance" },
  { label: "Business", slug: "business" },
  { label: "Trending", slug: "trending" }
];

export function FeaturedServicesClient({ initialServices }: FeaturedServicesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const services = useMemo(() => {
    return initialServices.map((s) => {
      const fullService = getServiceBySlug(s.slug);
      return {
        ...s,
        icon: fullService?.icon || Star
      };
    });
  }, [initialServices]);

  // Filter logic
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // Search matches
      const matchesSearch =
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Category matches
      if (selectedCategory === "all") return true;
      if (selectedCategory === "tax") return service.categorySlug === "tax";
      if (selectedCategory === "insurance") return service.categorySlug === "insurance";
      if (selectedCategory === "business") return service.categorySlug === "company";
      if (selectedCategory === "finance") return service.categorySlug === "banking" || service.slug.includes("loan") || service.slug.includes("cibil");
      if (selectedCategory === "government") {
        return (
          service.categorySlug === "licence" ||
          service.categorySlug === "cards" ||
          service.slug.includes("voter") ||
          service.slug.includes("shram") ||
          service.slug.includes("vishwakarma")
        );
      }
      if (selectedCategory === "trending") {
        return (
          service.badge?.toLowerCase().includes("popular") ||
          service.badge?.toLowerCase().includes("trending") ||
          service.badge?.toLowerCase().includes("limited") ||
          service.badge?.toLowerCase().includes("government")
        );
      }

      return true;
    });
  }, [services, searchQuery, selectedCategory]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 md:py-12">
      {/* Back to Home link */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
      </div>

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-blue-700">
          <Star className="h-3 w-3 fill-blue-700" /> Best Sellers
        </span>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4.5xl leading-tight">
          Featured Services Directory
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-500 max-w-lg mx-auto">
          Explore India&apos;s top-rated digital assistance filings, business registrations, CIBIL reports, and licenses in one secure location.
        </p>
      </div>

      {/* Search and Filters Hub */}
      <div className="space-y-4 mb-8">
        {/* Search Input */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search featured services (GST, CIBIL, Passport...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-200/80 bg-white/60 text-sm font-medium placeholder:text-slate-400 outline-none focus:border-blue-400 focus:bg-white focus:shadow-md transition"
          />
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar justify-start md:justify-center">
          {CATEGORY_CHIPS.map((chip) => {
            const active = selectedCategory === chip.slug;
            return (
              <button
                key={chip.slug}
                onClick={() => setSelectedCategory(chip.slug)}
                className={`h-9 px-4 shrink-0 rounded-full text-xs font-bold transition-all border ${
                  active
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white/60 border-slate-200/60 text-slate-500 hover:text-slate-800 hover:bg-white"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Cards */}
      {filteredServices.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 rounded-3xl bg-white/30">
          <p className="text-sm font-bold text-slate-500">No matching services found.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="mt-3 text-xs font-extrabold text-blue-600 hover:underline"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const Icon = service.icon;
            const isPaid = service.amount > 0;
            return (
              <div
                key={service.slug}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.02)] transition-all duration-300 hover:border-blue-200 hover:shadow-[0_16px_36px_rgba(37,99,235,0.06)] hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50/70 text-blue-600 transition-transform group-hover:scale-105">
                      <Icon className="h-5.5 w-5.5 stroke-[2]" />
                    </span>
                    {service.badge && (
                      <span className="rounded-full bg-orange-50 border border-orange-100 px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-orange-600 shadow-xs">
                        {service.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-base font-black text-slate-800 group-hover:text-blue-700 transition leading-snug">
                    {service.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 font-semibold">
                    {service.shortDescription}
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-50 pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Assistance Fee</p>
                    <p className="text-sm font-black text-slate-700">
                      {isPaid ? `₹${service.amount}` : "Enquiry Only"}
                    </p>
                  </div>
                  <Link
                    href={`/services/${service.slug}`}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-slate-800 active:scale-[0.97]"
                  >
                    {isPaid ? "Apply Now" : "Enquire"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
