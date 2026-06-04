"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  X,
  ArrowRight,
  Phone,
  MessageCircle,
  Check,
  ShieldCheck,
  BadgeCheck,
  Award,
  Sparkles,
  Clock,
  Users,
  ChevronDown,
  Star,
  Percent,
  Compass,
  FileText,
  Landmark,
  ClipboardCheck,
  IdCard,
  FileCheck2,
  BadgeIndianRupee,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Coins,
  ReceiptText
} from "lucide-react";

import { servicesData, type ServiceItem } from "@/lib/services-data";
import { ApplyServiceTrigger } from "@/components/service-selection-modal";

/* ─── Extra metadata mapping for premium layout ─── */
const serviceDetailsExtra: Record<string, { processingTime: string; rating: number; reviewsCount: number; popularityScore: number; isTrending: boolean; isNew: boolean; eligibility: string }> = {
  "pvc-card": { processingTime: "2-4 Days", rating: 4.9, reviewsCount: 342, popularityScore: 98, isTrending: true, isNew: false, eligibility: "Open to all Indian citizens with valid digital cards" },
  "voter-id": { processingTime: "7-15 Days", rating: 4.8, reviewsCount: 189, popularityScore: 85, isTrending: false, isNew: true, eligibility: "Indian citizens aged 18 or above" },
  "eshram-card": { processingTime: "1-2 Days", rating: 4.7, reviewsCount: 520, popularityScore: 92, isTrending: true, isNew: false, eligibility: "Unorganized workers aged 16-59" },
  "labour-card": { processingTime: "5-7 Days", rating: 4.8, reviewsCount: 290, popularityScore: 89, isTrending: false, isNew: false, eligibility: "Construction or unorganized manual labourers" },
  "pmegp-loan": { processingTime: "15-30 Days", rating: 4.9, reviewsCount: 112, popularityScore: 94, isTrending: true, isNew: false, eligibility: "Aged 18+, Class 8 pass for large projects" },
  "mudra-loan": { processingTime: "10-20 Days", rating: 4.8, reviewsCount: 231, popularityScore: 95, isTrending: true, isNew: false, eligibility: "Micro and small business owners & traders" },
  "pm-vishwakarma-yojana": { processingTime: "3-5 Days", rating: 4.9, reviewsCount: 405, popularityScore: 96, isTrending: true, isNew: false, eligibility: "Traditional artisans and craftsmen (18 trades)" },
  "startup-india-assistance": { processingTime: "7-10 Days", rating: 4.7, reviewsCount: 65, popularityScore: 80, isTrending: false, isNew: false, eligibility: "Partnerships, LLPs, or Private Limited companies" },
  "cm-yuva-entrepreneur-loan-assistance": { processingTime: "15-20 Days", rating: 4.9, reviewsCount: 88, popularityScore: 97, isTrending: true, isNew: false, eligibility: "Indian youth and small business operators" },
  "credit-cards": { processingTime: "2-5 Days", rating: 4.8, reviewsCount: 612, popularityScore: 99, isTrending: true, isNew: false, eligibility: "Salaried or self-employed individuals aged 21-60" },
  "saving-account-opening": { processingTime: "1 Day", rating: 4.7, reviewsCount: 480, popularityScore: 90, isTrending: false, isNew: false, eligibility: "Indian residents aged 18 or above" },
  "current-account-opening": { processingTime: "2-3 Days", rating: 4.8, reviewsCount: 195, popularityScore: 88, isTrending: false, isNew: false, eligibility: "Sole proprietorships, partnerships, or corporate entities" },
  "cibil-report-increase": { processingTime: "5-7 Days", rating: 4.9, reviewsCount: 754, popularityScore: 98, isTrending: true, isNew: false, eligibility: "Anyone seeking credit bureau score tracking and disputing" },
  "passport": { processingTime: "15-30 Days", rating: 4.9, reviewsCount: 310, popularityScore: 93, isTrending: true, isNew: false, eligibility: "Indian citizens with address & identity proofs" },
  "learning-driving-license": { processingTime: "3-5 Days", rating: 4.8, reviewsCount: 420, popularityScore: 94, isTrending: true, isNew: false, eligibility: "Indian residents aged 16+ (gearless) or 18+ (with gear)" },
  "gst-registration-filing": { processingTime: "3-5 Days", rating: 4.9, reviewsCount: 523, popularityScore: 99, isTrending: true, isNew: false, eligibility: "Indian businesses crossing tax thresholds or voluntarily registering" },
  "itr-filing": { processingTime: "1-2 Days", rating: 4.9, reviewsCount: 890, popularityScore: 99, isTrending: true, isNew: false, eligibility: "Indian taxpayers with taxable income or filing mandates" },
  "private-limited-registration": { processingTime: "7-10 Days", rating: 4.9, reviewsCount: 145, popularityScore: 91, isTrending: false, isNew: false, eligibility: "Minimum 2 directors and 2 shareholders" },
  "private-limited-compliance": { processingTime: "5-7 Days", rating: 4.8, reviewsCount: 98, popularityScore: 83, isTrending: false, isNew: false, eligibility: "Registered Private Limited companies in India" },
  "opc-registration": { processingTime: "7-10 Days", rating: 4.8, reviewsCount: 76, popularityScore: 81, isTrending: false, isNew: false, eligibility: "Single Indian resident promoter and one nominee" },
  "dsc": { processingTime: "1-2 Days", rating: 4.7, reviewsCount: 320, popularityScore: 87, isTrending: false, isNew: false, eligibility: "Individuals or authorized organization heads" },
  "msme-registration": { processingTime: "1-2 Days", rating: 4.9, reviewsCount: 412, popularityScore: 95, isTrending: true, isNew: false, eligibility: "Micro, small, and medium business proprietors" },
  "iso-certification": { processingTime: "5-7 Days", rating: 4.8, reviewsCount: 54, popularityScore: 78, isTrending: false, isNew: false, eligibility: "Indian entities seeking standard compliance audits" },
  "insurance": { processingTime: "1 Day", rating: 4.8, reviewsCount: 520, popularityScore: 92, isTrending: true, isNew: false, eligibility: "Indian vehicle owners with valid registration cards" }
};

