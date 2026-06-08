/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Mic, MicOff, Sparkles, Clock, Trash2, CornerDownRight, HelpCircle, TrendingUp } from "lucide-react";
import { servicesData } from "@/lib/services-data";

// Synonym mapping for abbreviation & typo tolerance
const synonymMap: Record<string, string[]> = {
  "gst-registration": ["gst", "g s t", "gst reg", "gstr", "gst registration", "tax"],
  "gst-return-filing": ["gst filing", "gstr", "gstr1", "gstr3b", "gst returns", "return filing"],
  "itr-filing": ["itr", "i t r", "tax", "income tax", "tax return", "tax filing", "return filing"],
  "passport": ["passport", "pass port", "pass-port", "pp", "p.p.", "visa", "abroad", "travel"],
  "learning-driving-license": ["driving licence", "driving license", "dl", "d l", "license", "licence", "rto", "vehicle driving", "learner"],
  "pvc-card": ["pvc", "pvc card", "smart card", "plastic card", "print card", "identity card print", "plastic printing"],
  "voter-id": ["voter", "voter id", "voter card", "epic", "election card"],
  "eshram-card": ["eshram", "e shram", "shram card", "labor card", "uan"],
  "labour-card": ["labour", "labor", "labour card", "labor card", "shramik"],
  "pmegp-loan": ["pmegp", "subsidy loan", "business loan", "government loan", "pmegp loan"],
  "mudra-loan": ["mudra", "mudra loan", "business loan", "micro loan", "bank loan"],
  "pm-vishwakarma-yojana": ["vishwakarma", "pm vishwakarma", "artisan", "scheme", "carpenter", "craftsman"],
  "startup-india-assistance": ["startup", "startup india", "dpiit", "pitch deck", "funding"],
  "cm-yuva-entrepreneur-loan-assistance": ["cm yuva", "yuva loan", "yuva", "entrepreneur loan", "up loan", "chief minister loan"],
  "credit-cards": ["credit card", "credit cards", "cc", "bank card", "apply card", "card apply"],
  "saving-account-opening": ["savings account", "saving account", "zero balance", "bank account", "account opening"],
  "current-account-opening": ["current account", "business account", "firm account", "current bank account"],
  "cibil-report-increase": ["cibil", "cibil score", "credit score", "credit repair", "credit report", "cibil check", "cibil status", "finance", "cibil report increase", "credit health", "repair score"],
  "dsc": ["dsc", "digital signature", "class 3", "signature token"],
  "msme-registration": ["msme", "udyam", "udyam registration", "msme registration", "udyam certificate"],
  "iso-certification": ["iso", "iso certificate", "iso certification", "quality standards"],
  "insurance": ["insurance", "vehicle insurance", "bike insurance", "car insurance", "truck insurance", "renew policy", "third party insurance"],
  "private-limited-registration": ["private limited", "pvt ltd", "company registration", "incorporation"],
  "opc-registration": ["opc", "one person company", "opc registration"],
  "private-limited-compliance": ["compliance", "roc compliance", "dir 3 kyc", "annual compliance"]
};

