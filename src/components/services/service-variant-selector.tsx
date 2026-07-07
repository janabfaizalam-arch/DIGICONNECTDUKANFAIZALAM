"use client";

import React from "react";
import { Check, Info, FileText } from "lucide-react";
import { motion } from "framer-motion";
import type { DbServiceVariant } from "@/lib/services";
import { safeCurrency } from "@/lib/admin-format";

interface ServiceVariantSelectorProps {
  variants: DbServiceVariant[];
  selectedVariant: DbServiceVariant | null;
  onSelect: (variant: DbServiceVariant) => void;
}

export function ServiceVariantSelector({
  variants,
  selectedVariant,
  onSelect,
}: ServiceVariantSelectorProps) {
  if (!variants || variants.length === 0) return null;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white/78 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.02)] backdrop-blur-sm md:p-8">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
        <h2 className="text-lg font-black text-slate-900 md:text-xl">Select Service Variant</h2>
      </div>
      <p className="text-xs text-slate-500 font-semibold mt-1">
        Choose a variant to customize your application forms, required checklist, and processing fees.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {variants.map((v) => {
          const isSelected = selectedVariant?.id === v.id;
          const processingPrice = v.offer_price || v.selling_price || 0;

          return (
            <div
              key={v.id}
              onClick={() => onSelect(v)}
              className={`relative overflow-hidden rounded-2xl border p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                isSelected
                  ? "bg-blue-50/20 border-blue-500 shadow-md ring-1 ring-blue-500/20"
                  : "bg-slate-50/40 border-slate-100 hover:border-slate-200 hover:bg-slate-50/80"
              }`}
            >
              {isSelected && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}

              <div>
                <h4 className="text-sm font-extrabold text-slate-950 pr-6">{v.name}</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">{v.description}</p>
              </div>

              <div className="mt-4 border-t border-slate-100/60 pt-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Total Price</span>
                    <p className="text-lg font-black text-slate-900">
                      {safeCurrency(processingPrice)}
                    </p>
                  </div>
                  {v.original_price > processingPrice && (
                    <span className="text-xs font-semibold text-slate-400 line-through">
                      {safeCurrency(v.original_price)}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-extrabold text-blue-700">
                    TAT: {v.timeline || "3 Days"}
                  </span>
                  {v.government_fees > 0 && (
                    <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[9px] font-extrabold text-orange-700">
                      Gov Fee: {safeCurrency(v.government_fees)}
                    </span>
                  )}
                  {v.wallet_cashback > 0 && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700">
                      +{safeCurrency(v.wallet_cashback)} Cashback
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedVariant && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-4"
        >
          <div className="flex gap-2">
            <Info className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-black text-slate-900">Required Documents for {selectedVariant.name}:</h5>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {((selectedVariant.required_documents as Array<{ id?: string; name: string; required?: boolean }>) || []).map((doc, idx) => (
                  <div key={doc.id || idx} className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-slate-450 shrink-0" />
                    <span className="text-xs text-slate-650 font-semibold">{doc.name}</span>
                    {doc.required && (
                      <span className="text-[8px] font-black text-red-500 uppercase tracking-wider">Required</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
