"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle2, FileUp, Info, RefreshCw } from "lucide-react";

interface Application {
  service_name: string;
  status: string;
  created_at: string;
}

export function RecentSuccessStories() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const response = await fetch("/api/recent-applications");
      const data = await response.json();
      if (data.success && data.applications) {
        setItems(data.applications);
      }
    } catch (err) {
      console.warn("Failed to load success stories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    // Auto-refresh from database every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // The API returns only real applications. When there is no genuine recent
  // activity, render nothing rather than fabricated entries.
  if (!loading && items.length === 0) {
    return null;
  }

  function getRelativeTime(dateStr: string) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    } catch {
      return "recently";
    }
  }

  return (
    <section className="bg-slate-50/50 py-12 px-4 relative overflow-hidden">
      {/* Visual background ambient reflection */}
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full bg-emerald-500/5 blur-[90px] pointer-events-none -translate-y-1/2" />

      <div className="container-shell max-w-[1600px] mx-auto relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Live Trust Engine
          </p>
          <h2 className="mt-1.5 text-xl md:text-2xl font-black tracking-tight text-slate-800">
            Recent Success Stories
          </h2>
          <p className="mt-2 text-xs font-semibold text-slate-450 leading-relaxed max-w-sm mx-auto">
            Live database verification of transactions and forms processed across India. Privacy-safe activity feed.
          </p>
        </div>

        {loading && items.length === 0 ? (
          /* Loading Skeleton */
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-[220px] shrink-0 rounded-2xl border border-slate-100 bg-white p-5 animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-slate-100" />
                  <div className="h-3.5 w-14 rounded bg-slate-100" />
                </div>
                <div className="h-4 w-3/4 rounded bg-slate-100 mt-4" />
                <div className="flex justify-between items-center mt-5">
                  <div className="h-3 w-10 rounded bg-slate-100" />
                  <div className="h-3 w-16 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Success Stories Carousel List */
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory scroll-smooth">
            {items.map((item, idx) => {
              const isCompleted = item.status === "completed" || item.status === "delivered";
              const isSubmission = item.status === "submitted" || item.status === "new";
              
              let statusLabel = "Processing";
              let statusBg = "bg-blue-50/70 text-blue-600 border-blue-100/50";
              let Icon = Info;

              if (isCompleted) {
                statusLabel = "Completed";
                statusBg = "bg-emerald-50/70 text-emerald-600 border-emerald-100/50";
                Icon = CheckCircle2;
              } else if (isSubmission) {
                statusLabel = "Submitted";
                statusBg = "bg-orange-50/70 text-orange-600 border-orange-100/50";
                Icon = FileUp;
              }

              return (
                <div
                  key={idx}
                  className="w-[230px] md:w-[250px] shrink-0 snap-start snap-always rounded-2xl border border-slate-200/40 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.01)] hover:shadow-[0_12px_24px_rgba(15,23,42,0.02)] transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-xl border ${statusBg}`}>
                        <Icon className="h-4 w-4 stroke-[2]" />
                      </span>
                      <span className={`text-[9.5px] font-black uppercase tracking-wider ${isCompleted ? "text-emerald-600" : isSubmission ? "text-orange-600" : "text-blue-600"}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Service Title */}
                    <h4 className="mt-4 text-xs md:text-sm font-black text-slate-800 leading-snug line-clamp-2">
                      {item.service_name}
                    </h4>
                  </div>

                  {/* Relative Timestamp */}
                  <div className="mt-5 pt-3 border-t border-slate-100/70 flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin text-slate-300" style={{ animationDuration: "3s" }} />
                      Verified
                    </span>
                    <span>{getRelativeTime(item.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