/* ─── Category mapping ─── */
const marketplaceCategories = [
  { id: "all", label: "Popular Services", icon: Sparkles, desc: "Most requested digital filings" },
  { id: "tax-business", label: "Tax & Business", icon: ReceiptText, desc: "GST, ITR and business taxes" },
  { id: "finance-banking", label: "Finance & Banking", icon: Landmark, desc: "Loans, CIBIL and credit cards" },
  { id: "insurance", label: "Insurance", icon: ShieldCheck, desc: "Fast renewals & auto quotes" },
  { id: "identity-documents", label: "Identity & Documents", icon: IdCard, desc: "PVC print, Voter ID & eShram" },
  { id: "government-schemes", label: "Government Schemes", icon: ClipboardCheck, desc: "Subsidy loans & artisan perks" },
  { id: "licenses-registrations", label: "Licenses & Registrations", icon: FileCheck2, desc: "Driving licenses & filings" },
  { id: "travel-services", label: "Travel Services", icon: Compass, desc: "Passport applications & slots" }
];

function getCategoryForService(service: ServiceItem): string {
  const slug = service.slug;
  if (slug === "passport") return "travel-services";
  if (["pvc-card", "voter-id", "eshram-card", "labour-card"].includes(slug)) return "identity-documents";
  if (["pmegp-loan", "mudra-loan", "pm-vishwakarma-yojana", "startup-india-assistance"].includes(slug)) return "government-schemes";
  if (["learning-driving-license"].includes(slug)) return "licenses-registrations";
  if (["gst-registration-filing", "itr-filing", "private-limited-registration", "private-limited-compliance", "opc-registration", "dsc", "msme-registration", "iso-certification"].includes(slug)) return "tax-business";
  if (["credit-cards", "saving-account-opening", "current-account-opening", "cibil-report-increase", "cm-yuva-entrepreneur-loan-assistance"].includes(slug)) return "finance-banking";
  if (slug === "insurance") return "insurance";
  return "tax-business";
}

/* ─── Typo Tolerant Search Matching ─── */
function getEditDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function isTypoTolerantMatch(service: ServiceItem, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  const title = service.title.toLowerCase();
  const desc = service.shortDescription.toLowerCase();
  
  if (title.includes(q) || desc.includes(q)) return true;

  // Typo mapping/synonyms
  const synonyms: Record<string, string[]> = {
    gst: ["gst", "gst reg", "gst certificate", "goods and services"],
    passport: ["passport", "pass port", "travel", "passpost"],
    dl: ["dl", "driving licence", "driving license", "driver license", "license"],
    itr: ["itr", "income tax", "tax return", "tax file", "itr file"],
    cibil: ["cibil", "credit score", "bureau", "credit health", "cibil score"],
    loan: ["loan", "pmegp", "mudra", "yuva", "subsidy", "finance", "business loan"]
  };

  for (const [key, tags] of Object.entries(synonyms)) {
    if (tags.some(t => q.includes(t) || t.includes(q))) {
      if (key === "gst" && title.includes("gst")) return true;
      if (key === "passport" && title.includes("passport")) return true;
      if (key === "dl" && (title.includes("licence") || title.includes("license") || title.includes("driving"))) return true;
      if (key === "itr" && title.includes("itr")) return true;
      if (key === "cibil" && (title.includes("cibil") || title.includes("credit"))) return true;
      if (key === "loan" && (title.includes("loan") || title.includes("yojana") || title.includes("assistance"))) return true;
    }
  }

  // Levenshtein typo comparison
  const queryWords = q.split(/\s+/);
  const titleWords = title.split(/\s+/);
  for (const qw of queryWords) {
    if (qw.length < 3) continue;
    for (const tw of titleWords) {
      if (tw.startsWith(qw) || qw.startsWith(tw)) return true;
      if (getEditDistance(qw, tw) <= 1) return true;
    }
  }

  return false;
}

