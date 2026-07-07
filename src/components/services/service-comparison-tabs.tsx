"use client";

import React, { useState } from "react";
import type { DbServiceComparison } from "@/lib/services";

interface ServiceComparisonTabsProps {
  comparisons: DbServiceComparison[];
}

export function ServiceComparisonTabs({ comparisons }: ServiceComparisonTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (!comparisons || comparisons.length === 0) return null;

  const currentComp = comparisons[activeTab];

  return (
    <div className="rounded-3xl border border-slate-100 bg-white/78 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.02)] backdrop-blur-sm md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <h2 className="text-lg font-black text-slate-900 md:text-xl">Interactive Comparison</h2>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Compare processing times, fees, benefits, and rules to choose the right scheme.
          </p>
        </div>

        {/* Tab switchers if multiple comparisons exist */}
        {comparisons.length > 1 && (
          <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100/60 p-1">
            {comparisons.map((c, idx) => (
              <button
                key={c.id || idx}
                onClick={() => setActiveTab(idx)}
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                  idx === activeTab
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-550 hover:text-slate-800"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comparison Grid */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-150 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-150">
                {((currentComp.headers as string[]) || []).map((header, index) => (
                  <th
                    key={index}
                    className={`px-5 py-4 text-xs font-black tracking-wider uppercase text-slate-800 ${
                      index > 0 ? "text-center border-l border-slate-150" : ""
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {((currentComp.rows as Record<string, string>[]) || []).map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={`transition-colors duration-150 hover:bg-slate-50/40 border-b border-slate-100 ${
                    rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                  }`}
                >
                  <td className="px-5 py-4 text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    {row.feature}
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-600 text-center border-l border-slate-150 leading-relaxed">
                    {row.v1}
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-600 text-center border-l border-slate-150 leading-relaxed">
                    {row.v2}
                  </td>
                  {row.v3 && (
                    <td className="px-5 py-4 text-xs font-semibold text-slate-600 text-center border-l border-slate-150 leading-relaxed">
                      {row.v3}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
