/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Search, Mic, MicOff, CornerDownRight, HelpCircle, History,
  Sparkles, Zap, ArrowRight, Printer, Gift, UserRound, X
} from "lucide-react";
import { servicesData } from "@/lib/services-data";

export type SearchCatalogItem = {
  slug: string;
  title: string;
  shortDescription: string;
  priceLabel: string;
  category: string;
  amount: number;
};

// Synonym mapping for abbreviation, typo, Hindi & Hinglish tolerance
const synonymMap: Record<string, string[]> = {
  "gst-registration": ["gst", "g s t", "gst reg", "gstr", "gst registration", "register gst", "gst regisration", "tax", "bahi", "khata", "vyapar"],
  "gst-return-filing": ["gst filing", "gstr", "gstr1", "gstr3b", "gst returns", "return filing", "gstr file"],
  "itr-filing": ["itr", "i t r", "tax", "income tax", "tax return", "tax filing", "return filing", "itr filing", "income tax return", "audit"],
  "passport": ["passport", "pass port", "pass-port", "pp", "p.p.", "visa", "abroad", "travel", "passprt", "pasport"],
  "learning-driving-license": ["driving licence", "driving license", "dl", "d l", "license", "licence", "rto", "vehicle driving", "learner", "chalan", "gaadi", "rto exam"],
  "pvc-card": ["pvc", "pvc card", "smart card", "plastic card", "print card", "identity card print", "plastic printing", "smart print"],
  "voter-id": ["voter", "voter id", "voter card", "epic", "election card", "vote card", "pehchan patra"],
  "eshram-card": ["eshram", "e shram", "shram card", "labor card", "uan", "labour card"],
  "labour-card": ["labour", "labor", "labour card", "labor card", "shramik", "majdoor", "majdoor card"],
  "pmegp-loan": ["pmegp", "subsidy loan", "business loan", "government loan", "pmegp loan", "loan"],
  "mudra-loan": ["mudra", "mudra loan", "business loan", "micro loan", "bank loan", "loan"],
  "pm-vishwakarma-yojana": ["vishwakarma", "pm vishwakarma", "artisan", "scheme", "carpenter", "craftsman", "skill training", "vishkarma"],
  "startup-india-assistance": ["startup", "startup india", "dpiit", "pitch deck", "funding", "business register"],
  "cm-yuva-entrepreneur-loan-assistance": ["cm yuva", "yuva loan", "yuva", "entrepreneur loan", "up loan", "chief minister loan"],
  "credit-cards": ["credit card", "credit cards", "cc", "bank card", "apply card", "card apply"],
  "saving-account-opening": ["savings account", "saving account", "zero balance", "bank account", "account opening", "khata", "open account"],
  "current-account-opening": ["current account", "business account", "firm account", "current bank account", "firm khata"],
  "cibil-report-increase": ["cibil", "cibil score", "credit score", "credit repair", "credit report", "cibil check", "cibil status", "finance", "cibil report increase", "credit health", "repair score"],
  "dsc": ["dsc", "digital signature", "class 3", "signature token"],
  "msme-registration": ["msme", "udyam", "udyam registration", "msme registration", "udyam certificate"],
  "iso-certification": ["iso", "iso certificate", "iso certification", "quality standards"],
  "insurance": ["insurance", "vehicle insurance", "bike insurance", "car insurance", "truck insurance", "renew policy", "third party insurance"],
  "private-limited-registration": ["private limited", "pvt ltd", "company registration", "incorporation"],
  "opc-registration": ["opc", "one person company", "opc registration"],
  "private-limited-compliance": ["compliance", "roc compliance", "dir 3 kyc", "annual compliance"]
};