// FAQ Accordion data
const faqData = [
  {
    question: "How does the 100% First Service Cashback work?",
    answer: "When you apply for your very first paid service on DigiConnect Dukan, we credit 100% of the fresh paid amount back into your DigiConnect Rewards Wallet as redeemable points instantly after payment confirmation. There is no coupon code required."
  },
  {
    question: "What is the maximum wallet balance I can redeem on a service?",
    answer: "You can redeem points from your Rewards Wallet up to a dual cap of 50% of the service price AND 50% of your total wallet balance. For example, if a service costs ₹500 and your wallet balance is ₹800, you can redeem a maximum of ₹250 (which is 50% of the service price, and less than 50% of your wallet balance)."
  },
  {
    question: "How long does document verification and processing take?",
    answer: "Most basic documents like PVC card printing and eShram cards are processed within 1-2 days. Complex filings like GST, corporate registrations, and passports take between 3-15 days depending on government slot availability. You can view the specific estimated processing time on each service card."
  },
  {
    question: "Are government and application fees included in the price?",
    answer: "Yes, for services with fixed pricing, the price shown is the complete service fee. For services listed as 'Enquiry Now', our specialists will evaluate your case details and give you an exact, transparent quote beforehand on WhatsApp with zero hidden charges."
  },
  {
    question: "What happens if my application is rejected by the government department?",
    answer: "Our certified experts run multi-level pre-checks on all forms and documents to minimize rejection risks. In the rare case of a discrepancy, our support team will get in touch with you immediately on WhatsApp/Call to re-file or correct the submission without additional service charges."
  }
];

interface ServicesDirectoryClientProps {
  initialServices?: Omit<ServiceItem, "icon">[];
}

