"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import useSWR from "swr";
import useEmblaCarousel from "embla-carousel-react";
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
  X,
  TrendingUp,
  ChevronDown,
  Gift,
  Search,
  Award,
  Lock,
  Copy,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Building2,
  Users,
  Building,
  User,
  ArrowUpRight
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

export function GstRegistrationClient({
  isLoggedIn: initialIsLoggedIn,
  faqs: initialFaqs
}: {
  isLoggedIn: boolean;
  faqs: FAQ[];
}) {
  const { success, error: toastError } = useToast();
  
  // SWR Caching Hook for backend data
  const { data: profileData, mutate: mutateProfile } = useSWR("/api/customer/profile", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const isLoggedIn = profileData ? profileData.isLoggedIn : initialIsLoggedIn;
  const walletBalance = profileData?.wallet?.balance ?? 0;
  const referralCode = profileData?.wallet?.referralCode ?? "";
  const referralLink = profileData?.wallet?.referralLink ?? "";

  // Active GST App lookup from backend
  const activeGstApp = profileData?.activeApplications?.find(
    (app: { serviceSlug?: string; serviceName?: string }) => app.serviceSlug === "gst-registration" || app.serviceName?.toLowerCase().includes("gst registration")
  );

  // States
  const [activeDocTab, setActiveDocTab] = useState<"individual" | "proprietor" | "partnership" | "llp" | "private">("individual");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [faqSearch, setFaqSearch] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<string>("10000");
  const [gstType, setGstType] = useState<"exclusive" | "inclusive">("exclusive");

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

  // Process Tracker Interactive State (for demo / walkthrough)
  const [demoStep, setDemoStep] = useState<number>(0);
  const isDemoMode = !activeGstApp;

  // Embla Carousel for pricing
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
        const dismissed = sessionStorage.getItem("exit_intent_gst_dismissed");
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
    sessionStorage.setItem("exit_intent_gst_dismissed", "true");
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
    "Hi DigiConnect, I am looking for online GST Registration assistance. Please guide me."
  )}`;

  const handleLeadSubmit = async (e: FormEvent, isExit = false) => {
    e.preventDefault();
    const name = isExit ? exitName : leadName;
    const mobile = isExit ? exitMobile : leadMobile;
    const msg = isExit ? "Captured from Exit Intent GST Consultation Form" : leadMessage;

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
        success(result.message || "Thank you! Our filing expert will contact you shortly.");
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

  // 4 Plan Variants
  const gstPlans = [
    {
      planId: "basic",
      name: "Basic GST Registration",
      price: "₹2,499",
      regularPrice: "₹6,999",
      description: "Ideal for fresh startups and individual consultants.",
      features: [
        "Government Portal Account",
        "Document Review & Upload",
        "ARN Generation & Tracking",
        "GST Certificate Download",
      ],
      badge: "Essential",
      color: "from-blue-500/10 to-indigo-500/5 border-blue-200"
    },
    {
      planId: "msme",
      name: "GST Registration + MSME",
      price: "₹2,999",
      regularPrice: "₹8,999",
      description: "Recommended for retail stores and manufacturing MSMEs.",
      features: [
        "Everything in Basic Plan",
        "MSME / Udyam Registration",
        "MSME Certificate Generation",
        "Priority CA Verification",
      ],
      badge: "Best Value",
      color: "from-indigo-500/15 via-blue-500/5 to-purple-500/5 border-indigo-200 shadow-md ring-2 ring-indigo-500/10"
    },
    {
      planId: "starter",
      name: "GST Business Starter Pack",
      price: "₹3,999",
      regularPrice: "₹12,999",
      description: "Complete setup for small firms and LLC business owners.",
      features: [
        "Everything in MSME Plan",
        "1-on-1 Business Consultation",
        "GST Compliance Filing Guide",
        "Wallet Credit Benefits",
      ],
      badge: "Recommended",
      color: "from-orange-500/10 to-amber-500/5 border-orange-200"
    },
    {
      planId: "premium",
      name: "GST Premium Advisor Pack",
      price: "₹4,999",
      regularPrice: "₹14,999",
      description: "For corporate builders wanting high-tier compliance.",
      features: [
        "Everything in Starter Pack",
        "Compliance Setup & Audit Review",
        "Dedicated Corporate CA Support",
        "Next-Day Urgent Filing Liaison",
      ],
      badge: "Enterprise",
      color: "from-emerald-500/10 to-teal-500/5 border-emerald-200"
    }
  ];

  // Process Steps Mapping
  const processSteps = [
    { step: 1, label: "Document Verification", desc: "Top corporate CAs review your identity proofs and address NOC for spelling errors." },
    { step: 2, label: "Application Draft", desc: "Drafting the GST registration form and resolving matching details." },
    { step: 3, label: "GST Submission", desc: "Uploading details to the government portal and submitting signature credentials." },
    { step: 4, label: "ARN Generated", desc: "Application Reference Number (ARN) issued to monitor department approval." },
    { step: 5, label: "GST Certificate Issued", desc: "Receiving your official 15-digit GSTIN portal account certificate." }
  ];

  // Determine active step based on application status or demo choice
  let activeStep = 1;
  let progressPercentage = 20;
  let statusText = "Ready to begin validation.";
  let estCompletion = "3 Working Days";

  if (!isDemoMode && activeGstApp) {
    const status = activeGstApp.status;
    if (status === "submitted" || status === "payment_pending") {
      activeStep = 1;
      progressPercentage = 20;
      statusText = "CA team verifying uploaded documents.";
    } else if (status === "review" || status === "action_required") {
      activeStep = 2;
      progressPercentage = 40;
      statusText = "Application draft prepared. Final checklist verification.";
    } else if (status === "in_progress" || status === "processing") {
      activeStep = 3;
      progressPercentage = 60;
      statusText = "Application uploaded and signature verification pending on GST Portal.";
    } else if (status === "updated" || status === "arn_generated") {
      activeStep = 4;
      progressPercentage = 80;
      statusText = "ARN generated! Awaiting Department clearance.";
    } else if (status === "approved" || status === "completed") {
      activeStep = 5;
      progressPercentage = 100;
      statusText = "GSTIN certificate generated! Active for business operations.";
      estCompletion = "Completed";
    }
  } else {
    // Demo mode mapping
    activeStep = demoStep + 1;
    progressPercentage = (demoStep + 1) * 20;
    const demoTexts = [
      "CA verifies upload files.",
      "GST Form drafting details.",
      "GST Portal document submit.",
      "ARN tracking status active.",
      "GSTIN Certificate download ready."
    ];
    statusText = demoTexts[demoStep] || "";
  }

  // 20 FAQ lists
  const faqList = [
    { q: "What is GST Registration?", a: "GST Registration is the process by which a business registers under the Goods and Services Tax (GST) Act to obtain a unique 15-digit GSTIN. It allows businesses to collect tax from customers and claim Input Tax Credit." },
    { q: "Is GST registration mandatory for all businesses?", a: "No, it is mandatory only if your annual aggregate turnover crosses the threshold limit (₹40 Lakhs for goods suppliers, ₹20 Lakhs for service providers) or if you meet specific mandatory criteria like selling online." },
    { q: "Can I register voluntarily if my turnover is below the limit?", a: "Yes, you can register voluntarily. It helps in claiming Input Tax Credit, opening bank accounts, and building trust with B2B corporate buyers." },
    { q: "What is the turnover threshold in Special Category States?", a: "For North-Eastern and hill states (special status), the threshold is ₹20 Lakhs for goods and ₹10 Lakhs for service providers." },
    { q: "Is GST mandatory for e-commerce sellers?", a: "Yes, under Section 24 of the GST Act, anyone supplying goods through e-commerce operators must obtain mandatory GST registration, regardless of turnover." },
    { q: "How long does it take to get a GSTIN?", a: "Typically, it takes 3 to 7 working days once the application is submitted. If the department raises a query, the timeline may extend slightly." },
    { q: "What is the penalty for operating without GST when required?", a: "A penalty of 10% of the tax due or ₹10,000 (whichever is higher) is applicable for non-registration under GST when legally required." },
    { q: "Can a person have multiple GST registrations?", a: "Yes, if a business operates in multiple states, it must obtain a separate GST registration for each state. You can also get multiple GSTINs in the same state for different business verticals." },
    { q: "What documents are required for an individual proprietorship?", a: "You need the owner's PAN and Aadhaar card, a passport photograph, a cancelled cheque or bank statement, and business address proof (such as electricity bill with NOC or rent agreement)." },
    { q: "Is a bank current account mandatory before applying?", a: "No, you can register using your personal savings bank details. Once the GSTIN is issued, you must open a current account and update bank details on the portal within 45 days." },
    { q: "What is the Composition Scheme?", a: "It is a simple tax scheme for small businesses with turnover below ₹1.5 Crore. They pay a flat rate of tax (1% to 6%) on sales and file fewer returns, but cannot claim Input Tax Credit." },
    { q: "What is Input Tax Credit (ITC)?", a: "ITC is the tax paid on business purchases (raw materials, office equipment, rent, etc.) that you can subtract from the tax you collect on sales, reducing your net tax liability." },
    { q: "Do freelancers need a GST registration?", a: "Only if their annual turnover crosses ₹20 Lakhs, or if they provide services to overseas clients, which is treated as an export of service." },
    { q: "What is an ARN?", a: "ARN stands for Application Reference Number. It is a unique number generated instantly when you submit your GST application, allowing you to track its approval status." },
    { q: "Can a registered business cancel its GSTIN?", a: "Yes, if the business closes, is sold, or turnover drops below the threshold, you can file a cancellation request on the portal." },
    { q: "Is physical verification of premises mandatory?", a: "Usually no, but the tax officer has the authority to carry out physical verification of the business address if they suspect fraudulent uploads." },
    { q: "What is a Casual Taxable Person?", a: "A person who occasionally undertakes transactions involving supply of goods or services in a state where they do not have a fixed place of business (e.g. trade fairs)." },
    { q: "Are export services exempt from GST?", a: "Exports are treated as 'zero-rated supplies'. You do not charge tax on exports, but you need a GST registration to claim refunds of taxes paid on domestic inputs." },
    { q: "What happens if there is a spelling mismatch in my documents?", a: "Spelling discrepancies between PAN, Aadhaar, and electricity bills can lead to application query rejection. Our team reviews files beforehand to prevent this." },
    { q: "Can I file GST returns myself once registered?", a: "Yes, but it is highly recommended to seek professional CA assistance to avoid errors in reconciliation, incorrect input claims, or late filing penalty blocks." }
  ];

  const filteredFaqs = faqList.filter(faq =>
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
            "mainEntity": faqList.map(item => ({
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

      {/* Dynamic Background Graphics */}
      <div className="absolute top-0 left-0 right-0 h-[650px] bg-[radial-gradient(circle_at_15%_15%,rgba(37,99,235,0.08),transparent_50%),radial-gradient(circle_at_85%_35%,rgba(99,102,241,0.06),transparent_50%),radial-gradient(circle_at_50%_60%,rgba(249,115,22,0.04),transparent_60%)] pointer-events-none" />
      
      {/* Floating particles background decoration */}
      <div className="absolute top-10 left-10 w-4 h-4 rounded-full bg-blue-400/20 blur-sm animate-bounce" style={{ animationDuration: "5s" }} />
      <div className="absolute top-96 right-16 w-6 h-6 rounded-full bg-indigo-400/20 blur-sm animate-pulse" />

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
              Fast, CA-Assisted <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 bg-clip-text text-transparent">GST Registration</span>
            </h1>

            <p className="text-base md:text-lg font-medium text-slate-500 leading-relaxed max-w-xl">
              Launch your business compliant from day one. Get complete guidance, paperless uploads, secure document checks, and direct integration with your DigiConnect wallet.
            </p>

            {/* Redesigned Premium CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href={isLoggedIn ? "/apply/gst-registration" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-registration")}`}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] hover:shadow-blue-500/30 active:scale-[0.98]"
              >
                Apply for GST Registration
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
                { label: "Govt Approved Process", desc: "100% compliant guidelines" },
                { label: "PAN India Service", desc: "Support in 28 states & UTs" },
                { label: "3 Day Turnaround", desc: "Fast application file" },
                { label: "20% Cashback", desc: "Wallet credit on approval" }
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

          {/* Hero Right: Premium Animated Mocks & Reflections */}
          <div className="relative flex justify-center">
            <div className="relative w-full max-w-[420px] aspect-[1/1.05] rounded-[42px] border border-white/60 bg-white/35 p-6 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col justify-between">
              
              {/* Internal shine overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-100%] animate-[shine_8s_infinite] pointer-events-none" />

              {/* Floating GSTIN Badge */}
              <div className="absolute top-8 left-[-15px] p-3 rounded-2xl border border-white/60 bg-white/85 shadow-xl backdrop-blur-sm flex items-center gap-2.5 animate-float-icon-1 max-w-[170px] z-10">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-md text-xs font-black">
                  GST
                </span>
                <div>
                  <p className="text-[10px] font-black text-slate-800 leading-none">GSTIN Approved</p>
                  <p className="text-[8px] font-bold text-emerald-600 mt-0.5">Active Portal Account</p>
                </div>
              </div>

              {/* Floating ARN Tracker Preview */}
              <div className="absolute bottom-12 right-[-20px] p-3.5 rounded-2xl border border-white/60 bg-white/85 shadow-xl backdrop-blur-sm flex items-center gap-2.5 animate-float-icon-2 max-w-[180px] z-10">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 text-xs font-black">
                  ARN
                </span>
                <div>
                  <p className="text-[10px] font-black text-slate-800 leading-none">Live ARN Tracker</p>
                  <p className="text-[8px] font-medium text-slate-400 mt-0.5">Update: Filed to Department</p>
                </div>
              </div>

              {/* Mock Certificate Visualizer with reflection */}
              <div className="w-full bg-white/90 border border-slate-100 rounded-3xl p-5 shadow-inner mt-4 flex-1 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50/10 via-transparent to-transparent pointer-events-none" />
                
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">FORM GST REG-06</span>
                    <h3 className="text-sm font-black text-slate-900 leading-none">Government of India</h3>
                    <p className="text-[9px] font-bold text-slate-400">Registration Certificate</p>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-blue-100 bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold">
                    Govt
                  </div>
                </div>

                <div className="my-4 space-y-2 border-t border-b border-dashed border-slate-100 py-3 text-[10px] font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Registration Number</span>
                    <span className="font-mono font-black text-slate-900">09AAACD1234F1Z3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Legal Name</span>
                    <span className="font-black text-slate-900">DigiConnect Solutions</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type of Liability</span>
                    <span className="font-black text-slate-900">Regular Taxpayer</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                  <span>Issued Date: 06/06/2026</span>
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Status: Valid</span>
                </div>
              </div>

              {/* Certificate Bottom Stats */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-150/50 mt-4 text-[10px] font-bold text-slate-400">
                <span>Secure SSL Encryption</span>
                <span>DigiConnect CA Network</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 - PROCESS TRACKER (GST PROGRESS CARD FIX) */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100/80">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
            Live Compliance Status
          </span>
          <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] mt-3 tracking-tight">
            Interactive Compliance Tracker
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2.5">
            {isDemoMode 
              ? "See how our interactive dashboard monitors your application's lifecycle. Click steps to view the flow." 
              : "Track your actual GST Registration progress live from our backend portal."}
          </p>
        </div>

        {/* Live Tracker Box */}
        <div className="glass-panel rounded-[42px] border border-white/60 p-6 md:p-10 shadow-xl max-w-4xl mx-auto bg-white/45 backdrop-blur-md">
          
          {/* Header Stats */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100/80 pb-6 mb-8">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">DigiConnect Live Portal</span>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                {isDemoMode ? "Interactive Walkthrough Mode" : "Your Active Application Status"}
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              </h3>
            </div>
            
            <div className="flex items-center gap-6 text-xs font-bold">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase">Estimated Completion</p>
                <p className="text-sm font-black text-slate-800">{estCompletion}</p>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase">Application Progress</p>
                <p className="text-sm font-black text-blue-600">{progressPercentage}%</p>
              </div>
            </div>
          </div>

          {/* Timeline Animation Component */}
          <div className="relative">
            {/* Horizontal Line backdrop */}
            <div className="absolute top-6 left-6 right-6 h-1 bg-slate-100 rounded pointer-events-none hidden md:block" />
            <div 
              className="absolute top-6 left-6 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded transition-all duration-500 pointer-events-none hidden md:block" 
              style={{ width: `calc(${progressPercentage}% - 48px)` }}
            />

            <div className="grid gap-8 md:grid-cols-5 relative">
              {processSteps.map((stepItem) => {
                const isCompleted = stepItem.step < activeStep;
                const isActive = stepItem.step === activeStep;
                
                return (
                  <div 
                    key={stepItem.step} 
                    onClick={() => isDemoMode && setDemoStep(stepItem.step - 1)}
                    className={`flex flex-col items-center text-center group ${isDemoMode ? "cursor-pointer" : ""} transition-all duration-200`}
                  >
                    {/* Circle Node */}
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative z-10 ${
                      isCompleted 
                        ? "bg-gradient-to-tr from-blue-600 to-indigo-600 border-transparent text-white shadow-md shadow-blue-500/10" 
                        : isActive 
                        ? "bg-white border-blue-500 text-blue-600 ring-4 ring-blue-50 shadow-md shadow-blue-500/20 scale-110" 
                        : "bg-white border-slate-200 text-slate-400"
                    }`}>
                      {isCompleted ? (
                        <Check className="h-5 w-5 font-black" />
                      ) : (
                        <span className="text-xs font-black">{stepItem.step}</span>
                      )}

                      {/* Active step pulse effect */}
                      {isActive && (
                        <span className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-30 pointer-events-none" />
                      )}
                    </div>

                    <div className="mt-4 space-y-1 max-w-[150px]">
                      <h4 className={`text-xs font-black transition-colors ${
                        isActive ? "text-blue-600" : isCompleted ? "text-slate-800" : "text-slate-400"
                      }`}>{stepItem.label}</h4>
                      <p className="text-[9px] font-semibold leading-normal text-slate-400">{stepItem.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Step Description Alert */}
          <div className="mt-10 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50 flex items-start gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold font-mono">
              i
            </span>
            <div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Current Phase Update</p>
              <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">
                {statusText} {isDemoMode && "Select any step node above to preview the system compliance update alert."}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 3 - PRICING REDESIGN (CAROUSEL / SLIDER) */}
      <section className="py-20 bg-gradient-to-b from-[#fbfcff] to-[#f4f7fc] px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100 shadow-sm">
              GST Registration Plans
            </span>
            <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] mt-3 tracking-tight">
              Flexible Packages Tailored For You
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-2.5">
              Swipe across registration options. All packages qualify for a 20% wallet cashback.
            </p>
          </div>

          {/* Carousel Slider */}
          <div className="relative max-w-5xl mx-auto">
            <div className="overflow-hidden py-6" ref={emblaRef}>
              <div className="flex gap-6">
                {gstPlans.map((plan, idx) => {
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
                            <span className="text-[9px] font-bold text-slate-400">excl. Govt fees</span>
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
                            href={isLoggedIn ? `/apply/gst-registration?plan=${plan.planId}` : `/login/customer?redirect=${encodeURIComponent(`/apply/gst-registration?plan=${plan.planId}`)}`}
                            className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md hover:scale-[1.01] transition duration-150 active:scale-[0.99]"
                          >
                            Apply with {plan.badge} Plan
                            <ArrowUpRight className="h-4 w-4" />
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
              {gstPlans.map((_, idx) => (
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

      {/* SECTION 4 - DIGICONNECT VS OTHERS COMPARISON TABLE */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
            Service Analysis
          </span>
          <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] mt-3 tracking-tight">
            DigiConnect Dukan Comparison
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2.5">
            See how DigiConnect Dukan contrasts with traditional CA agencies, freelancers, and other services.
          </p>
        </div>

        {/* Comparison grid wrapper */}
        <div className="overflow-x-auto border border-slate-150/60 bg-white rounded-3xl shadow-sm max-w-4xl mx-auto">
          <table className="min-w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4.5">Core Features</th>
                <th className="p-4.5 bg-blue-50/40 text-blue-700 border-l border-r border-blue-100 font-black">DigiConnect Dukan</th>
                <th className="p-4.5 text-slate-400">Local Agents</th>
                <th className="p-4.5 text-slate-400">Freelancer CAs</th>
                <th className="p-4.5 text-slate-400">Random Portals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              {[
                { name: "Certified CA Verification", dc: true, agent: "Varies", free: true, rand: "No Check" },
                { name: "Dedicated Help Support", dc: true, agent: "Office Hours", free: "Unreliable", rand: "Email Only" },
                { name: "Secure Document Review", dc: true, agent: "Manual Folders", free: "Email/WhatsApp", rand: "Self Submission" },
                { name: "Instant ARN Tracking", dc: true, agent: "Follow up call", free: "No dashboard", rand: "Manual upload" },
                { name: "WhatsApp Alerts & Sync", dc: true, agent: "Rarely", free: "Yes", rand: "No alerts" },
                { name: "20% Cashback Rewards", dc: true, agent: "No", free: "No", rand: "No" },
                { name: "Wallet Credits Redeemed", dc: true, agent: "No", free: "No", rand: "No" },
                { name: "Encrypted Secure Storage", dc: true, agent: "Paper files", free: "Google Drive", rand: "Standard servers" },
                { name: "Visual Status Tracking", dc: true, agent: "No", free: "No", rand: "Standard text status" },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
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

      {/* SECTION 5 - REWARD CENTER (CASHBACK SECTION UPGRADE) */}
      <section className="py-20 bg-gradient-to-b from-[#f4f7fc] to-[#fbfcff] px-4 md:px-8 border-t border-slate-100/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex rounded-full bg-orange-50 px-3.5 py-1 text-xs font-bold text-orange-700 border border-orange-100 shadow-sm">
              Reward Center
            </span>
            <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] mt-3 tracking-tight">
              Unlock Your Wallet Rewards
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-2.5">
              Obtain cashbacks, refer partners, and reduce fees across compliance services.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center max-w-5xl mx-auto">
            
            {/* Wallet illustration & Dashboard details */}
            <div className="glass-panel rounded-[42px] border border-white/60 p-6 md:p-8 bg-white/70 shadow-lg flex flex-col md:flex-row gap-6 items-center">
              
              {/* Animated SVG Wallet graphic */}
              <div className="w-36 h-36 shrink-0 relative flex items-center justify-center bg-blue-50 rounded-full border border-blue-100 shadow-inner">
                <svg viewBox="0 0 100 100" className="w-24 h-24 animate-pulse">
                  {/* Wallet outline */}
                  <path d="M20 30 h55 a 5 5 0 0 1 5 5 v35 a 5 5 0 0 1 -5 5 h-55 a 5 5 0 0 1 -5 -5 v-35 a 5 5 0 0 1 5 -5 z" fill="#3b82f6" fillOpacity="0.2" stroke="#2563eb" strokeWidth="2.5" />
                  {/* Coin details */}
                  <circle cx="50" cy="50" r="10" fill="#f59e0b" className="animate-[bounce_3s_infinite]" />
                  {/* Card slot decoration */}
                  <rect x="25" y="40" width="30" height="4" rx="2" fill="#2563eb" />
                </svg>
                <div className="absolute top-4 right-4 bg-orange-500 text-white rounded-full p-1 text-[8px] font-black animate-[ping_2s_infinite]">
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
                { title: "20% Cashback Guarantee", desc: "Get 20% of your service price instantly credited to your wallet once approved.", icon: Gift },
                { title: "Referral Bonus (₹100)", desc: "Share your code. Your partner gets 20% off and you receive ₹100 credits.", icon: Users },
                { title: "Future Filing Discounts", desc: "Redeem balance credits directly to compute GST Return filings or ITR orders.", icon: Calculator },
                { title: "Instant Payouts Tracker", desc: "Monitor wallet transactions history in your customer profile panel.", icon: Check }
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

      {/* SECTION 6 - TRUST & COMPLIANCE STATS (TRUST SECTION UPGRADE) */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
              Trust & Metrics
            </span>
            <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] tracking-tight leading-tight">
              Leading Compliance Portal In India
            </h2>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">
              We sync application forms directly with verified server databases. Our CA consultants verify every filing to avoid rejections.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: "PAN India Coverage", desc: "Support in 28 states & UTs" },
                { title: "Average Processing 72h", desc: "On-time application liaison" },
                { title: "Govt Approved Workflow", desc: "100% secure API sync" }
              ].map((badge, idx) => (
                <div key={idx} className="p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-start gap-2.5">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-slate-800 leading-none">{badge.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1">{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Animated Statistics Counters */}
          <div className="grid grid-cols-3 gap-6 p-6 rounded-[36px] border border-white/60 bg-white/40 shadow-inner backdrop-blur-md">
            {[
              { value: 50000, suffix: "+", label: "Happy Clients" },
              { value: 99.8, suffix: "%", label: "Accuracy Score" },
              { value: 24, suffix: "/7", label: "Active Support" }
            ].map((stat, idx) => (
              <div key={idx} className="text-center space-y-1.5 p-4 rounded-3xl bg-white border border-slate-100/50 shadow-sm flex flex-col justify-center">
                <p className="text-2xl md:text-3.5xl font-black text-blue-600 leading-none">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SECTION 7 - FAQS ACCORDION WITH LIVE SEARCH (FAQ UPGRADE) */}
      <section className="py-20 px-4 md:px-8 max-w-4xl mx-auto border-t border-slate-100">
        <div className="text-center mb-12 space-y-3">
          <span className="inline-flex rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
            Support FAQs
          </span>
          <h2 className="text-3xl md:text-4.5xl font-black text-[#071326] tracking-tight">
            Frequently Asked Questions
          </h2>
          
          {/* FAQ Live Search input */}
          <div className="relative max-w-md mx-auto pt-3">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search 20+ GST topics..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-200 bg-white/90 text-xs font-semibold outline-none focus:border-blue-500 shadow-inner transition"
            />
          </div>
        </div>

        {/* FAQ Accordion list */}
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
            <p className="text-center text-xs font-semibold text-slate-400 py-8">No matching compliance questions found.</p>
          )}
        </div>
      </section>

      {/* SECTION 8 - WIDGETS (CALCULATOR, PREVIOUS SECTIONS) */}
      <section className="py-16 bg-slate-50/45 px-4 md:px-8 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] items-center">
            
            <div className="space-y-4">
              <span className="inline-flex rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100 shadow-sm">
                Interactive Tool
              </span>
              <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 leading-tight">
                Instant GST Calculator
              </h2>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                Compute CGST, SGST, IGST, and billing totals automatically. Adjust base sums and toggle Exclusive / Inclusive tax rules.
              </p>

              <div className="bg-white border border-slate-100 p-5 rounded-[28px] shadow-sm space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400">Principal Amount (₹)</label>
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 transition"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400">Tax Mode</label>
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

            {/* Outputs */}
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
                  <div className="mt-3 space-y-1.5 text-[11px] font-semibold text-slate-650">
                    <div className="flex justify-between">
                      <span>Base Amount</span>
                      <span>{formatPrice(output.data.base)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CGST ({output.rate/2}%)</span>
                      <span>{formatPrice(output.data.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
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
        </div>
      </section>

      {/* LEAD CAPTURE FALLBACK FORM */}
      <section className="py-20 px-4 md:px-8 max-w-3xl mx-auto border-t border-slate-100">
        <div className="bg-white border border-slate-150/60 rounded-[36px] p-6 md:p-10 shadow-sm text-center space-y-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">Request a Free CA Consultation</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Still confused about types of schemes or documents? Leave your mobile and our specialist team will call you back.
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
              placeholder="Your Business Type / Specific Query (Optional)"
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

      {/* STICKY FOOTER CTA FOR MOBILE / DESKTOP */}
      {scrolledPastHero && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 border-t border-slate-100 shadow-lg p-4 z-40 backdrop-blur-md flex justify-between items-center max-w-7xl mx-auto rounded-t-3xl animate-[slideUp_0.3s_ease-out]">
          <div className="hidden md:block">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Premium GST Pack</p>
            <h4 className="text-sm font-black text-slate-800">Assisted GST Registration</h4>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Link
              href={isLoggedIn ? "/apply/gst-registration" : `/login/customer?redirect=${encodeURIComponent("/apply/gst-registration")}`}
              className="flex-1 md:flex-none inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-6 text-xs font-bold text-white shadow"
            >
              Apply for GST Registration
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
