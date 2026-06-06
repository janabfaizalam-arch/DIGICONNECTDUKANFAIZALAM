"use client";

import { useState, useEffect, FormEvent, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import useEmblaCarousel from "embla-carousel-react";
import {
  Sparkles,
  ArrowRight,
  MessageCircle,
  AlertTriangle,
  Calculator,
  FileText,
  Check,
  X,
  TrendingUp,
  ChevronDown,
  Gift,
  Search,
  CheckCircle2,
  UserCheck
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { trackCrmEvent } from "@/lib/crm";

type FAQ = {
  question: string;
  answer: string;
};

// AnimatedCounter removed - not currently used

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ItrFilingClient({
  isLoggedIn: initialIsLoggedIn,
  faqs: initialFaqs
}: {
  isLoggedIn: boolean;
  faqs: FAQ[];
}) {
  const { success, error: toastError } = useToast();

  const { data: profileData } = useSWR("/api/customer/profile", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const isLoggedIn = profileData ? profileData.isLoggedIn : initialIsLoggedIn;

  void profileData?.activeApplications?.find(
    (app: { serviceSlug?: string; serviceName?: string }) => app.serviceSlug === "itr-filing" || app.serviceName?.toLowerCase().includes("itr filing")
  );

  // Trigger CRM Page Visit tracking
  useEffect(() => {
    trackCrmEvent("page_visit", "itr-filing");
  }, []);

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [faqSearch, setFaqSearch] = useState("");

  // Lead Fallback Form State
  const [leadName, setLeadName] = useState("");
  const [leadMobile, setLeadMobile] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Exit Intent State
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitIntentSubmitted, setExitIntentSubmitted] = useState(false);
  const [exitName, setExitName] = useState("");
  const [exitMobile, setExitMobile] = useState("");

  // Live Activity Feed State
  const [activeActivityIndex, setActiveActivityIndex] = useState(0);
  const liveActivities = useMemo(() => [
    { type: "itr-filing", text: "R*** K*** from Bengaluru filed ITR-1 (Salaried)", time: "2 mins ago" },
    { type: "itr-filing", text: "A*** S*** from Mumbai filed ITR-2 (Capital Gains)", time: "8 mins ago" },
    { type: "cashback", text: "V*** P*** from New Delhi received ₹150 Cashback credit", time: "12 mins ago" },
    { type: "itr-filing", text: "D*** C*** from Ahmedabad filed ITR-4 (Presumptive)", time: "22 mins ago" },
    { type: "itr-filing", text: "K*** L*** from Chennai filed NRI ITR Return", time: "30 mins ago" },
    { type: "cashback", text: "M*** G*** from Hyderabad received ₹200 Cashback credit", time: "45 mins ago" }
  ], []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveActivityIndex((prev) => (prev + 1) % liveActivities.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [liveActivities.length]);

  // Simulated ARN Tracking
  const [arnQuery, setArnQuery] = useState("");
  const [arnStatus, setArnStatus] = useState<null | {
    arn: string;
    type: string;
    date: string;
    stage: number;
    timeline: { label: string; date: string; completed: boolean; current?: boolean }[];
  }>(null);
  const [arnError, setArnError] = useState("");

  const handleTrackArn = (e: React.FormEvent) => {
    e.preventDefault();
    setArnError("");
    setArnStatus(null);

    const cleanArn = arnQuery.trim().toUpperCase();
    if (!cleanArn) {
      setArnError("Please enter an ARN number.");
      return;
    }
    if (cleanArn.length < 10) {
      setArnError("Application Reference Number (ARN) must be at least 10 characters.");
      return;
    }

    const seed = cleanArn.charCodeAt(0) + cleanArn.charCodeAt(cleanArn.length - 1);
    const stageNum = seed % 3 === 0 ? 3 : (seed % 2 === 0 ? 4 : 2);
    
    const stages = [
      { label: "Document Uploaded", date: "May 28, 2026", completed: true },
      { label: "Assigned CA Verified", date: "May 29, 2026", completed: true },
      { label: "Draft Prepared", date: "May 30, 2026", completed: true },
      { label: "Filed to IT Portal", date: "In Progress", completed: false, current: true },
      { label: "Refund Disbursed", date: "Pending", completed: false }
    ];

    const timeline = stages.map((st, idx) => ({
      ...st,
      completed: idx < stageNum,
      current: idx === stageNum
    }));

    setArnStatus({
      arn: cleanArn,
      type: "Income Tax Return Filing",
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      stage: stageNum,
      timeline
    });

    trackCrmEvent("calculator_usage", "itr-filing");
  };

  // Embla Carousel for pricing plans
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });
  const [activePlanIdx, setActivePlanIdx] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setActivePlanIdx(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", onSelect);
    onSelect();

    const autoScroll = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => {
      clearInterval(autoScroll);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Exit Intent hook
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 10) {
        const dismissed = sessionStorage.getItem("exit_intent_itr_dismissed");
        if (!dismissed) {
          setShowExitIntent(true);
        }
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, []);

  const handleDismissExitIntent = () => {
    setShowExitIntent(false);
    sessionStorage.setItem("exit_intent_itr_dismissed", "true");
  };

  const handleLeadSubmit = async (e: FormEvent, isExit = false) => {
    e.preventDefault();
    const name = isExit ? exitName : leadName;
    const mobile = isExit ? exitMobile : leadMobile;
    const msg = isExit ? "Captured from Exit Intent ITR Consultation Form" : leadMessage;

    if (!name || !mobile) {
      toastError("Please fill in both Name and Mobile Number.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toastError("Please enter a valid 10-digit mobile number.");
      return;
    }

    trackCrmEvent("expert_talk_click", "itr-filing", mobile, name);

    setIsSubmittingLead(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("mobile", mobile);
      formData.append("service", "ITR Filing");
      formData.append("message", msg);

      const response = await fetch("/api/lead", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok && (result.ok || result.success)) {
        success(result.message || "Thank you! Our tax expert will contact you shortly.");
        if (isExit) {
          setExitIntentSubmitted(true);
          setTimeout(() => {
            setShowExitIntent(false);
            sessionStorage.setItem("exit_intent_itr_dismissed", "true");
          }, 3000);
        } else {
          setLeadName("");
          setLeadMobile("");
          setLeadMessage("");
        }
      } else {
        toastError(result.error || result.message || "Lead submission failed.");
      }
    } catch {
      toastError("Failed to submit inquiry. Please try again.");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const whatsappNumber = "917007595931";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    "Hi DigiConnect, I am looking for online ITR Filing assistance. Please guide me."
  )}`;

  const itrPlans = [
    {
      planId: "itr1",
      name: "ITR-1 (Salaried) Plan",
      price: "₹699",
      regularPrice: "₹1,499",
      description: "For individuals with salary, pension, one house property, or interest income.",
      features: [
        "Form 16 & AIS Mapping",
        "Expert CA Verification",
        "House Property Deductions",
        "TDS Refund Claim Verification",
      ],
      badge: "Salaried Base",
      color: "from-blue-500/10 to-indigo-500/5 border-blue-200"
    },
    {
      planId: "itr2",
      name: "ITR-2 (Capital Gains & Houses) Plan",
      price: "₹999",
      regularPrice: "₹2,499",
      description: "For multiple house properties, equity trading profits, or foreign asset holdings.",
      features: [
        "Everything in ITR-1 Plan",
        "Capital Gains Computation",
        "Multiple Houses Deductions",
        "Foreign Assets Disclosure Check",
      ],
      badge: "Trader & Investor",
      color: "from-indigo-500/15 via-blue-500/5 to-purple-500/5 border-indigo-200 shadow-md ring-2 ring-indigo-500/10"
    },
    {
      planId: "itr3",
      name: "ITR-3 (Business & Audit) Plan",
      price: "₹1,499",
      regularPrice: "₹3,999",
      description: "For partners in firms, proprietary business owners, or trading with books of accounts.",
      features: [
        "Everything in ITR-2 Plan",
        "Balance Sheet Checks",
        "Depreciation Calculations",
        "Audit Preparation Advice",
      ],
      badge: "Business Pro",
      color: "from-orange-500/10 to-amber-500/5 border-orange-200"
    },
    {
      planId: "itr4",
      name: "ITR-4 (Presumptive Business) Plan",
      price: "₹999",
      regularPrice: "₹2,499",
      description: "For freelancers, professionals, and small businesses filing presumptive tax.",
      features: [
        "Section 44AD/44ADA Scheme",
        "Gross Profit Estimation",
        "No Books Verification required",
        "Fast Portal Uploads",
      ],
      badge: "Freelancer Choice",
      color: "from-emerald-500/10 to-teal-500/5 border-emerald-200"
    },
    {
      planId: "nri",
      name: "NRI ITR Filing Plan",
      price: "₹2,499",
      regularPrice: "₹5,999",
      description: "For non-resident Indians with domestic incomes, properties, or double tax relief claims.",
      features: [
        "DTAA Double Tax Relief",
        "NRE/NRO Account Interest Maps",
        "Foreign Income Exclusions",
        "FEMA compliance checks",
      ],
      badge: "Non-Resident",
      color: "from-rose-500/10 to-pink-500/5 border-rose-200"
    },
    {
      planId: "capgain",
      name: "Capital Gains Premium Plan",
      price: "₹2,999",
      regularPrice: "₹6,999",
      description: "For complex stock market portfolios, real estate sales, and cryptocurrency tax mapping.",
      features: [
        "Unlimited Stock Transactions",
        "Real Estate Indexation claims",
        "Crypto Tax 30% computations",
        "Set-off & Carry Forward validation",
      ],
      badge: "Premium Wealth",
      color: "from-violet-500/10 to-purple-500/5 border-violet-200"
    }
  ];

  const filteredFaqs = initialFaqs.filter(faq =>
    faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
    faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#fbfcff] text-[#0b1f3a] relative overflow-hidden">
      
      {/* Background soft gradients */}
      <div className="absolute top-0 left-0 right-0 h-[650px] bg-[radial-gradient(circle_at_15%_15%,rgba(249,115,22,0.08),transparent_50%),radial-gradient(circle_at_85%_35%,rgba(99,102,241,0.06),transparent_50%),radial-gradient(circle_at_50%_60%,rgba(37,99,235,0.04),transparent_60%)] pointer-events-none" />
      
      {/* Floating particles background decoration */}
      <div className="absolute top-10 left-10 w-4 h-4 rounded-full bg-orange-400/20 blur-sm animate-bounce" style={{ animationDuration: "5s" }} />
      <div className="absolute top-96 right-16 w-6 h-6 rounded-full bg-blue-400/20 blur-sm animate-pulse" />

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid gap-16 lg:grid-cols-[1.15fr_0.85fr] items-center">
          
          {/* Hero Left */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50/50 px-4 py-1.5 text-xs font-bold text-orange-700 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-orange-600 animate-pulse" />
              <span>AY 2026-27 Tax Filing Open</span>
            </div>

            <h1 className="text-4xl md:text-5.5xl font-black tracking-tight text-[#071326] leading-tight">
              Income Tax Return <br />
              <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 bg-clip-text text-transparent">Filing Made Simple</span>
            </h1>

            <p className="text-base md:text-lg font-medium text-slate-500 leading-relaxed max-w-xl">
              File your ITR online with expert CA assistance, secure document handling and maximum eligible tax benefits. Get 100% query-free filings, fast audits, and quick refunds.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href={isLoggedIn ? "/apply/itr-filing" : `/login/customer?redirect=${encodeURIComponent("/apply/itr-filing")}`}
                onClick={() => trackCrmEvent("apply_click", "itr-filing")}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-rose-600 px-8 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] hover:shadow-orange-500/30 active:scale-[0.98]"
              >
                File My ITR
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackCrmEvent("expert_talk_click", "itr-filing")}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-7 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageCircle className="h-4.5 w-4.5 text-emerald-600" />
                Talk to Tax Expert
              </a>
            </div>

            {/* Quick Access to Calculators and Knowledge links */}
            <div className="flex flex-wrap gap-4 pt-1 text-xs font-black text-slate-600">
              <Link href="/services/itr-filing/calculators" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition">
                <Calculator className="h-4 w-4" />
                Compute Savings (Old vs New Slabs)
              </Link>
              <span className="text-slate-350">|</span>
              <Link href="/services/itr-filing/knowledge-center" className="inline-flex items-center gap-1.5 text-orange-655 hover:text-orange-800 transition">
                <FileText className="h-4 w-4" />
                ITR Knowledge Hub & Due Dates
              </Link>
            </div>

            {/* Hero Trust Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100/80">
              {[
                { label: "AY 2026-27 Active", desc: "Latest filing schemas" },
                { label: "Expert CA Filing", desc: "100% human audit review" },
                { label: "Secure Document Vault", desc: "256-bit SSL encrypted files" },
                { label: "20% Cashback", desc: "Wallet credits on checkout" }
              ].map((badge, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-black text-slate-800 leading-none">{badge.label}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 pl-5">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Right: Premium Mock Visuals */}
          <div className="relative flex justify-center">
            <div className="relative w-full max-w-[420px] aspect-[1/1.05] rounded-[42px] border border-white/60 bg-white/35 p-6 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col justify-between">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-100%] animate-[shine_8s_infinite] pointer-events-none" />

              {/* Floating ITR Acknowledgement Badge */}
              <div className="absolute top-8 left-[-15px] p-3 rounded-2xl border border-white/60 bg-white/85 shadow-xl backdrop-blur-sm flex items-center gap-2.5 animate-float-icon-1 max-w-[170px] z-10">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-500 to-rose-600 text-white shadow-md text-xs font-black">
                  ITR
                </span>
                <div>
                  <p className="text-[10px] font-black text-slate-800 leading-none">ITR-V Generated</p>
                  <p className="text-[8px] font-bold text-emerald-600 mt-0.5">Filing Complete</p>
                </div>
              </div>

              {/* Floating Refund Progress Ring */}
              <div className="absolute top-[120px] right-[-15px] p-3 rounded-2xl border border-white/60 bg-white/85 shadow-xl backdrop-blur-sm flex items-center gap-2.5 animate-float-icon-1 max-w-[155px] z-10">
                <div className="relative h-10 w-10 flex items-center justify-center shrink-0">
                  <svg className="w-10 h-10 transform -rotate-90">
                    <circle cx="20" cy="20" r="16" stroke="rgba(249, 115, 22, 0.1)" strokeWidth="3" fill="transparent" />
                    <circle cx="20" cy="20" r="16" stroke="#f97316" strokeWidth="3" fill="transparent" strokeDasharray="100" strokeDashoffset="25" />
                  </svg>
                  <span className="absolute text-[8px] font-black text-slate-800">75%</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-800 leading-none">Refund Tracker</p>
                  <p className="text-[8px] font-bold text-orange-600 mt-0.5">Approved in Process</p>
                </div>
              </div>

              {/* Floating Wallet Cashback Badge */}
              <div className="absolute top-[180px] left-[-30px] p-3 rounded-2xl border border-white/60 bg-white/85 shadow-xl backdrop-blur-sm flex items-center gap-2.5 animate-float-icon-2 max-w-[170px] z-10">
                <div className="h-8 w-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black animate-coin-spin">
                  ₹
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-800 leading-none">₹150 Cashback</p>
                  <p className="text-[8px] font-bold text-orange-600 mt-0.5">Credited instantly</p>
                </div>
              </div>

              {/* AIS/26AS Preview */}
              <div className="absolute bottom-12 right-[-20px] p-3.5 rounded-2xl border border-white/60 bg-white/85 shadow-xl backdrop-blur-sm flex items-center gap-2.5 animate-float-icon-2 max-w-[180px] z-10">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 text-xs font-black">
                  AIS
                </span>
                <div>
                  <p className="text-[10px] font-black text-slate-800 leading-none">AIS Synced</p>
                  <p className="text-[8px] font-medium text-slate-400 mt-0.5">Stock & Interest Verified</p>
                </div>
              </div>

              {/* Mock ITR Acknowledgement Card */}
              <div className="w-full bg-white/90 border border-slate-100 rounded-3xl p-5 shadow-inner mt-4 flex-1 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-orange-50/10 via-transparent to-transparent pointer-events-none" />
                
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">FORM ITR-V ACKNOWLEDGEMENT</span>
                    <h3 className="text-sm font-black text-slate-900 leading-none">Income Tax Department</h3>
                    <p className="text-[9px] font-bold text-slate-400">AY 2026-27 Return</p>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-orange-100 bg-orange-50 flex items-center justify-center text-orange-600 text-xs font-bold font-heading">
                    ITR
                  </div>
                </div>

                <div className="my-4 space-y-2 border-t border-b border-dashed border-slate-100 py-3 text-[10px] font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>PAN Number</span>
                    <span className="font-mono font-black text-slate-900">ALOPS7821B</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Filing Status</span>
                    <span className="font-black text-slate-900">E-filed & Verified</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expected Refund</span>
                    <span className="font-black text-emerald-600 font-bold">₹4,850 Refund</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                  <span>Assessed Date: 06/06/2026</span>
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Status: Processed</span>
                </div>
              </div>

              {/* Trusted by Customers Ribbon */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[85%] py-1.5 px-3 bg-slate-900 text-white rounded-full flex items-center justify-center gap-2 shadow-lg z-20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-wider text-center">Trusted by 10,000+ Salaried Customers</span>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-150/50 mt-4 text-[10px] font-bold text-slate-400">
                <span>Secure SSL Checkouts</span>
                <span>DigiConnect CA Network</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE ACTIVITY TICKER & ARN TRACKING */}
      <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100/80 bg-slate-50/35 rounded-3xl mt-10">
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* Live Activity Ticker */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <span className="inline-flex rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100 shadow-sm animate-pulse">
                Live Activity Feed
              </span>
              <h3 className="text-2xl font-black text-[#071326] mt-2 tracking-tight font-heading">
                Privacy-Safe Sync Feeds
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Realtime activity of assisted ITR tax return filings across our user networks.
              </p>
            </div>

            <div className="relative overflow-hidden h-24 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3 w-full">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-orange-50 flex items-center justify-center text-orange-655 animate-bounce">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-800 transition duration-300">
                    {liveActivities[activeActivityIndex]?.text}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-bold">
                    <span>Verified Success</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{liveActivities[activeActivityIndex]?.time}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ARN Tracker Module */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
                Filing Status Center
              </span>
              <h3 className="text-2xl font-black text-[#071326] mt-2 tracking-tight font-heading">
                Simulated ARN/Filing Tracker
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your Application ID or mock code to verify process tracking updates.
              </p>
            </div>

            <form onSubmit={handleTrackArn} className="flex gap-2 bg-white border border-slate-100 p-2 rounded-2xl shadow-sm">
              <input
                type="text"
                placeholder="Enter Application Reference ID..."
                value={arnQuery}
                onChange={(e) => setArnQuery(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-xs font-bold text-[#071326] placeholder-slate-400 outline-none"
              />
              <button
                type="submit"
                className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-black text-white transition cursor-pointer"
              >
                Track Status
              </button>
            </form>

            {arnError && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {arnError}
              </p>
            )}

            {arnStatus && (
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-md space-y-4 mt-3 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{arnStatus.arn}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{arnStatus.type} &bull; Filed: {arnStatus.date}</p>
                  </div>
                  <span className="inline-flex bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-0.5 text-[9px] font-black uppercase rounded">
                    Stage {arnStatus.stage}/5 Active
                  </span>
                </div>

                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2.5 top-1.5 bottom-1.5 w-0.5 bg-slate-100" />
                  {arnStatus.timeline.map((step, idx) => (
                    <div key={idx} className="relative flex justify-between items-start text-xs">
                      <div className={`absolute left-[-20.5px] h-3.5 w-3.5 rounded-full border-2 bg-white flex items-center justify-center ${
                        step.completed ? "border-emerald-600 bg-emerald-600" : step.current ? "border-orange-500 bg-orange-100" : "border-slate-200"
                      }`}>
                        {step.completed && <Check className="h-2 w-2 text-white font-black" />}
                      </div>
                      <div className="space-y-0.5">
                        <p className={`font-black ${step.completed ? "text-slate-800" : step.current ? "text-orange-600" : "text-slate-400"}`}>
                          {step.label}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold">{step.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ITR VARIANTS CAROUSEL */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto text-center space-y-12">
        <div className="space-y-3">
          <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-750 border border-blue-100 shadow-sm uppercase tracking-wider">
            Pricing Plans
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-[#071326] tracking-tight">
            Tailormade Assisted ITR Variants
          </h2>
          <p className="text-xs md:text-sm font-medium text-slate-500 max-w-xl mx-auto">
            Choose the specific ITR form variant customized to match your tax situation under CA advisory.
          </p>
        </div>

        {/* embla carousel wrapper */}
        <div className="relative overflow-hidden py-4" ref={emblaRef}>
          <div className="flex">
            {itrPlans.map((plan) => (
              <div key={plan.planId} className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.3%] px-3">
                <div className={`h-full rounded-[32px] border bg-gradient-to-tr ${plan.color} p-6.5 text-left flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative group hover:-translate-y-1 min-h-[360px]`}>
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="bg-orange-500/10 border border-orange-500/20 text-orange-700 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        {plan.badge}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-emerald-100">
                        Save {Math.round((1 - parseInt(plan.price.replace(/\D/g, "")) / parseInt(plan.regularPrice.replace(/\D/g, ""))) * 100)}%
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 mt-4 leading-snug">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-semibold leading-normal">{plan.description}</p>
                    
                    <div className="mt-4.5 space-y-2.5 border-t border-slate-100/50 pt-4">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-600">
                          <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-150/40 mt-6">
                    <div className="flex justify-between items-baseline mb-4">
                      <div>
                        <span className="text-2xl font-black text-[#071326]">{plan.price}</span>
                        <span className="text-[10px] text-slate-400 font-bold ml-1">GST Incl.</span>
                      </div>
                      <span className="text-xs text-slate-400 line-through font-bold">{plan.regularPrice}</span>
                    </div>

                    <Link
                      href={isLoggedIn ? `/apply/itr-filing?plan=${plan.planId}` : `/login/customer?redirect=${encodeURIComponent(`/apply/itr-filing?plan=${plan.planId}`)}`}
                      className="w-full h-10 rounded-full bg-slate-950 text-white font-black hover:bg-slate-900 text-xs flex items-center justify-center shadow-md transition active:scale-95 cursor-pointer"
                    >
                      File Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* indicator dots */}
        <div className="flex justify-center gap-2 mt-4">
          {itrPlans.map((_, idx) => (
            <button
              key={idx}
              onClick={() => emblaApi?.scrollTo(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${activePlanIdx === idx ? "w-6 bg-orange-500" : "w-2 bg-slate-200"}`}
            />
          ))}
        </div>
      </section>

      {/* WHO SHOULD FILE ITR */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto bg-slate-50/50 rounded-[40px] border border-slate-100">
        <div className="text-center space-y-4 mb-14">
          <span className="inline-flex rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100 shadow-sm uppercase tracking-wider">
            Audience Breakdown
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-[#071326] tracking-tight">
            Who Needs to File ITR?
          </h2>
          <p className="text-xs md:text-sm font-medium text-slate-500 max-w-xl mx-auto">
            Interactive grid specifying user groups requiring filing submissions under AY 2026-27 guidelines.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Salaried Employees", desc: "Individuals receiving salary incomes with Form 16, HRA exemptions, and Section 80C investments.", form: "ITR-1" },
            { title: "Traders & Investors", desc: "Equity cash, options day-traders, mutual fund investors, real estate sellers, crypto builders.", form: "ITR-2" },
            { title: "Business Owners", desc: "Proprietors, LLPs, partners running business models requiring custom balance sheets.", form: "ITR-3" },
            { title: "Freelancers & Techs", desc: "Individual consultants, designers, software architects preferring presumptive taxation.", form: "ITR-4" }
          ].map((item, idx) => (
            <div key={idx} className="p-6.5 bg-white border border-slate-100 rounded-[28px] hover:shadow-lg hover:border-orange-100 transition duration-300 space-y-3.5 relative overflow-hidden group">
              <span className="absolute top-3 right-3 text-[10px] bg-slate-100 px-2 py-0.5 rounded font-black text-slate-500 uppercase">
                Form {item.form}
              </span>
              <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                <UserCheck className="h-5.5 w-5.5" />
              </div>
              <h3 className="text-sm font-black text-slate-900 group-hover:text-orange-655 transition">{item.title}</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DOCUMENTS CHECKLIST */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-12 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <span className="inline-flex rounded-full bg-orange-50 px-3.5 py-1 text-xs font-bold text-orange-750 border border-orange-100 shadow-sm uppercase tracking-wider">
              Document Checklist
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[#071326] tracking-tight leading-tight">
              Keep These Documents Handy
            </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 leading-relaxed">
              We need these documents to verify your final income computations before submitting your ITR application directly on the government e-filing portal.
            </p>

            <div className="space-y-3.5 pt-2">
              {[
                "100% paperless digital uploads center",
                "Automatic Form 16 parsing integration",
                "AIS/26AS tax credit matching algorithms",
                "Secure document store in compliance vault"
              ].map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs font-extrabold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[36px] p-6.5 md:p-8 shadow-xl space-y-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Interactive Document Slots</h3>
            
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: "Form 16 Tax Certificate", desc: "Issued by your employer certifying salary details." },
                { title: "AIS Statement", desc: "Annual Information Statement verifying bank trades." },
                { title: "Form 26AS Tax Record", desc: "Government records detailing all TDS credits." },
                { title: "Bank Statements", desc: "All bank account summaries detailing interest earned." },
                { title: "Capital Gains Statement", desc: "Required for stocks, mutual funds, property." },
                { title: "Books / Profit Loss", desc: "Balance sheet summaries for ITR-3 business." }
              ].map((doc, idx) => (
                <div key={idx} className="p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl flex items-start gap-3 hover:bg-slate-50 transition">
                  <div className="h-5.5 w-5.5 rounded bg-orange-100 flex items-center justify-center text-orange-655 text-[10px] font-black shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">{doc.title}</h4>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5">{doc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* PROCESS TIMELINE */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto bg-slate-50/50 rounded-[40px] border border-slate-100">
        <div className="text-center space-y-4 mb-14">
          <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm uppercase tracking-wider">
            Processing Flow
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-[#071326] tracking-tight">
            Our 6-Step Assisted Filing Process
          </h2>
          <p className="text-xs md:text-sm font-medium text-slate-500 max-w-xl mx-auto">
            How our corporate compliance CA network submits your return on the government e-filing portal.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6 text-left">
          {[
            { step: 1, title: "Select Plan", desc: "Choose your ITR variant and proceed to secure checkout." },
            { step: 2, title: "Upload Files", desc: "Provide Form 16, bank statement and AIS files." },
            { step: 3, title: "CA Assignment", desc: "Dedicated certified tax expert assigned to your panel." },
            { step: 4, title: "Tax Audit", desc: "Expert verifies computations for maximum tax savings." },
            { step: 5, title: "Filing & ITR-V", desc: "Return uploaded to government portal; ITR-V generated." },
            { step: 6, title: "Track Refund", desc: "Monitor IT Department processing and refund disbursal." }
          ].map((st) => (
            <div key={st.step} className="p-5 bg-white border border-slate-150/40 rounded-2xl space-y-3 shadow-sm relative">
              <span className="absolute top-3 right-3 text-2xl font-black text-slate-100 font-heading">0{st.step}</span>
              <div className="h-9 w-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-black">
                {st.step}
              </div>
              <h3 className="text-xs font-black text-slate-900">{st.title}</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ADVANTAGE COMPARISON TABLE */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto text-center space-y-12">
        <div className="space-y-4">
          <span className="inline-flex rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-750 border border-indigo-100 shadow-sm uppercase tracking-wider">
            Filing Comparison
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-[#071326] tracking-tight">
            Why DigiConnect for ITR Filing?
          </h2>
          <p className="text-xs md:text-sm font-medium text-slate-500 max-w-xl mx-auto">
            Compare our assisted compliance benefits with local accountants or trying to self-file.
          </p>
        </div>

        <div className="overflow-x-auto rounded-[32px] border border-slate-100 bg-white shadow-xl">
          <table className="w-full text-xs text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[#071326] font-black uppercase tracking-wider text-[10px]">
                <th className="p-5">Feature Benefits</th>
                <th className="p-5 text-orange-655 font-bold">DigiConnect Dukan</th>
                <th className="p-5">Self-Filing (Portal)</th>
                <th className="p-5">Traditional CAs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
              <tr>
                <td className="p-5 font-bold text-slate-900">Expert Verification</td>
                <td className="p-5 text-emerald-650 flex items-center gap-1.5"><CheckCircle2 className="h-4.5 w-4.5" /> CA Team Review</td>
                <td className="p-5 text-rose-500 flex items-center gap-1.5">✕ None (Self Check)</td>
                <td className="p-5 text-emerald-650 flex items-center gap-1.5"><CheckCircle2 className="h-4.5 w-4.5" /> High consultation</td>
              </tr>
              <tr>
                <td className="p-5 font-bold text-slate-900">Wallet Cashback</td>
                <td className="p-5 text-emerald-650 flex items-center gap-1.5"><CheckCircle2 className="h-4.5 w-4.5" /> Flat 20% Cashback</td>
                <td className="p-5 text-slate-400">✕ None</td>
                <td className="p-5 text-slate-400">✕ None</td>
              </tr>
              <tr>
                <td className="p-5 font-bold text-slate-900">Document Hub Vault</td>
                <td className="p-5 text-emerald-650 flex items-center gap-1.5"><CheckCircle2 className="h-4.5 w-4.5" /> Compliance Vault</td>
                <td className="p-5 text-slate-400">✕ Need manual save</td>
                <td className="p-5 text-slate-400">✕ Manual emails</td>
              </tr>
              <tr>
                <td className="p-5 font-bold text-slate-900">Filing Status Tracker</td>
                <td className="p-5 text-emerald-650 flex items-center gap-1.5"><CheckCircle2 className="h-4.5 w-4.5" /> Live tracker updates</td>
                <td className="p-5 text-slate-400">✕ Manual login checks</td>
                <td className="p-5 text-slate-400">✕ Manual phone calls</td>
              </tr>
              <tr>
                <td className="p-5 font-bold text-slate-900">Pricing Cost</td>
                <td className="p-5 text-emerald-650 flex items-center gap-1.5"><CheckCircle2 className="h-4.5 w-4.5" /> Starter ₹699 only</td>
                <td className="p-5 text-slate-800">Free (Prone to errors)</td>
                <td className="p-5 text-slate-600">Min ₹2,000+ per file</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* LEAD INQUIRY FORM */}
      <section className="py-20 px-4 md:px-8 max-w-4xl mx-auto">
        <div className="bg-white border border-slate-100 rounded-[36px] p-6.5 md:p-10 shadow-xl space-y-6 text-center">
          <div className="space-y-2">
            <span className="inline-flex rounded-full bg-orange-50 px-3.5 py-1 text-xs font-bold text-orange-750 border border-orange-100 shadow-sm uppercase">
              Expert Call Request
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-[#071326] tracking-tight leading-tight">
              Still Unsure About ITR Filings?
            </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 max-w-md mx-auto">
              Request a free callback from our certified tax specialist to resolve your query within 30 minutes.
            </p>
          </div>

          <form onSubmit={(e) => handleLeadSubmit(e, false)} className="space-y-4 max-w-lg mx-auto text-left">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-450 block">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alok Gupta"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-xs font-bold text-[#071326] placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-450 block">10-Digit Mobile Number</label>
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  placeholder="e.g. 9876543210"
                  value={leadMobile}
                  onChange={(e) => setLeadMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-xs font-bold text-[#071326] placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white transition"
                />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-450 block">Optional Message / Query</label>
              <textarea
                placeholder="e.g. I have a salary from two employers, which ITR should I file?"
                value={leadMessage}
                onChange={(e) => setLeadMessage(e.target.value)}
                className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-xs font-bold text-[#071326] placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white transition h-20 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingLead}
              className="w-full h-11 rounded-full bg-slate-950 hover:bg-slate-900 disabled:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
            >
              {isSubmittingLead ? "Requesting Call..." : "Request Free Callback"}
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>
      </section>

      {/* FAQ COLLAPSIBLE SEGMENT */}
      <section className="py-20 px-4 md:px-8 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-black text-[#071326] tracking-tight">ITR Frequently Asked Questions</h2>
          <p className="text-xs text-slate-455">Search queries regarding slabs, Form 16, capital gains refunds, or expert help.</p>
        </div>

        <div className="relative flex items-center bg-white border border-slate-100 p-2 rounded-2xl shadow-sm max-w-md mx-auto">
          <Search className="h-4.5 w-4.5 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Search tax questions..."
            value={faqSearch}
            onChange={(e) => setFaqSearch(e.target.value)}
            className="flex-1 bg-transparent px-3 py-2 text-xs font-bold text-[#071326] placeholder-slate-400 outline-none"
          />
        </div>

        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className="bg-white border border-slate-100 rounded-2xl overflow-hidden transition-all shadow-sm">
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex justify-between items-center text-xs font-extrabold text-slate-850 hover:bg-slate-50/50 transition cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`h-4.5 w-4.5 text-slate-400 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="p-5 border-t border-slate-50 text-xs text-slate-500 leading-relaxed font-medium bg-slate-50/20">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* EXIT INTENT DIALOG POPUP */}
      {showExitIntent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={handleDismissExitIntent} />
          
          <div className="relative w-full max-w-md bg-white border border-slate-100 rounded-[36px] p-6.5 md:p-8 shadow-2xl text-center space-y-5 animate-[scaleIn_0.25s_ease-out] z-10">
            <button
              onClick={handleDismissExitIntent}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="mx-auto h-11 w-11 rounded-2xl bg-orange-50 text-orange-655 flex items-center justify-center">
              <Gift className="h-6 w-6 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Wait! Claim Free Expert Advice</h3>
              <p className="text-xs text-slate-450 leading-relaxed font-medium">
                Leave your number before you go, and get a **Free CA Assessment** along with an additional **₹100 discount coupon** for your assisted return filing!
              </p>
            </div>

            {exitIntentSubmitted ? (
              <div className="p-4.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-black">
                🎉 Callback registered! Check your phone for verification codes.
              </div>
            ) : (
              <form onSubmit={(e) => handleLeadSubmit(e, true)} className="space-y-3.5 text-left">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohit Kumar"
                    value={exitName}
                    onChange={(e) => setExitName(e.target.value)}
                    className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    placeholder="e.g. 9876543210"
                    value={exitMobile}
                    onChange={(e) => setExitMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="w-full h-10 rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                >
                  Get ₹100 Off + Callback
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </main>
  );
}
