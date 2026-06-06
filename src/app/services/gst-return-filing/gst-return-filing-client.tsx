"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Sparkles,
  Phone,
  ArrowRight,
  MessageCircle,
  AlertTriangle,
  Check,
  X,
  TrendingUp,
  ChevronDown,
  Gift,
  Clock,
  CheckSquare,
  Search,
  Award,
  Lock,
  Copy,
  Calculator,
  Calendar,
  Shield,
  FileText,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";

type FAQ = {
  question: string;
  answer: string;
};

// Animated counter utility
function AnimatedCounter({ value, suffix = "", duration = 1200 }: { value: number; suffix?: string; duration?: number }) {
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

export function GstReturnFilingClient({
  isLoggedIn: initialIsLoggedIn,
  faqs: initialFaqs
}: {
  isLoggedIn: boolean;
  faqs: FAQ[];
}) {
  const { success, error: toastError } = useToast();
  
  // SWR Hook for profile details
  const { data: profileData } = useSWR("/api/customer/profile", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const isLoggedIn = profileData ? profileData.isLoggedIn : initialIsLoggedIn;
  const walletBalance = profileData?.wallet?.balance ?? 0;
  const referralCode = profileData?.wallet?.referralCode ?? "";
  const referralLink = profileData?.wallet?.referralLink ?? "";

  // Active Return Filing App lookup
  const activeGstApp = profileData?.activeApplications?.find(
    (app: { serviceSlug?: string; serviceName?: string }) => app.serviceSlug === "gst-return-filing" || app.serviceName?.toLowerCase().includes("gst return")
  );

  // States
  const [activeFilingTab, setActiveFilingTab] = useState<"gstr1" | "gstr3b" | "nil" | "gstr9">("gstr1");
  const [frequencyTab, setFrequencyTab] = useState<"monthly" | "quarterly">("monthly");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [faqSearch, setFaqSearch] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<string>("20000");
  const [gstType, setGstType] = useState<"exclusive" | "inclusive">("exclusive");

  // Lead Fallback State
  const [leadName, setLeadName] = useState("");
  const [leadMobile, setLeadMobile] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Exit Intent State
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitIntentSubmitted, setExitIntentSubmitted] = useState(false);
  const [exitName, setExitName] = useState("");
  const [exitMobile, setExitMobile] = useState("");

  // Sticky CTAs Scroll Detector
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrolledPastHero(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Exit Intent hook
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 10) {
        const dismissed = sessionStorage.getItem("exit_intent_filing_dismissed");
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
    sessionStorage.setItem("exit_intent_filing_dismissed", "true");
  };

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      success("Referral link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // WhatsApp Url
  const whatsappNumber = "917007595931";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    "Hi DigiConnect, I am looking for online GST Return Filing assistance. Please guide me."
  )}`;

  const handleLeadSubmit = async (e: FormEvent, isExit = false) => {
    e.preventDefault();
    const name = isExit ? exitName : leadName;
    const mobile = isExit ? exitMobile : leadMobile;
    const msg = isExit ? "Captured from Exit Intent Return Filing Form" : leadMessage;

    if (!name || !mobile) {
      toastError("Please fill in both Name and Mobile Number.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toastError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmittingLead(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("mobile", mobile);
      formData.append("service", "GST Return Filing");
      formData.append("message", msg);

      const response = await fetch("/api/lead", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok && (result.ok || result.success)) {
        success(result.message || "Thank you! Our expert will contact you shortly.");
        if (isExit) {
          setExitIntentSubmitted(true);
          setTimeout(() => {
            setShowExitIntent(false);
            sessionStorage.setItem("exit_intent_filing_dismissed", "true");
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

  // Calculator logic
  const amountNum = parseFloat(calcAmount) || 0;
  const computeGst = (rate: number) => {
    if (gstType === "exclusive") {
      const gstAmount = amountNum * (rate / 100);
      return {
        base: amountNum,
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        total: amountNum + gstAmount
      };
    } else {
      const baseAmount = amountNum / (1 + rate / 100);
      const gstAmount = amountNum - baseAmount;
      return {
        base: baseAmount,
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        total: amountNum
      };
    }
  };

  const gst5 = computeGst(5);
  const gst12 = computeGst(12);
  const gst18 = computeGst(18);
  const gst28 = computeGst(28);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(val);
  };

  // 5 Return Filing Plan Tiers (Horizontal layout data)
  const filingPlans = [
    {
      planId: "monthly_starter",
      category: "monthly",
      name: "Starter Monthly Return",
      price: "₹299",
      billing: "/month",
      regularPrice: "₹499",
      description: "Perfect for freelancers and micro-entities with low transaction counts.",
      features: ["GSTR-1 Sales Report Draft", "GSTR-3B Tax Summary Submission", "Express Nil Return Filing", "Due date email reminders"],
      badge: "Starter",
      color: "from-blue-500/10 to-indigo-500/5 border-blue-200"
    },
    {
      planId: "monthly_business",
      category: "monthly",
      name: "Business Monthly Return",
      price: "₹499",
      billing: "/month",
      regularPrice: "₹999",
      description: "Best for active retailers and merchants requiring GSTR-2B ITC matching.",
      features: ["Everything in Starter Pack", "GSTR-2B Input Credit Reconciliation", "Late Return compliance support", "WhatsApp priority group support"],
      badge: "Popular",
      color: "from-indigo-500/15 via-blue-500/5 to-purple-500/5 border-indigo-200 shadow-md ring-2 ring-indigo-500/10"
    },
    {
      planId: "monthly_premium",
      category: "monthly",
      name: "Premium Monthly Return",
      price: "₹999",
      billing: "/month",
      regularPrice: "₹1,999",
      description: "For corporate structures wanting full verification of invoices and ITC reconciliation.",
      features: ["Everything in Business Pack", "Dedicated Account Executive", "Monthly tax liability review call", "Comprehensive Audit preparation file"],
      badge: "Premium",
      color: "from-orange-500/10 to-amber-500/5 border-orange-200"
    },
    {
      planId: "quarterly_qrmp",
      category: "quarterly",
      name: "Quarterly QRMP Scheme",
      price: "₹1,499",
      billing: "/quarter",
      regularPrice: "₹2,999",
      description: "For small taxpayers registered under the portal QRMP scheme (file once in 3 months).",
      features: ["Quarterly GSTR-1 & 3B compliance", "Monthly portal challan calculation", "Supplier tax credit matching", "Email & Call Support desk"],
      badge: "QRMP",
      color: "from-emerald-500/10 to-teal-500/5 border-emerald-200"
    },
    {
      planId: "annual",
      category: "annual",
      name: "Annual Compliance Pack",
      price: "₹4,999",
      billing: "/year",
      regularPrice: "₹9,999",
      description: "All-inclusive yearly return and audit reconciliation compliance.",
      features: ["All 12 monthly GSTR filings", "Annual GSTR-9 Return draft & upload", "Reconciliation audits of invoices", "Direct Chartered Accountant support"],
      badge: "Yearly Saver",
      color: "from-purple-500/10 to-pink-500/5 border-purple-200"
    }
  ];

  // 15 GSTR FAQs
  const returnFaqList = [
    { q: "What is GSTR-1?", a: "GSTR-1 is a return that registers details of all outward supplies of goods and services. Every registered business must submit sales details so that buyers can claim Input Tax Credit." },
    { q: "What is GSTR-3B?", a: "GSTR-3B is a self-declared monthly summary return. Taxpayers declare outward sales, eligible Input Tax Credit (ITC), and net tax payable to pay challans on the portal." },
    { q: "What is the QRMP scheme?", a: "QRMP stands for 'Quarterly Return Monthly Payment'. It allows small taxpayers (aggregate turnover up to ₹5 Crore) to file GSTR-1 and GSTR-3B once every quarter while paying tax liabilities monthly." },
    { q: "What is a Nil Return under GST?", a: "If your business has had zero sales, zero purchases, and no ITC to claim for the month/quarter, you must still file a Nil Return to keep your account active and avoid daily late fees." },
    { q: "What is GSTR-2B?", a: "GSTR-2B is an auto-drafted, static input credit statement generated monthly for every recipient based on details uploaded by their suppliers in GSTR-1." },
    { q: "What is GSTR-9?", a: "GSTR-9 is an annual return filed once a year, compiling monthly/quarterly values of sales, purchases, taxes paid, and input credits claimed." },
    { q: "What is the late fee for delayed return filing?", a: "A late fee of ₹20 per day for Nil returns and ₹50 per day for active returns is automatically charged on the portal. The maximum cap is ₹5,000 per return." },
    { q: "How does ITC reconciliation work?", a: "It is the process of matching the purchase invoices in your account ledgers with the invoices uploaded by your suppliers (reflected in GSTR-2B) to ensure you do not claim incorrect input credit." },
    { q: "What happens if I don't file returns for two consecutive periods?", a: "The government portal will block your capability to generate E-Way bills for transporting goods, and your GSTIN status may be suspended." },
    { q: "Can a suspended GSTIN be restored?", a: "Yes, you must file all pending returns, pay the accumulated late fees and interest, and apply for revocation of suspension to the jurisdictional officer." },
    { q: "What is a GSTR-9C audit?", a: "GSTR-9C is a reconciliation statement between audited annual financial statements and the filed GSTR-9 return, mandatory for businesses with turnover crossing ₹5 Crore." },
    { q: "What is reverse charge mechanism (RCM)?", a: "Under RCM, the liability to pay GST falls on the buyer of goods or services instead of the supplier (e.g. hiring GTA transport or advocate services)." },
    { q: "Is interest applicable on late tax payments?", a: "Yes, an interest of 18% per annum is applicable on net tax liabilities paid after the due date." },
    { q: "Can I revise a filed GST return?", a: "No, a filed GSTR-1 or GSTR-3B cannot be revised. However, any corrections or omissions can be adjusted in the return of the subsequent tax period." },
    { q: "What is the due date for GSTR-1 and GSTR-3B?", a: "Typically, GSTR-1 is due by the 11th of the following month, and GSTR-3B is due by the 20th of the following month for monthly filers." }
  ];

  const filteredFaqs = returnFaqList.filter(faq =>
    faq.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
    faq.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#fbfcff] text-[#0b1f3a] relative overflow-hidden">
      
      {/* JSON-LD Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": returnFaqList.map(item => ({
              "@type": "Question",
              "name": item.q,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": item.a
              }
            }))
          })
        }}
      />

      {/* Dynamic Background decorations */}
      <div className="absolute top-0 left-0 right-0 h-[650px] bg-[radial-gradient(circle_at_15%_15%,rgba(37,99,235,0.08),transparent_50%),radial-gradient(circle_at_85%_35%,rgba(99,102,241,0.06),transparent_50%)] pointer-events-none" />

      {/* SECTION 1 - HERO */}
      <section className="relative pt-16 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid gap-16 lg:grid-cols-[1.15fr_0.85fr] items-center">
          
          {/* Hero Left */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-4 py-1.5 text-xs font-bold text-blue-700 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
              <span>DigiConnect Compliance Portal</span>
            </div>

            <h1 className="text-4xl md:text-5.5xl font-black tracking-tight text-[#071326] leading-tight">
              On-Time, CA-Assisted <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 bg-clip-text text-transparent">GST Return Filing</span>
            </h1>

            <p className="text-base md:text-lg font-medium text-slate-500 leading-relaxed max-w-xl">
              Eliminate GSTR errors, reconcile Input Tax Credit, and avoid portal penalties. Streamlined submissions backed by direct WhatsApp notifications and wallet cashback.
            </p>

            {/* Redesigned Premium CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href={isLoggedIn ? "/apply/gst-return-filing" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-return-filing")}`}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] hover:shadow-blue-500/30 active:scale-[0.98]"
              >
                Apply for GST Return Filing
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-7 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageCircle className="h-4.5 w-4.5 text-emerald-600" />
                Talk to GST Expert
              </a>
            </div>

            {/* Redesigned Trust Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100/80">
              {[
                { label: "Zero Penalty Record", desc: "Always filed on time" },
                { label: "ITC Reconciliation", desc: "Max input credit claimed" },
                { label: "Dedicated CAs", desc: "Expert verification checks" },
                { label: "20% Cashback", desc: "Wallet credit on filing" }
              ].map((badge, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-black text-slate-800 leading-none">{badge.label}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 pl-5">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Right: Live Dashboard mockup */}
          <div className="relative flex justify-center">
            <div className="relative w-full max-w-[420px] aspect-[1/1.05] rounded-[42px] border border-white/60 bg-white/35 p-6 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col justify-between">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-100%] animate-[shine_8s_infinite] pointer-events-none" />

              <div className="absolute top-8 left-[-15px] p-3 rounded-2xl border border-white/60 bg-white/85 shadow-xl backdrop-blur-sm flex items-center gap-2.5 animate-float-icon-1 max-w-[175px] z-10">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md text-xs font-black">
                  GSTR
                </span>
                <div>
                  <p className="text-[10px] font-black text-slate-800 leading-none">Monthly Filing</p>
                  <p className="text-[8px] font-bold text-emerald-600 mt-0.5">Q1 Submissions Done</p>
                </div>
              </div>

              {/* Live dashboard stats */}
              <div className="w-full bg-white/90 border border-slate-100 rounded-3xl p-5 shadow-inner mt-4 flex-1 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">GSTR-3B Summary</span>
                    <h3 className="text-sm font-black text-slate-900 leading-none">Tax Period: May 2026</h3>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Reconciled</span>
                </div>

                <div className="my-4 space-y-3 text-[10px] font-semibold text-slate-650">
                  <div className="flex justify-between">
                    <span>Total Outward Sales</span>
                    <span className="font-black text-slate-900">₹4,25,800.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Input Credit claimed (ITC)</span>
                    <span className="font-black text-emerald-600">₹42,850.00</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900">
                    <span>Net GST Paid (Challan)</span>
                    <span>₹33,794.00</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 border-t border-slate-100 pt-3">
                  <span>ARN: AD090526002341P</span>
                  <span className="text-blue-600">Filed via EVC</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-150/50 mt-4 text-[10px] font-bold text-slate-400">
                <span>Avoid Late Fee blocks</span>
                <span>Active Advisor Synced</span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* SECTION 2 - PRICING CAROUSEL (GST RETURN FILING PLANS) */}
      <section className="py-20 bg-gradient-to-b from-[#fbfcff] to-[#f4f7fc] px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100 shadow-sm">
              GST Return Filing Plans
            </span>
            <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] mt-3 tracking-tight">
              Premium GSTR Compliance Packages
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-2.5">
              Choose from our flexible compliance packs. Billed Monthly, Quarterly or Annually.
            </p>
          </div>

          {/* Horizontal pricing cards */}
          <div className="space-y-4 max-w-4xl mx-auto">
            {filingPlans.map((plan) => (
              <div 
                key={plan.planId}
                className={`glass-panel rounded-3xl border bg-white/70 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${plan.color}`}
              >
                {/* Left block: Title & description */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-black text-slate-900 leading-none">{plan.name}</h3>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-white border border-slate-100 rounded-full text-slate-500">
                      {plan.badge}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 leading-normal max-w-lg">{plan.description}</p>
                  
                  {/* Features list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px] font-bold text-slate-600">
                    {plan.features.map((feature, i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>{feature}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right block: Pricing & checkout trigger */}
                <div className="shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 border-slate-100/50 pt-4 md:pt-0 gap-4">
                  <div className="text-left md:text-right">
                    <div className="flex items-baseline gap-1.5 justify-start md:justify-end">
                      <span className="text-slate-400 text-xs font-semibold line-through">{plan.regularPrice}</span>
                      <span className="text-2xl font-black text-slate-950">{plan.price}</span>
                      <span className="text-xs font-semibold text-slate-400">{plan.billing}</span>
                    </div>
                    <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                      20% Cashback
                    </span>
                  </div>
                  
                  <Link
                    href={isLoggedIn ? `/apply/gst-return-filing?plan=${plan.planId}` : `/login/customer?redirect=${encodeURIComponent(`/apply/gst-return-filing?plan=${plan.planId}`)}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white px-5 shadow transition active:scale-95"
                  >
                    Select Plan
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SECTION 3 - RETURN FILING HANDLING CATEGORIES */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100/80">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
            Returns Handling
          </span>
          <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] mt-3 tracking-tight">
            Comprehensive Tax Return Filings
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2.5">
            Switch tabs to see specific compliance deadlines and guidelines.
          </p>
        </div>

        {/* Tabs switcher */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 bg-slate-50/70 p-1.5 rounded-full max-w-2xl mx-auto border border-slate-100">
          {([
            { id: "gstr1", label: "GSTR-1 (Sales)" },
            { id: "gstr3b", label: "GSTR-3B (Tax Summary)" },
            { id: "nil", label: "Nil Returns" },
            { id: "gstr9", label: "GSTR-9 (Annual)" }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilingTab(tab.id)}
              className={`px-5 py-2 text-xs font-black rounded-full transition-all duration-150 ${
                activeFilingTab === tab.id
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm max-w-3xl mx-auto">
          {activeFilingTab === "gstr1" && (
            <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
              <h3 className="text-base font-black text-slate-900">GSTR-1 Outward Supplies Return</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                GSTR-1 contains details of all outward supplies of goods and services. Every registered business must upload invoice details of sales made during the tax period so that clients can view and claim input credit (ITC).
              </p>
              <div className="grid gap-3 sm:grid-cols-2 pt-2 text-xs font-semibold text-slate-700">
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-blue-600" /> B2B Invoice Uploads</div>
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-blue-600" /> B2C Sales Consolidation</div>
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-blue-600" /> HSN Summary Code Validation</div>
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-blue-600" /> Credit/Debit Notes Adjustments</div>
              </div>
            </div>
          )}

          {activeFilingTab === "gstr3b" && (
            <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
              <h3 className="text-base font-black text-slate-900">GSTR-3B Self-Declared Summary Return</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                GSTR-3B is a monthly summary return. Taxpayers declare consolidated outward sales, inward purchases eligible for Input Tax Credit (ITC), and clear net tax liability. Delayed GSTR-3B filings attract interest and daily late fees.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 pt-2 text-xs font-semibold text-slate-700">
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-indigo-600" /> Tax Payment Challan Generation</div>
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-indigo-600" /> ITC Offsetting Math</div>
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-indigo-600" /> GSTR-2B Input Credit Reconciliation</div>
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-indigo-600" /> Interest computation validation</div>
              </div>
            </div>
          )}

          {activeFilingTab === "nil" && (
            <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
              <h3 className="text-base font-black text-slate-900">Express Nil GST Return Filing</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                If your business has had zero sales, zero purchases, and no ITC to claim for the month/quarter, you must still file a Nil Return to keep your GSTIN active and avoid cumulative daily late fees.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 pt-2 text-xs font-semibold text-slate-700">
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-orange-500" /> 5-Minute Express Filing</div>
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-orange-500" /> Zero Ledger Verification</div>
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-orange-500" /> Simple OTP Signature</div>
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-orange-500" /> Avoid accumulative GSTR blockages</div>
              </div>
            </div>
          )}

          {activeFilingTab === "gstr9" && (
            <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
              <h3 className="text-base font-black text-slate-900">GSTR-9 Annual Return Compliance</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                GSTR-9 is an annual return filed once a year, compiling monthly/quarterly values of sales, purchases, taxes paid, and input credits claimed. Highly critical to resolve tax credit mismatch discrepancies.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 pt-2 text-xs font-semibold text-slate-700">
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-emerald-600" /> Yearly Reconciliation Checks</div>
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-emerald-600" /> Outward vs Inward credit validation</div>
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-emerald-600" /> Audit file preparation support</div>
                <div className="flex gap-2.5 items-center"><CheckSquare className="h-4 w-4 text-emerald-600" /> Mismatch alert resolutions</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* MONTHLY VS QUARTERLY SCHEME */}
      <section className="py-20 bg-blue-50/20 px-4 md:px-8 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
                Filing frequency
              </span>
              <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] mt-3 tracking-tight">
                Monthly vs Quarterly QRMP Filings
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-2.5">
                Choose GSTR return filing intervals matching your client requirements and annual turnover volume.
              </p>
              
              <div className="mt-6 flex gap-2">
                <button 
                  onClick={() => setFrequencyTab("monthly")}
                  className={`px-5 py-2.5 text-xs font-black rounded-xl border transition ${
                    frequencyTab === "monthly"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  Monthly Returns
                </button>
                <button 
                  onClick={() => setFrequencyTab("quarterly")}
                  className={`px-5 py-2.5 text-xs font-black rounded-xl border transition ${
                    frequencyTab === "quarterly"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  Quarterly QRMP Returns
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              {frequencyTab === "monthly" ? (
                <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900">Standard Monthly Compliance</h3>
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[8px] font-black uppercase text-blue-700 border border-blue-100">Recommended</span>
                  </div>
                  <p className="text-xs font-medium text-slate-400">For businesses with turnover above ₹5 Crore, or those dealing with active corporate buyers who need real-time monthly ITC credit reflection.</p>
                  <ul className="space-y-2 text-xs font-semibold text-slate-700">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-600 shrink-0" /> GSTR-1 by 11th of every month</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-600 shrink-0" /> GSTR-3B by 20th of every month</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-600 shrink-0" /> Best for steady B2B trade lines</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900">Quarterly QRMP Scheme</h3>
                    <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase text-indigo-700 border border-indigo-100">Small Businesses</span>
                  </div>
                  <p className="text-xs font-medium text-slate-400">For taxpayers with aggregate turnover up to ₹5 Crore. File returns once every 3 months, pay tax liabilities monthly through simple portal challans.</p>
                  <ul className="space-y-2 text-xs font-semibold text-slate-700">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0" /> GSTR-1 by 13th of quarter end</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0" /> GSTR-3B by 22nd / 24th of quarter end</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0" /> Reduced compliance costs & filings</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* LATE FEES AND PENALTIES */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <span className="inline-flex rounded-full bg-red-50 px-3.5 py-1 text-xs font-bold text-red-700 border border-red-100 shadow-sm">
              Penalties Schedule
            </span>
            <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] mt-3 tracking-tight">
              Late Fees & Penalty Avoidance
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-2.5">
              Delaying return submissions triggers automatic portal charges. Keep track of rules to secure your business credentials.
            </p>
            
            <div className="mt-6 space-y-3">
              <div className="flex gap-3 p-3.5 bg-red-50/20 border border-red-100/30 rounded-2xl">
                <AlertTriangle className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-slate-800">E-Way Bill Blocking</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Non-filing of returns for two consecutive tax periods leads to automatic blockage of e-way bill generation.</p>
                </div>
              </div>
              <div className="flex gap-3 p-3.5 bg-red-50/20 border border-red-100/30 rounded-2xl">
                <AlertTriangle className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-slate-800">GSTIN Suspension</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Delay of GSTR filing for 6 continuous periods gives the tax officer power to suspend and cancel registration.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Late fees table */}
          <div className="border border-slate-100 bg-white rounded-3xl overflow-hidden shadow-sm text-xs font-semibold text-slate-700">
            <div className="bg-slate-50 p-4 border-b border-slate-100 font-bold text-[10px] uppercase text-slate-500">
              Late Fee Calculation Structure
            </div>
            <div className="p-4 space-y-3.5">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span>Nil Return Filings</span>
                <span className="font-black text-slate-900">₹20 / day of delay</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span>Active Transactions (Sales/Purchases)</span>
                <span className="font-black text-slate-900">₹50 / day of delay</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span>Composition Taxpayer</span>
                <span className="font-black text-slate-900">₹50 / day of delay</span>
              </div>
              <div className="flex justify-between font-black text-red-650 pt-2 border-t border-dashed border-slate-200">
                <span>Max Late Fee Cap (Regular Taxpayer)</span>
                <span>₹5,000 / return limit</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REWARD CENTER SNEAK-PEEK */}
      <section className="py-20 bg-gradient-to-b from-[#f4f7fc] to-[#fbfcff] px-4 md:px-8 border-t border-slate-100/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="space-y-4 max-w-xl">
            <span className="inline-flex rounded-full bg-orange-50 px-3.5 py-1 text-xs font-bold text-orange-700 border border-orange-100 shadow-sm">
              Reward Center
            </span>
            <h2 className="text-3xl font-black text-[#071326] tracking-tight">
              Get 20% Cashback on Filing
            </h2>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Every completed filing triggers instant wallet points. Enjoy Referral Bonuses of ₹100, dynamic discounts on renewals, and zero portal blocks.
            </p>
            {isLoggedIn && referralCode && (
              <div className="p-4 rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/30 flex justify-between items-center gap-4 max-w-md">
                <div className="min-w-0">
                  <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Your Referral Link</p>
                  <p className="text-xs font-black text-slate-800 truncate">{referralCode}</p>
                </div>
                <button
                  onClick={copyReferralLink}
                  className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-[10px] font-black text-indigo-700 rounded-full hover:bg-indigo-50 active:scale-95 transition"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedLink ? "Copied" : "Copy Link"}
                </button>
              </div>
            )}
          </div>

          <div className="w-36 h-36 relative flex items-center justify-center bg-blue-50 rounded-full border border-blue-100 shadow-inner shrink-0">
            <svg viewBox="0 0 100 100" className="w-24 h-24 animate-pulse">
              <path d="M20 30 h55 a 5 5 0 0 1 5 5 v35 a 5 5 0 0 1 -5 5 h-55 a 5 5 0 0 1 -5 -5 v-35 a 5 5 0 0 1 5 -5 z" fill="#3b82f6" fillOpacity="0.2" stroke="#2563eb" strokeWidth="2.5" />
              <circle cx="50" cy="50" r="10" fill="#f59e0b" />
            </svg>
          </div>
        </div>
      </section>

      {/* TRUST SECTION COUNTERS */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
              Trust Signals
            </span>
            <h2 className="text-3xl font-black text-[#071326] tracking-tight">
              India&apos;s Preferred Compliance Desk
            </h2>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">
              We compile returns securely, running invoice matching checks through advanced CA checks to ensure no warning notices are triggered by the tax office.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[
              { value: 10000, suffix: "+", label: "Active Filings" },
              { value: 99.9, suffix: "%", label: "Accuracy Score" },
              { value: 0, suffix: "", label: "Penalty Notices" }
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-4 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col justify-center">
                <p className="text-2xl md:text-3.5xl font-black text-blue-600 leading-none">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mt-1.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 - GSTR FAQ ACCORDION WITH LIVE SEARCH */}
      <section className="py-20 px-4 md:px-8 max-w-4xl mx-auto border-t border-slate-100">
        <div className="text-center mb-12 space-y-3">
          <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
            Filing FAQ
          </span>
          <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] tracking-tight">
            GSTR Filing FAQ
          </h2>
          
          <div className="relative max-w-md mx-auto pt-3">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search return filing questions..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-200 bg-white/90 text-xs font-semibold outline-none focus:border-blue-500 shadow-inner transition"
            />
          </div>
        </div>

        <div className="space-y-3.5">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="border border-slate-150/60 bg-white rounded-3xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 flex justify-between items-center text-left text-xs font-black text-slate-850 hover:bg-slate-50/50 transition duration-150"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`h-4.5 w-4.5 text-slate-400 transition-transform ${isOpen ? "transform rotate-180 text-blue-600" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 border-t border-slate-50 text-xs leading-relaxed text-slate-500 font-semibold">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center text-xs font-semibold text-slate-400 py-8">No matching return questions found.</p>
          )}
        </div>
      </section>

      {/* LEAD CAPTURE FALLBACK FORM */}
      <section className="py-20 px-4 md:px-8 max-w-3xl mx-auto border-t border-slate-100">
        <div className="bg-white border border-slate-150/60 rounded-[36px] p-6 md:p-10 shadow-sm text-center space-y-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">Request GSTR Compliance Call</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Still confused about GST input credits or due dates? Leave your contact details and our team will get in touch.
            </p>
          </div>
          <form onSubmit={(e) => handleLeadSubmit(e, false)} className="space-y-4 max-w-md mx-auto pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Full Name"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 transition"
              />
              <input
                type="tel"
                value={leadMobile}
                onChange={(e) => setLeadMobile(e.target.value)}
                placeholder="Mobile Number"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 transition"
              />
            </div>
            <textarea
              value={leadMessage}
              onChange={(e) => setLeadMessage(e.target.value)}
              placeholder="Your Business Turnover / Specific filing query (Optional)"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 min-h-24 transition"
            />
            <button
              type="submit"
              disabled={isSubmittingLead}
              className="w-full inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-black text-white shadow-md hover:scale-[1.01] transition duration-150 active:scale-[0.99]"
            >
              {isSubmittingLead ? "Submitting Inquiry..." : "Submit Consultation Request"}
            </button>
          </form>
        </div>
      </section>

      {/* STICKY FOOTER CTA */}
      {scrolledPastHero && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 border-t border-slate-100 shadow-lg p-4 z-40 backdrop-blur-md flex justify-between items-center max-w-7xl mx-auto rounded-t-3xl animate-[slideUp_0.3s_ease-out]">
          <div className="hidden md:block">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">GSTR Filing Pack</p>
            <h4 className="text-sm font-black text-slate-800">Assisted Return Filing</h4>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Link
              href={isLoggedIn ? "/apply/gst-return-filing" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-return-filing")}`}
              className="flex-1 md:flex-none inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-6 text-xs font-bold text-white shadow"
            >
              Apply for GST Return Filing
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
            >
              <MessageCircle className="h-5 w-5 text-emerald-600" />
            </a>
          </div>
        </div>
      )}

      {/* EXIT INTENT DIALOG */}
      {showExitIntent && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-[36px] max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-[scaleUp_0.3s_ease-out]">
            
            <button
              onClick={handleDismissExitIntent}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 mx-auto">
                <Gift className="h-6 w-6" />
              </span>
              
              <h3 className="text-base font-black text-slate-900">Wait! Protect your business from Late Fees</h3>
              <p className="text-xs font-semibold text-slate-500">
                GST portal charges ₹50 per day for late returns. Request a free compliance call today, or chat directly on WhatsApp.
              </p>

              {exitIntentSubmitted ? (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl">
                  ✓ Consultation request submitted successfully!
                </div>
              ) : (
                <form onSubmit={(e) => handleLeadSubmit(e, true)} className="space-y-3 pt-2 text-left">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Name</label>
                    <input 
                      type="text" 
                      value={exitName}
                      onChange={(e) => setExitName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      required
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Mobile Number</label>
                    <input 
                      type="tel" 
                      value={exitMobile}
                      onChange={(e) => setExitMobile(e.target.value)}
                      placeholder="e.g. 9876543210"
                      required
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmittingLead}
                    className="w-full inline-flex h-10 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow hover:bg-blue-700 transition"
                  >
                    {isSubmittingLead ? "Requesting Call..." : "Call Me Back"}
                  </button>
                  <a 
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleDismissExitIntent}
                    className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <MessageCircle className="h-4.5 w-4.5 text-emerald-600" />
                    Chat on WhatsApp
                  </a>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