function levenshtein(a: string, b: string): number {
  const tmp: number[][] = [];
  let i: number, j: number;
  for (i = 0; i <= a.length; i++) tmp.push([i]);
  for (j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

const popularSearches = [
  "GST Registration",
  "ITR Filing",
  "Passport",
  "Driving Licence",
  "CIBIL Analysis",
  "PVC Smart Card",
  "PM Vishwakarma",
  "Vehicle Insurance",
];

const trendingServices = servicesData.filter(s =>
  ["gst-registration", "itr-filing", "passport", "pvc-card", "cibil-report-analysis-and-credit-health-consultation"].includes(s.slug)
);

export function SmartSearchHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

  // Load recent searches & recently viewed
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pvc-recent-searches");
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch { /* ignore */ }

    try {
      const viewed = localStorage.getItem("dc-recently-viewed");
      if (viewed) setRecentlyViewed(JSON.parse(viewed));
    } catch { /* ignore */ }
  }, []);

  // Search engine
  useEffect(() => {
    const q = searchQuery.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    if (!q) {
      setSearchResults([]);
      setSuggestion(null);
      return;
    }

    const ranked = servicesData.map(service => {
      let score = 0;
      const title = service.title.toLowerCase();
      const desc = service.shortDescription.toLowerCase();

      if (title === q) score += 100;
      else if (title.startsWith(q)) score += 80;
      else if (title.includes(q)) score += 50;

      if (desc.includes(q)) score += 15;

      const synonyms = synonymMap[service.slug] || [];
      synonyms.forEach(syn => {
        if (syn === q) score += 95;
        else if (syn.includes(q)) score += 40;
        else if (q.includes(syn)) score += 30;
      });

      const queryWords = q.split(/\s+/);
      const titleWords = title.split(/\s+/);
      queryWords.forEach(qw => {
        titleWords.forEach(tw => {
          const dist = levenshtein(qw, tw);
          if (dist === 1 && qw.length > 3) score += 25;
          else if (dist === 2 && qw.length > 5) score += 10;
        });
      });

      return { service, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.service);

    setSearchResults(ranked);

    if (ranked.length === 0 && q.length > 3) {
      let bestMatch: string | null = null;
      let minDistance = 999;

      Object.values(synonymMap).flat().forEach(syn => {
        const dist = levenshtein(q, syn);
        if (dist < minDistance && dist <= 2) {
          minDistance = dist;
          bestMatch = syn;
        }
      });

      setSuggestion(bestMatch);
    } else {
      setSuggestion(null);
    }
  }, [searchQuery]);

  const saveSearch = (term: string) => {
    const next = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(next);
    localStorage.setItem("pvc-recent-searches", JSON.stringify(next));
  };

  const handleRecentDelete = (term: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = recentSearches.filter(s => s !== term);
    setRecentSearches(next);
    localStorage.setItem("pvc-recent-searches", JSON.stringify(next));
  };

  const handleClearAllRecents = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem("pvc-recent-searches");
  };

  const toggleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setSearchQuery(text);
      saveSearch(text);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <section id="search-hub" className="bg-white py-8 md:py-12 px-3">
      <div className="container-shell">
        <div className="mx-auto max-w-3xl">
          {/* Section heading */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Find Any Service Instantly
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Smart search with typo tolerance, abbreviations & voice support
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <div className="relative flex items-center animate-scan-focus rounded-2xl">
              <Search className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search GST, ITR, DL, CIBIL, Mudra, PVC card..."
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-24 text-base font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 shadow-sm"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleVoiceSearch}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-500"
                  }`}
                  title="Voice Search"
                >
                  {isListening ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Listening indicator */}
            {isListening && (
              <div className="mt-2 text-center text-xs font-bold text-red-500 animate-pulse flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Listening... Speak now
              </div>
            )}

            {/* Typo suggestion */}
            {suggestion && (
              <div className="mt-3 text-left px-1 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-orange-500" />
                Did you mean:{" "}
                <button
                  onClick={() => { setSearchQuery(suggestion); saveSearch(suggestion); }}
                  className="text-blue-600 underline font-bold"
                >
                  {suggestion}
                </button>?
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-lg text-left max-h-80 overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-100">
                Matching Services ({searchResults.length})
              </p>
              <div className="mt-2 space-y-0.5">
                {searchResults.slice(0, 8).map((service) => (
                  <Link
                    key={service.slug}
                    href={`/services/${service.slug}`}
                    onClick={() => saveSearch(service.title)}
                    className="group flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-blue-50/50 transition"
                  >
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-700 leading-tight truncate">
                        {service.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{service.shortDescription}</p>
                    </div>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-400 transition">
                      <CornerDownRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {searchQuery && searchResults.length === 0 && !suggestion && (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5 text-center">
              <p className="text-sm font-bold text-slate-600">No matching services found</p>
              <p className="text-xs text-slate-400 mt-1">Try different keywords or browse categories below</p>
            </div>
          )}

          {/* Popular & Recent when idle */}
          {!searchQuery && (
            <div className="mt-6 space-y-6">
              {/* Popular Service Chips */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                  Popular Services
                </p>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map(term => (
                    <button
                      key={term}
                      onClick={() => { setSearchQuery(term); saveSearch(term); }}
                      className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trending Services */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                  Trending Now
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {trendingServices.map(service => (
                    <Link
                      key={service.slug}
                      href={`/services/${service.slug}`}
                      className="group rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-blue-200 hover:shadow-sm"
                    >
                      <p className="text-xs font-bold text-slate-700 group-hover:text-blue-700 line-clamp-1">
                        {service.title}
                      </p>
                      {service.amount > 0 && (
                        <p className="text-[10px] font-semibold text-slate-400 mt-1">₹{service.amount}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Recent Searches
                    </p>
                    <button
                      onClick={handleClearAllRecents}
                      className="text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map(term => (
                      <button
                        key={term}
                        onClick={() => { setSearchQuery(term); saveSearch(term); }}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-slate-300"
                      >
                        <Clock className="h-3 w-3 text-slate-300" />
                        {term}
                        <span
                          onClick={(e) => handleRecentDelete(term, e)}
                          className="text-slate-300 hover:text-slate-600 font-bold text-[10px] pl-0.5"
                        >
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recently Viewed */}
              {recentlyViewed.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                    Recently Viewed
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recentlyViewed.slice(0, 5).map(slug => {
                      const service = servicesData.find(s => s.slug === slug);
                      if (!service) return null;
                      return (
                        <Link
                          key={slug}
                          href={`/services/${slug}`}
                          className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                        >
                          {service.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
