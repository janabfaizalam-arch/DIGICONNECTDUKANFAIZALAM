"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";

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
      if (data.success && Array.isArray(data.applications)) {
        setItems(data.applications);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, [loadData]);

  function getRelativeTime(dateStr: string) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
      const diffHours = Math.floor(diffMins / 60);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    } catch {
      return "recently";
    }
  }

  // Hide completely while loading or empty — no placeholder whitespace.
  if (loading || !items.length) return null;

  return (
    <HomepageSection surface="cream" aria-labelledby="success-stories-heading">
      <HomepageSectionHeader
        eyebrow="Verified activity"
        title="Recent completed applications"
        description="Privacy-safe feed of completed or delivered applications. No personal details are shown."
      />
      <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 pr-[calc(4.5rem+env(safe-area-inset-right))]">
        {items.map((item, idx) => (
          <article
            key={`${item.service_name}-${item.created_at}-${idx}`}
            className="lg-card lg-raise flex w-[230px] shrink-0 snap-start flex-col justify-between rounded-2xl p-4 md:w-[250px]"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--dc-blue-soft)] text-[var(--dc-blue-mid)]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--dc-teal)]">Completed</span>
              </div>
              <h3 className="mt-3 line-clamp-2 text-sm font-black leading-snug text-[var(--dc-ink)]">{item.service_name}</h3>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--dc-blue-bright)]/10 pt-3 text-[10px] font-bold text-[var(--dc-muted)]">
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Verified
              </span>
              <span>{getRelativeTime(item.created_at)}</span>
            </div>
          </article>
        ))}
      </div>
    </HomepageSection>
  );
}
