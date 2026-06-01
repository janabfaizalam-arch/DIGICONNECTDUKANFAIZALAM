"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function HomepageYuvaPill() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has closed the pill previously
    const isClosed = localStorage.getItem("cm_yuva_pill_closed");
    if (!isClosed) {
      // Delay showing slightly to make the slide-down feel smooth and premium
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("cm_yuva_pill_closed", "true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0, y: -20 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative z-30 w-full overflow-hidden border-b border-blue-50/20 bg-[linear-gradient(135deg,rgba(7,19,38,0.85),rgba(13,42,82,0.85))] py-2.5 backdrop-blur-md print:hidden"
        >
          {/* Subtle glow effect behind */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-20%,rgba(249,115,22,0.15),transparent_40%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_120%,rgba(37,99,235,0.15),transparent_40%)]" />

          <div className="container-shell flex items-center justify-between gap-4">
            {/* The Glass Pill wrapper */}
            <div className="relative flex flex-1 items-center overflow-hidden rounded-full border border-white/10 bg-white/5 py-1.5 pl-4 pr-3 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-sm">
              
              {/* Hot badge */}
              <span className="mr-3 flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                <Sparkles className="h-2.5 w-2.5" />
                New
              </span>

              {/* Scrolling Text Container */}
              <div className="relative flex flex-1 overflow-hidden">
                <div className="flex animate-marquee whitespace-nowrap text-[11px] font-bold text-white/90 md:text-xs">
                  <span className="inline-block px-4">
                    🚀 CM YUVA Entrepreneur Loan Assistance Now Available • Project Report Support • MSME Registration • Documentation Help • Apply Online
                  </span>
                  <span className="inline-block px-4" aria-hidden="true">
                    🚀 CM YUVA Entrepreneur Loan Assistance Now Available • Project Report Support • MSME Registration • Documentation Help • Apply Online
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href="/services/cm-yuva-entrepreneur-loan-assistance"
                className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-[10px] font-extrabold text-[#071326] transition-all duration-200 hover:bg-orange-500 hover:text-white hover:scale-105"
              >
                Learn More
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white"
              aria-label="Dismiss announcement"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <style jsx global>{`
            @keyframes marquee {
              0% {
                transform: translate3d(0, 0, 0);
              }
              100% {
                transform: translate3d(-50%, 0, 0);
              }
            }
            .animate-marquee {
              animation: marquee 22s linear infinite;
            }
            .animate-marquee:hover {
              animation-play-state: paused;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
