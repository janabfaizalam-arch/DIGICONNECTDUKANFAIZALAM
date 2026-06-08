"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Star, CheckCircle, Quote, MessageSquare } from "lucide-react";

const testimonials = [
  {
    name: "Amit Kumar",
    location: "Lucknow",
    text: "Fast service and proper guidance. Maine PMEGP business loan file prepare karwayi thi. Verification within 2 hours me start ho gayi. Support team WhatsApp pe active rehti hai.",
    rating: 5,
  },
  {
    name: "Shabana Parveen",
    location: "Barabanki",
    text: "DigiConnect Dukan se PVC card order kiya tha. Card quality standard credit card jaisi hai, waterproof aur gloss finish. Deliver bhi direct address pe ho gaya.",
    rating: 5,
  },
  {
    name: "Rohit Verma",
    location: "Kanpur",
    text: "ITR aur GST registration process bahut easy ho gaya. Inka dynamic checkout ledger wallet discount clear dikhata hai. RNOS certified team is highly reliable.",
    rating: 5,
  },
  {
    name: "Priya Singh",
    location: "Delhi",
    text: "Passport application ke liye documents check karwaye the. Ek bhi mistake nahi nikli. First attempt me approved. Professional aur fast service.",
    rating: 5,
  },
  {
    name: "Rajesh Gupta",
    location: "Varanasi",
    text: "CIBIL score bahut low tha. Expert team ne step by step guide kiya aur 3 months me 150+ points improve ho gaye. Highly recommended for finance consultation.",
    rating: 5,
  },
];

const tabs = ["Customer Reviews", "Google Reviews"];

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
  const [activeTab, setActiveTab] = useState(0);
  const [googleData, setGoogleData] = useState<GoogleData | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Fetch real Google reviews
  useEffect(() => {
    setGoogleLoading(true);
    fetch("/api/google-reviews")
      .then((res) => res.json())
      .then((data) => {
        setGoogleData(data);
      })
      .catch((err) => {
        console.warn("Failed to load Google reviews:", err);
        setGoogleData({ success: false, configured: false, reviews: [] });
      })
      .finally(() => {
        setGoogleLoading(false);
      });
  }, []);

  const activeList = useMemo(() => {
    if (activeTab === 0) return testimonials;
    return (googleData?.reviews || []);
  }, [activeTab, googleData]);

  // Auto-rotate current list
  useEffect(() => {
    if (activeList.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activeList.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeList]);

  // Reset index when changing tabs
  useEffect(() => {
    setActiveIndex(0);
  }, [activeTab]);

  return (
    <section id="reviews" className="bg-white py-10 md:py-12 px-3">
      <div className="container-shell">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 flex items-center justify-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-blue-600 text-blue-600" />
            Customer Success
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:text-2xl leading-none">
            Verified Reviews
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {tabs.map((tab, idx) => {
            const isGoogleTab = idx === 1;
            const countLabel = isGoogleTab && googleData?.totalRatings 
              ? ` (${googleData.totalRatings})` 
              : "";
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(idx)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === idx
                    ? "bg-blue-50 text-blue-700 border border-blue-100/30"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent"
                }`}
              >
                {tab}{countLabel}
              </button>
            );
          })}
        </div>

        {/* Carousel Content */}
        <div className="relative max-w-2xl mx-auto min-h-[220px]">
          {activeTab === 1 && (!googleData || !googleData.configured || activeList.length === 0) ? (
            /* Google Reviews Fallback Card */
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-8 text-center flex flex-col justify-center items-center min-h-[180px] shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-slate-800">Google Business Reviews</h4>
              <p className="mt-1.5 text-[11px] font-semibold text-slate-400 max-w-xs leading-normal">
                {googleLoading 
                  ? "Loading real reviews..." 
                  : "Google reviews will appear here after configuration."}
              </p>
            </div>
          ) : activeList.length === 0 ? (
            /* Loading State or No Reviews state */
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center flex flex-col justify-center items-center min-h-[180px]">
              <p className="text-xs font-bold text-slate-400">No reviews found.</p>
            </div>
          ) : (
            /* Active Slider List */
            <div className="relative h-44 flex items-center justify-center">
              {activeList.map((test, index) => {
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
                        {activeTab === 1 && (test as GoogleReviewItem).profilePhoto ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={(test as GoogleReviewItem).profilePhoto || ""} 
                            alt={test.name}
                            className="h-6 w-6 rounded-full border border-slate-100" 
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 font-bold text-[10px] flex items-center justify-center">
                            {test.name.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-bold text-slate-800">{test.name}</span>
                          <span className="text-[10px] font-semibold text-slate-400 ml-1.5">
                            • {activeTab === 1 ? ((test as GoogleReviewItem).timeDescription || "Google Review") : test.location}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100/50">
                        <CheckCircle className="h-3 w-3 stroke-[2.5]" /> {activeTab === 1 ? "Google Verified" : "Verified"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dot indicators */}
          {activeList.length > 1 && (
            <div className="mt-4 flex justify-center gap-1.5">
              {activeList.map((_, index) => (
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
