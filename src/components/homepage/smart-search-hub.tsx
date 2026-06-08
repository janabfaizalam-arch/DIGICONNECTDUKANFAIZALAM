/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Mic, MicOff, CornerDownRight, HelpCircle } from "lucide-react";
import { servicesData } from "@/lib/services-data";

// Synonym mapping for abbreviation & typo tolerance
const synonymMap: Record<string, string[]> = {
  "gst-registration": ["gst", "g s t", "gst reg", "gstr", "gst registration", "register gst", "gst regisration", "tax"],
  "gst-return-filing": ["gst filing", "gstr", "gstr1", "gstr3b", "gst returns", "return filing"],
  "itr-filing": ["itr", "i t r", "tax", "income tax", "tax return", "tax filing", "return filing", "itr filing", "income tax return"],
  "passport": ["passport", "pass port", "pass-port", "pp", "p.p.", "visa", "abroad", "travel", "passprt", "pasport"],
  "learning-driving-license": ["driving licence", "driving license", "dl", "d l", "license", "licence", "rto", "vehicle driving", "learner"],
  "pvc-card": ["pvc", "pvc card", "smart card", "plastic card", "print card", "identity card print", "plastic printing"],
  "voter-id": ["voter", "voter id", "voter card", "epic", "election card"],
  "eshram-card": ["eshram", "e shram", "shram card", "labor card", "uan"],
  "labour-card": ["labour", "labor", "labour card", "labor card", "shramik"],
  "pmegp-loan": ["pmegp", "subsidy loan", "business loan", "government loan", "pmegp loan"],
  "mudra-loan": ["mudra", "mudra loan", "business loan", "micro loan", "bank loan"],
  "pm-vishwakarma-yojana": ["vishwakarma", "pm vishwakarma", "artisan", "scheme", "carpenter", "craftsman", "skill training"],
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



export function SmartSearchHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setActiveResultIndex(-1);
  }, [searchQuery, searchResults]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return;
    const maxIdx = Math.min(searchResults.length, 8);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveResultIndex((prev) => (prev + 1) % maxIdx);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveResultIndex((prev) => (prev - 1 + maxIdx) % maxIdx);
    } else if (e.key === "Enter") {
      if (activeResultIndex >= 0 && activeResultIndex < maxIdx) {
        e.preventDefault();
        const activeService = searchResults[activeResultIndex];
        saveSearch(activeService.title);
        window.location.href = `/services/${activeService.slug}`;
      }
    }
  };

  // Load recent searches & recently viewed
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pvc-recent-searches");
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Search engine
  useEffect(() => {
    const rawQ = searchQuery.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    if (!rawQ) {
      setSearchResults([]);
      setSuggestion(null);
      return;
    }

    const q = rawQ;
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
          if (dist === 1 && qw.length > 3) score += 35;
          else if (dist === 2 && qw.length > 5) score += 15;
        });
      });

      return { service, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.service);

    setSearchResults(ranked);

    if (ranked.length === 0 && q.length > 2) {
      let bestMatch: string | null = null;
      let minDistance = 999;

      Object.values(synonymMap).flat().forEach(syn => {
        const dist = levenshtein(q, syn);
        if (dist < minDistance && dist <= 2) {
          minDistance = dist;
          bestMatch = syn;
        }
      });

      // Capitalize first letter for suggestion display
      if (bestMatch) {
        const readableMatch = (bestMatch as string).split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        setSuggestion(readableMatch);
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



  const toggleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please try Chrome or Edge.");
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
    <section id="search-hub" className="relative z-20 px-4 mt-4 max-w-2xl mx-auto">
      {/* Search Input Box */}
      <div className="relative">
        <div className="relative flex items-center rounded-2xl bg-white/70 border border-slate-200/50 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100/50 transition-all duration-300">
          <Search className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search services, schemes, forms…"
            className="h-12 w-full rounded-2xl bg-transparent pl-12 pr-14 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
          />
          <div className="absolute right-2 flex items-center">
            <button
              type="button"
              onClick={toggleVoiceSearch}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 active:scale-95 ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-slate-100/80 hover:bg-slate-200/60 text-slate-500"
              }`}
              title="Voice Search"
            >
              {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Listening indicator */}
        {isListening && (
          <div className="mt-2 text-center text-xs font-bold text-red-500 animate-pulse flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Listening...
          </div>
        )}

        {/* Typo suggestion */}
        {suggestion && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-lg text-left z-30 flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-orange-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-500">
              Did you mean:{" "}
              <button
                onClick={() => { setSearchQuery(suggestion); saveSearch(suggestion); }}
                className="text-blue-600 underline font-bold"
              >
                {suggestion}
              </button>?
            </span>
          </div>
        )}

        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl text-left max-h-80 overflow-y-auto no-scrollbar z-30">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Matching Services ({searchResults.length})</span>
              <span className="text-[9px] font-bold text-blue-500">Auto Synced</span>
            </p>
            <div className="mt-2 space-y-0.5">
              {searchResults.slice(0, 8).map((service, index) => (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  onClick={() => saveSearch(service.title)}
                  className={`group flex items-center justify-between gap-3 p-2.5 rounded-xl transition ${
                    index === activeResultIndex ? "bg-blue-600 text-white" : "hover:bg-blue-50/40"
                  }`}
                >
                  <div className="min-w-0">
                    <h4 className={`text-xs md:text-sm font-bold leading-tight truncate transition-colors ${
                      index === activeResultIndex ? "text-white" : "text-slate-800 group-hover:text-blue-600"
                    }`}>
                      {service.title}
                    </h4>
                    <p className={`text-[10px] md:text-xs mt-0.5 line-clamp-1 leading-normal font-semibold transition-colors ${
                      index === activeResultIndex ? "text-white/80" : "text-slate-400"
                    }`}>
                      {service.shortDescription}
                    </p>
                  </div>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    index === activeResultIndex ? "bg-white/20 text-white" : "bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-400"
                  }`}>
                    <CornerDownRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No results state */}
        {searchQuery && searchResults.length === 0 && !suggestion && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl text-left z-30">
            <p className="text-sm font-bold text-slate-605">No matching services found</p>
            <p className="text-xs text-slate-400 mt-1 font-semibold leading-normal">
              Try searching with other keywords.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
