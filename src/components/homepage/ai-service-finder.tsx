/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Mic, MicOff, Sparkles, Clock, Trash2, ArrowRight, CornerDownRight, HelpCircle } from "lucide-react";
import { servicesData } from "@/lib/services-data";

// Custom mappings for abbreviation & synonym matching
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

// Levenshtein distance for spelling correction
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
  "PVC Smart Card",
  "CIBIL Expert Analysis",
  "Mudra Loan Assistance",
];

const recommendedServices = servicesData.filter(s => 
  s.slug === "cibil-report-analysis-and-credit-health-consultation" || 
  s.slug === "pvc-card" || 
  s.slug === "gst-registration"
);

export function AiServiceFinder() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem("pvc-recent-searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to load recent searches", e);
      }
    }
  }, []);

  // Sync search updates
  useEffect(() => {
    const q = searchQuery.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    if (!q) {
      setSearchResults([]);
      setSuggestion(null);
      return;
    }

    // Rank & score search results
    const ranked = servicesData.map(service => {
      let score = 0;
      const title = service.title.toLowerCase();
      const desc = service.shortDescription.toLowerCase();

      // Exact matches
      if (title === q) score += 100;
      else if (title.startsWith(q)) score += 80;
      else if (title.includes(q)) score += 50;

      if (desc.includes(q)) score += 15;

      // Synonym mapping matching
      const synonyms = synonymMap[service.slug] || [];
      synonyms.forEach(syn => {
        if (syn === q) score += 95;
        else if (syn.includes(q)) score += 40;
        else if (q.includes(syn)) score += 30;
      });

      // Typo tolerance
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

    // Auto-suggest closest query when typo detected but no exact matches found
    if (ranked.length === 0 && q.length > 3) {
      // Find closest synonym
      let bestMatch: string | null = null;
      let minDistance = 999;
      
      Object.values(synonymMap).flat().forEach(syn => {
        const dist = levenshtein(q, syn);
        if (dist < minDistance && dist <= 2) {
          minDistance = dist;
          bestMatch = syn;
        }
      });

      if (bestMatch) {
        setSuggestion(bestMatch);
      } else {
        setSuggestion(null);
      }
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

  // Voice Search Web Speech API
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
    recognition.lang = "en-IN"; // English with Indian accent support
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setSearchQuery(text);
      saveSearch(text);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <section id="ai-finder" className="section-pad pt-2 bg-slate-50/50">
      <div className="container-shell">
        <div className="glass-panel overflow-hidden rounded-[2rem] border border-white/20 p-5 shadow-soft md:p-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-widest text-blue-700 shadow-sm border border-blue-100">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
              AI Intelligent Search
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4.5xl leading-tight">
              AI Service Finder & Help Desk
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500 max-w-xl mx-auto">
              Type or speak to find services. Typo tolerance, abbreviation, and synonym detection active.
            </p>

            {/* Smart Search Bar container */}
            <div className="relative mt-8">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search GST, ITR, DL, CIBIL, Mudra, PVC card..."
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-28 text-base font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 shadow-sm"
                />
                
                {/* Micro Actions (Voice + Search trigger) */}
                <div className="absolute right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleVoiceSearch}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                      isListening 
                        ? "bg-red-500 text-white animate-pulse" 
                        : "bg-slate-100 hover:bg-slate-200 text-slate-650"
                    }`}
                    title="Voice Search"
                  >
                    {isListening ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Speech listening status indicator */}
              {isListening && (
                <div className="mt-2.5 text-center text-xs font-bold text-red-500 animate-pulse flex items-center justify-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Listening... Speak now (English/Hindi names)
                </div>
              )}

              {/* Typo Correction spelling check suggestion */}
              {suggestion && (
                <div className="mt-3 text-left px-2 text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-orange-500" />
                  Did you mean:{" "}
                  <button
                    onClick={() => {
                      setSearchQuery(suggestion);
                      saveSearch(suggestion);
                    }}
                    className="text-blue-600 underline font-black"
                  >
                    {suggestion}
                  </button>
                  ?
                </div>
              )}
            </div>

            {/* Instant Suggestions Panel */}
            {searchResults.length > 0 && (
              <div className="mt-5 rounded-2xl border border-slate-150/40 bg-white p-4 shadow-lg text-left max-h-80 overflow-y-auto">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
                  AI Matching Services ({searchResults.length})
                </p>
                <div className="mt-2.5 space-y-1">
                  {searchResults.map((service) => (
                    <Link
                      key={service.slug}
                      href={`/services/${service.slug}`}
                      onClick={() => saveSearch(service.title)}
                      className="group flex items-start justify-between gap-3 p-2.5 rounded-xl hover:bg-blue-50/40 transition"
                    >
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700 leading-tight">
                          {service.title}
                        </h4>
                        <p className="text-xs text-slate-450 mt-1 line-clamp-1 leading-none">{service.shortDescription}</p>
                      </div>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-600 transition">
                        <CornerDownRight className="h-4 w-4" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* No Results Fallback / Recovery */}
            {searchQuery && searchResults.length === 0 && !suggestion && (
              <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/20 p-5 text-left">
                <p className="text-sm font-black text-slate-800">No direct matches found</p>
                <p className="text-xs text-slate-500 mt-0.5 font-semibold">Humare AI Assistant ko is keyword ka direct match nahi mila. Aap in services ko check kar sakte hain:</p>
                
                <div className="mt-3.5 grid gap-2.5 sm:grid-cols-3">
                  {recommendedServices.map(service => (
                    <Link
                      key={service.slug}
                      href={`/services/${service.slug}`}
                      className="flex flex-col justify-between p-3 rounded-xl border border-slate-150 bg-white shadow-sm hover:border-blue-300 transition"
                    >
                      <span className="text-[10px] font-black text-slate-900 line-clamp-1">{service.title}</span>
                      <span className="mt-2.5 inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                        Apply Now <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Searches layout (Recent & Popular) when query is empty */}
            {!searchQuery && (
              <div className="mt-8 grid gap-6 md:grid-cols-2 text-left pt-6 border-t border-slate-100/50">
                {/* Recent Searches */}
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Recent Searches</h4>
                    {recentSearches.length > 0 && (
                      <button
                        onClick={handleClearAllRecents}
                        className="text-[10px] font-bold text-slate-450 hover:text-red-500 flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Clear
                      </button>
                    )}
                  </div>
                  
                  {recentSearches.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recentSearches.map(term => (
                        <button
                          key={term}
                          onClick={() => {
                            setSearchQuery(term);
                            saveSearch(term);
                          }}
                          className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-650 hover:border-slate-350"
                        >
                          <Clock className="h-3 w-3 text-slate-400" />
                          {term}
                          <span 
                            onClick={(e) => handleRecentDelete(term, e)}
                            className="text-slate-350 hover:text-slate-600 font-extrabold text-[10px] pl-1"
                          >
                            ×
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs font-semibold text-slate-450 italic">No recent searches</p>
                  )}
                </div>

                {/* Popular Searches */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Popular Searches</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {popularSearches.map(term => (
                      <button
                        key={term}
                        onClick={() => {
                          setSearchQuery(term);
                          saveSearch(term);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/20 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50/50"
                      >
                        <Sparkles className="h-3 w-3 text-orange-400 shrink-0" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
