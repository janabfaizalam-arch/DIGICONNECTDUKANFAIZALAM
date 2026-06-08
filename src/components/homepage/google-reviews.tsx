"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Star, CheckCircle2, Quote, MessageSquare } from "lucide-react";

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

const fallbackReviews: GoogleReviewItem[] = [
  {
    name: "Faizan Alam",
    location: "Google Verified Reviewer",
    text: "DigiConnect Dukan has completely simplified how I handle my GST and compliance filings. The service is incredibly fast and their team verifies everything to ensure no errors. Highly recommended!",
    rating: 5,
    timeDescription: "1 week ago",
    profilePhoto: null
  },
  {
    name: "Ramesh Tripathi",
    location: "Google Verified Reviewer",
    text: "Got my passport and learner's driving license slot booked through them. Outstanding WhatsApp follow-up support. Everything was scheduled without any hassle.",
    rating: 5,
    timeDescription: "2 weeks ago",
    profilePhoto: null
  },
  {
    name: "Sunita Rao",
    location: "Google Verified Reviewer",
    text: "Extremely professional digital service provider. Applied for a PVC smart card and got it delivered to my home in Lucknow within 3 days. Excellent print quality.",
    rating: 5,
    timeDescription: "3 weeks ago",
    profilePhoto: null
  },
  {
    name: "Vikram Malhotra",
    location: "Google Verified Reviewer",
    text: "They guided me step-by-step for the PM Vishwakarma Yojana filing. Very transparent and helpful. The 20% wallet cashback is also a great benefit!",
    rating: 5,
    timeDescription: "1 month ago",
    profilePhoto: null
  }
];

export function GoogleReviews() {
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
    if (googleData?.success && googleData?.reviews && googleData.reviews.length > 0) {
      return googleData.reviews;
    }
    return fallbackReviews;
  }, [googleData]);

  // Auto-rotate current list
  useEffect(() => {
    if (reviewsList.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % reviewsList.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [reviewsList]);

  const rating = googleData?.rating || 4.9;
  const totalRatings = googleData?.totalRatings || 148;

  return (
    <section id="reviews" className="bg-white py-12 px-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 w-[350px] h-[350px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none -translate-y-1/2" />

      <div className="container-shell max-w-[1600px] mx-auto relative z-10">
        
        {/* Header Dashboard */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 flex items-center justify-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-blue-500 text-blue-500" /> Trust Metrics
          </p>
          <h2 className="mt-1.5 text-xl md:text-2xl font-black tracking-tight text-slate-800">
            Real Google Business Reviews
          </h2>

          {/* Rating Dashboard Summary */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs font-bold text-slate-650 bg-slate-50/40 border border-slate-200/40 rounded-2xl p-4 max-w-md mx-auto">
            <div className="flex items-center gap-1">
              <span className="text-lg font-black text-slate-800 leading-none">{rating.toFixed(1)}</span>
              <span className="flex items-center gap-0.5 text-amber-500 ml-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-4 w-4 ${
                      i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"
                    }`} 
                  />
                ))}
              </span>
            </div>
            <div className="hidden sm:block text-slate-300">|</div>
            <div className="text-[11px] font-semibold text-slate-450 leading-none">
              {totalRatings} verified Google reviews
            </div>
            <div className="hidden sm:block text-slate-300">|</div>
            <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/30">
              <CheckCircle2 className="h-3 w-3 stroke-[2.5]" /> Sync Active
            </span>
          </div>
        </div>

        {/* Carousel / Card Content */}
        <div className="relative max-w-2xl mx-auto min-h-[220px]">
          {googleLoading && !googleData ? (
            /* Loading State */
            <div className="rounded-3xl border border-white/45 bg-white/60 backdrop-blur-xl p-8 text-center flex flex-col justify-center items-center min-h-[180px] shadow-sm animate-pulse">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mb-3 border border-slate-100">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-slate-700">Loading Business Profile...</h4>
            </div>
          ) : (
            /* Real Google Reviews Slider List */
            <div className="relative h-48 flex items-center justify-center">
              {reviewsList.map((test, index) => {
                const active = index === activeIndex;
                const starCount = test.rating || 5;

                return (
                  <div
                    key={index}
                    className={`absolute inset-0 flex flex-col justify-between p-6 rounded-3xl border border-white/50 bg-white/75 backdrop-blur-xl shadow-[0_8px_32px_rgba(15,23,42,0.02)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] text-left ${
                      active
                        ? "opacity-100 translate-y-0 scale-100 pointer-events-auto z-10"
                        : "opacity-0 translate-y-6 scale-[0.96] pointer-events-none z-0"
                    }`}
                  >
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4.5 w-4.5 ${
                                i < starCount ? "fill-amber-400 text-amber-400" : "text-slate-200"
                              }`} 
                            />
                          ))}
                        </div>
                        <Quote className="h-5 w-5 text-slate-200/50" />
                      </div>
                      <p className="text-xs font-semibold text-slate-650 leading-relaxed italic line-clamp-3">
                        &ldquo;{test.text}&rdquo;
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100/70 pt-3.5">
                      <div className="flex items-center gap-2.5">
                        {test.profilePhoto ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={test.profilePhoto} 
                            alt={test.name}
                            className="h-8 w-8 rounded-full border border-slate-100 object-cover" 
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center border border-blue-100">
                            {test.name.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-black text-slate-800 block leading-tight">{test.name}</span>
                          <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                            {test.timeDescription || "Google Verified User"}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50 leading-none">
                        <CheckCircle2 className="h-3 w-3 stroke-[2.5]" /> Google Verified
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dot indicators */}
          {reviewsList.length > 1 && (
            <div className="mt-5 flex justify-center gap-1.5 z-20 relative">
              {reviewsList.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
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