// Spotlight Quick Actions matching terms
const QUICK_ACTIONS = [
  { title: "Apply Now", href: "/services", description: "Browse catalog and apply for Passport, GST, ITR, PAN...", icon: Zap, terms: ["apply", "new", "start", "form", "services", "apply now"] },
  { title: "Track Application", href: "/customer/dashboard?tab=applications", description: "Check real-time progress of your applications", icon: CornerDownRight, terms: ["track", "status", "check", "file", "arn", "progress", "history"] },
  { title: "Download Receipt / Invoice", href: "/customer/dashboard?tab=applications", description: "Get your payment receipts and tax invoices", icon: HelpCircle, terms: ["receipt", "invoice", "bill", "download", "pdf", "payment receipt"] },
  { title: "Customer Support", href: "/customer/dashboard?tab=support", description: "Connect with support for any queries or help", icon: HelpCircle, terms: ["support", "help", "contact", "chat", "whatsapp", "call", "care", "executive"] },
  { title: "Wallet & Cashback Balance", href: "/customer/dashboard?tab=wallet", description: "Check reward points, cashbacks, and transactions", icon: Sparkles, terms: ["wallet", "balance", "money", "cashback", "payout", "passbook", "ledger", "rewards"] },
  { title: "Rewards / Refer & Earn", href: "/customer/dashboard?tab=referral", description: "Refer your friends and earn cash rewards", icon: Gift, terms: ["rewards", "refer", "referral", "earn", "invite", "bonus", "referral code"] },
  { title: "My Profile & KYC Documents", href: "/customer/dashboard?tab=profile", description: "Edit contact details, address, and upload files", icon: UserRound, terms: ["profile", "account", "kyc", "setting", "address", "mobile", "password"] },
  { title: "Smart PVC Card Printing", href: "/print", description: "Instantly upload PDFs/images and print PVC cards", icon: Printer, terms: ["print", "pvc", "plastic", "smart card", "document", "upload pdf", "print now"] }
];

const POPULAR_SEARCHES = ["Passport", "GST Registration", "ITR Filing", "PM Vishwakarma", "PVC Card"];

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

