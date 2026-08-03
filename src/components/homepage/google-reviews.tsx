"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Star, CheckCircle2, Quote, MessageSquare } from "lucide-react";
import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";

interface GoogleReviewItem {
  name: string;
  location: string;
  text: string;
  rating: number;
  timeDescription?: string;
  profilePhoto?: string | null;
}

interface GoogleData {
  success: boolean;
  configured: boolean;
  reviews: GoogleReviewItem[];
  rating?: number;
  totalRatings?: number;
  lastSyncedAt?: string | null;
}

/** Shows Google Business reviews only when the Places integration returns real data. */
export function GoogleReviews() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [googleData, setGoogleData] = useState<GoogleData | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/google-reviews")
      .then((res) => res.json())
      .then((data: GoogleData) => {
        if (active) setGoogleData(data);
      })
      .catch(() => {
        if (active) setGoogleData({ success: false, configured: false, reviews: [] });
      })
      .finally(() => {
        if (active) setGoogleLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const reviewsList = useMemo(() => {
    if (googleData?.success && googleData.reviews?.length) return googleData.reviews;
    return [];
  }, [googleData]);

  useEffect(() => {
    if (reviewsList.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % reviewsList.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [reviewsList.length]);

  // Hide completely while loading or empty — no placeholder whitespace.
  if (googleLoading || !reviewsList.length) return null;

  const rating = googleData?.rating ?? null;
  const totalRatings = googleData?.totalRatings ?? reviewsList.length;

  return (
    <HomepageSection id="reviews" surface="sky">
      <HomepageSectionHeader
        eyebrow="Google reviews"
        title="What customers say on Google"
        description="Live Google Business reviews only. This section stays hidden when the API has no data."
      />

      {rating != null ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--dc-blue-500)]/15 bg-white p-4">
          <span className="text-2xl font-black text-[var(--dc-ink)]">{rating.toFixed(1)}</span>
          <span className="flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
              />
            ))}
          </span>
          <span className="text-xs font-bold text-[var(--dc-body)]">{totalRatings} Google reviews</span>
          <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--dc-teal-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--dc-teal)]">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Synced
          </span>
        </div>
      ) : null}

      <div className="relative mx-auto min-h-[220px] max-w-2xl">
        <div className="relative flex h-48 items-center justify-center">
          {reviewsList.map((test, index) => {
            const active = index === activeIndex;
            const starCount = test.rating || 5;
            return (
              <div
                key={`${test.name}-${index}`}
                className={`absolute inset-0 flex flex-col justify-between rounded-3xl border border-[var(--dc-blue-500)]/10 bg-white p-6 shadow-[0_8px_28px_rgba(7,31,77,0.06)] transition-all duration-500 ${
                  active ? "z-10 translate-y-0 opacity-100" : "pointer-events-none z-0 translate-y-4 opacity-0"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < starCount ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                        />
                      ))}
                    </div>
                    <Quote className="h-5 w-5 text-slate-200" aria-hidden="true" />
                  </div>
                  <p className="line-clamp-3 text-sm font-semibold italic leading-relaxed text-[var(--dc-body)]">
                    &ldquo;{test.text}&rdquo;
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2.5">
                    {test.profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={test.profilePhoto} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dc-blue-soft)] text-xs font-black text-[var(--dc-blue-700)]">
                        {test.name.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <span className="block text-xs font-black text-[var(--dc-ink)]">{test.name}</span>
                      <span className="mt-0.5 block text-[10px] font-semibold text-[var(--dc-muted)]">
                        {test.timeDescription || "Google review"}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--dc-teal-soft)] px-2 py-0.5 text-[9px] font-black text-[var(--dc-teal)]">
                    <MessageSquare className="h-3 w-3" aria-hidden="true" /> Google
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {reviewsList.length > 1 ? (
          <div className="mt-5 flex justify-center gap-1.5">
            {reviewsList.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2 min-w-2 rounded-full transition-all ${
                  index === activeIndex ? "w-6 bg-[var(--dc-blue-700)]" : "bg-slate-300"
                }`}
                aria-label={`Show review ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </HomepageSection>
  );
}
