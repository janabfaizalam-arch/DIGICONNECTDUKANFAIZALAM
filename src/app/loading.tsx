import React from "react";
import { Sparkles } from "lucide-react";

export default function RootLoading() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12 md:px-8" role="status" aria-label="Loading page">
      <div className="w-full max-w-lg p-6 rounded-3xl border border-white/20 bg-white/40 backdrop-blur-md shadow-[0_8px_32px_rgba(31,38,135,0.03)] text-center relative overflow-hidden">
        {/* Shimmer overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        
        {/* Spinner Ring */}
        <div className="relative flex justify-center items-center mb-6">
          <div className="h-14 w-14 rounded-full border-[3px] border-slate-100 border-t-blue-600 animate-spin" />
          <div className="absolute flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-650">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
        </div>

        {/* Brand Header */}
        <h3 className="text-lg font-black tracking-tight text-slate-800 animate-pulse">
          DigiConnect Dukan
        </h3>
        <p className="text-xs font-semibold text-slate-450 mt-1 uppercase tracking-widest">
          Secure Verification Desk
        </p>

        {/* Premium skeleton blocks */}
        <div className="mt-8 space-y-4">
          <div className="h-4.5 w-1/3 mx-auto rounded-full bg-slate-200/80 animate-pulse" />
          <div className="space-y-2.5">
            <div className="h-3.5 w-full rounded-full bg-slate-200/50 animate-pulse" />
            <div className="h-3.5 w-5/6 mx-auto rounded-full bg-slate-200/50 animate-pulse" />
            <div className="h-3.5 w-4/6 mx-auto rounded-full bg-slate-200/50 animate-pulse" />
          </div>
        </div>

        {/* Micro footer branding */}
        <div className="mt-8 border-t border-slate-150/40 pt-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          Powered By RNoS India Pvt Ltd
        </div>
      </div>
    </main>
  );
}
