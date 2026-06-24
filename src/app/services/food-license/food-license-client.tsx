"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Clock,
  MapPin,
  Check,
  X,
  TrendingUp,
  Award,
  ChevronDown,
  Info,
  DollarSign,
  User,
  Users,
  Search,
  Building,
  HelpCircle,
  FileCheck,
  FileText,
  AlertTriangle,
  UploadCloud,
  ChevronRight,
  Calculator,
  Compass,
  Star,
  Send,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { trackCrmEvent } from "@/lib/crm";

type FAQ = {
  question: string;
  answer: string;
};

function AnimatedCounter({ value, suffix = "", duration = 1500 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const totalMiliseconds = duration;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 20);
    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime));
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function FoodLicenseClient({
  isLoggedIn: initialIsLoggedIn,
  faqs
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

  useEffect(() => {
    trackCrmEvent("page_visit", "food-license");
  }, []);

  // FAQ states
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [faqSearch, setFaqSearch] = useState("");

  // Sticky scroll states
  const [showStickyCard, setShowStickyCard] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCard(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- 1. Eligibility Checker State ---
  const [turnoverScale, setTurnoverScale] = useState<"under12l" | "12lto20c" | "over20c">("under12l");
  const [businessNature, setBusinessNature] = useState<"general" | "manufacturing" | "ecommerce" | "import_export">("general");

  const recommendedLicense = useMemo(() => {
    if (businessNature === "import_export" || turnoverScale === "over20c" || businessNature === "ecommerce") {
      return {
        name: "Central FSSAI License",
        desc: "Mandatory for large-scale operations, e-commerce, and import/export food trades.",
        fee: "Starting ₹4,999",
        badge: "Central Tier Required",
        color: "text-amber-700 bg-amber-50 border-amber-100",
        planKey: "premium"
      };
    } else if (turnoverScale === "12lto20c" || businessNature === "manufacturing") {
      return {
        name: "State FSSAI License",
        desc: "Required for mid-sized manufacturers, distributors, cold stores, and large restaurants.",
        fee: "Starting ₹2,999",
        badge: "State Tier Recommended",
        color: "text-blue-700 bg-blue-50 border-blue-100",
        planKey: "pro"
      };
    } else {
      return {
        name: "Basic FSSAI Registration",
        desc: "Ideal for home kitchens, small shops, tea stalls, and small cafes under ₹12 Lakhs annual turnover.",
        fee: "Starting ₹1,499",
        badge: "Basic Registration Fits",
        color: "text-emerald-700 bg-emerald-50 border-emerald-100",
        planKey: "basic"
      };
    }
  }, [turnoverScale, businessNature]);

  // --- 2. Document Readiness Checker State ---
  const [selectedDocType, setSelectedDocType] = useState<"aadhaar" | "pan" | "noc">("aadhaar");
  const [checkingFile, setCheckingFile] = useState(false);
  const [readinessResult, setReadinessResult] = useState<{
    score: number;
    status: "ready" | "needs_attention" | null;
    message: string;
  } | null>(null);

  const simulateDocCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setCheckingFile(true);
    setReadinessResult(null);

    setTimeout(() => {
      setCheckingFile(false);
      if (selectedDocType === "noc") {
        setReadinessResult({
          score: 85,
          status: "needs_attention",
          message: "⚠️ Address NOC matches, but utility bill image resolution is low. Please ensure clean copy uploads."
        });
      } else {
        setReadinessResult({
          score: 98,
          status: "ready",
          message: "✓ Verified matching spelling and active identifier format. Documents are 100% ready for filing!"
        });
      }
      success("Document scan simulation completed!");
      trackCrmEvent("calculator_usage", "food-license-doc-checker");
    }, 2000);
  };

  // --- 3. Business Compliance Score State ---
  const [complianceAnswers, setComplianceAnswers] = useState<Record<number, boolean>>({});
  const complianceQuestions = [
    { id: 1, text: "Do you have commercial waste management facilities?" },
    { id: 2, text: "Are all food handling staff wearing hygiene caps/gloves?" },
    { id: 3, text: "Do you have clean, potable water source certifications?" },
    { id: 4, text: "Do you maintain records of food temperatures?" },
    { id: 5, text: "Are pest control checks carried out quarterly?" }
  ];

  const complianceScore = useMemo(() => {
    const totalCount = complianceQuestions.length;
    const answeredYes = Object.values(complianceAnswers).filter(Boolean).length;
    return Math.round((answeredYes / totalCount) * 100);
  }, [complianceAnswers]);

  // --- 4. Smart Assistant Chat State ---
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "bot"; text: string }[]>([
    { sender: "bot", text: "Hello! I am your FSSAI Smart Assistant. Click on any query below to get instant support." }
  ]);

  const presetQueries = [
    "Do I need a license for a home kitchen?",
    "FSSAI required for Swiggy/Zomato onboarding?",
    "What is the difference between State and Central License?",
    "What penalties apply for cooking without FSSAI?"
  ];

  const handleSendPresetQuery = (query: string) => {
    setChatMessages((prev) => [...prev, { sender: "user", text: query }]);

    let botResponse = "";
    if (query.includes("home kitchen")) {
      botResponse = "Yes! Home kitchens require a Basic FSSAI Registration if annual sales are under ₹12 Lakhs. It is essential for delivering legally and onboarding on online applications.";
    } else if (query.includes("Swiggy/Zomato")) {
      botResponse = "Swiggy & Zomato strictly mandate a 14-digit FSSAI number for registration. Partner accounts cannot be activated without uploading your approved FSSAI certificate.";
    } else if (query.includes("difference")) {
      botResponse = "Basic is for turnover under ₹12L. State is for turnover between ₹12L and ₹20Cr. Central is for turnover over ₹20Cr, importers, exporters, e-commerce platforms, or multi-state chains.";
    } else {
      botResponse = "Failing to obtain FSSAI when legally required can attract heavy fines up to ₹5 Lakhs and potential imprisonment up to 6 months. It is highly recommended to register prior to starting operations.";
    }

    setTimeout(() => {
      setChatMessages((prev) => [...prev, { sender: "bot", text: botResponse }]);
      trackCrmEvent("smart_chat_interaction", "food-license");
    }, 800);
  };

  // Lead Fallback Form State
  const [leadName, setLeadName] = useState("");
  const [leadMobile, setLeadMobile] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadMobile) {
      toastError("Please fill in both Name and Mobile Number.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(leadMobile)) {
      toastError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmittingLead(true);
    try {
      const formData = new FormData();
      formData.append("name", leadName);
      formData.append("mobile", leadMobile);
      formData.append("service", "Food License (FSSAI)");
      formData.append("message", "Requested expert assistance consultation.");

      const response = await fetch("/api/lead", { method: "POST", body: formData });
      const result = await response.json();

      if (response.ok && (result.ok || result.success)) {
        success("Thank you! Our compliance expert will call you shortly.");
        setLeadName("");
        setLeadMobile("");
        trackCrmEvent("expert_talk_click", "food-license", leadMobile, leadName);
      } else {
        toastError(result.error || result.message || "Lead submission failed.");
      }
    } catch {
      toastError("Failed to submit inquiry. Please try again.");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
    faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#FBFBFF] text-[#0B1F3A] relative overflow-hidden font-sans">
      
      {/* Background Graphic Rings */}
      <div className="absolute top-0 left-0 right-0 h-[650px] bg-[radial-gradient(circle_at_15%_15%,rgba(37,99,235,0.06),transparent_50%),radial-gradient(circle_at_85%_35%,rgba(249,115,22,0.05),transparent_50%)] pointer-events-none" />

      {/* 1. STICKY TOP ACTIONS */}
      <AnimatePresence>
        {showStickyCard && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-white/80 border-b border-slate-200/50 backdrop-blur-md px-6 py-3.5 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
              <p className="text-xs font-bold text-slate-800 hidden sm:block">
                FSSAI License: Starting at ₹1,499
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={isLoggedIn ? "/apply/food-license?plan=basic" : `/login/customer?redirect=${encodeURIComponent("/apply/food-license?plan=basic")}`}
                className="h-9 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center shadow-md shadow-blue-500/10 active:scale-[0.98]"
              >
                Apply Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] items-center">
          {/* Hero Left */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50/50 px-4 py-1.5 text-xs font-bold text-orange-700 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
              <span>🔥 Most Popular Business Compliance Service</span>
            </div>

            <h1 className="text-4xl md:text-5.5xl font-black tracking-tight text-[#071326] leading-tight">
              Get Your FSSAI Food <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 bg-clip-text text-transparent">License Without Hassle</span>
            </h1>

            <p className="text-base md:text-lg font-medium text-slate-500 leading-relaxed max-w-xl">
              Apply for FSSAI Registration, State License or Central License with expert assistance. Fast processing, document support and application tracking.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href={isLoggedIn ? "/apply/food-license?plan=basic" : `/login/customer?redirect=${encodeURIComponent("/apply/food-license?plan=basic")}`}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] hover:shadow-blue-500/30 transition active:scale-[0.98]"
              >
                Apply Now
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              <a
                href="#expert-consult"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-7 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-sm hover:bg-slate-50 hover:scale-[1.02] transition active:scale-[0.98]"
              >
                <MessageCircle className="h-4.5 w-4.5 text-emerald-600" />
                Talk To Expert
              </a>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 border-t border-slate-100">
              {[
                "Government Compliant",
                "Expert Assisted",
                "Secure Documents",
                "Fast Processing",
                "PAN India Service"
              ].map((badge, idx) => (
                <div key={idx} className="flex items-center gap-1 text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-[10px] font-black text-slate-800">{badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Right: Liquid Glass Mock Certificate card */}
          <div className="relative flex justify-center">
            <div className="relative w-full max-w-[420px] rounded-[36px] border border-white/60 bg-white/40 p-6 shadow-2xl backdrop-blur-md overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
              
              {/* Generated Illustration Frame */}
              <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-inner relative bg-slate-100 flex items-center justify-center">
                <img
                  src="/images/services/food-license/hero.png"
                  alt="Food Business Compliance illustration"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* FSSAI Mock Certificate Overlay */}
              <div className="mt-5 bg-white/90 border border-slate-150 rounded-2xl p-4 shadow-sm relative">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-bold text-orange-600 uppercase tracking-widest">FoSCoS Certificate</span>
                    <h3 className="text-xs font-black text-slate-900 leading-none">Government of India</h3>
                    <p className="text-[8px] font-bold text-slate-400">Food Safety & Standards Authority of India</p>
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    APPROVED
                  </span>
                </div>

                <div className="my-3 space-y-1.5 border-t border-b border-dashed border-slate-100 py-2.5 text-[9px] text-slate-600">
                  <div className="flex justify-between">
                    <span>License No:</span>
                    <span className="font-mono font-bold text-slate-900">10026051000284</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FBO Name:</span>
                    <span className="font-bold text-slate-900">RNOS Food Enterprises</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sub-category:</span>
                    <span className="font-bold text-slate-900">General Manufacturing</span>
                  </div>
                </div>

                <div className="text-[8px] text-slate-400 text-center font-bold">
                  Trusted by 10,000+ Business Owners
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DYNAMIC STAT COUNTERS */}
      <section className="py-10 bg-white border-y border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: 10000, suffix: "+", label: "Applications Processed" },
            { value: 98, suffix: "%", label: "Success Rate" },
            { value: 4.9, suffix: "★", label: "Customer Rating", isFloat: true },
            { value: 28, suffix: "+ States", label: "PAN India Coverage", isStates: true }
          ].map((stat, idx) => (
            <div key={idx} className="space-y-1">
              <p className="text-3xl md:text-4.5xl font-black text-blue-600 leading-none">
                {stat.isFloat ? "4.9" : stat.isStates ? "28+" : <AnimatedCounter value={stat.value} suffix={stat.suffix} />}
              </p>
              <p className="text-xs font-black uppercase text-slate-400 tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. INTERACTIVE WIDGETS CONSOLE */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Compliance Hub</span>
          <h2 className="text-3xl font-black text-[#071326] tracking-tight">Interactive Food Safety Tools</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">Use our mock calculators and readiness checkers to verify your compliance score before filing.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Tool 1: Eligibility Checker */}
          <div className="rounded-[28px] border border-slate-200/50 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
                <Calculator className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">1. FSSAI Eligibility Checker</h3>
                <p className="text-[10px] text-slate-400">Identify the correct license type for your scale</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Annual Turnover</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "under12l", label: "Under ₹12L" },
                    { key: "12lto20c", label: "₹12L – ₹20Cr" },
                    { key: "over20c", label: "Above ₹20Cr" }
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setTurnoverScale(item.key as typeof turnoverScale)}
                      className={`h-9 text-xs rounded-xl border font-bold transition ${
                        turnoverScale === item.key
                          ? "bg-blue-600 text-white border-transparent shadow-sm"
                          : "bg-white text-slate-550 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Business Nature</label>
                <select
                  value={businessNature}
                  onChange={(e) => setBusinessNature(e.target.value as typeof businessNature)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 bg-white"
                >
                  <option value="general">Retailer / Cafe / Cloud Kitchen</option>
                  <option value="manufacturing">Food Manufacturer / Processor</option>
                  <option value="ecommerce">E-commerce Vendor (online supply)</option>
                  <option value="import_export">Import / Export Trade</option>
                </select>
              </div>
            </div>

            {/* Recommendation Result Card */}
            <div className={`p-4 rounded-2xl border ${recommendedLicense.color} flex flex-col justify-between gap-3`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider">{recommendedLicense.badge}</span>
                  <h4 className="text-sm font-black mt-0.5">{recommendedLicense.name}</h4>
                </div>
                <span className="text-xs font-black">{recommendedLicense.fee}</span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed opacity-90">{recommendedLicense.desc}</p>
              <Link
                href={isLoggedIn ? `/apply/food-license?plan=${recommendedLicense.planKey}` : `/login/customer?redirect=${encodeURIComponent(`/apply/food-license?plan=${recommendedLicense.planKey}`)}`}
                className="mt-1 h-8 rounded-lg bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center hover:bg-slate-800 transition active:scale-[0.98]"
              >
                Apply for this plan
              </Link>
            </div>
          </div>

          {/* Tool 2: Document Readiness Scanner */}
          <div className="rounded-[28px] border border-slate-200/50 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <FileCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">2. Document Readiness Scanner</h3>
                <p className="text-[10px] text-slate-400">Simulate file verification for active submission</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "aadhaar", label: "Aadhaar Card" },
                  { key: "pan", label: "PAN Card" },
                  { key: "noc", label: "Address NOC / bill" }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setSelectedDocType(item.key as typeof selectedDocType);
                      setReadinessResult(null);
                    }}
                    className={`h-9 text-xs rounded-xl border font-bold transition ${
                      selectedDocType === item.key
                        ? "bg-blue-600 text-white border-transparent"
                        : "bg-white text-slate-550 border-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:border-blue-500 transition text-center cursor-pointer bg-slate-50/50">
                <input
                  type="file"
                  onChange={simulateDocCheck}
                  disabled={checkingFile}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {checkingFile ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-600">AI scanning metadata details...</p>
                  </div>
                ) : (
                  <div className="space-y-2 flex flex-col items-center">
                    <UploadCloud className="h-8 w-8 text-slate-400" />
                    <p className="text-xs font-bold text-slate-800">Select or Drag any file to test readiness</p>
                    <p className="text-[9px] text-slate-450 font-semibold">PDF, JPEG, or PNG formats up to 5MB</p>
                  </div>
                )}
              </div>
            </div>

            {readinessResult ? (
              <div className={`p-4 rounded-xl border ${
                readinessResult.status === "ready"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : "bg-amber-50 border-amber-200 text-amber-950"
              } text-xs space-y-2`}>
                <div className="flex justify-between items-center">
                  <span className="font-extrabold uppercase text-[10px]">Readiness Score</span>
                  <span className="font-mono font-black">{readinessResult.score}%</span>
                </div>
                <p className="font-semibold leading-relaxed text-[11px]">{readinessResult.message}</p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-100 text-center text-[10px] text-slate-400 font-semibold">
                Upload a document to check validation status
              </div>
            )}
          </div>

          {/* Tool 3: Compliance Score Calculator */}
          <div className="rounded-[28px] border border-slate-200/50 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Compass className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">3. Business Compliance score</h3>
                <p className="text-[10px] text-slate-400">Answer safety checks to calculate your grading</p>
              </div>
            </div>

            <div className="space-y-3.5 max-h-[180px] overflow-y-auto pr-1">
              {complianceQuestions.map((q) => (
                <div key={q.id} className="flex justify-between items-center text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="pr-4 leading-tight">{q.text}</span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setComplianceAnswers(prev => ({ ...prev, [q.id]: true }))}
                      className={`h-6 w-9 rounded text-[10px] font-bold transition ${
                        complianceAnswers[q.id] === true
                          ? "bg-emerald-600 text-white"
                          : "bg-white border text-slate-500"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setComplianceAnswers(prev => ({ ...prev, [q.id]: false }))}
                      className={`h-6 w-9 rounded text-[10px] font-bold transition ${
                        complianceAnswers[q.id] === false
                          ? "bg-rose-600 text-white"
                          : "bg-white border text-slate-500"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-950 text-white flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Compliance Grade</span>
                <p className="text-sm font-black">
                  {complianceScore >= 80 ? "Class A Grade (High Safety)" : complianceScore >= 40 ? "Class B Grade (Medium)" : "Requires Attention"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center font-mono font-black text-xs">
                {complianceScore}%
              </div>
            </div>
          </div>

          {/* Tool 4: Smart Assistant Chat */}
          <div className="rounded-[28px] border border-slate-200/50 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">4. Smart Assistant Chat</h3>
                <p className="text-[10px] text-slate-400">Click on any question for instant FSSAI help</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border h-40 overflow-y-auto flex flex-col gap-2.5 text-xs">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`p-2.5 rounded-xl max-w-[85%] font-medium leading-relaxed ${
                  msg.sender === "bot"
                    ? "bg-white text-slate-800 border self-start rounded-tl-none shadow-xs"
                    : "bg-blue-600 text-white self-end rounded-tr-none"
                }`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PRESET QUERIES</p>
              <div className="flex flex-wrap gap-1.5">
                {presetQueries.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendPresetQuery(q)}
                    className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-left truncate max-w-full"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. WHAT IS FSSAI LICENSE */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-12 bg-white/70 rounded-3xl border border-slate-200/40">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] items-center">
          <div className="space-y-4">
            <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Introduction</span>
            <h2 className="text-3xl font-black text-[#071326] tracking-tight leading-tight">
              What is FSSAI License & Why is it Mandatory?
            </h2>
            <p className="text-xs leading-relaxed text-slate-500 font-semibold">
              FSSAI is the primary governing authority certifying the hygiene and safety protocols of food products sold in India. Holding an active FSSAI registration is a mandatory statutory legal requirement under the Food Safety Act of 2006.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { title: "Legal Mandate", desc: "It is legally mandatory for home kitchens, restaurants, distributors, and delivery sellers to hold a valid FSSAI ID." },
              { title: "Avoid Penalty Blocks", desc: "Non-compliance can invite immediate business closure audits and fines ranging from ₹10,000 to ₹5,000,000." },
              { title: "Trust and Credibility", desc: "Having an approved FSSAI 14-digit identifier on your packaging builds immense user trust and credibility." },
              { title: "Marketplace Integration", desc: "Mandatory for onboarding and listing food products on online channels like Swiggy, Zomato, or Blinkit." }
            ].map((box, idx) => (
              <div key={idx} className="p-5 border rounded-2xl bg-slate-50 space-y-2">
                <h4 className="text-sm font-extrabold text-slate-900">{box.title}</h4>
                <p className="text-[11px] leading-relaxed text-slate-500 font-semibold">{box.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. TYPES OF FSSAI LICENSE */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Licensing Structure</span>
          <h2 className="text-3xl font-black text-[#071326] tracking-tight">Types of FSSAI License</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">Different turnover volumes and business operations require different license tiers.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Basic Registration",
              turnover: "Turnover up to ₹12 Lakhs",
              details: "Perfect for home kitchens, sweet stalls, dry stores, temporary street food vendors, and small cafes.",
              price: "Starting ₹1,499",
              color: "border-slate-200"
            },
            {
              title: "State License",
              turnover: "Turnover ₹12L to ₹20 Crores",
              details: "Designed for mid-sized manufacturers, distributors, cold stores, hotels, and established restaurants.",
              price: "Starting ₹2,999",
              color: "border-blue-200 ring-2 ring-blue-500/5 bg-blue-50/20"
            },
            {
              title: "Central License",
              turnover: "Large scale / Over ₹20 Crores",
              details: "For large manufacturers, importers, exporters, e-commerce portals, and multi-state chains.",
              price: "Starting ₹4,999",
              color: "border-slate-200"
            }
          ].map((card, idx) => (
            <div key={idx} className={`p-6 border rounded-[28px] bg-white flex flex-col justify-between space-y-6 ${card.color} shadow-sm`}>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900">{card.title}</h3>
                <span className="inline-block text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                  {card.turnover}
                </span>
                <p className="text-xs leading-relaxed text-slate-550 pt-2 font-medium">{card.details}</p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <span className="text-sm font-black text-slate-900">{card.price}</span>
                <Link
                  href={isLoggedIn ? "/apply/food-license?plan=basic" : `/login/customer?redirect=${encodeURIComponent("/apply/food-license?plan=basic")}`}
                  className="h-8.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center transition active:scale-[0.98]"
                >
                  Choose
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto rounded-3xl border border-slate-200/60 shadow-sm bg-white mt-12">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[9px] text-slate-400 tracking-wider">
              <tr>
                <th className="p-4">Criteria</th>
                <th className="p-4">Basic Registration</th>
                <th className="p-4">State License</th>
                <th className="p-4">Central License</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {[
                { name: "Turnover Limit", basic: "Under ₹12 Lakhs/year", state: "₹12 Lakhs to ₹20 Crores/year", central: "Exceeding ₹20 Crores/year" },
                { name: "Government Fees", basic: "₹100 / year", state: "₹2,000 to ₹5,000 / year", central: "₹7,500 / year" },
                { name: "Validity", basic: "1 to 5 Years", state: "1 to 5 Years", central: "1 to 5 Years" },
                { name: "Processing time", basic: "5 - 10 Days", state: "15 - 20 Days", central: "25 - 30 Days" },
                { name: "E-Commerce / Online", basic: "No (needs State/Central)", state: "Yes", central: "Yes (Mandatory)" },
                { name: "Import/Export", basic: "Not Eligible", state: "Not Eligible", central: "Yes (Mandatory)" }
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900">{row.name}</td>
                  <td className="p-4">{row.basic}</td>
                  <td className="p-4">{row.state}</td>
                  <td className="p-4">{row.central}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. WHO NEEDS FSSAI */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Scope of Business</span>
          <h2 className="text-3xl font-black text-[#071326] tracking-tight">Who Needs FSSAI Food License?</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">Every scale of the food ecosystem requires licensing compliance.</p>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-6 text-center text-xs font-bold text-slate-800">
          {[
            "Restaurants", "Cloud Kitchen", "Bakery", "Sweet Shop", "Tea Stall", "Juice Shop",
            "Hotel", "Cafe", "Food Manufacturer", "Food Distributor", "Food Transporter", "Online Food Seller",
            "Home Kitchen", "Dark Kitchen", "Catering Service", "Grocery Store", "Dairy Business", "Import Export Food Business"
          ].map((item, idx) => (
            <div key={idx} className="p-4.5 rounded-2xl border bg-white shadow-xs hover:border-blue-500 transition-colors flex items-center justify-center min-h-[4.5rem]">
              <span className="leading-tight">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 8. BENEFITS SECTION */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-12 bg-white/70 border border-slate-200/40 rounded-3xl">
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Advantages</span>
          <h2 className="text-3xl font-black text-[#071326] tracking-tight">FSSAI Compliance Benefits</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">Holding a license does not just keep you legal; it grows your sales.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { title: "Build Customer Trust", desc: "Displays approved safety checks, showing you value the hygiene and health of your customers." },
            { title: "Legal compliance", desc: "Protects your brand from sudden inspections, harassment, closure notices, and hefty court fines." },
            { title: "Avoid Penalties", desc: "Save thousands of rupees in fines by holding a compliant, up-to-date registered active certificate." },
            { title: "Business Growth", desc: "Easier access to corporate contracts, distribution networks, franchise partnerships, and expansion." },
            { title: "Online Selling", desc: "Mandatory qualification requirement to onboard and sell food items on Swiggy, Zomato, and e-com." },
            { title: "Improved Brand Value", desc: "Establish your food enterprise as a premium, certified brand, improving market credibility." }
          ].map((benefit, idx) => (
            <div key={idx} className="p-5 border rounded-2xl bg-slate-50 space-y-2 shadow-xs hover:scale-[1.01] transition-transform">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h4 className="text-sm font-extrabold text-slate-900">{benefit.title}</h4>
              <p className="text-[11px] leading-relaxed text-slate-500 font-semibold">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 9. DOCUMENT REQUIRED SECTION */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Checklist</span>
          <h2 className="text-3xl font-black text-[#071326] tracking-tight">Documents Required</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">Prepare these files before submitting the application.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Individual Checklist */}
          <div className="p-6 border rounded-[28px] bg-white space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 border-b pb-2">For Individuals / Proprietors</h3>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              {["Aadhaar Card copy", "PAN Card copy", "Passport Size Photograph", "Mobile Number linked to Aadhaar", "Email Address"].map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Business Checklist */}
          <div className="p-6 border rounded-[28px] bg-white space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 border-b pb-2">For Partnerships / Companies / Shop Locations</h3>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              {["GST Registration copy (optional)", "Address Proof (Electricity Bill / Water Bill)", "NOC from Premises Owner", "Partnership Deed / Incorporation Certificate", "List of Food Items & Processing machineries"].map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 10. TIMELINE PROCESS */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-12 bg-white/70 border border-slate-200/40 rounded-3xl">
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Workflow</span>
          <h2 className="text-3xl font-black text-[#071326] tracking-tight">Process Timeline</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">Get your food license verified and issued in six simple steps.</p>
        </div>

        {/* Horizontal Process Steps */}
        <div className="grid gap-6 sm:grid-cols-6 relative">
          {[
            { step: "Step 1", title: "Choose License Type", desc: "Identify Basic, State, or Central tier based on turnover." },
            { step: "Step 2", title: "Upload Documents", desc: "Upload clear photo copies of identity and address proofs." },
            { step: "Step 3", title: "Verification", desc: "Our CA team reviews spellings and details to prevent query rejections." },
            { step: "Step 4", title: "Application Filing", desc: "Form filing submitted to the FoSCoS government portal." },
            { step: "Step 5", title: "Government Processing", desc: "Safety officers inspect details and issue approvals." },
            { step: "Step 6", title: "License Issued", desc: "Download print-ready PDF certificate on your dashboard." }
          ].map((step, idx) => (
            <div key={idx} className="space-y-2 text-center relative group">
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black mx-auto shadow-md">
                {idx + 1}
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400 mt-2">{step.step}</p>
              <h4 className="text-xs font-extrabold text-slate-900">{step.title}</h4>
              <p className="text-[10px] leading-relaxed text-slate-500 font-medium px-2">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 11. PROCESSING PACKAGES */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Pricing Tables</span>
          <h2 className="text-3xl font-black text-[#071326] tracking-tight">Flexible Compliance Packages</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">Select the right assistance tier for your food safety filing.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              name: "Basic",
              price: "₹1499",
              features: ["FSSAI Registration", "Application Filing", "Standard Support"],
              actionUrl: "/apply/food-license?plan=basic",
              recommended: false
            },
            {
              name: "Business Pro",
              price: "₹2999",
              features: ["Everything in Basic", "Document Review", "Priority Processing", "Business Consultation"],
              actionUrl: "/apply/food-license?plan=pro",
              recommended: true
            },
            {
              name: "Premium Compliance",
              price: "₹4999",
              features: ["Everything in Pro", "Renewal Reminder", "Dedicated Executive", "Compliance Support", "Priority Assistance"],
              actionUrl: "/apply/food-license?plan=premium",
              recommended: false
            }
          ].map((plan, idx) => (
            <div key={idx} className={`p-6 border rounded-[28px] bg-white flex flex-col justify-between space-y-6 relative shadow-sm ${
              plan.recommended ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200"
            }`}>
              {plan.recommended && (
                <span className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm">
                  Recommended Plan
                </span>
              )}
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900">{plan.name}</h3>
                <p className="text-3xl font-black text-slate-900 leading-none">{plan.price}</p>
                <ul className="space-y-2.5 pt-4 text-xs font-semibold text-slate-650">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={isLoggedIn ? plan.actionUrl : `/login/customer?redirect=${encodeURIComponent(plan.actionUrl)}`}
                className={`h-11 w-full rounded-xl font-bold text-xs flex items-center justify-center transition active:scale-[0.98] ${
                  plan.recommended
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Buy Package
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 12. WHY CHOOSE DIGICONNECT DUKAN */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Comparison</span>
          <h2 className="text-3xl font-black text-[#071326] tracking-tight">DigiConnect Dukan vs Local Agents</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">Why thousands of FBOs choose us for corporate-grade safety filings.</p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-sm bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[9px] text-slate-400 tracking-wider">
              <tr>
                <th className="p-4">Feature</th>
                <th className="p-4 text-blue-600">DigiConnect Dukan</th>
                <th className="p-4">Local Agent</th>
                <th className="p-4">Others</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {[
                { name: "Expert Guidance", digi: true, local: false, others: true },
                { name: "Application Accuracy Review", digi: true, local: false, others: false },
                { name: "Document Pre-verification", digi: true, local: false, others: false },
                { name: "Digital Wallet Integration", digi: true, local: false, others: false },
                { name: "Renewal Reminder Alerts", digi: true, local: false, others: false },
                { name: "Smart Chat Assistant", digi: true, local: false, others: false }
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900">{row.name}</td>
                  <td className="p-4">
                    {row.digi ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-rose-500" />}
                  </td>
                  <td className="p-4">
                    {row.local ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-rose-500" />}
                  </td>
                  <td className="p-4">
                    {row.others ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-rose-500" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 13. FAQ SECTION */}
      <section className="py-20 px-4 md:px-8 max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Q&A</span>
          <h2 className="text-3xl font-black text-[#071326] tracking-tight">Frequently Asked Questions</h2>
          <p className="text-slate-500 text-sm">Find answers to the most common queries regarding FSSAI compliance.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={faqSearch}
            onChange={(e) => setFaqSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-blue-600 outline-none transition"
          />
        </div>

        <div className="divide-y divide-slate-100 bg-white border rounded-2xl overflow-hidden shadow-xs">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div key={index} className="group">
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full px-5 py-4 flex justify-between items-center text-xs font-extrabold text-slate-800 hover:bg-slate-50/50 text-left transition"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs leading-relaxed text-slate-550 font-medium">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 14. TESTIMONIALS SECTION */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto bg-slate-50 rounded-3xl space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Reviews</span>
          <h2 className="text-3xl font-black text-[#071326] tracking-tight">What Business Owners Say</h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">Read evaluations from verified food merchants using our dashboard.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { name: "Rahul Deshmukh", role: "Cloud Kitchen Owner, Pune", text: "Onboarded my brand on Swiggy within 7 days! The document checker pre-verified my electricity bill and prevented any portal errors." },
            { name: "Ananya Iyer", role: "Home Baker, Chennai", text: "Being a small home kitchen, I was scared of department queries. DigiConnect Ca assisted me and got my registration issued fast." },
            { name: "Vikram Sengupta", role: "Restaurant Partner, Kolkata", text: "Great wallet integration! Got 20% cashback on my State License payment which I redeemed for GST filings." }
          ].map((rev, idx) => (
            <div key={idx} className="p-6 rounded-2xl border bg-white space-y-3 shadow-xs">
              <div className="flex gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-500" />)}
              </div>
              <p className="text-xs leading-relaxed text-slate-655 font-medium italic">{`"${rev.text}"`}</p>
              <div>
                <p className="text-xs font-extrabold text-slate-900">{rev.name}</p>
                <p className="text-[10px] text-slate-450 font-bold">{rev.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 15. EXPERT CONSULTATION LEAD CAPTURE */}
      <section id="expert-consult" className="py-20 px-4 md:px-8 max-w-4xl mx-auto">
        <div className="rounded-[36px] bg-gradient-to-br from-slate-900 to-slate-950 text-white p-8 md:p-12 text-center space-y-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-lg mx-auto space-y-2">
            <h3 className="text-2xl font-black">Need custom FSSAI licensing consultation?</h3>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Our food safety experts are standing by. Fill in your details below and we will call you back to clear any queries.
            </p>
          </div>

          <form onSubmit={handleLeadSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Your Full Name"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              className="h-11 px-4 rounded-xl bg-white/10 border border-white/10 text-xs font-semibold text-white focus:border-blue-500 focus:bg-white/20 outline-none transition w-full sm:flex-1"
            />
            <input
              type="text"
              placeholder="10 digit Mobile"
              value={leadMobile}
              onChange={(e) => setLeadMobile(e.target.value)}
              className="h-11 px-4 rounded-xl bg-white/10 border border-white/10 text-xs font-semibold text-white focus:border-blue-500 focus:bg-white/20 outline-none transition w-full sm:flex-1"
            />
            <button
              type="submit"
              disabled={isSubmittingLead}
              className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/10 transition active:scale-[0.98]"
            >
              {isSubmittingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : "Talk To Expert"}
            </button>
          </form>
        </div>
      </section>

      {/* 16. RELATED COMPLIANCE SERVICES */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-8 border-t">
        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Related Services</h4>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[
            { name: "GST Registration", url: "/services/gst-registration", desc: "Obtain your 15-digit GSTIN online." },
            { name: "MSME Registration", url: "/services/msme-registration", desc: "Get Udyam certificate subsidies." },
            { name: "Shop Act License", url: "/services/shop-act", desc: "Establish location operating permits." },
            { name: "Trademark Registration", url: "/services/trademark", desc: "Secure your brand name logo legally." }
          ].map((item, idx) => (
            <Link key={idx} href={item.url} className="p-5 border rounded-2xl bg-white shadow-xs hover:border-blue-500 transition-colors space-y-1 block">
              <h5 className="text-xs font-black text-slate-900">{item.name}</h5>
              <p className="text-[10px] text-slate-500 font-semibold">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}
