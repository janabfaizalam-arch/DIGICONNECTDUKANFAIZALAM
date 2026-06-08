"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";


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

  const truncateServiceName = (name: string) => {
    if (name.length > 22) {
      return name.substring(0, 20) + "...";
    }
    return name;
  };

  const serviceNameClean = truncateServiceName(currentItem.service_name);
  let statusText = "processed";
  if (isCompleted) {
    statusText = "completed";
  } else if (currentItem.status === "submitted" || currentItem.status === "new") {
    statusText = "submitted";
  }

  const phrasedText = `${serviceNameClean} ${statusText}`;

  return (
    <div className="fixed bottom-[76px] sm:bottom-6 left-6 z-[45] pointer-events-none select-none max-w-[240px] print:hidden">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: { type: "spring", stiffness: 350, damping: 30 }
            }}
            exit={{ 
              opacity: 0, 
              y: -5, 
              scale: 0.95,
              transition: { duration: 0.15, ease: "easeInOut" }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/50 bg-white/70 backdrop-blur-xl shadow-[0_4px_12px_rgba(15,23,42,0.06)] pointer-events-auto"
          >
            {/* Elegant pulsing status dot */}
            <span className={`relative flex h-1.5 w-1.5 shrink-0 rounded-full ${
              isCompleted ? "bg-emerald-500" : 
              isSubmission ? "bg-amber-500" : 
              "bg-blue-500"
            }`}>
              <span className={`absolute inline-flex h-full w-full rounded-full animate-ping opacity-75 ${
                isCompleted ? "bg-emerald-500" : 
                isSubmission ? "bg-amber-500" : 
                "bg-blue-500"
              }`} />
            </span>

            {/* Content text */}
            <span className="text-[10px] font-semibold text-slate-800 tracking-tight leading-tight truncate">
              {phrasedText}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
