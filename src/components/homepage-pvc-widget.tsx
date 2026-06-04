"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minimize2, CreditCard, Sparkles, Check, ArrowRight } from "lucide-react";

export function HomepagePvcWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check localStorage state on mount
    const closedTimestamp = localStorage.getItem("pvc-widget-last-closed");
    const minimizedState = localStorage.getItem("pvc-widget-minimized");
    
    if (closedTimestamp) {
      const elapsed = Date.now() - Number(closedTimestamp);
      if (elapsed < 24 * 60 * 60 * 1000) {
        setIsOpen(false);
        return;
      }
    }
    
    setIsOpen(true);
    if (minimizedState === "true") {
      setIsMinimized(true);
    }
  }, []);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
    localStorage.setItem("pvc-widget-last-closed", String(Date.now()));
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMinimized(true);
    localStorage.setItem("pvc-widget-minimized", "true");
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMinimized(false);
    localStorage.setItem("pvc-widget-minimized", "false");
  };

  if (!isMounted || !isOpen) return null;

  return (
    <AnimatePresence>
      {isMinimized ? (
        // Premium Minimized Bubble Badge
        <motion.button
          key="pvc-minimized"
          initial={{ opacity: 0, scale: 0.8, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 15 }}
          onClick={handleExpand}
          className="fixed z-50 flex items-center gap-2 rounded-full border border-white/20 bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 p-[1px] shadow-[0_10px_25px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95 transition-all duration-300"
          style={{
            right: "1.25rem",
            bottom: "calc(var(--bottom-nav-height) + 1rem + env(safe-area-inset-bottom))",
          }}
          aria-label="Expand PVC Card widget"
        >
          <span className="flex h-9 items-center gap-1.5 rounded-full bg-slate-950/90 px-3.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
            </span>
            <CreditCard className="h-3.5 w-3.5 text-blue-400" />
            PVC Card
          </span>
        </motion.button>
      ) : (
        // Responsive Main Widget
        <motion.div
          key="pvc-full"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="fixed z-50 border border-white/20 bg-white/80 p-3 shadow-[0_16px_40px_rgba(8,47,73,0.15)] backdrop-blur-xl transition duration-300 hover:scale-[1.01]
            /* Mobile styles */
            left-4 right-4 max-h-[140px] rounded-2xl bottom-[calc(var(--bottom-nav-height)+0.5rem+env(safe-area-inset-bottom))]
            /* Desktop overrides */
            md:left-auto md:right-5 md:w-[320px] md:max-h-none md:rounded-3xl md:p-4.5 md:bottom-[calc(var(--bottom-nav-height)+1.5rem+env(safe-area-inset-bottom))]"
        >
          {/* Liquid Glass Overlay Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-orange-500/5 pointer-events-none rounded-inherit" />
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 pointer-events-none rounded-t-inherit" />

          {/* Action Header Buttons */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100/40">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-orange-650 shadow-sm border border-orange-100/40">
              <Sparkles className="h-2 w-2 text-orange-500 animate-pulse" />
              PVC Smart Card
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleMinimize}
                title="Minimize Widget"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition duration-150"
              >
                <Minimize2 className="h-2.5 w-2.5" />
              </button>
              <button
                onClick={handleClose}
                title="Close Widget"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition duration-150"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>

          {/* Mobile Layout (Max-height 140px layout) */}
          <div className="flex md:hidden gap-3 mt-2.5 items-center">
            <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-white bg-white/20 p-0.5 shadow-sm">
              <Image
                src="/images/services/pvc/pvc-widget.png"
                alt="PVC Card"
                width={50}
                height={50}
                className="rounded-lg object-cover w-full h-full"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-900 leading-none">
                Waterproof Polymer Card
              </h4>
              <p className="mt-1 text-[9px] font-semibold text-slate-500 leading-tight line-clamp-2">
                Aadhaar, PAN, Voter or DL printed on premium wallet-sized PVC.
              </p>
            </div>
            <Link
              href="/apply/pvc-card"
              className="flex h-8 shrink-0 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 font-extrabold text-white text-[10px] shadow-md shadow-blue-600/10 hover:from-blue-700 active:scale-95 transition"
            >
              Order
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Desktop Layout (Standard Glass Card) */}
          <div className="hidden md:block">
            <div className="mt-3.5 flex gap-3.5 items-start">
              <div className="relative shrink-0 w-14 h-14 rounded-2xl overflow-hidden border border-white/60 bg-white/20 p-1 shadow-md animate-[float-soft_5s_ease-in-out_infinite]">
                <Image
                  src="/images/services/pvc/pvc-widget.png"
                  alt="PVC Card"
                  width={60}
                  height={60}
                  className="rounded-xl object-cover w-full h-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 leading-tight">
                  Premium PVC Printing
                </h4>
                <p className="mt-1 text-[10px] font-semibold text-slate-500 leading-relaxed">
                  Transform digital files into high-quality waterproof smart cards.
                </p>
              </div>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-1.5 text-[9px] font-bold text-slate-700 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50">
              <div className="flex items-center gap-1">
                <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                Aadhaar PVC Card
              </div>
              <div className="flex items-center gap-1">
                <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                PAN PVC Card
              </div>
              <div className="flex items-center gap-1">
                <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                Voter ID Card
              </div>
              <div className="flex items-center gap-1">
                <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                Ayushman Card
              </div>
            </div>

            <div className="mt-3.5">
              <Link
                href="/apply/pvc-card"
                className="group flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 font-extrabold text-white text-[11px] shadow-md shadow-blue-600/10 hover:from-blue-700 hover:to-indigo-700 transition active:scale-[0.98]"
              >
                Order Smart Card
                <ArrowRight className="h-3 w-3 transition duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="mt-3 flex flex-col items-center border-t border-slate-100/50 pt-2.5 text-center">
              <span className="text-[7.5px] font-bold tracking-wide text-slate-450 uppercase leading-normal">
                DigiConnect Dukan • Powered By RNoS India
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
