"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, FileUp, HelpCircle } from "lucide-react";

interface Application {
  service_name: string;
  status: string;
  created_at: string;
}

export function LiveNotificationFeed() {
  const [items, setItems] = useState<Application[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  const fetchRecent = useCallback(async () => {
    try {
      const response = await fetch("/api/recent-applications");
      const data = await response.json();
      if (data.success && data.applications && data.applications.length > 0) {
        setItems(data.applications);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.warn("[live-notification-feed] Failed to fetch recent applications:", err);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    void fetchRecent();
    // Re-fetch database entries every 3 minutes
    const fetchInterval = setInterval(fetchRecent, 180000);
    return () => clearInterval(fetchInterval);
  }, [fetchRecent]);

  // Cycle through items
  useEffect(() => {
    if (items.length === 0) return;

    // Show initial toast after 5 seconds
    const startTimer = setTimeout(() => {
      setVisible(true);
    }, 5000);

    const cycleTimer = setInterval(() => {
      // Hide current toast
      setVisible(false);
      
      // After transition out, load next item and show
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setVisible(true);
      }, 500);

    }, 15000); // Cycle every 15 seconds

    return () => {
      clearTimeout(startTimer);
      clearInterval(cycleTimer);
    };
  }, [items]);

  if (items.length === 0 || currentIndex >= items.length) {
    return null;
  }

  const currentItem = items[currentIndex];
  
  // Custom styling details based on application status
  const isCompleted = currentItem.status === "completed" || currentItem.status === "delivered";
  const isSubmission = currentItem.status === "submitted" || currentItem.status === "new";

  // Build clean live updates phrase
  let phrasedText = `${currentItem.service_name} Processing`;
  if (isCompleted) {
    phrasedText = `✓ ${currentItem.service_name} Completed`;
  } else if (isSubmission) {
    phrasedText = `↑ ${currentItem.service_name} Submitted`;
  }

  return (
    <div className="fixed bottom-[92px] sm:bottom-6 left-6 z-[45] pointer-events-none select-none max-w-[285px] sm:max-w-xs print:hidden">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: { type: "spring", stiffness: 300, damping: 25 }
            }}
            exit={{ 
              opacity: 0, 
              y: -10, 
              scale: 0.9,
              transition: { duration: 0.2, ease: "easeInOut" }
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-white/10 bg-slate-950/90 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-auto"
          >
            {/* iOS style pulsing status dot */}
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10">
              <span className={`h-1.5 w-1.5 rounded-full relative ${
                isCompleted ? "bg-emerald-400" : 
                isSubmission ? "bg-amber-400" : 
                "bg-blue-400"
              }`}>
                <span className={`absolute inset-0 rounded-full animate-ping opacity-75 ${
                  isCompleted ? "bg-emerald-400" : 
                  isSubmission ? "bg-amber-400" : 
                  "bg-blue-400"
                }`} />
              </span>
            </div>

            {/* Content text */}
            <div className="min-w-0 pr-1 text-left flex flex-col justify-center">
              <h4 className="text-[11px] font-bold text-white tracking-tight leading-tight truncate">
                {phrasedText}
              </h4>
              <span className="text-[9px] font-semibold text-slate-400 block leading-none mt-0.5">
                Processed Live PAN India
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
