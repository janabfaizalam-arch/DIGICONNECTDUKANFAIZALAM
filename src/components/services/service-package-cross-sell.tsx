"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import type { DbServicePackage } from "@/lib/services";
import { safeCurrency } from "@/lib/admin-format";

interface ServicePackageCrossSellProps {
  currentServiceSlug: string;
}

export function ServicePackageCrossSell({ currentServiceSlug }: ServicePackageCrossSellProps) {
  const [packages, setPackages] = useState<DbServicePackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPackages() {
      try {
        const res = await fetch("/api/admin/packages");
        if (res.ok) {
          const data = await res.json();
          // Filter packages that contain the current service in their items list
          const related = data.filter((pkg: DbServicePackage) =>
            pkg.is_active && pkg.items.some((item) => item.service_slug === currentServiceSlug)
          );
          setPackages(related);
        }
      } catch (err) {
        console.error("Failed to load packages", err);
      } finally {
        setLoading(false);
      }
    }
    loadPackages();
  }, [currentServiceSlug]);

  if (loading || packages.length === 0) return null;

  return (
    <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/20 to-purple-50/10 p-5 shadow-[0_8px_30px_rgba(99,102,241,0.03)] backdrop-blur-sm md:p-8">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
        <h2 className="text-lg font-black text-slate-900 md:text-xl">Recommended Packages (Save Big)</h2>
      </div>
      <p className="text-xs text-slate-500 font-semibold mt-1">
        Get comprehensive setups and save up to 40% on government registrations by purchasing a starter bundle.
      </p>

      <div className="mt-5 space-y-4">
        {packages.map((pkg) => {
          const savings = pkg.original_price - pkg.selling_price;

          return (
            <div
              key={pkg.id}
              className="flex flex-col gap-4 rounded-2xl border border-indigo-100/50 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-slate-950">{pkg.name}</h4>
                  {savings > 0 && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 uppercase">
                      Save {safeCurrency(savings)}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-500">{pkg.description}</p>
                
                {/* List of included services */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {pkg.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-extrabold text-slate-700">
                      <CheckCircle className="h-3 w-3 text-indigo-600" />
                      <span>{item.service_slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price and Checkout Button */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                <div className="text-left sm:text-right">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-black text-slate-900">
                      {safeCurrency(pkg.selling_price)}
                    </p>
                    {pkg.original_price > pkg.selling_price && (
                      <span className="text-xs font-semibold text-slate-400 line-through">
                        {safeCurrency(pkg.original_price)}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mt-0.5">
                    +{safeCurrency(pkg.wallet_cashback)} Wallet Credit
                  </p>
                </div>

                <Link
                  href={`/apply/${pkg.slug}`}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white shadow-md shadow-indigo-500/10 hover:bg-indigo-700 transition active:scale-[0.98]"
                >
                  Buy Bundle
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
