"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
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
  CheckSquare
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";

type FAQ = {
  question: string;
  answer: string;
};

export function GstReturnFilingClient({
  isLoggedIn,
  faqs
}: {
  isLoggedIn: boolean;
  faqs: FAQ[];
}) {
  const { success, error: toastError } = useToast();
  const [activeFilingTab, setActiveFilingTab] = useState<"gstr1" | "gstr3b" | "nil" | "gstr9">("gstr1");
  const [frequencyTab, setFrequencyTab] = useState<"monthly" | "quarterly">("monthly");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Smart Calculator State
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

  // Scroll visibility for sticky CTAs
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  // WhatsApp chat message builder
  const whatsappNumber = "917007595931";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    "Hi DigiConnect, I want to inquire about online GST Return Filing assistance. Please guide me."
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
        const exitIntentDismissed = sessionStorage.getItem("exit_intent_filing_dismissed");
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
    sessionStorage.setItem("exit_intent_filing_dismissed", "true");
  };

  const handleLeadSubmit = async (e: FormEvent, isExit = false) => {
    e.preventDefault();
    const name = isExit ? exitName : leadName;
    const mobile = isExit ? exitMobile : leadMobile;
    const msg = isExit ? "Captured from Exit Intent Filing Discount Form" : leadMessage;

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
        success(result.message || "Thank you! Our filing expert will contact you shortly.");
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
        toastError(result.error || result.message || "Inquiry submission failed.");
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
      
      {/* Dynamic background decorations */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.06),transparent_50%),radial-gradient(circle_at_80%_40%,rgba(249,115,22,0.05),transparent_50%)] pointer-events-none" />

      {/* SECTION 1 - HERO */}
      <section className="relative pt-12 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          {/* Hero Content Left */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-3.5 py-1 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
              <span>CA-Assisted GST Return Filing</span>
            </div>
            
            <h1 className="text-4xl md:text-5.5xl font-extrabold tracking-tight text-[#071326] leading-tight">
              GST Return Filing <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 bg-clip-text text-transparent">Made Effortless</span>
            </h1>
            
            <p className="text-base md:text-lg font-medium text-slate-500 leading-relaxed max-w-xl">
              File GSTR-1 & GSTR-3B accurately. Ensure correct Input Tax Credit (ITC) reconciliation and avoid penalties. Guaranteed on-time submissions.
            </p>

            {/* Hero Trust Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-2">
              {[
                { label: "100% Accuracy", desc: "No reconciliation errors" },
                { label: "Expert CA Support", desc: "Consultants verify returns" },
                { label: "On-Time Filing", desc: "Avoid daily late fees" },
                { label: "Secure Sync", desc: "Safe portal encryption" }
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
                href={isLoggedIn ? "/apply/gst-return-filing" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-return-filing")}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-7 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                File GSTR Now (₹999)
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-6 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-sm transition duration-150 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                Consult Advisor
              </a>
            </div>

            {/* Quick stats row */}
            <div className="flex items-center gap-6 pt-4 border-t border-slate-100 max-w-md">
              <div>
                <p className="text-xl font-black text-slate-900">10,000+</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Filings</p>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div>
                <p className="text-xl font-black text-slate-900">99.9%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accuracy Score</p>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div>
                <p className="text-xl font-black text-slate-900">Zero</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Penalty Notices</p>
              </div>
            </div>
          </div>

          {/* Hero Right: Compliance glass showcase */}
          <div className="relative flex justify-center">
            <div className="relative w-full max-w-[420px] aspect-[1/1.05] rounded-[36px] border border-white/40 bg-white/40 p-6 shadow-xl backdrop-blur-md overflow-hidden flex flex-col justify-between">
              
              <div className="absolute top-[-30px] right-[-30px] w-[140px] h-[140px] rounded-full bg-blue-400/20 blur-xl pointer-events-none" />
              <div className="absolute bottom-[-50px] left-[-50px] w-[180px] h-[180px] rounded-full bg-orange-400/15 blur-xl pointer-events-none" />

              {/* Floating element 1 */}
              <div className="absolute top-10 left-[-20px] p-3 rounded-2xl border border-white/50 bg-white/70 shadow-lg backdrop-blur-sm flex items-center gap-2.5 animate-float-icon-1 max-w-[170px]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-black text-slate-800 leading-none">Avoid Late Fees</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">Due Date Reminders</p>
                </div>
              </div>

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white shadow-md">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">Compliance Dashboard</p>
                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">Ready to file: GSTR-3B</p>
                  </div>
                </div>
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[8px] font-black uppercase text-emerald-700 border border-emerald-100">
                  Q1 Compliant
                </span>
              </div>

              {/* GSTR Overview List */}
              <div className="my-6 space-y-3 bg-white/60 rounded-2xl p-4 border border-white/40">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Filing Status Summary</p>
                {[
                  { returnType: "GSTR-1 (Sales Invoices)", status: "Submitted to Portal", checked: true },
                  { returnType: "GSTR-2B (Input Credit Sync)", status: "Reconciled & Matched", checked: true },
                  { returnType: "GSTR-3B (Tax Consolidated)", status: "Challan Drafted", checked: false }
                ].map((item, index) => (
                  <div key={index} className="flex items-start justify-between gap-2 border-b border-slate-100/50 pb-2 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                        item.checked ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700 animate-pulse"
                      }`}>
                        {item.checked ? "✓" : "•"}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">{item.returnType}</span>
                    </div>
                    <span className={`text-[9px] font-bold ${item.checked ? "text-slate-400" : "text-blue-600"}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Input Credit Reclaimed</p>
                  <p className="text-xs font-black text-emerald-600">₹42,850.00</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Penalty Saved</p>
                  <p className="text-xs font-black text-slate-800">₹12,400.00</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 - RETURN TYPES */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
            Filing Types
          </span>
          <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
            GST Return Filings We Handle
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Switch between tabs to see requirements, deadlines, and documentation guidelines.
          </p>
        </div>

        {/* Tab switcher */}
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
              className={`px-4 py-2 text-xs font-black rounded-full transition-all duration-150 ${
                activeFilingTab === tab.id
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content checklist */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm max-w-3xl mx-auto">
          {activeFilingTab === "gstr1" && (
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-900">GSTR-1 Outward Supplies Return</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
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
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-900">GSTR-3B Self-Declared Summary Return</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
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
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-900">Express Nil GST Return Filing</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
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
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-900">GSTR-9 Annual Return Compliance</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
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

      {/* MONTHLY VS QUARTERLY FILING */}
      <section className="py-16 bg-blue-50/20 px-4 md:px-8 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                Frequency selector
              </span>
              <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
                Monthly vs Quarterly GSTR Filing
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-3 leading-relaxed">
                Choose the correct return filing frequency according to your aggregate turnover volume and supplier credit demands.
              </p>
              
              <div className="mt-6 flex gap-2">
                <button 
                  onClick={() => setFrequencyTab("monthly")}
                  className={`px-4 py-2.5 text-xs font-black rounded-xl border transition ${
                    frequencyTab === "monthly"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  Monthly Returns
                </button>
                <button 
                  onClick={() => setFrequencyTab("quarterly")}
                  className={`px-4 py-2.5 text-xs font-black rounded-xl border transition ${
                    frequencyTab === "quarterly"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  Quarterly QRMP Returns
                </button>
              </div>
            </div>

            {/* Frequency details display */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              {frequencyTab === "monthly" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900">Standard Monthly Compliance</h3>
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700 border border-blue-100">Recommended</span>
                  </div>
                  <p className="text-xs font-medium text-slate-400">For businesses with turnover above ₹5 Crore, or those dealing with active corporate buyers who need real-time monthly ITC credit reflection.</p>
                  <ul className="space-y-2 text-xs font-semibold text-slate-700">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-600 shrink-0" /> GSTR-1 by 11th of every month</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-600 shrink-0" /> GSTR-3B by 20th of every month</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-600 shrink-0" /> Best for steady B2B trade lines</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-4">
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
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 border border-red-100">
              Penalties Schedule
            </span>
            <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
              Late Fees & Penalty Avoidance
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-3 leading-relaxed">
              Delaying return submissions triggers automatic portal charges. Keep track of rules to secure your business credentials.
            </p>
            
            {/* Penalty warnings list */}
            <div className="mt-6 space-y-3">
              <div className="flex gap-3 p-3 bg-red-50/20 border border-red-100/30 rounded-2xl">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-slate-800">E-Way Bill Blocking</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Non-filing of returns for two consecutive tax periods leads to automatic blockage of e-way bill generation.</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 bg-red-50/20 border border-red-100/30 rounded-2xl">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
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
              <div className="flex justify-between font-black text-red-600 pt-2 border-t border-dashed border-slate-200">
                <span>Max Late Fee Cap (Regular Taxpayer)</span>
                <span>₹5,000 / return limit</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPLIANCE PACKAGES & PRICING */}
      <section className="py-16 bg-gradient-to-b from-[#f5f9ff] to-[#ffffff] px-4 md:px-8 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
              Pricing Options
            </span>
            <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
              Filing & Compliance Packages
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-2">
              Select a tier based on your business volume and frequency requirements.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                name: "Starter Package",
                desc: "Best for Nil returns and micro entities",
                price: "₹999",
                period: "/Quarter",
                cashback: "₹200",
                features: [
                  "GSTR-1 & GSTR-3B filings",
                  "Nil return express preparation",
                  "Email receipt deliveries",
                  "Standard client support desk"
                ],
                tag: "Micro",
                color: "border-slate-100"
              },
              {
                name: "Professional Pack",
                desc: "Best for growing active retailers & CAs",
                price: "₹2,499",
                period: "/Quarter",
                cashback: "₹500",
                features: [
                  "Complete Monthly filings GSTR-1 & 3B",
                  "GSTR-2B Input Credit reconciliation",
                  "E-way bill generation support",
                  "WhatsApp direct compliance advisor"
                ],
                tag: "Popular",
                color: "border-blue-200 ring-4 ring-blue-50/50"
              },
              {
                name: "Corporate Compliance",
                desc: "For large traders & private firms",
                price: "₹4,999",
                period: "/Quarter",
                cashback: "₹1,000",
                features: [
                  "All monthly returns + annual GSTR-9",
                  "Supplier invoice credit disputing",
                  "Ledger reconciliation audits",
                  "Direct CA call support"
                ],
                tag: "Enterprise",
                color: "border-slate-100"
              }
            ].map((plan, idx) => (
              <div 
                key={idx} 
                className={`bg-white rounded-3xl p-6 border shadow-sm relative flex flex-col justify-between ${plan.color}`}
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-900">{plan.name}</span>
                    <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[8px] font-black uppercase text-slate-500 border border-slate-100">{plan.tag}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{plan.desc}</p>
                  
                  <div className="mt-5 flex items-baseline">
                    <span className="text-2xl font-black text-slate-900">{plan.price}</span>
                    <span className="text-xs font-semibold text-slate-400">{plan.period}</span>
                  </div>

                  <div className="mt-3 p-2 bg-orange-50/40 border border-orange-100/30 rounded-xl flex items-center gap-2">
                    <Gift className="h-4 w-4 text-orange-600 shrink-0" />
                    <span className="text-[10px] font-black text-orange-800">20% Cashback ({plan.cashback})</span>
                  </div>

                  <ul className="mt-5 space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-5">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  <Link 
                    href={isLoggedIn ? "/apply/gst-return-filing" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-return-filing")}`}
                    className="w-full inline-flex h-10 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow hover:bg-blue-700 transition"
                  >
                    Select Plan
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SMART GST CALCULATOR IN FILING PAGE */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center">
          <div>
            <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
              Interactive Tools
            </span>
            <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 mt-3">
              Filing GST Calculator
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

      {/* SECTION - FAQ */}
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

      {/* SUPPORT CENTER */}
      <section className="py-16 bg-blue-50/20 px-4 md:px-8 border-t border-slate-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
            Connect
          </span>
          <h2 className="text-2xl md:text-3.5xl font-black text-slate-900">
            Dedicated GSTR Filing Support
          </h2>
          <p className="text-sm font-medium text-slate-500 max-w-xl mx-auto leading-relaxed">
            Need customized compliance answers? Connect with our dedicated CA compliance desk.
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
            <h3 className="text-lg font-black text-slate-900">Get a Free GSTR Consultation Call</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Still confused about monthly filings vs QRMP schemes? Leave your phone number and we&apos;ll call you back in 15 minutes.
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
              placeholder="Your specific GSTR compliance queries or business info (Optional)"
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
                <span className="text-xs font-black text-slate-800">GST Return Filing Assisted</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block">OFFER PRICE</span>
                  <span className="text-xs font-black text-slate-800">₹999</span>
                </div>
                <Link 
                  href={isLoggedIn ? "/apply/gst-return-filing" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-return-filing")}`}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-blue-600 px-4 text-xs font-bold text-white shadow transition hover:bg-blue-700 active:scale-95"
                >
                  File GSTR Now
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Sticky Bottom CTA */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 border-t border-slate-100 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] z-40 p-3.5 flex items-center justify-between pb-safe">
            <div>
              <p className="text-[9px] font-bold text-slate-400">GST RETURN FILING</p>
              <p className="text-sm font-black text-slate-800">₹999 <span className="text-[10px] text-slate-400 font-normal line-through">₹2,999</span></p>
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
                href={isLoggedIn ? "/apply/gst-return-filing" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-return-filing")}`}
                className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-5 text-xs font-bold text-white shadow active:scale-95"
              >
                File GSTR
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
