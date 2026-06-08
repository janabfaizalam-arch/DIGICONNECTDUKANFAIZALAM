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

    }, 22000); // Cycle every 22 seconds

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

  let statusText = "In Progress";
  let Icon = HelpCircle;
  let statusColorClass = "text-blue-500 bg-blue-50 border-blue-100/50";

  if (isCompleted) {
    statusText = "Completed";
    Icon = CheckCircle2;
    statusColorClass = "text-emerald-500 bg-emerald-50 border-emerald-100/50";
  } else if (isSubmission) {
    statusText = "Submitted";
    Icon = FileUp;
    statusColorClass = "text-orange-500 bg-orange-50 border-orange-100/50";
  }

  return (
    <div className="fixed bottom-6 left-6 z-[45] pointer-events-none select-none max-w-[280px] sm:max-w-xs print:hidden">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: { type: "spring", stiffness: 260, damping: 22 }
            }}
            exit={{ 
              opacity: 0, 
              y: -15, 
              scale: 0.95,
              transition: { duration: 0.3, ease: "easeInOut" }
            }}
            className="flex items-center gap-3 p-3 rounded-2xl border border-white/45 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] pointer-events-auto"
          >
            {/* Left status badge icon */}
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${statusColorClass}`}>
              <Icon className="h-4.5 w-4.5 stroke-[2]" />
            </div>

            {/* Content text */}
            <div className="min-w-0 pr-1 text-left">
              <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block leading-none">
                {statusText} Live
              </span>
              <h4 className="text-[11px] font-black text-slate-800 mt-1 leading-tight truncate">
                {currentItem.service_name}
              </h4>
              <span className="text-[9.5px] font-semibold text-slate-450 block leading-none mt-0.5">
                Processed PAN India
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