export function ServicesDirectoryClient({ initialServices }: ServicesDirectoryClientProps) {
  const services = useMemo(() => {
    const baseList = initialServices || servicesData;
    return baseList.map(s => {
      const fallback = servicesData.find(fs => fs.slug === s.slug);
      return {
        ...s,
        icon: fallback?.icon || FileText
      } as ServiceItem;
    });
  }, [initialServices]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("popularity");
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("service_recent_searches");
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch {
          // Ignore
        }
      }
    }
  }, []);

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    const cleanQuery = query.trim().slice(0, 40);
    setRecentSearches(prev => {
      const updated = [cleanQuery, ...prev.filter(q => q !== cleanQuery)].slice(0, 5);
      localStorage.setItem("service_recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  const removeRecentSearch = (queryToDelete: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(q => q !== queryToDelete);
      localStorage.setItem("service_recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  // Typo-tolerant matching & filtering
  const filteredServices = useMemo(() => {
    let list = services.filter(s => {
      // Category filter
      if (selectedCategory !== "all") {
        const cat = getCategoryForService(s);
        if (cat !== selectedCategory) return false;
      }
      // Search query filter
      return isTypoTolerantMatch(s, searchQuery);
    });

    // Sorting
    list = [...list].sort((a, b) => {
      const extraA = serviceDetailsExtra[a.slug] || { rating: 4.8, popularityScore: 80, isNew: false, processingTime: "5 Days" };
      const extraB = serviceDetailsExtra[b.slug] || { rating: 4.8, popularityScore: 80, isNew: false, processingTime: "5 Days" };

      if (selectedSort === "popularity") {
        return extraB.popularityScore - extraA.popularityScore;
      }
      if (selectedSort === "price-asc") {
        return a.amount - b.amount;
      }
      if (selectedSort === "price-desc") {
        return b.amount - a.amount;
      }
      if (selectedSort === "rating") {
        return extraB.rating - extraA.rating;
      }
      if (selectedSort === "newest") {
        if (extraA.isNew && !extraB.isNew) return -1;
        if (!extraA.isNew && extraB.isNew) return 1;
        return extraB.popularityScore - extraA.popularityScore;
      }
      if (selectedSort === "alphabetical") {
        return a.title.localeCompare(b.title);
      }
      if (selectedSort === "processing-time") {
        const parseDays = (t: string) => parseInt(t.replace(/[^\d]/g, "")) || 30;
        return parseDays(extraA.processingTime) - parseDays(extraB.processingTime);
      }
      return 0;
    });

    return list;
  }, [searchQuery, selectedCategory, selectedSort, services]);

  // Featured services list (8 items)
  const featuredServicesList = useMemo(() => {
    const featuredSlugs = [
      "gst-registration-filing",
      "itr-filing",
      "learning-driving-license",
      "passport",
      "pm-vishwakarma-yojana",
      "cibil-report-increase",
      "pvc-card",
      "credit-cards"
    ];
    return featuredSlugs
      .map(slug => services.find(s => s.slug === slug))
      .filter((s): s is ServiceItem => !!s);
  }, [services]);

  // Popular queries list
  const popularQueries = ["GST Registration", "ITR Filing", "Passport Apply", "PVC Smart Card", "CIBIL Report"];

  // Recommended services (3 items based on popularity score)
  const recommendedServices = useMemo(() => {
    return [...services]
      .sort((a, b) => {
        const scoreA = serviceDetailsExtra[a.slug]?.popularityScore ?? 0;
        const scoreB = serviceDetailsExtra[b.slug]?.popularityScore ?? 0;
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }, [services]);



  // FAQ Schema JSON-LD Injection
  const faqSchema = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqData.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }))
    };
  }, []);

  return (
    <div className="bg-[#fcfcfd] min-h-screen text-slate-800 font-sans relative antialiased selection:bg-blue-150 pb-24 md:pb-12">
      
      {/* FAQ Schema Inject */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ─── SECTION 1: HERO & SECTION 4: AI FINDER (UNIFIED SEARCH) ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f0f4fc] via-[#ffffff] to-[#fcfcfd] pt-12 pb-10 px-4 md:px-8">
        {/* Subtle decorative circles for Stripe/Apple look */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-5xl text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/50 bg-blue-50/70 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-blue-700 shadow-[0_2px_10px_rgba(37,99,235,0.03)]">
            <Sparkles className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
            India&apos;s Premium Service Marketplace
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Digital Services <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 bg-clip-text text-transparent">Marketplace</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xs sm:text-sm font-semibold leading-relaxed text-slate-500">
            Apply online for government registrations, corporate compliance, tax filing, vehicle insurance, and financial services with direct WhatsApp guidance.
          </p>

          {/* Unified AI Finder Search Widget */}
          <div className="max-w-2xl mx-auto mt-6 relative" onFocus={() => setSearchFocused(true)} onBlur={(e) => {
            // Delay closing to allow clicking links/buttons in panel
            setTimeout(() => {
              if (!e.currentTarget.contains(document.activeElement)) {
                setSearchFocused(false);
              }
            }, 200);
          }}>
            <div className="flex h-13.5 w-full items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-[0_12px_32px_rgba(0,0,0,0.03)] focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-300">
              <Search className="h-5 w-5 text-slate-400 shrink-0 mr-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    saveRecentSearch(searchQuery);
                    setSearchFocused(false);
                  }
                }}
                placeholder="Search services (e.g. GST, ITR, Mudra Loan, Passport)..."
                className="w-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none h-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                  }}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Smart suggestions panel */}
            <AnimatePresence>
              {searchFocused && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-15.5 z-40 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_20px_48px_rgba(15,23,42,0.08)] backdrop-blur-lg text-left"
                >
                  {/* Suggestions list when typing */}
                  {searchQuery.trim().length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Suggestions</p>
                      <div className="divide-y divide-slate-100">
                        {servicesData
                          .filter(s => isTypoTolerantMatch(s, searchQuery))
                          .slice(0, 5)
                          .map(s => {
                            const extra = serviceDetailsExtra[s.slug];
                            return (
                              <button
                                key={s.slug}
                                onMouseDown={() => {
                                  saveRecentSearch(searchQuery);
                                  setSelectedService(s);
                                  setSearchFocused(false);
                                }}
                                className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50/20 px-1 rounded-lg text-left transition"
                              >
                                <span className="truncate">{s.title}</span>
                                <span className="text-[10px] text-slate-450 font-semibold">{extra?.processingTime}</span>
                              </button>
                            );
                          })}
                        {servicesData.filter(s => isTypoTolerantMatch(s, searchQuery)).length === 0 && (
                          <p className="text-xs text-slate-500 py-3 font-semibold text-center">No matching services found</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6">
                      <div className="space-y-4">
                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recent Searches</p>
                            <div className="flex flex-wrap gap-1.5">
                              {recentSearches.map(q => (
                                <span
                                  key={q}
                                  className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/50 hover:bg-slate-100 rounded-full pl-3 pr-1 py-0.5 text-xs font-bold text-slate-650 cursor-pointer transition"
                                  onMouseDown={() => {
                                    setSearchQuery(q);
                                  }}
                                >
                                  {q}
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      removeRecentSearch(q);
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Popular Searches */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">Popular Searches</p>
                          <div className="flex flex-wrap gap-2">
                            {popularQueries.map(q => (
                              <button
                                key={q}
                                type="button"
                                onMouseDown={() => {
                                  setSearchQuery(q);
                                  saveRecentSearch(q);
                                }}
                                className="h-7.5 px-3 rounded-full border border-slate-200/60 bg-white hover:border-slate-350 hover:bg-slate-50 text-xs font-bold text-slate-600 transition"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Recommended Column */}
                      <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4 space-y-2 shrink-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">Recommended</p>
                        <div className="space-y-1.5">
                          {recommendedServices.map(s => (
                            <button
                              key={s.slug}
                              onMouseDown={() => {
                                setSelectedService(s);
                                setSearchFocused(false);
                              }}
                              className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-blue-600 transition"
                            >
                              <span className="truncate pr-2">{s.title}</span>
                              <ChevronRight className="h-3 w-3 text-slate-450 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Trending / New Quick indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 text-xs font-bold text-slate-550">
            <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50/50 border border-blue-100/50 px-2.5 py-1 rounded-full">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500 animate-pulse" />
              Trending: GST Registration, Mudra Loan, PM Vishwakarma
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
            <span className="flex items-center gap-1 text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-orange-500" />
              Recently Added: Voter ID Correction, Mudra Application
            </span>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: SERVICE CATEGORIES ─── */}
      <section className="px-4 py-8 md:px-8 bg-white border-y border-slate-200/50">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-blue-600">Explore Directory</h2>
            <p className="text-lg font-black text-slate-900">Browse by Service Category</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {marketplaceCategories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    // scroll to main grid
                    const el = document.getElementById("main-directory-grid");
                    if (el) {
                      const top = el.getBoundingClientRect().top + window.scrollY - 120;
                      window.scrollTo({ top, behavior: "smooth" });
                    }
                  }}
                  className={`flex flex-col items-center justify-center text-center p-4 rounded-2xl border transition duration-300 hover:shadow-md cursor-pointer group select-none ${
                    isSelected
                      ? "bg-blue-50/50 border-blue-300 text-blue-700 shadow-sm"
                      : "bg-[#fcfcfd]/50 border-slate-200 hover:border-slate-350 hover:bg-white text-slate-600"
                  }`}
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl mb-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] border transition-all duration-300 group-hover:scale-105 ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-slate-200/60 text-slate-500 group-hover:text-blue-600"
                  }`}>
                    <Icon className="h-5.5 w-5.5" strokeWidth={1.8} />
                  </span>
                  <span className="text-xs font-black leading-snug tracking-tight">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: FEATURED SERVICES ─── */}
      <section className="px-4 py-10 md:px-8 bg-[#fcfcfd]">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-xs font-black uppercase tracking-widest text-orange-600">Featured Programs</h2>
              <p className="text-xl font-black text-slate-900">Highest In-Demand Services</p>
            </div>
            <div className="flex gap-2 self-end sm:self-auto text-xs font-bold text-slate-400">
              <span>Scroll horizontally to view &rarr;</span>
            </div>
          </div>

          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
            {featuredServicesList.map((service) => {
              const Icon = service.icon;
              const extra = serviceDetailsExtra[service.slug] || { rating: 4.8, reviewsCount: 150, isTrending: true, processingTime: "5 Days" };
              return (
                <div
                  key={service.slug}
                  className="snap-start flex flex-col justify-between shrink-0 w-[280px] rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.6)] hover:border-slate-350 transition-all duration-300 relative group overflow-hidden"
                >
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100/50 text-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                        <Icon className="h-5.5 w-5.5" strokeWidth={1.8} />
                      </span>
                      <span className="inline-flex rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-100/30 px-2 py-0.5 text-[9px] font-black uppercase text-orange-700 tracking-wider">
                        100% / 20% Cashback
                      </span>
                    </div>

                    <h3 className="mt-4 text-sm font-black text-slate-900 leading-tight group-hover:text-blue-600 transition">
                      {service.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {service.shortDescription}
                    </p>
                  </div>

                  <div className="mt-5 space-y-4 pt-3.5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Amount</p>
                        <p className="font-extrabold text-slate-900">{service.priceLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Process Time</p>
                        <p className="font-extrabold text-slate-700">{extra.processingTime}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedService(service)}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-[11px] font-black text-slate-650 transition cursor-pointer active:scale-95"
                      >
                        Details
                      </button>
                      <ApplyServiceTrigger serviceSlug={service.slug} className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-[11px] font-black text-white transition shadow-sm cursor-pointer active:scale-95">
                        Apply Now
                      </ApplyServiceTrigger>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: SERVICES GRID (Main directory section) ─── */}
      <section id="main-directory-grid" className="px-4 py-8 md:px-8 bg-white border-t border-slate-200/50 scroll-mt-24">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 border-b border-slate-150 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading">Marketplace Directory</h2>
                <p className="text-xs text-slate-500 font-semibold">{filteredServices.length} Services available</p>
              </div>

              {/* Sorting and Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600">
                  <span className="text-slate-400">Sort By:</span>
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer font-extrabold text-slate-800"
                  >
                    <option value="popularity">Most Popular</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating">Top Rated</option>
                    <option value="newest">Recently Added</option>
                    <option value="alphabetical">Alphabetical (A-Z)</option>
                    <option value="processing-time">Processing Time</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Filter Category Chips */}
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
              {marketplaceCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-7.5 px-3 rounded-full text-xs font-bold transition shrink-0 active:scale-95 ${
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-50 border border-slate-200/50 text-slate-650 hover:bg-slate-100"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid list */}
          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredServices.map(service => {
                const Icon = service.icon;
                const extra = serviceDetailsExtra[service.slug] || { rating: 4.8, reviewsCount: 120, isTrending: false, isNew: false, processingTime: "5 Days" };
                return (
                  <div
                    key={service.slug}
                    className="flex flex-col justify-between rounded-[24px] border border-slate-200 bg-white p-4.5 shadow-[0_8px_30px_rgba(0,0,0,0.015),inset_0_1px_0_rgba(255,255,255,0.6)] hover:-translate-y-1.5 hover:border-slate-350 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] transition-all duration-300 group overflow-hidden relative"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50/50 border border-blue-100/50 text-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                          <Icon className="h-5 w-5" strokeWidth={1.8} />
                        </span>
                        
                        <div className="flex flex-col items-end gap-1">
                          <span className="rounded-full bg-emerald-50 border border-emerald-200/30 px-2 py-0.5 text-[8.5px] font-black uppercase text-emerald-700 tracking-wider">
                            20% / 100% Cashback
                          </span>
                          {extra.isNew && (
                            <span className="rounded-full bg-orange-50 border border-orange-200/30 px-2 py-0.5 text-[8.5px] font-black uppercase text-orange-700 tracking-wider">
                              New
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="mt-3.5 text-xs font-black text-slate-900 leading-tight tracking-tight group-hover:text-blue-600 transition">
                        {service.title}
                      </h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500 line-clamp-2">
                        {service.shortDescription}
                      </p>

                      <div className="flex items-center gap-3 mt-3.5 text-xs font-semibold text-slate-500">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-amber-500" />
                          <span className="font-extrabold text-slate-900">{extra.rating}</span>
                        </div>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span>({extra.reviewsCount} reviews)</span>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4 pt-3.5 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Starting Price</p>
                          <p className="font-extrabold text-slate-900">{service.priceLabel}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Processing</p>
                          <p className="font-extrabold text-slate-700">{extra.processingTime}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedService(service)}
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-[11px] font-black text-slate-650 transition cursor-pointer active:scale-95"
                        >
                          Learn More
                        </button>
                        <ApplyServiceTrigger serviceSlug={service.slug} className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-[11px] font-black text-white transition shadow-sm cursor-pointer active:scale-95">
                          Apply Now
                        </ApplyServiceTrigger>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="rounded-[32px] border-2 border-dashed border-slate-200 bg-[#fcfcfd]/50 px-6 py-16 text-center max-w-lg mx-auto space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-black text-slate-900">No Services Found</p>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  We couldn&apos;t find any service matching your search or filters. Check your spelling or select another category.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-900 px-5 text-xs font-black text-white transition hover:bg-slate-800"
              >
                Reset Filters & Search
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── SECTION 6: SERVICE DETAIL DRAWER / BOTTOM SHEET ─── */}
      <AnimatePresence>
        {selectedService && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedService(null)}
              className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-sm"
            />

            {/* Slide Drawer (Right side on Desktop, Bottom on Mobile) */}
            <motion.div
              initial={{
                x: typeof window !== "undefined" && window.innerWidth >= 768 ? "100%" : 0,
                y: typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : 0
              }}
              animate={{ x: 0, y: 0 }}
              exit={{
                x: typeof window !== "undefined" && window.innerWidth >= 768 ? "100%" : 0,
                y: typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : 0
              }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed z-50 bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.08)] border-slate-200 overflow-hidden flex flex-col
                         inset-y-0 right-0 w-full md:max-w-md lg:max-w-lg md:border-l
                         bottom-0 left-0 right-0 h-[85vh] md:h-full rounded-t-[32px] md:rounded-t-none md:rounded-l-[32px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100/50 text-blue-600">
                    <span className="h-5 w-5 flex items-center justify-center">
                      {(() => {
                        const Icon = selectedService.icon;
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </span>
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 leading-tight">{selectedService.title}</h2>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{selectedService.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedService(null)}
                  className="p-1.5 rounded-full hover:bg-slate-550/10 text-slate-450 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 scrollbar-thin">
                {/* Highlights row */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-150 text-xs">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Process Time</p>
                    <p className="font-extrabold text-slate-900">{serviceDetailsExtra[selectedService.slug]?.processingTime ?? "3-5 Days"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Starting Fee</p>
                    <p className="font-extrabold text-slate-900">{selectedService.priceLabel}</p>
                  </div>
                </div>

                {/* Overview */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Overview</h3>
                  <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                    {selectedService.overview}
                  </p>
                </div>

                {/* Benefits */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Key Benefits</h3>
                  <ul className="space-y-2">
                    {selectedService.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600 font-bold">
                        <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Documents Required */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Documents Required</h3>
                  <ul className="space-y-2">
                    {selectedService.documents.map((d, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600 font-bold">
                        <FileText className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" strokeWidth={2.2} />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Eligibility */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Eligibility Criteria</h3>
                  <div className="bg-orange-50/50 border border-orange-100/50 p-3.5 rounded-xl flex items-start gap-2.5">
                    <ShieldCheck className="h-4.5 w-4.5 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-650 font-bold leading-normal">
                      {serviceDetailsExtra[selectedService.slug]?.eligibility ?? "Open to all Indian residents with valid documentation"}
                    </p>
                  </div>
                </div>

                {/* FAQs */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Frequently Asked Questions</h3>
                  <div className="space-y-2.5">
                    {selectedService.faqs.slice(0, 3).map((faq, i) => (
                      <div key={i} className="p-3 bg-slate-50/50 border border-slate-150 rounded-xl space-y-1">
                        <p className="text-xs font-black text-slate-800">{faq.question}</p>
                        <p className="text-[11px] leading-relaxed text-slate-500 font-semibold">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Apply Trigger */}
              <div className="p-5 border-t border-slate-100 bg-[#fcfcfd]/80 shrink-0">
                <ApplyServiceTrigger serviceSlug={selectedService.slug} className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-extrabold text-white transition shadow-md active:scale-98 cursor-pointer">
                  Apply & Get {selectedService.priceLabel === "Enquiry Now" ? "Guidance" : "Cashback"}
                  <ArrowRight className="h-4 w-4" />
                </ApplyServiceTrigger>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── SECTION 7: CASHBACK CENTER ─── */}
      <section className="px-4 py-12 md:px-8 bg-white border-y border-slate-200/50">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-blue-600">Wallet Rewards</h2>
            <p className="text-xl font-black text-slate-900">DigiConnect Cashback Center</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "20% Cashback", highlight: "Every Repeat Service", desc: "Get automatically credited 20% of paid value on all consecutive applications.", icon: Percent, color: "from-blue-500 to-indigo-600" },
              { title: "100% Cashback", highlight: "First Service Apply", desc: "Credit 100% of the fresh paid amount as points for your very first marketplace order.", icon: Award, color: "from-orange-500 to-amber-600" },
              { title: "₹100 Refer Reward", highlight: "Refer & Earn Program", desc: "Earn ₹100 point rewards for every friend who signs up with your dashboard invite link.", icon: Coins, color: "from-indigo-500 to-violet-600" },
              { title: "Partial Wallet Debit", highlight: "Save Up To 50%", desc: "Deduct up to 50% of service value using points from your Reward Wallet on checkouts.", icon: BadgeIndianRupee, color: "from-emerald-500 to-teal-600" }
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="p-5.5 rounded-3xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] relative overflow-hidden group hover:border-slate-350 transition-all duration-300"
                >
                  <div className="space-y-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200/60 text-blue-600 shadow-sm">
                      <Icon className="h-5.5 w-5.5" strokeWidth={2} />
                    </span>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-orange-600">{card.highlight}</p>
                      <h3 className="text-sm font-black text-slate-900">{card.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── SECTION 8: WHY CHOOSE DIGICONNECT ─── */}
      <section className="px-4 py-12 md:px-8 bg-[#fcfcfd]">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-600">Why DigiConnect</h2>
            <p className="text-xl font-black text-slate-900">Dukan Service Guarantees</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: "Secure Processing", desc: "Multi-level encryption and secure direct linkages to standard bank & government gateways.", icon: ShieldCheck },
              { title: "Verified Experts", desc: "All applications are reviewed and processed by certified documentation specialists.", icon: BadgeCheck },
              { title: "PAN India Support", desc: "Assisting customers across all Indian states and pin codes with dedicated regional updates.", icon: Users },
              { title: "Fast Turnaround", desc: "Prompt submittals and slots scheduling, ensuring zero delays in your digital documents.", icon: Clock },
              { title: "Wallet Rewards", desc: "Get rich cashbacks and referral points on checkout to save up to 50% on future orders.", icon: BadgeIndianRupee },
              { title: "Dedicated Assistance", desc: "Interactive WhatsApp alerts and direct call support during business hours.", icon: MessageCircle }
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="flex gap-4 p-5 rounded-2xl border border-slate-200/80 bg-white hover:shadow-sm transition"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100/50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-900">{feat.title}</h3>
                    <p className="text-[11px] leading-relaxed text-slate-500 font-semibold">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── SECTION 9: TRUST METRICS ─── */}
      <section className="px-4 py-10 md:px-8 bg-white border-y border-slate-200/50">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-slate-100">
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-slate-900">50,000+</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Happy Customers</p>
            </div>
            <div className="space-y-1 pt-0 pl-3">
              <p className="text-2xl sm:text-3xl font-black text-emerald-600">99%</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Success Rate</p>
            </div>
            <div className="space-y-1 pt-0 pl-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900">PAN India</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Regional Coverage</p>
            </div>
            <div className="space-y-1 pt-0 pl-3">
              <p className="text-2xl sm:text-3xl font-black text-blue-600">100% Secure</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Verified Payments</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 10: FAQ ACCORDION ─── */}
      <section className="px-4 py-12 md:px-8 bg-[#fcfcfd]">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-600">Support FAQs</h2>
            <p className="text-xl font-black text-slate-900 font-heading">Frequently Asked Questions</p>
          </div>

          <div className="space-y-3 pt-4">
            {faqData.map((faq, idx) => {
              const isOpen = faqOpenIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.015)] transition"
                >
                  <button
                    type="button"
                    onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between px-5 py-4 text-xs font-black text-slate-800 text-left cursor-pointer hover:bg-slate-50 transition"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`h-4.5 w-4.5 text-slate-450 shrink-0 transition-transform duration-250 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 text-[11px] leading-relaxed text-slate-550 border-t border-slate-100 font-bold bg-[#fcfcfd]/50">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── SECTION 11: SUPPORT CENTER ─── */}
      <section className="px-4 py-12 md:px-8 bg-white border-t border-slate-200/50">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-orange-600">Support Desk</h2>
            <p className="text-xl font-black text-slate-900">Speak With Our Experts</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { role: "Primary Support", phone: "+91 7007595931", name: "General Enquiries" },
              { role: "Office Support", phone: "+91 9305086491", name: "Corporate Compliance" },
              { role: "CIBIL & Finance Expert", phone: "+91 8287002983", name: "Credit Score & Mudra Loans" }
            ].map((contact, idx) => {
              const cleanedPhone = contact.phone.replace(/\s+/g, "");
              const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone.replace("+", "")}&text=Hi%2C%20I%20have%20an%20enquiry%20regarding%20DigiConnect%20Dukan%20services.`;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border border-slate-200 bg-[#fcfcfd]/50 space-y-4 flex flex-col justify-between hover:border-slate-350 transition-all"
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">{contact.role}</p>
                    <h3 className="text-sm font-black text-slate-900">{contact.phone}</h3>
                    <p className="text-xs text-slate-500 font-semibold">{contact.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                    <a
                      href={`tel:${cleanedPhone}`}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-[10px] font-black text-slate-650 transition cursor-pointer"
                    >
                      <Phone className="h-3 w-3 text-slate-500" />
                      Call
                    </a>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black text-white transition cursor-pointer"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
