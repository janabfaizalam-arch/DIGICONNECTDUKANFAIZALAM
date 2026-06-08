"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Star, CheckCircle, Quote, MessageSquare } from "lucide-react";

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
}

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [googleData, setGoogleData] = useState<GoogleData | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);

  // Fetch real Google reviews
  useEffect(() => {
    let active = true;
    fetch("/api/google-reviews")
      .then((res) => res.json())
      .then((data) => {
        if (active) setGoogleData(data);
      })
      .catch((err) => {
        console.warn("Failed to load Google reviews:", err);
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
    return googleData?.reviews || [];
  }, [googleData]);

  // Auto-rotate current list
  useEffect(() => {
    if (reviewsList.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % reviewsList.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [reviewsList]);

  const rating = googleData?.rating || 0;
  const totalRatings = googleData?.totalRatings || 0;
  const isConfigured = googleData?.success && googleData?.configured && reviewsList.length > 0;

  return (
    <section id="reviews" className="bg-white py-8 md:py-10 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 flex items-center justify-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-blue-600 text-blue-600" />
            Customer Success
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:text-2xl leading-none">
            Google Reviews
          </h2>
          {isConfigured && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-650">
              <span className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-3.5 w-3.5 ${
                      i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"
                    }`} 
                  />
                ))}
              </span>
              <span className="font-extrabold text-slate-800">{rating.toFixed(1)} out of 5 stars</span>
              <span className="text-slate-400 font-semibold">•</span>
              <span className="text-slate-500 font-semibold">{totalRatings} verified reviews</span>
            </div>
          )}
        </div>

        {/* Carousel Content */}
        <div className="relative max-w-2xl mx-auto min-h-[220px]">
          {googleLoading ? (
            /* Loading State */
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-8 text-center flex flex-col justify-center items-center min-h-[180px] shadow-sm animate-pulse">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-450 mb-3">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-slate-800">Google Business Reviews</h4>
              <p className="mt-1.5 text-[11px] font-semibold text-slate-400 max-w-xs leading-normal">
                Loading real reviews...
              </p>
            </div>
          ) : !isConfigured ? (
            /* Google Reviews Fallback Card */
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-8 text-center flex flex-col justify-center items-center min-h-[180px] shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-slate-800">Google Business Reviews</h4>
              <p className="mt-1.5 text-[11px] font-semibold text-slate-400 max-w-xs leading-normal">
                Google Reviews will appear after business profile integration.
              </p>
            </div>
          ) : (
            /* Real Google Reviews Slider List */
            <div className="relative h-44 flex items-center justify-center">
              {reviewsList.map((test, index) => {
                const active = index === activeIndex;
                const starCount = test.rating || 5;

                return (
                  <div
                    key={index}
                    className={`absolute inset-0 flex flex-col justify-between p-5 rounded-2xl border border-slate-100 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.01)] transition-all duration-500 text-left ${
                      active
                        ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                        : "opacity-0 translate-y-4 scale-[0.97] pointer-events-none"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-3.5 w-3.5 ${
                                i < starCount ? "fill-amber-400 text-amber-400" : "text-slate-200"
                              }`} 
                            />
                          ))}
                        </div>
                        <Quote className="h-4.5 w-4.5 text-slate-100" />
                      </div>
                      <p className="text-xs font-semibold text-slate-650 leading-relaxed italic line-clamp-3">
                        &ldquo;{test.text}&rdquo;
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-50 pt-2.5">
                      <div className="flex items-center gap-2">
                        {test.profilePhoto ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={test.profilePhoto} 
                            alt={test.name}
                            className="h-6 w-6 rounded-full border border-slate-100 object-cover" 
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 font-bold text-[10px] flex items-center justify-center">
                            {test.name.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-bold text-slate-800">{test.name}</span>
                          <span className="text-[10px] font-semibold text-slate-400 ml-1.5">
                            • {test.timeDescription || "Google Review"}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100/50">
                        <CheckCircle className="h-3 w-3 stroke-[2.5]" /> Google Verified
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dot indicators */}
          {isConfigured && reviewsList.length > 1 && (
            <div className="mt-4 flex justify-center gap-1.5">
              {reviewsList.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeIndex ? "w-6 bg-blue-600" : "w-1.5 bg-slate-200"
                  }`}
                  aria-label={`Go to review ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
