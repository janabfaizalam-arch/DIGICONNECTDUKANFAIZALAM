"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import {
  Sparkles,
  Shield,
  Phone,
  ArrowRight,
  MessageCircle,
  AlertTriangle,
  Calculator,
  FileText,
  Check,
  Building2,
  Briefcase,
  Users,
  Building,
  User,
  X,
  TrendingUp,
  Award,
  Lock,
  ChevronDown,
  Gift
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";

type FAQ = {
  question: string;
  answer: string;
};

export function GstRegistrationClient({
  isLoggedIn,
  faqs
}: {
  isLoggedIn: boolean;
  faqs: FAQ[];
}) {
  const { success, error: toastError } = useToast();
  const [activeDocTab, setActiveDocTab] = useState<"individual" | "proprietor" | "partnership" | "llp" | "private">("individual");
  const [activeMistakeCard, setActiveMistakeCard] = useState<number | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Smart Calculator State
  const [calcAmount, setCalcAmount] = useState<string>("10000");
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


  // Scroll visibility for sticky CTAs
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  // WhatsApp chat message builder
  const whatsappNumber = "917007595931";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    "Hi DigiConnect, I want to know more about online GST Registration. Please assist me."
  )}`;

  useEffect(() => {
    // Detect scrolling for sticky header CTA
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setScrolledPastHero(true);
      } else {
        setScrolledPastHero(false);
      }
    };
    window.addEventListener("scroll", handleScroll);

    // Exit Intent Handler (only on desktops)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 10) {
        const exitIntentDismissed = sessionStorage.getItem("exit_intent_gst_dismissed");
        if (!exitIntentDismissed) {
          setShowExitIntent(true);
        }
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleDismissExitIntent = () => {
    setShowExitIntent(false);
    sessionStorage.setItem("exit_intent_gst_dismissed", "true");
  };

  const handleLeadSubmit = async (e: FormEvent, isExit = false) => {
    e.preventDefault();
    const name = isExit ? exitName : leadName;
    const mobile = isExit ? exitMobile : leadMobile;
    const msg = isExit ? "Captured from Exit Intent Discount Form" : leadMessage;

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
      formData.append("service", "GST Registration");
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
            sessionStorage.setItem("exit_intent_gst_dismissed", "true");
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

  // Smart Calculator Math
  const amountNum = parseFloat(calcAmount) || 0;
  
  const computeGst = (rate: number) => {
    if (gstType === "exclusive") {
      const gstAmount = amountNum * (rate / 100);
      const halfGst = gstAmount / 2;
      return {
        base: amountNum,
        cgst: halfGst,
        sgst: halfGst,
        total: amountNum + gstAmount
      };
    } else {
      const baseAmount = amountNum / (1 + rate / 100);
      const gstAmount = amountNum - baseAmount;
      const halfGst = gstAmount / 2;
      return {
        base: baseAmount,
        cgst: halfGst,
        sgst: halfGst,
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fbfcff] via-[#f5f9ff] to-[#ffffff] text-[#0b1f3a] relative">
      
      {/* Dynamic Liquid background decorations */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.06),transparent_50%),radial-gradient(circle_at_80%_40%,rgba(249,115,22,0.05),transparent_50%)] pointer-events-none" />

      {/* SECTION 1 - HERO */}
      <section className="relative pt-12 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          {/* Hero Content Left */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-3.5 py-1 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
              <span>Apple Liquid Glass Premium Redesign</span>
            </div>
            
            <h1 className="text-4xl md:text-5.5xl font-extrabold tracking-tight text-[#071326] leading-tight">
              GST Registration <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 bg-clip-text text-transparent">Made Simple</span>
            </h1>
            
            <p className="text-base md:text-lg font-medium text-slate-500 leading-relaxed max-w-xl">
              Get your business legally registered online under GST in 3 days. Assisted by top corporate consultants with error-free application processing.
            </p>

            {/* Hero Trust Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-2">
              {[
                { label: "PAN India Service", desc: "All 28 states & 8 UTs" },
                { label: "Expert Support", desc: "Dedicated CAs" },
                { label: "Secure Processing", desc: "Data encryption" },
                { label: "Fast Turnaround", desc: "Within 3 working days" }
              ].map((badge, i) => (
                <div key={i} className="flex flex-col p-3 rounded-2xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-sm">
                  <span className="text-xs font-black text-slate-800">{badge.label}</span>
                  <span className="text-[10px] font-medium text-slate-400 mt-0.5">{badge.desc}</span>
                </div>
              ))}
            </div>

            {/* Hero CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link 
                href={isLoggedIn ? "/apply/gst-registration" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-registration")}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-7 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                Apply Now (₹2,499)
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-6 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-sm transition duration-150 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                Talk to Expert
              </a>
            </div>

            {/* Quick stats row */}
            <div className="flex items-center gap-6 pt-4 border-t border-slate-100 max-w-md">
              <div>
                <p className="text-xl font-black text-slate-900">50,000+</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trusted Clients</p>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div>
                <p className="text-xl font-black text-slate-900">99.8%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Success Rate</p>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div>
                <p className="text-xl font-black text-slate-900">24/7</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secure Support</p>
              </div>
            </div>
          </div>

          {/* Hero Right: Liquid Glass Card Mockup */}
          <div className="relative flex justify-center">
            {/* Visual Glass Card Elements */}
            <div className="relative w-full max-w-[420px] aspect-[1/1.05] rounded-[36px] border border-white/40 bg-white/40 p-6 shadow-xl backdrop-blur-md overflow-hidden flex flex-col justify-between">
              
              <div className="absolute top-[-30px] right-[-30px] w-[140px] h-[140px] rounded-full bg-blue-400/20 blur-xl pointer-events-none" />
              <div className="absolute bottom-[-50px] left-[-50px] w-[180px] h-[180px] rounded-full bg-orange-400/15 blur-xl pointer-events-none" />

              {/* Floating Element 1 */}
              <div className="absolute top-10 left-[-20px] p-3 rounded-2xl border border-white/50 bg-white/70 shadow-lg backdrop-blur-sm flex items-center gap-2.5 animate-float-icon-1 max-w-[160px]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Shield className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-black text-slate-800 leading-none">Safe & Verified</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">Govt Approved</p>
                </div>
              </div>

              {/* Floating Element 2 */}
              <div className="absolute bottom-16 right-[-15px] p-3 rounded-2xl border border-white/50 bg-white/70 shadow-lg backdrop-blur-sm flex items-center gap-2.5 animate-float-icon-2 max-w-[160px]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-black text-slate-800 leading-none">ITC Benefits</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">Claim Tax Back</p>
                </div>
              </div>

              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-md">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">GSTIN Application</p>
                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wide">Status: Active Verification</p>
                  </div>
                </div>
                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[8px] font-black uppercase text-blue-700 border border-blue-100">
                  Step 2 of 5
                </span>
              </div>

              {/* Card Center: Visual checklist */}
              <div className="my-6 space-y-3 bg-white/60 rounded-2xl p-4 border border-white/40">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Document Checklist</p>
                {[
                  { title: "Owner PAN & Aadhaar Verified", done: true },
                  { title: "Business Address Proof Uploaded", done: true },
                  { title: "NOC Signature Matching Review", done: false },
                  { title: "ARN Generation Queued", done: false }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                      item.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                    }`}>
                      {item.done ? "✓" : "•"}
                    </span>
                    <span className={`text-xs font-semibold ${item.done ? "text-slate-800" : "text-slate-400"}`}>
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                  <p className="text-[9px] font-bold text-slate-400">ESTIMATED DELIVERY</p>
                  <p className="text-xs font-black text-slate-800">3 Working Days</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400">CA ASSIGNED</p>
                  <p className="text-xs font-black text-slate-800">CA Ankit Sharma</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 - BENEFITS */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
            Why Register?
          </span>
          <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
            Unlock Massive Business Benefits
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2">
            GST registration is not just a legal mandate—it is a powerful tool to accelerate your business growth.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Input Tax Credit",
              desc: "Claim refund on GST paid on business purchases like raw materials, office rent, services, and machinery.",
              icon: "💰"
            },
            {
              title: "Business Legitimacy",
              desc: "Establish trust with corporate clients, open standard current accounts, and acquire national branding.",
              icon: "🛡️"
            },
            {
              title: "Sell Online",
              desc: "Unlock the gate to list your products on top e-commerce websites like Amazon, Flipkart, Myntra, and Meesho.",
              icon: "🌐"
            },
            {
              title: "Government Tenders",
              desc: "Gain eligibility to bid for lucrative government tenders and private contracts that require a registered GSTIN.",
              icon: "🏛️"
            },
            {
              title: "Interstate Trade",
              desc: "Transport goods across state borders legally and operate under a unified national market with no hidden levies.",
              icon: "✈️"
            },
            {
              title: "GST Invoice",
              desc: "Issue tax invoices directly to your clients so they can claim credit, making you their preferred partner.",
              icon: "📋"
            }
          ].map((benefit, idx) => (
            <div key={idx} className="liquid-card rounded-3xl p-6 hover:shadow-lg transition duration-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm text-2xl mb-4">
                {benefit.icon}
              </div>
              <h3 className="text-lg font-black text-slate-900">{benefit.title}</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed mt-2">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3 - WHO NEEDS GST */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
            Applicability
          </span>
          <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
            Who Needs GST Registration?
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Click on any entity to view specific criteria and thresholds.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              role: "E-commerce Sellers",
              desc: "Mandatory for anyone selling goods on online portals. No threshold exemption applies for online product sellers.",
              icon: Building2
            },
            {
              role: "Service Providers",
              desc: "Required if your annual services turnover exceeds ₹20 Lakhs (₹10 Lakhs in Special Category States).",
              icon: Briefcase
            },
            {
              role: "Traders",
              desc: "Required if your gross trading turnover (retail/wholesale) exceeds ₹40 Lakhs (₹20 Lakhs in Special States).",
              icon: Users
            },
            {
              role: "Manufacturers",
              desc: "Required if your total annual manufacturing sales volume exceeds ₹40 Lakhs, or if you sell across states.",
              icon: Building
            },
            {
              role: "Startups",
              desc: "Voluntary registration is highly recommended to claim pre-incorporation credits and raise venture funding.",
              icon: Sparkles
            },
            {
              role: "Freelancers",
              desc: "Mandatory if you provide services to foreign clients (export of services) or cross the ₹20 Lakhs threshold.",
              icon: User
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className="group p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:border-blue-200 transition duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-sm font-black text-slate-800">{item.role}</h3>
                </div>
                <p className="text-xs font-medium text-slate-500 mt-3 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4 - ELIGIBILITY */}
      <section className="py-16 bg-blue-50/20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                Criteria
              </span>
              <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
                GST Registration Eligibility
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-3 leading-relaxed">
                Determine your liability under the GST Act. Broadly categorised into threshold turnover limits and mandatory conditions.
              </p>
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs">✓</div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800">Aggregate Turnover Threshold</h3>
                    <p className="text-[11px] text-slate-500 mt-1">₹40 Lakhs for Goods suppliers (₹20 Lakhs for Special States) and ₹20 Lakhs for Service Providers (₹10 Lakhs for Special States).</p>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs">✓</div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800">Interstate Supply Exemption Rule</h3>
                    <p className="text-[11px] text-slate-500 mt-1">Any business engaged in sending goods across state boundaries must obtain GSTIN regardless of annual turnover limits.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Layout */}
            <div className="relative border-l border-blue-100 pl-6 space-y-8 py-2">
              <div className="relative">
                <span className="absolute left-[-31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white text-[9px] shadow-sm">
                  1
                </span>
                <h3 className="text-sm font-black text-slate-800">Turnover Limits reached</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Once your financial year gross sales cross ₹20 Lakhs or ₹40 Lakhs, you must register within 30 days of crossing the limit.
                </p>
              </div>

              <div className="relative">
                <span className="absolute left-[-31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] shadow-sm">
                  2
                </span>
                <h3 className="text-sm font-black text-slate-800">Mandatory Category Matches</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Includes e-commerce seller listings, casual taxable traders (exhibitions), non-resident taxpayers, and reverse-charge entities.
                </p>
              </div>

              <div className="relative">
                <span className="absolute left-[-31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-white text-[9px] shadow-sm">
                  3
                </span>
                <h3 className="text-sm font-black text-slate-800">Voluntary Registration (Optional)</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Obtain a registration to build credit profile, avail corporate partnerships, and collect taxes for refund offsets.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 - DOCUMENTS REQUIRED */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
            Checklist
          </span>
          <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
            Documents Required Checklist
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Different business structures need separate documents. Choose your type:
          </p>
        </div>

        {/* Tabs switcher */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 bg-slate-50/70 p-1.5 rounded-full max-w-3xl mx-auto border border-slate-100">
          {([
            { id: "individual", label: "Individual" },
            { id: "proprietor", label: "Proprietorship" },
            { id: "partnership", label: "Partnership" },
            { id: "llp", label: "LLP" },
            { id: "private", label: "Pvt Ltd" }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDocTab(tab.id)}
              className={`px-4 py-2 text-xs font-black rounded-full transition-all duration-150 ${
                activeDocTab === tab.id
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content checklist */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm max-w-4xl mx-auto">
          {activeDocTab === "individual" && (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: "Owner PAN Card", desc: "Mandatory PAN linked to Aadhaar." },
                { title: "Owner Aadhaar Card", desc: "For e-KYC validation via OTP." },
                { title: "Passport Size Photograph", desc: "Clear selfie/photo of the applicant." },
                { title: "Electricity Bill (Address Proof)", desc: "Electricity bill of business address (not older than 2 months)." },
                { title: "NOC from Premises Owner", desc: "Consent letter from property owner if rented/residential." },
                { title: "Bank proof", desc: "Cancelled cheque, bank passbook, or statement copy." }
              ].map((doc, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs">✓</span>
                  <div>
                    <p className="text-xs font-black text-slate-800">{doc.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{doc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDocTab === "proprietor" && (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: "Proprietor PAN & Aadhaar", desc: "Mandatory identity proofs." },
                { title: "Shop License / MSME Certificate", desc: "Any local proof of business name." },
                { title: "Electricity Bill of Premises", desc: "Proof of business address." },
                { title: "Rent Agreement / Lease", desc: "If premises is rented." },
                { title: "No Objection Certificate (NOC)", desc: "From the property owner." },
                { title: "Proprietor Bank Proof", desc: "Cancelled cheque or statement copy." }
              ].map((doc, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs">✓</span>
                  <div>
                    <p className="text-xs font-black text-slate-800">{doc.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{doc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDocTab === "partnership" && (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: "Partnership Deed", desc: "Certified document copy of the firm deed." },
                { title: "PAN Card of the Partnership", desc: "Separate PAN is required for the firm." },
                { title: "Partners PAN & Aadhaar", desc: "Required for all partners." },
                { title: "Authority Letter", desc: "Declaring primary authorized signatory partner." },
                { title: "Electricity Bill & Rent Deed", desc: "Premises proof of address." },
                { title: "Firm Bank Details", desc: "Cancelled cheque/statement of firm's current account." }
              ].map((doc, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs">✓</span>
                  <div>
                    <p className="text-xs font-black text-slate-800">{doc.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{doc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDocTab === "llp" && (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: "Certificate of Incorporation", desc: "Issued by Registrar of Companies (ROC)." },
                { title: "LLP Agreement", desc: "Executed agreement copy of LLP partners." },
                { title: "PAN Card of LLP", desc: "Firm PAN card copy." },
                { title: "Aadhaar & PAN of Designated Partners", desc: "Signatory partner KYC." },
                { title: "Resolution for Signatory", desc: "Board approval copy." },
                { title: "Electricity Bill & Rent Agreement", desc: "Address proof of registered office." }
              ].map((doc, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">✓</span>
                  <div>
                    <p className="text-xs font-black text-slate-800">{doc.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{doc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDocTab === "private" && (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: "Certificate of Incorporation (COI)", desc: "Company registration certificate." },
                { title: "PAN Card of the Company", desc: "Corporate identity number PAN." },
                { title: "MOA & AOA documents", desc: "Constitutional documents of company." },
                { title: "Directors' Aadhaar & PAN", desc: "KYC details of all active directors." },
                { title: "Board Resolution / Auth signatory", desc: "Letter signed by directors." },
                { title: "Registered Office Address Proof", desc: "Electric bill, property tax + Rent agreement + NOC." }
              ].map((doc, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs">✓</span>
                  <div>
                    <p className="text-xs font-black text-slate-800">{doc.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{doc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 6 - PROCESS FLOW */}
      <section className="py-16 bg-slate-50/40 px-4 md:px-8 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
              Workflow
            </span>
            <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
              Step-by-step Process Flow
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-2">
              We manage the entire application pipeline end-to-end.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-5 relative">
            {[
              { title: "Submit Application", desc: "Submit details, upload documents, and complete secure payment in 2 minutes." },
              { title: "Document Verification", desc: "Our CA expert checks all documents for spelling, address proofs, and signature NOC matching." },
              { title: "GST Filing Submission", desc: "We prepare the application file and upload it to the official Govt GST portal." },
              { title: "ARN Generation", desc: "Get an Application Reference Number (ARN) instantly to track the file progress." },
              { title: "GST Certificate", desc: "Download your verified GSTIN certificate and start business operations." }
            ].map((step, index) => (
              <div key={index} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-black text-white shadow-sm mb-3">
                    {index + 1}
                  </span>
                  <h3 className="text-xs font-black text-slate-800">{step.title}</h3>
                  <p className="text-[10px] font-medium leading-relaxed text-slate-400 mt-2">
                    {step.desc}
                  </p>
                </div>
                {index < 4 && (
                  <div className="hidden md:block absolute right-[-14px] top-1/2 transform -translate-y-1/2 z-10">
                    <span className="text-slate-300 font-bold text-lg">→</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SMART CALCULATOR WIDGET */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center">
          <div>
            <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
              Interactive Tools
            </span>
            <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
              Instant GST Calculator
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-3 leading-relaxed">
              Verify calculations for CGST, SGST, IGST, and total billing amounts instantly. Select Exclusive or Inclusive rates to match your product pricing model.
            </p>
            <div className="mt-6 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Principal Amount (₹)</label>
                <input 
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 transition"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Tax Mode</label>
                <div className="mt-1.5 flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setGstType("exclusive")}
                    className={`flex-1 py-2 text-xs font-black rounded-lg border transition ${
                      gstType === "exclusive" 
                        ? "bg-blue-50 border-blue-500 text-blue-700 font-bold" 
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    GST Exclusive
                  </button>
                  <button 
                    type="button"
                    onClick={() => setGstType("inclusive")}
                    className={`flex-1 py-2 text-xs font-black rounded-lg border transition ${
                      gstType === "inclusive" 
                        ? "bg-blue-50 border-blue-500 text-blue-700 font-bold" 
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    GST Inclusive
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Calculator Outputs */}
          <div className="grid gap-4 grid-cols-2">
            {[
              { rate: 5, data: gst5, bg: "bg-blue-50/50 border-blue-100 text-blue-800" },
              { rate: 12, data: gst12, bg: "bg-indigo-50/50 border-indigo-100 text-indigo-800" },
              { rate: 18, data: gst18, bg: "bg-orange-50/40 border-orange-100 text-orange-800" },
              { rate: 28, data: gst28, bg: "bg-emerald-50/40 border-emerald-100 text-emerald-800" }
            ].map((output, idx) => (
              <div key={idx} className={`p-4 rounded-3xl border shadow-sm ${output.bg}`}>
                <div className="flex justify-between items-center border-b border-white/50 pb-2">
                  <span className="text-xs font-black">GST {output.rate}%</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/70">Rate</span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-[11px] font-medium text-slate-500">
                    <span>Base Amount</span>
                    <span>{formatPrice(output.data.base)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-500">
                    <span>CGST ({output.rate/2}%)</span>
                    <span>{formatPrice(output.data.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-500">
                    <span>SGST ({output.rate/2}%)</span>
                    <span>{formatPrice(output.data.sgst)}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 pt-1.5 border-t border-dashed border-slate-200/50">
                    <span>Total Bill</span>
                    <span>{formatPrice(output.data.total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 - PRICING SECTION */}
      <section className="py-16 bg-gradient-to-b from-[#f5f9ff] to-[#ffffff] px-4 md:px-8 border-t border-slate-100">
        <div className="max-w-md mx-auto">
          <div className="glass-panel rounded-[36px] border border-white/60 p-6 md:p-8 shadow-xl text-center relative overflow-hidden">
            
            {/* Offer badge */}
            <div className="absolute top-4 right-[-32px] transform rotate-[45deg] bg-orange-500 text-white text-[8px] font-black uppercase tracking-wider py-1 w-[120px] shadow-sm">
              Save 64%
            </div>

            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
              Pricing Plan
            </span>
            
            <h3 className="text-xl font-black text-slate-900 mt-4">All-Inclusive GST Pack</h3>
            <p className="text-xs font-medium text-slate-400 mt-1">Certified CA review & submission assistance</p>

            <div className="mt-6 flex justify-center items-baseline gap-2">
              <span className="text-slate-400 text-sm font-semibold line-through">₹6,999</span>
              <span className="text-3xl font-black text-slate-950">₹2,499</span>
              <span className="text-xs font-semibold text-slate-500">excl. Govt fees</span>
            </div>

            {/* Wallet Cashbacks */}
            <div className="mt-4 p-3 rounded-2xl bg-gradient-to-tr from-orange-500/10 to-amber-500/5 border border-orange-200/40 text-left flex items-start gap-3">
              <Gift className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-orange-800">20% Cashback (₹500)</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  Get ₹500 cashback credited back to your DigiConnect wallet upon completion of registration.
                </p>
              </div>
            </div>

            {/* Inclusions checklist */}
            <div className="mt-6 space-y-2.5 text-left border-t border-slate-100 pt-6">
              {[
                "CA Verified Document Validation",
                "Filing Form Draft Preparation",
                "ARN Tracking Reference ID",
                "GST Certificate Download",
                "Dedicated Compliance Advisor Support"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Check className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Link 
                href={isLoggedIn ? "/apply/gst-registration" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-registration")}`}
                className="premium-button premium-button-blue shadow-lg"
              >
                Apply & Secure GSTIN
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Guarantee badges */}
            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400">
              <Shield className="h-3.5 w-3.5 text-slate-400" />
              <span>100% Secure Checkout | No Hidden Charges</span>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 8 - WHY DIGICONNECT */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
            Trust Signals
          </span>
          <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
            Why Choose DigiConnect?
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Providing reliable legal and corporate support services across the nation.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Expert Team", desc: "Our network of professional Chartered Accountants review files to prevent rejection.", icon: Award },
            { title: "Secure Documents", desc: "Your upload identity documents are treated with standard server security guidelines.", icon: Lock },
            { title: "Fast Support", desc: "Receive immediate resolution of questions and status tracking on WhatsApp/Call.", icon: Phone },
            { title: "Affordable Pricing", desc: "No complex overhead bills. Standard and competitive legal fees across services.", icon: Calculator },
            { title: "PAN India Service", desc: "Providing form submissions and liaison assistance across all states and Union territories.", icon: Shield },
            { title: "Wallet Cashback", desc: "Enjoy 20% value back in rewards wallet redeemable for future utility filings.", icon: Gift }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-black text-slate-800">{item.title}</h3>
                <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 9 - GST REGISTRATION TYPES */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
            Types comparison
          </span>
          <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
            GST Registration Schemes
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Compare options to select the right registration pathway for your entity.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto border border-slate-100 bg-white rounded-3xl shadow-sm">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">GST Scheme Type</th>
                <th className="p-4">Who is it for?</th>
                <th className="p-4">Tax Structure</th>
                <th className="p-4">Input Credit (ITC)</th>
                <th className="p-4">Compliance Requirement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              <tr>
                <td className="p-4 font-black text-slate-900">Regular Taxpayer</td>
                <td className="p-4">Standard businesses, retail, services, e-commerce</td>
                <td className="p-4">Dynamic based on product category (5% - 28%)</td>
                <td className="p-4 text-emerald-700">Fully Eligible</td>
                <td className="p-4">Monthly GSTR-1, GSTR-3B filings</td>
              </tr>
              <tr>
                <td className="p-4 font-black text-slate-900">Composition Scheme</td>
                <td className="p-4">Small traders & manufacturing below ₹1.5 Cr</td>
                <td className="p-4">Flat rate (1% to 6% on aggregate sales)</td>
                <td className="p-4 text-red-600">Not Eligible</td>
                <td className="p-4">Quarterly returns & CMP-08 payments</td>
              </tr>
              <tr>
                <td className="p-4 font-black text-slate-900">Casual Taxable Person</td>
                <td className="p-4">Traders opening temporary stalls or events</td>
                <td className="p-4">Standard rates, paid in advance on estimate</td>
                <td className="p-4 text-emerald-700">Fully Eligible</td>
                <td className="p-4">Temporary registration valid for 90 days</td>
              </tr>
              <tr>
                <td className="p-4 font-black text-slate-900">Non-Resident Taxable</td>
                <td className="p-4">Foreign individuals trading occasionally in India</td>
                <td className="p-4">Standard rates, paid in advance on estimate</td>
                <td className="p-4 text-emerald-700">Fully Eligible</td>
                <td className="p-4">Temporary validation, customized filing periods</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 10 - COMMON MISTAKES */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 border border-orange-100">
            Warnings & Compliance
          </span>
          <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
            Common Mistakes leading to Rejections
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Tax officers check applications closely. Click on each warning to learn how to avoid rejections.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { title: "Wrong PAN details", desc: "Mismatch of name or DOB between PAN card database and Aadhaar records prevents validation." },
            { title: "Wrong Business Name", desc: "Selecting trade names containing words like 'Reserve Bank', 'State', or 'Government' without prior clearance." },
            { title: "Wrong Address Proof", desc: "Uploading utility bills not in the name of the property owner, or bill older than two months." },
            { title: "NOC Issues", desc: "Missing consent letter, or signature mismatch on the NOC document copy uploaded." },
            { title: "Invalid Bank Proof", desc: "Uploading statements that do not clearly show the applicant's name, or blank cheque without pre-printed name." }
          ].map((mistake, idx) => (
            <div 
              key={idx}
              onClick={() => setActiveMistakeCard(activeMistakeCard === idx ? null : idx)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                activeMistakeCard === idx 
                  ? "bg-orange-50/70 border-orange-300 shadow-sm" 
                  : "bg-white border-slate-100 hover:border-orange-100"
              }`}
            >
              <div>
                <AlertTriangle className={`h-5 w-5 ${activeMistakeCard === idx ? "text-orange-600 animate-bounce" : "text-orange-400"}`} />
                <h3 className="text-xs font-black text-slate-800 mt-3 leading-tight">{mistake.title}</h3>
              </div>
              <p className={`text-[10px] font-medium text-slate-500 leading-relaxed mt-2 transition-all ${
                activeMistakeCard === idx ? "block" : "hidden lg:block lg:opacity-60"
              }`}>
                {mistake.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 11 - FAQ */}
      <section className="py-16 px-4 md:px-8 max-w-4xl mx-auto border-t border-slate-100">
        <div className="text-center mb-10">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
            Support FAQ
          </span>
          <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="border border-slate-100 bg-white rounded-2xl overflow-hidden shadow-sm transition"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                className="w-full p-4 text-left flex justify-between items-center gap-4 focus:outline-none"
              >
                <span className="text-xs font-black text-slate-800">{faq.question}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                  openFaqIndex === index ? "transform rotate-180" : ""
                }`} />
              </button>
              {openFaqIndex === index && (
                <div className="px-4 pb-4 text-xs font-medium leading-relaxed text-slate-500 border-t border-slate-50 pt-2.5">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 12 - SUPPORT CENTER */}
      <section className="py-16 bg-blue-50/20 px-4 md:px-8 border-t border-slate-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
            Connect
          </span>
          <h2 className="text-2xl md:text-3.5xl font-black text-slate-900">
            Dedicated Customer Support
          </h2>
          <p className="text-sm font-medium text-slate-500 max-w-xl mx-auto leading-relaxed">
            Need custom queries resolved? Connect with our office desks for real-time validation checks.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto pt-2">
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-3 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-bold text-slate-400">PRIMARY CALL DESK</p>
                <p className="text-xs font-black text-slate-800">+91 7007595931</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-3 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-bold text-slate-400">OFFICE LINE SUPPORT</p>
                <p className="text-xs font-black text-slate-800">+91 9305086491</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <a 
              href={`https://wa.me/917007595931`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
            >
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp
            </a>
            <a 
              href="tel:+917007595931"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <Phone className="h-4 w-4 text-blue-600" />
              Call Office Desk
            </a>
          </div>
        </div>
      </section>

      {/* LEAD CAPTURE FALLBACK FORM */}
      <section className="py-16 px-4 md:px-8 max-w-3xl mx-auto border-t border-slate-100">
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm text-center space-y-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Get a Free Consultation Call Back</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Still confused about details? Fill in your phone and our compliance advisor will call you back within 15 minutes.
            </p>
          </div>
          <form onSubmit={(e) => handleLeadSubmit(e, false)} className="space-y-3 max-w-md mx-auto pt-2">
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
              placeholder="Your specific business query or scheme requirement (Optional)"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 transition resize-none"
            />
            <button 
              type="submit"
              disabled={isSubmittingLead}
              className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 text-xs font-bold text-white shadow transition hover:bg-blue-700"
            >
              {isSubmittingLead ? "Submitting Inquiry..." : "Submit Inquiry"}
            </button>
          </form>
        </div>
      </section>

      {/* WHATSAPP FLOATING BUTTON */}
      <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-floating-button"
        title="WhatsApp Expert Support"
        aria-label="Chat with expert on WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>

      {/* STICKY BOTTOM BAR (MOBILE) & STICKY HEADER (DESKTOP) */}
      {scrolledPastHero && (
        <>
          {/* Desktop Sticky Header Banner */}
          <div className="hidden md:block fixed top-[60px] left-0 right-0 bg-white/80 border-b border-slate-100 shadow-md z-40 backdrop-blur-md animate-fade-in">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-50 text-blue-600 text-xs font-black">GST</span>
                <span className="text-xs font-black text-slate-800">GST Registration Online</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block">OFFER PRICE</span>
                  <span className="text-xs font-black text-slate-800">₹2,499</span>
                </div>
                <Link 
                  href={isLoggedIn ? "/apply/gst-registration" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-registration")}`}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-blue-600 px-4 text-xs font-bold text-white shadow transition hover:bg-blue-700 active:scale-95"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Sticky Bottom CTA */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 border-t border-slate-100 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] z-40 p-3.5 flex items-center justify-between pb-safe">
            <div>
              <p className="text-[9px] font-bold text-slate-400">GST REGISTRATION</p>
              <p className="text-sm font-black text-slate-800">₹2,499 <span className="text-[10px] text-slate-400 font-normal line-through">₹6,999</span></p>
            </div>
            <div className="flex gap-2">
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-600 active:scale-95"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
              <Link 
                href={isLoggedIn ? "/apply/gst-registration" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-registration")}`}
                className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-5 text-xs font-bold text-white shadow active:scale-95"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </>
      )}

      {/* EXIT INTENT DIALOG POPUP */}
      {showExitIntent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden animate-reveal-in">
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
              
              <h3 className="text-base font-black text-slate-900">Wait! Get an Exclusive Consultation Call</h3>
              <p className="text-xs font-semibold text-slate-500">
                Registering under GST doesn&apos;t have to be complicated. Drop your phone and we&apos;ll give you a call or chat directly on WhatsApp.
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
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
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