// Custom text highlighter helper
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;
  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="bg-blue-100 text-blue-900 rounded-[2px] px-0.5 font-extrabold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function SmartSearchHub({
  catalog,
  variant = "default",
}: {
  catalog?: SearchCatalogItem[];
  variant?: "default" | "hero";
}) {
  const isHero = variant === "hero";
  const searchCatalog = useMemo<SearchCatalogItem[]>(() => {
    if (catalog && catalog.length) return catalog;
    return servicesData.map((s) => ({
      slug: s.slug,
      title: s.title,
      shortDescription: s.shortDescription,
      priceLabel: s.priceLabel,
      category: s.category,
      amount: s.amount,
    }));
  }, [catalog]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchCatalogItem[]>([]);
  const [matchedActions, setMatchedActions] = useState<typeof QUICK_ACTIONS>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [desktopSearch, setDesktopSearch] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktopSearch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setActiveResultIndex(-1);
  }, [searchQuery, searchResults, matchedActions]);

  // Handle Spotlight keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalResults = matchedActions.length + searchResults.length;
    if (totalResults === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveResultIndex((prev) => (prev + 1) % totalResults);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveResultIndex((prev) => (prev - 1 + totalResults) % totalResults);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeResultIndex >= 0 && activeResultIndex < totalResults) {
        if (activeResultIndex < matchedActions.length) {
          const action = matchedActions[activeResultIndex];
          saveSearch(action.title);
          window.location.href = action.href;
        } else {
          const service = searchResults[activeResultIndex - matchedActions.length];
          saveSearch(service.title);
          window.location.href = `/services/${service.slug}`;
        }
      }
    }
  };

  // Load recent searches on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pvc-recent-searches");
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Search Engine
  useEffect(() => {
    const rawQ = searchQuery.toLowerCase().replace(/[^a-z0-9\s\u0900-\u097F]/g, "").trim();
    if (!rawQ) {
      setSearchResults([]);
      setMatchedActions([]);
      setSuggestion(null);
      return;
    }

    const q = rawQ;

    // 1. Filter Spotlight Actions
    const actions = QUICK_ACTIONS.filter(action =>
      action.title.toLowerCase().includes(q) ||
      action.description.toLowerCase().includes(q) ||
      action.terms.some(term => term.includes(q) || q.includes(term))
    );
    setMatchedActions(actions);

    // 2. Filter & Rank Services (deterministic; no browser AI API)
    const ranked = searchCatalog
      .map((service) => {
        let score = 0;
        const title = service.title.toLowerCase();
        const desc = (service.shortDescription || "").toLowerCase();
        const category = (service.category || "").toLowerCase();

        if (title === q) score += 100;
        else if (title.startsWith(q)) score += 80;
        else if (title.includes(q)) score += 50;

        if (desc.includes(q)) score += 15;
        if (category.includes(q)) score += 10;

        const synonyms = synonymMap[service.slug] || [];
        synonyms.forEach((syn) => {
          const synLower = syn.toLowerCase();
          if (synLower === q) score += 95;
          else if (synLower.includes(q)) score += 40;
          else if (q.includes(synLower)) score += 30;
        });

        const queryWords = q.split(/\s+/);
        const titleWords = title.split(/\s+/);
        queryWords.forEach((qw) => {
          titleWords.forEach((tw) => {
            const dist = levenshtein(qw, tw);
            if (dist === 1 && qw.length > 3) score += 35;
            else if (dist === 2 && qw.length > 5) score += 15;
          });
        });

        return { service, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.service);

    setSearchResults(ranked);

    // Typo distance suggestion
    if (ranked.length === 0 && q.length > 2) {
      let bestMatch: string | null = null;
      let minDistance = 999;

      Object.values(synonymMap).flat().forEach(syn => {
        const dist = levenshtein(q, syn.toLowerCase());
        if (dist < minDistance && dist <= 2) {
          minDistance = dist;
          bestMatch = syn;
        }
      });

      if (bestMatch) {
        const readableMatch = (bestMatch as string).split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        setSuggestion(readableMatch);
      } else {
        setSuggestion(null);
      }
    } else {
      setSuggestion(null);
    }
  }, [searchQuery, searchCatalog]);

  const saveSearch = (term: string) => {
    const next = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(next);
    try {
      localStorage.setItem("pvc-recent-searches", JSON.stringify(next));
    } catch { /* ignore */ }
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
    <section
      id="search-hub"
      className={
        isHero
          ? "relative z-30 w-full max-w-xl"
          : "relative z-30 mx-auto w-full max-w-2xl px-3 pt-3 pb-2 sm:px-4 sm:pt-5 md:pt-6"
      }
    >
      {/* Click catcher backdrop wrapper */}
      {isFocused && (
        <div
          className="fixed inset-0 z-10 bg-transparent"
          onMouseDown={() => setIsFocused(false)}
        />
      )}

      {/* Search Input Box */}
      <div className="relative z-20 min-w-0">
        <div
          className={
            isHero
              ? "relative flex min-h-12 items-center gap-1 rounded-full border border-white/40 bg-white p-1 shadow-[0_12px_36px_rgba(7,31,77,0.2)] sm:min-h-[3.35rem]"
              : "relative flex min-h-12 items-center gap-1 rounded-2xl border border-slate-200/50 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.03)] backdrop-blur-xl transition-all duration-300 focus-within:border-blue-500/50 focus-within:shadow-[0_12px_36px_rgba(37,99,235,0.06)] sm:min-h-[3.25rem] sm:rounded-full"
          }
        >
          <Search className="pointer-events-none ml-3 h-4 w-4 shrink-0 text-slate-400 sm:ml-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
          <label htmlFor="homepage-search-input" className="sr-only">
            Search services, schemes, forms and FAQs
          </label>
          <input
            id="homepage-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            placeholder={desktopSearch ? "Search services, schemes, forms and FAQs" : "Search services or schemes"}
            autoComplete="off"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent py-3 pr-1 text-base font-semibold text-slate-800 outline-none placeholder:truncate placeholder:text-slate-400 sm:text-[15px] sm:font-bold"
            aria-controls="homepage-search-results"
            aria-autocomplete="list"
          />
          <div className="mr-1 flex shrink-0 items-center gap-0.5 sm:mr-1.5 sm:gap-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
            {isHero ? (
              <button
                type="button"
                onClick={() => {
                  if (searchResults[0]) {
                    window.location.href = `/services/${searchResults[0].slug}`;
                  } else if (searchQuery.trim()) {
                    window.location.href = `/services?q=${encodeURIComponent(searchQuery.trim())}`;
                  } else {
                    document.getElementById("homepage-search-input")?.focus();
                  }
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--dc-blue-700)] text-white transition hover:bg-[var(--dc-blue-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200 sm:w-auto sm:px-4"
                aria-label="Search"
              >
                <Search className="h-4 w-4 sm:hidden" aria-hidden="true" />
                <span className="hidden text-sm font-semibold sm:inline">Search</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleVoiceSearch}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200/70"
                }`}
                aria-label={isListening ? "Stop voice search" : "Start voice search"}
                title="Voice search"
              >
                {isListening ? <Mic className="h-4 w-4" aria-hidden="true" /> : <MicOff className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
        {!isHero ? (
          <p className="mt-1.5 hidden px-1 text-[11px] font-semibold text-slate-400 md:block">
            Search services, schemes, forms and FAQs
          </p>
        ) : null}

        {/* Listening Indicator */}
        {isListening && (
          <div className="mt-2 text-center text-xs font-bold text-red-500 animate-pulse flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Listening...
          </div>
        )}

        {/* Typo Suggestion */}
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

        {/* Dynamic Command Dropdown */}
        {isFocused && (
          <div
            id="homepage-search-results"
            role="listbox"
            aria-label="Search suggestions"
            className="absolute top-full left-0 right-0 z-30 mt-2 max-h-[min(360px,55vh)] space-y-3.5 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-150 bg-white p-3 text-left shadow-2xl no-scrollbar sm:p-4"
          >
            {/* Case A: Empty Input State (Popular, Recents, and Default Quick Actions) */}
            {!searchQuery.trim() ? (
              <>
                {/* Popular Tags */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Popular searches</p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SEARCHES.map(term => (
                      <button
                        key={term}
                        onMouseDown={() => { setSearchQuery(term); saveSearch(term); }}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200/50 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recents */}
                {recentSearches.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Recent searches</p>
                    <div className="space-y-1">
                      {recentSearches.map(term => (
                        <button
                          key={term}
                          onMouseDown={() => { setSearchQuery(term); }}
                          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 w-full text-left"
                        >
                          <History className="h-3.5 w-3.5 text-slate-300" />
                          <span>{term}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Quick Actions */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">🚀 Quick Action Shortcuts</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {QUICK_ACTIONS.map(action => {
                      const Icon = action.icon;
                      return (
                        <Link
                          key={action.title}
                          href={action.href}
                          className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/50 hover:bg-blue-50/30 border border-slate-200/40 hover:border-blue-100/50 group transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                            <Icon className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-tight group-hover:text-blue-700">{action.title}</p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 leading-normal">{action.description}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              // Case B: Active Query Results
              <>
                {/* 1. Surfaced Actions */}
                {matchedActions.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Quick Actions</p>
                    <div className="space-y-1">
                      {matchedActions.map((action, index) => {
                        const Icon = action.icon;
                        const isActive = index === activeResultIndex;
                        return (
                          <Link
                            key={action.title}
                            href={action.href}
                            onMouseDown={() => saveSearch(action.title)}
                            className={`flex items-center justify-between gap-3 p-2 rounded-xl transition ${
                              isActive ? "bg-blue-600 text-white" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                                isActive ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                              }`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className={`truncate text-xs font-bold leading-tight ${isActive ? "text-white" : "text-slate-800"}`}>
                                  <HighlightText text={action.title} query={searchQuery} />
                                </p>
                                <p className={`text-[10px] truncate mt-0.5 leading-normal ${isActive ? "text-white/80" : "text-slate-400"}`}>
                                  {action.description}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-white" : "text-slate-300"}`} />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Surfaced Services */}
                {searchResults.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Services & Schemes</p>
                    <div className="space-y-1">
                      {searchResults.slice(0, 8).map((service, index) => {
                        const globalIndex = matchedActions.length + index;
                        const isActive = globalIndex === activeResultIndex;
                        return (
                          <Link
                            key={service.slug}
                            href={`/services/${service.slug}`}
                            onMouseDown={() => saveSearch(service.title)}
                            className={`group flex items-center justify-between gap-3 p-2 rounded-xl transition ${
                              isActive ? "bg-blue-600 text-white" : "hover:bg-slate-50/40"
                            }`}
                          >
                            <div className="min-w-0">
                              <h4 className={`text-xs md:text-sm font-bold leading-tight truncate transition-colors ${
                                isActive ? "text-white" : "text-slate-850 group-hover:text-blue-650"
                              }`}>
                                <HighlightText text={service.title} query={searchQuery} />
                              </h4>
                              <p className={`text-[10px] md:text-xs mt-0.5 line-clamp-1 leading-normal font-semibold transition-colors ${
                                isActive ? "text-white/80" : "text-slate-400"
                              }`}>
                                <HighlightText text={service.shortDescription} query={searchQuery} />
                              </p>
                            </div>
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              isActive ? "bg-white/20 text-white" : "bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-400"
                            }`}>
                              <CornerDownRight className="h-3.5 w-3.5" />
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {searchResults.length === 0 && matchedActions.length === 0 && (
                  <div className="py-4 text-center">
                    <p className="text-sm font-bold text-slate-600">No matches found</p>
                    <p className="text-xs text-slate-400 mt-1 font-semibold leading-normal">
                      Try searching with different terms or check spelling.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
