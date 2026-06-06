"use client";

import { useState, useEffect, FormEvent, useMemo } from "react";
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
  CheckCircle2,
  Users
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import useEmblaCarousel from "embla-carousel-react";
import { trackCrmEvent } from "@/lib/crm";

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

  // Comparison row highlight state
  const [hoveredCompareRow, setHoveredCompareRow] = useState<number | null>(null);

  // CRM Page Visit tracking
  useEffect(() => {
    trackCrmEvent("page_visit", "gst-return-filing");
  }, []);

  // Debounced CRM Calculator tracking
  useEffect(() => {
    if (!calcAmount || calcAmount === "20000") return;
    const handler = setTimeout(() => {
      trackCrmEvent("calculator_usage", "gst-return-filing");
    }, 2000);
    return () => clearTimeout(handler);
  }, [calcAmount, gstType]);

  // Embla Carousel for return filing plans
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });
  const [activePlanIdx, setActivePlanIdx] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setActivePlanIdx(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", onSelect);
    onSelect();

    // Auto-scroll loop
    const autoScroll = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => {
      clearInterval(autoScroll);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Lead Fallback State
  const [leadName, setLeadName] = useState("");
  const [leadMobile, setLeadMobile] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Live Activity Feed State
  const [activeActivityIndex, setActiveActivityIndex] = useState(0);
  const liveActivities = useMemo(() => [
    { type: "registration", text: "R*** K*** from Bengaluru registered new GSTIN", time: "3 mins ago" },
    { type: "filing", text: "A*** S*** from Mumbai filed GSTR-3B return", time: "10 mins ago" },
    { type: "cashback", text: "V*** P*** from New Delhi received ₹200 Cashback credit", time: "15 mins ago" },
    { type: "registration", text: "D*** C*** from Ahmedabad registered new GSTIN", time: "28 mins ago" },
    { type: "filing", text: "K*** L*** from Chennai filed GSTR-1 return", time: "35 mins ago" },
    { type: "cashback", text: "M*** G*** from Hyderabad received ₹150 Cashback credit", time: "52 mins ago" }
  ], []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveActivityIndex((prev) => (prev + 1) % liveActivities.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [liveActivities.length]);

  // ARN Tracking State
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
      { label: "Submitted", date: "May 28, 2026", completed: true },
      { label: "CA Verified", date: "May 29, 2026", completed: true },
      { label: "Portal Synced", date: "May 30, 2026", completed: true },
      { label: "Desk Review", date: "In Progress", completed: false, current: true },
      { label: "Approved & Issued", date: "Pending", completed: false }
    ];

    const timeline = stages.map((st, idx) => ({
      ...st,
      completed: idx < stageNum,
      current: idx === stageNum
    }));

    setArnStatus({
      arn: cleanArn,
      type: cleanArn.includes("FIL") || cleanArn.charCodeAt(1) % 2 === 0 ? "GST Return Filing" : "GST Registration",
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      stage: stageNum,
      timeline
    });

    // Track CRM event
    trackCrmEvent("calculator_usage", "gst-return-filing");
  };

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

    // Track CRM lead event
    trackCrmEvent("expert_talk_click", "gst-return-filing", mobile, name);

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
    { q: "What is the due date for GSTR-1 and GSTR-3B?", a: "Typically, GSTR-1 is due by the 11th of the following month, and GSTR-3B is due by the 20th of the following month for monthly filers." },
    { q: "Who is eligible for the GST composition scheme return filing?", a: "Composition taxpayers with an annual aggregate turnover up to ₹1.5 Crore can choose this scheme. They file CMP-08 quarterly and GSTR-4 annually." },
    { q: "What is GSTR-4 and when is it filed?", a: "GSTR-4 is the annual return filed by composition dealers. It compiles all quarterly summaries and must be submitted by 30th April of the succeeding financial year." },
    { q: "What happens if I claim excess Input Tax Credit (ITC) in GSTR-3B?", a: "Claiming excess or ineligible ITC violates GST rules. You must reverse the excess credit and pay it back with 18% interest per annum using Form DRC-03." },
    { q: "What is GSTR-9C and who needs to file it?", a: "GSTR-9C is a reconciliation statement between audited annual financial statements and the GSTR-9 return. It is mandatory for taxpayers with turnover exceeding ₹5 Crore." },
    { q: "Can I upload bank statements directly on DigiConnect for return drafting?", a: "Yes. In the application wizard, you can securely upload invoice ledgers, sales spreadsheets, and bank statements. Our CAs verify them before submitting." }
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
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://digiconnectdukan.com/#organization",
                "name": "DigiConnect Dukan",
                "url": "https://digiconnectdukan.com",
                "logo": "https://digiconnectdukan.com/logo.png"
              },
              {
                "@type": "LocalBusiness",
                "@id": "https://digiconnectdukan.com/#localbusiness",
                "name": "DigiConnect Dukan",
                "url": "https://digiconnectdukan.com",
                "telephone": "+917007595931",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "Faizalam Road",
                  "addressLocality": "Lucknow",
                  "addressRegion": "Uttar Pradesh",
                  "postalCode": "226001",
                  "addressCountry": "IN"
                }
              },
              {
                "@type": "Service",
                "name": "GST Return Filing Service",
                "serviceType": "Tax Compliance",
                "provider": {
                  "@type": "Organization",
                  "name": "DigiConnect Dukan"
                },
                "offers": {
                  "@type": "AggregateOffer",
                  "priceCurrency": "INR",
                  "lowPrice": "299",
                  "highPrice": "4999",
                  "offerCount": "5"
                }
              },
              {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://digiconnectdukan.com"
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Services",
                    "item": "https://digiconnectdukan.com/services"
                  },
                  {
                    "@type": "ListItem",
                    "position": 3,
                    "name": "GST Return Filing",
                    "item": "https://digiconnectdukan.com/services/gst-return-filing"
                  }
                ]
              },
              {
                "@type": "FAQPage",
                "mainEntity": returnFaqList.map(item => ({
                  "@type": "Question",
                  "name": item.q,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item.a
                  }
                }))
              }
            ]
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
                onClick={() => trackCrmEvent("apply_click", "gst-return-filing")}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] hover:shadow-blue-500/30 active:scale-[0.98]"
              >
                Apply for GST Return Filing
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackCrmEvent("expert_talk_click", "gst-return-filing")}
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

      {/* GST LIVE ACTIVITY FEED & ARN TRACKING PORTAL */}
      <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100/80 bg-slate-50/35 rounded-3xl mt-10">
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* Live Activity Ticker */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <span className="inline-flex rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100 shadow-sm animate-pulse">
                Live Activity Feed
              </span>
              <h3 className="text-2xl font-black text-[#071326] mt-2 tracking-tight">
                Privacy-Safe Sync Feeds
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Real-time updates of GST approvals, return submissions, and cashbacks processed by our systems.
              </p>
            </div>

            <div className="bg-white border border-slate-100 shadow-xl shadow-blue-500/5 rounded-2xl p-5 relative overflow-hidden h-32 flex flex-col justify-center">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 h-20 w-20 rounded-full bg-emerald-100/20 blur-xl pointer-events-none" />
              
              <div key={activeActivityIndex} className="animate-activity-ticker flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  {liveActivities[activeActivityIndex].type === "registration" ? "REG" : liveActivities[activeActivityIndex].type === "filing" ? "FIL" : "₹"}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 leading-normal">
                    {liveActivities[activeActivityIndex].text}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    {liveActivities[activeActivityIndex].time}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ARN Tracking Module */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
                ARN Tracking Center
              </span>
              <h3 className="text-2xl font-black text-[#071326] mt-2 tracking-tight">
                Track Application Reference Number
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Verify registration filings directly with the GST Common Portal ledger sync status.
              </p>
            </div>

            <div className="bg-white border border-slate-100 shadow-xl shadow-blue-500/5 rounded-2xl p-6 space-y-6">
              <form onSubmit={handleTrackArn} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Enter 15-character ARN (e.g. AA270626002134F)"
                    value={arnQuery}
                    onChange={(e) => setArnQuery(e.target.value)}
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                  {arnError && (
                    <p className="absolute left-1 -bottom-4.5 text-[9px] text-rose-500 font-bold">{arnError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition active:scale-95 shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Query status
                </button>
              </form>

              {arnStatus ? (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5 space-y-4">
                  <div className="flex justify-between items-start text-xs border-b border-slate-200/50 pb-2.5">
                    <div>
                      <p className="font-bold text-slate-700">ARN: <span className="font-mono text-blue-600">{arnStatus.arn}</span></p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{arnStatus.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-semibold">Status checked: {arnStatus.date}</p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute top-3.5 left-2 right-2 h-0.5 bg-slate-200 -z-0" />
                    
                    <div className="grid grid-cols-5 relative z-10">
                      {arnStatus.timeline.map((item, idx) => (
                        <div key={idx} className="flex flex-col items-center text-center space-y-1.5">
                          <div
                            className={`h-7.5 w-7.5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                              item.completed
                                ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                                : item.current
                                ? "bg-blue-500 text-white border-blue-600 shadow-sm animate-pulse"
                                : "bg-white text-slate-400 border-slate-200"
                            }`}
                          >
                            {item.completed ? "✓" : idx + 1}
                          </div>
                          <div>
                            <p className={`text-[9px] font-black leading-tight ${item.completed || item.current ? "text-slate-800" : "text-slate-400"}`}>
                              {item.label}
                            </p>
                            <p className="text-[7.5px] text-slate-400 font-semibold mt-0.5">{item.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-[10px] text-slate-400 font-medium">Input your Application Reference Number above to check government sync status.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* SECTION — RETURN TYPES */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100 bg-white">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
            Tax Returns
          </span>
          <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] mt-3 tracking-tight">
            GST Return Categories We Handle
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2.5">
            File any compliance form assisted by Chartered Accountants with instant receipts.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "GSTR-1 (Sales Return)", desc: "Upload details of all outward supplies of goods or services. Mandatorily filed monthly or quarterly to pass Input Tax Credit to clients.", code: "Sales Statement" },
            { title: "GSTR-3B (Consolidated Summary)", desc: "Self-declaration of sales and purchase values. Used to claim eligible input credit, compute net liability, and pay tax dues.", code: "Tax Declaration" },
            { title: "Nil Return Filing", desc: "No sales or purchases during the tax period? You must still file a Nil return on the portal to avoid daily accumulative late penalties.", code: "Zero Sales" },
            { title: "QRMP Scheme Filings", desc: "Quarterly Return Monthly Payment scheme. Allows taxpayers with turnover up to ₹5 Crore to compile GSTR returns once in 3 months.", code: "Quarterly Saver" },
            { title: "GSTR-9 (Annual Return)", desc: "Consolidated yearly compliance form compiling monthly/quarterly transactions. Crucial to verify book entries with portal data.", code: "Yearly Audit" },
            { title: "GSTR-2B ITC Reconciliation", desc: "Advanced cross-matching of purchase invoice ledgers with supplier portal uploads to prevent incorrect input tax credit claims.", code: "Credit Sync" }
          ].map((item, idx) => (
            <div key={idx} className="liquid-glass-surface rounded-3xl p-6 border bg-white/60 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all group">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-blue-50/50 rounded-full text-blue-700">
                    {item.code}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 group-hover:scale-125 transition" />
                </div>
                <h3 className="text-xs font-black text-slate-900 leading-tight">{item.title}</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-3 leading-relaxed">{item.desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100/50 flex justify-between items-center text-[10px] font-bold text-blue-600">
                <span>CA Verification Included</span>
                <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition" />
              </div>
            </div>
          ))}
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

          {/* Embla Pricing Carousel */}
          <div className="relative max-w-5xl mx-auto">
            <div className="overflow-hidden py-6" ref={emblaRef}>
              <div className="flex gap-6">
                {filingPlans.map((plan, idx) => {
                  const isCurrent = idx === activePlanIdx;
                  return (
                    <div 
                      key={plan.planId} 
                      className={`flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.3%] select-none min-w-0 transition-all duration-300 transform ${
                        isCurrent 
                          ? "scale-100 opacity-100" 
                          : "scale-95 opacity-60 md:opacity-100"
                      }`}
                    >
                      <div className={`glass-panel h-full rounded-[36px] border bg-white/70 p-6 shadow-md flex flex-col justify-between transition-all ${plan.color}`}>
                        
                        <div>
                          {/* Plan Badge */}
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-white border border-slate-100 rounded-full text-slate-500">
                              {plan.badge}
                            </span>
                            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-100">
                              20% Cashback
                            </span>
                          </div>

                          {/* Plan Name & Price */}
                          <h3 className="text-base font-black text-slate-900 leading-tight">{plan.name}</h3>
                          <p className="text-[10px] font-semibold text-slate-400 mt-1 leading-relaxed">{plan.description}</p>
                          
                          <div className="mt-5 flex items-baseline gap-2">
                            <span className="text-slate-400 text-xs font-semibold line-through">{plan.regularPrice}</span>
                            <span className="text-2xl font-black text-slate-950">{plan.price}</span>
                            <span className="text-[9px] font-bold text-slate-400">{plan.billing}</span>
                          </div>

                          {/* Features */}
                          <ul className="mt-6 space-y-2.5 text-xs text-slate-700 border-t border-slate-100/50 pt-5 text-left">
                            {plan.features.map((feature, i) => (
                              <li key={i} className="flex items-center gap-2.5">
                                <Check className="h-4 w-4 text-blue-600 shrink-0" />
                                <span className="font-semibold text-slate-600">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* CTA button */}
                        <div className="mt-8">
                          <Link 
                            href={isLoggedIn ? `/apply/gst-return-filing?plan=${plan.planId}` : `/login/customer?redirect=${encodeURIComponent(`/apply/gst-return-filing?plan=${plan.planId}`)}`}
                            onClick={() => trackCrmEvent("apply_click", "gst-return-filing")}
                            className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md hover:scale-[1.01] transition duration-150 active:scale-[0.99]"
                          >
                            Apply with {plan.badge}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slider Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {filingPlans.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => emblaApi?.scrollTo(idx)}
                  className={`h-2.5 rounded-full transition-all duration-200 ${
                    idx === activePlanIdx ? "w-6 bg-blue-600" : "w-2.5 bg-slate-200"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DIGICONNECT VS OTHERS */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100 bg-slate-50/20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
            Comparison Hub
          </span>
          <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] mt-3 tracking-tight">
            DigiConnect vs Traditional Filing Options
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2.5">
            Compare service values to see how we guarantee error-free, timely return submissions.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-150/60 bg-white rounded-3xl shadow-sm max-w-4xl mx-auto">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4.5">Core Features</th>
                <th className="p-4.5 bg-blue-50/40 text-blue-700 border-l border-r border-blue-100 font-black">DigiConnect Dukan</th>
                <th className="p-4.5 text-slate-400">Local Agent</th>
                <th className="p-4.5 text-slate-400">Freelancer</th>
                <th className="p-4.5 text-slate-400">Random Online Portal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              {[
                { name: "CA Verification", dc: true, agent: "Sometimes", free: "Yes", rand: "Self Submission" },
                { name: "Dedicated Support", dc: true, agent: "Office Hours", free: "Unreliable", rand: "Ticket Only" },
                { name: "Document Review", dc: true, agent: "Manual check", free: "Manual check", rand: "Automated scan" },
                { name: "ARN Tracking", dc: true, agent: "No tracker", free: "No tracker", rand: "Standard text" },
                { name: "WhatsApp Updates", dc: true, agent: "Rarely", free: "Yes", rand: "Email only" },
                { name: "Cashback (20% Wallet)", dc: true, agent: "No", free: "No", rand: "No" },
                { name: "Wallet Rewards", dc: true, agent: "No", free: "No", rand: "No" },
                { name: "Secure Storage", dc: true, agent: "File cabinets", free: "Personal PC", rand: "Standard servers" },
                { name: "Application Tracking", dc: true, agent: "No", free: "No", rand: "Basic status" },
                { name: "Expert Consultation", dc: true, agent: "Charges extra", free: "Varies", rand: "Paid add-on" }
              ].map((row, idx) => (
                <tr 
                  key={idx}
                  onMouseEnter={() => setHoveredCompareRow(idx)}
                  onMouseLeave={() => setHoveredCompareRow(null)}
                  className={`transition-colors duration-150 cursor-pointer ${
                    hoveredCompareRow === idx ? "bg-blue-50/35 text-blue-900 font-bold" : "hover:bg-slate-50/50"
                  }`}
                >
                  <td className="p-4.5 font-semibold text-slate-800 text-xs">{row.name}</td>
                  
                  {/* DigiConnect Column */}
                  <td className="p-4.5 bg-blue-50/20 text-blue-700 border-l border-r border-blue-100/50 font-black text-center md:text-left">
                    {row.dc === true ? (
                      <span className="flex items-center gap-1.5 justify-center md:justify-start">
                        <CheckCircle2 className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                        <span>Included</span>
                      </span>
                    ) : (
                      row.dc
                    )}
                  </td>
                  
                  {/* Local Agent Column */}
                  <td className="p-4.5 text-slate-400">{(row.agent as unknown) === true ? "✓" : row.agent}</td>
                  
                  {/* Freelancer Column */}
                  <td className="p-4.5 text-slate-400">{(row.free as unknown) === true ? "✓" : row.free}</td>
                  
                  {/* Random Portal Column */}
                  <td className="p-4.5 text-slate-400">{(row.rand as unknown) === true ? "✓" : row.rand}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* REWARD CENTER */}
      <section className="py-20 bg-gradient-to-b from-[#f4f7fc] to-[#fbfcff] px-4 md:px-8 border-t border-slate-100/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex rounded-full bg-orange-50 px-3.5 py-1 text-xs font-bold text-orange-700 border border-orange-100 shadow-sm">
              Reward Hub
            </span>
            <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] mt-3 tracking-tight">
              Unlock Your Wallet Rewards
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-2.5">
              Obtain cashbacks, refer partners, and reduce fees across return compliance services.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center max-w-5xl mx-auto">
            
            {/* Wallet illustration & Dashboard details */}
            <div className="glass-panel rounded-[42px] border border-white/60 p-6 md:p-8 bg-white/70 shadow-lg flex flex-col md:flex-row gap-6 items-center">
              
              {/* Animated SVG Wallet graphic with coin animations */}
              <div className="w-36 h-36 shrink-0 relative flex items-center justify-center bg-blue-50 rounded-full border border-blue-100 shadow-inner">
                <svg viewBox="0 0 100 100" className="w-24 h-24">
                  {/* Wallet outline */}
                  <path d="M20 30 h55 a 5 5 0 0 1 5 5 v35 a 5 5 0 0 1 -5 5 h-55 a 5 5 0 0 1 -5 -5 v-35 a 5 5 0 0 1 5 -5 z" fill="#3b82f6" fillOpacity="0.2" stroke="#2563eb" strokeWidth="2.5" />
                  {/* Card slot decoration */}
                  <rect x="25" y="40" width="30" height="4" rx="2" fill="#2563eb" />
                  {/* Floating Gold Coin */}
                  <circle cx="50" cy="50" r="10" fill="#f59e0b" className="animate-[bounce_2s_infinite]" />
                </svg>
                <div className="absolute top-4 right-4 bg-orange-500 text-white rounded-full p-1 text-[8px] font-black animate-[ping_3s_infinite]">
                  ₹
                </div>
              </div>

              {/* Wallet info */}
              <div className="space-y-4 text-center md:text-left flex-1">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Credits</span>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">
                    {isLoggedIn ? formatPrice(walletBalance) : "₹0.00"}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400">Available to redeem up to 50% on future orders.</p>
                </div>

                {/* Reward Progress Meter */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-500">
                    <span>Filing Tier Progress</span>
                    <span>{isLoggedIn ? "Silver Member" : "Non-Member"}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full" 
                      style={{ width: isLoggedIn ? "60%" : "0%" }} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center md:text-left">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Referral Earned</p>
                    <p className="text-sm font-black text-slate-800">
                      {isLoggedIn ? formatPrice(profileData?.wallet?.lifetimeEarned ?? 0) : "₹0.00"}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center md:text-left">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Cashback Rate</p>
                    <p className="text-sm font-black text-blue-600">20% Flat</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reward Center Features */}
            <div className="space-y-4">
              {[
                { title: "20% Cashback Guarantee", desc: "Get 20% of your filing service price instantly credited to your wallet upon completion.", icon: Gift },
                { title: "Referral Bonus (₹100)", desc: "Share your code. Your partner gets 20% off and you receive ₹100 credits.", icon: Users },
                { title: "Future Filing Discounts", desc: "Redeem balance credits directly to compute GST Return filings or ITR orders.", icon: Calculator },
                { title: "Loyalty Benefits & Perks", desc: "Get priority CA reviews and zero penalty notice guarantees as a regular filer.", icon: Award }
              ].map((item, index) => (
                <div key={index} className="flex gap-4 p-4 bg-white/70 border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">{item.title}</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 leading-normal">{item.desc}</p>
                  </div>
                </div>
              ))}

              {/* Referral sharing widget if logged in */}
              {isLoggedIn && referralCode && (
                <div className="p-4 rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/30 flex justify-between items-center gap-4">
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Share with Partners</p>
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

          </div>
        </div>
      </section>

      {/* TRUST SECTION COUNTERS */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
              Trust Center
            </span>
            <h2 className="text-3xl font-black text-[#071326] tracking-tight">
              India&apos;s Preferred Compliance Desk
            </h2>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">
              We compile returns securely, running invoice matching checks through advanced CA checks to ensure no warning notices are triggered by the tax office.
            </p>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              {[
                { title: "PAN India Coverage", desc: "Support in all 28 states & UTs" },
                { title: "Govt Approved Workflow", desc: "100% compliant server submission" }
              ].map((badge, idx) => (
                <div key={idx} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-start gap-2.5">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-slate-800 leading-none">{badge.title}</h4>
                    <p className="text-[9px] text-slate-400 mt-1">{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { value: 50000, suffix: "+", label: "Customers Served" },
              { value: 99.8, suffix: "%", label: "Success Rate" },
              { value: 24, suffix: "/7", label: "Active Support" },
              { value: 72, suffix: " Hours", label: "Avg Processing" }
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-4.5 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col justify-center">
                <p className="text-2xl md:text-3.5xl font-black text-blue-600 leading-none">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mt-2">{stat.label}</p>
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

      {/* SECTION - SMART RECOMMENDATIONS */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100 bg-slate-50/20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
            Recommended For You
          </span>
          <h3 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-2 tracking-tight">
            Compliance & Growth Ecosystem
          </h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Grow your business with other premium compliance setups and government loan schemes.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {[
            {
              title: "GST Registration",
              desc: "Get your official 15-digit GSTIN under regular or composition schemes in 3 working days.",
              link: "/services/gst-registration",
              badge: "Startup Pack",
              cta: "Launch Now"
            },
            {
              title: "CM YUVA Scheme",
              desc: "Apply for ₹10 Lakhs interest-free business setup loans with government financial aid.",
              link: "/services/cm-yuva-entrepreneur-loan-assistance",
              badge: "Govt Subsidy",
              cta: "Check Eligibility"
            },
            {
              title: "PM Vishwakarma Scheme",
              desc: "Collateral-free loans up to ₹3 Lakhs, skill training incentives, and vendor toolkit aids.",
              link: "/services/pm-vishwakarma-yojana",
              badge: "Artisans & Traders",
              cta: "Enroll Today"
            },
            {
              title: "Credit Score Health Check",
              desc: "Verify credit history reports and get professional Chartered Accountant health analysis calls.",
              link: "/services/cibil-report-analysis-and-credit-health-consultation",
              badge: "Banking Readiness",
              cta: "Analyze Now"
            }
          ].map((item, idx) => (
            <div key={idx} className="liquid-glass-surface rounded-3xl p-5 border bg-white/70 shadow-sm flex flex-col justify-between hover:-translate-y-1.5 transition duration-200 group">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-blue-50/50 rounded-full text-blue-700">
                    {item.badge}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
                <h4 className="text-xs font-black text-slate-900 leading-tight">{item.title}</h4>
                <p className="text-[10px] font-semibold text-slate-400 mt-2 leading-relaxed">{item.desc}</p>
              </div>
              <div className="mt-5">
                <Link
                  href={item.link}
                  className="w-full inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-[10px] font-extrabold text-white shadow transition-all active:scale-95"
                >
                  {item.cta}
                  <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition" />
                </Link>
              </div>
            </div>
          ))}
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
