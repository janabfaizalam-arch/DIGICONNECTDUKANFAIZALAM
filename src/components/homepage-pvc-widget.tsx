"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minimize2, CreditCard, Sparkles, Check, ArrowRight } from "lucide-react";

export function HomepagePvcWidget() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Check sessionStorage on client side to preserve user preference
  useEffect(() => {
    setIsMounted(true);
    const closed = sessionStorage.getItem("pvc-widget-closed");
    const minimized = sessionStorage.getItem("pvc-widget-minimized");
    if (closed === "true") {
      setIsOpen(false);
    }
    if (minimized === "true") {
      setIsMinimized(true);
    }
  }, []);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
    sessionStorage.setItem("pvc-widget-closed", "true");
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMinimized(true);
    sessionStorage.setItem("pvc-widget-minimized", "true");
  };

  const handleRestore = () => {
    setIsMinimized(false);
    sessionStorage.setItem("pvc-widget-minimized", "false");
  };

  if (!isMounted || !isOpen) return null;

  return (
    <AnimatePresence>
      {isMinimized ? (
        // Sleek Minimized Floating Badge Bubble
        <motion.button
          key="minimized-widget"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          onClick={handleRestore}
          className="fixed z-50 flex items-center gap-2 rounded-full border border-white/20 bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 p-[1.5px] shadow-[0_10px_30px_rgba(37,99,235,0.35)] hover:scale-105 active:scale-95 transition duration-300"
          style={{
            right: "1.25rem",
            bottom: "calc(5rem + env(safe-area-inset-bottom))",
          }}
          aria-label="Restore PVC Card Printing widget"
        >
          <span className="flex h-11 items-center gap-2 rounded-full bg-slate-950/90 px-4 py-2 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white">
              <CreditCard className="h-4.5 w-4.5 text-blue-400" />
              🪪 PVC Smart Card
            </span>
          </span>
        </motion.button>
      ) : (
        // Premium Apple Glassmorphism Main Widget
        <motion.div
          key="full-widget"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed z-50 w-[320px] sm:w-[350px] overflow-hidden rounded-3xl border border-white/25 bg-white/75 p-5 shadow-[0_20px_50px_rgba(8,47,73,0.18)] backdrop-blur-xl transition duration-300 hover:scale-[1.01] hover:shadow-[0_25px_60px_rgba(37,99,235,0.22)]"
          style={{
            right: "1.25rem",
            bottom: "calc(5.25rem + env(safe-area-inset-bottom))",
          }}
        >
          {/* Liquid Glass Overlay Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-orange-500/5 pointer-events-none -z-10" />
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 pointer-events-none" />

          {/* Action Header Buttons */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100/50">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-orange-600 shadow-sm border border-orange-100/50">
              <Sparkles className="h-2.5 w-2.5 text-orange-500 animate-pulse" />
              🔥 NEW SERVICE
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleMinimize}
                title="Minimize Widget"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition duration-150"
              >
                <Minimize2 className="h-3 w-3" />
              </button>
              <button
                onClick={handleClose}
                title="Close Widget"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition duration-150"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Main Visual and Content */}
          <div className="mt-4 flex gap-4 items-start">
            {/* 3D Smart Card Image with floating animation */}
            <div className="relative shrink-0 w-16 h-16 rounded-2xl overflow-hidden border border-white/60 bg-white/20 p-1 shadow-md animate-[float_5s_ease-in-out_infinite]">
              <Image
                src="/images/services/pvc/pvc-widget.png"
                alt="3D Premium PVC smart card"
                width={80}
                height={80}
                className="rounded-xl object-cover w-full h-full"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 leading-tight">
                🪪 PREMIUM PVC CARD PRINTING
              </h4>
              <p className="mt-1 text-[11px] font-semibold text-slate-500 leading-normal">
                Transform Your Documents Into Durable Smart PVC Cards
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-700 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100/50">
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-600 shrink-0" />
              Aadhaar PVC Card
            </div>
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-600 shrink-0" />
              PAN PVC Card
            </div>
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-600 shrink-0" />
              Voter ID PVC Card
            </div>
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-600 shrink-0" />
              Ayushman Card
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="mt-4">
            <Link
              href="/apply/pvc-card"
              className="group flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 font-extrabold text-white text-xs shadow-lg shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 transition duration-150 active:scale-[0.98]"
            >
              Order Now
              <ArrowRight className="h-3.5 w-3.5 transition duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Footer Branding */}
          <div className="mt-3.5 flex flex-col items-center border-t border-slate-100/50 pt-3 text-center pointer-events-none select-none">
            <a
              href="https://www.rnos.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] font-extrabold text-blue-600 hover:underline pointer-events-auto"
            >
              🌐 www.rnos.in
            </a>
            <span className="mt-1 text-[8px] font-extrabold tracking-wide text-slate-400 uppercase">
              DigiConnect Dukan Powered By RNoS India Pvt. Ltd.
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
