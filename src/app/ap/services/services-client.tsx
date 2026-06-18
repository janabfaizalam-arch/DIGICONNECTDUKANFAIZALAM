"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Star, ArrowRight, FileText, Sparkles, Layers, History } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/portal-data";
import type { AgentService } from "@/lib/agent-services";

interface PartnerServicesClientProps {
  initialServices: AgentService[];
}

export function PartnerServicesClient({ initialServices }: PartnerServicesClientProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  // Load favorites and recents from localStorage
  useEffect(() => {
    try {
      const storedFavs = JSON.parse(localStorage.getItem("digipartner_favorites") || "[]");
      setFavorites(storedFavs);
      
      const storedRecents = JSON.parse(localStorage.getItem("digipartner_recently_used") || "[]");
      setRecentSlugs(storedRecents);
    } catch (err) {
      console.warn("Could not load stored services state", err);
    }
  }, []);

  // Classify category on the fly to remain service-agnostic
  const getCategoryLabel = (category: string | null, slug: string) => {
    const s = String(slug).toLowerCase();
    
    if (s.includes("loan") || s.includes("pmegp") || s.includes("mudra") || s.includes("yuva")) {
      return "Loans & Subsidy";
    }
    if (s.includes("card") || s.includes("account") || s.includes("cibil") || s.includes("credit") || s.includes("saving") || s.includes("current")) {
      return "Finance & Credit";
    }
    if (s.includes("gst") || s.includes("itr") || s.includes("limited") || s.includes("msme") || s.includes("dsc") || s.includes("iso")) {
      return "Tax & Business";
    }
    return "Gov ID & Forms";
  };

  // Toggle favorite status
  const toggleFavorite = (slug: string) => {
    const updated = favorites.includes(slug)
      ? favorites.filter((f) => f !== slug)
      : [...favorites, slug];
    setFavorites(updated);
    localStorage.setItem("digipartner_favorites", JSON.stringify(updated));
  };

  // Add to recently used list
  const trackRecentUse = (slug: string) => {
    const updated = [slug, ...recentSlugs.filter((s) => s !== slug)].slice(0, 5);
    setRecentSlugs(updated);
    localStorage.setItem("digipartner_recently_used", JSON.stringify(updated));
  };

  // Categorized & filtered services
  const processedServices = useMemo(() => {
    return initialServices.map((srv) => ({
      ...srv,
      calculatedCategory: getCategoryLabel(srv.category, srv.slug),
    }));
  }, [initialServices]);

  // Categories list
  const categories = ["All", "Tax & Business", "Gov ID & Forms", "Loans & Subsidy", "Finance & Credit", "Favorites"];

  // Filtered lists
  const filteredServices = useMemo(() => {
    return processedServices.filter((srv) => {
      // Category check
      if (selectedCategory === "Favorites") {
        if (!favorites.includes(srv.slug)) return false;
      } else if (selectedCategory !== "All") {
        if (srv.calculatedCategory !== selectedCategory) return false;
      }

      // Search check
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = srv.title.toLowerCase().includes(query);
        const matchesDesc = (srv.description || "").toLowerCase().includes(query);
        const matchesSlug = srv.slug.toLowerCase().includes(query);
        return matchesTitle || matchesDesc || matchesSlug;
      }

      return true;
    });
  }, [processedServices, selectedCategory, search, favorites]);

  // Recently used services lookup
  const recentlyUsedServices = useMemo(() => {
    return recentSlugs
      .map((slug) => processedServices.find((s) => s.slug === slug))
      .filter((s): s is typeof processedServices[number] => Boolean(s));
  }, [recentSlugs, processedServices]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 border border-blue-500/20 text-xs font-bold text-blue-600">
            <Sparkles className="h-3.5 w-3.5" />
            Service Engine
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Service Catalog
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Browse active products, calculate custom commission overlays, and initiate quick client submissions.
          </p>
        </div>
      </div>

      {/* Recently Used Services */}
      {recentlyUsedServices.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-slate-400" /> Recently Used Services
          </p>
          <div className="flex flex-wrap gap-2">
            {recentlyUsedServices.map((srv) => (
              <Link
                key={srv.id}
                href={`/ap/applications/new?serviceId=${srv.id}`}
                onClick={() => trackRecentUse(srv.slug)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/60 bg-white/70 text-xs text-slate-600 hover:border-blue-550 hover:text-blue-600 hover:bg-white transition-all font-semibold shadow-sm"
              >
                <span>{srv.title}</span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid gap-4 md:grid-cols-4 items-center">
        <div className="relative md:col-span-3">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search active services by title, instructions or documents..."
            className="w-full rounded-xl border border-slate-200 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none shadow-sm"
          />
        </div>

        <div className="text-right text-xs text-slate-400 font-bold px-1">
          Showing {filteredServices.length} of {processedServices.length} services
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`h-9 px-4 shrink-0 rounded-xl text-xs font-bold transition-all duration-200 border ${
              selectedCategory === cat
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-blue-500/15"
                : "bg-white/70 text-slate-500 border-slate-200/60 hover:text-slate-800 hover:bg-white hover:border-slate-350 shadow-sm"
            }`}
          >
            {cat === "Favorites" ? (
              <span className="flex items-center gap-1">
                <Star className={`h-3.5 w-3.5 ${selectedCategory === "Favorites" ? "fill-white text-white" : "text-amber-500 fill-amber-500"}`} />
                Favorites ({favorites.length})
              </span>
            ) : (
              cat
            )}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredServices.length ? (
          filteredServices.map((srv) => {
            const isFav = favorites.includes(srv.slug);
            const payoutAmount = srv.payout_type === "percentage"
              ? Math.round((srv.customer_fee * srv.payout_percentage) / 100)
              : srv.agent_payout;

            return (
              <Card
                key={srv.id}
                className="relative overflow-hidden border border-slate-200/50 bg-white/70 p-5 rounded-2xl backdrop-blur-md flex flex-col justify-between hover:border-slate-300 hover:bg-white hover:shadow-sm transition-all duration-150 group"
              >
                <div className="space-y-4">
                  {/* Card Title & Category */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {srv.calculatedCategory}
                      </span>
                      <h3 className="mt-2 font-extrabold text-slate-900 text-base leading-tight group-hover:text-blue-600 transition-colors">
                        {srv.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => toggleFavorite(srv.slug)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50 ${
                        isFav ? "text-amber-500" : "text-slate-400"
                      }`}
                    >
                      <Star className={`h-4.5 w-4.5 ${isFav ? "fill-amber-500 text-amber-500" : ""}`} />
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">
                    {srv.description || "Guides customers through eligibility check and documentation collection."}
                  </p>

                  {/* Pricing and Commission Details */}
                  <div className="grid grid-cols-3 gap-2.5 rounded-xl bg-white/50 p-3.5 border border-slate-200/50">
                    <div>
                      <p className="text-[9px] font-bold uppercase text-slate-400">Price</p>
                      <p className="mt-0.5 text-sm font-black text-slate-900">
                        {formatCurrency(srv.customer_fee)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase text-emerald-600">Earnings</p>
                      <p className="mt-0.5 text-sm font-black text-emerald-600">
                        {formatCurrency(payoutAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase text-indigo-600">TAT</p>
                      <p className="mt-0.5 text-sm font-extrabold text-indigo-600 truncate">
                        {srv.processing_time || "48 hrs"}
                      </p>
                    </div>
                  </div>

                  {/* Required Documents */}
                  {srv.required_documents && (
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-700 flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-slate-400" /> Required Docs:
                      </p>
                      <p className="text-[10px] text-slate-550 leading-normal font-semibold line-clamp-2">
                        {srv.required_documents}
                      </p>
                    </div>
                  )}
                </div>

                {/* Apply Button */}
                <div className="mt-5 pt-3.5 border-t border-slate-100">
                  <Link
                    href={`/ap/applications/new?serviceId=${srv.id}`}
                    onClick={() => trackRecentUse(srv.slug)}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-bold text-xs transition duration-150 border border-blue-200 hover:border-transparent hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>Apply Now</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-white/50">
            <Layers className="mx-auto h-12 w-12 text-slate-400 animate-pulse" />
            <h3 className="mt-4 text-lg font-bold text-slate-900">No services found</h3>
            <p className="mt-2 text-sm text-slate-400 font-semibold">
              Try adjusting your search criteria or category filters to find the required digital service.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
