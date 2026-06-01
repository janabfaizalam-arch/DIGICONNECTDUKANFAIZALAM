"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Shield,
  FileText,
  UserCheck,
  CheckCircle,
  Clock,
  ArrowRight,
  MessageCircle,
  FileCheck,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  Layers,
  Settings,
  Activity,
  ThumbsUp,
  Briefcase,
  FileSignature,
  Coins
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Custom type declaration to avoid typescript explicit 'any' lint issues
type winExtension = typeof window & {
  gtag?: (event: string, action: string, data: Record<string, unknown>) => void;
  fbq?: (event: string, action: string, data: Record<string, unknown>) => void;
};

// 12 Researched CM YUVA Eligible Loan Sectors (Strictly English Only)
const ELIGIBLE_SECTORS = [
  { title: "Manufacturing Sector", desc: "Setting up processing mills, packaging plants, textile production, or customized scale factories.", icon: Settings },
  { title: "Service Sector", desc: "Startups in software development labs, diagnostic centers, clinical consultancies, and tailoring hubs.", icon: Layers },
  { title: "Food Processing", desc: "Oil extraction setups, flour milling, cold storages, bakeries, and spices processing.", icon: Coins },
  { title: "Engineering Workshop", desc: "Auto-garage setups, lathe machining, sheet metal welding, and industrial fabrication workshops.", icon: Settings },
  { title: "Repair & Maintenance Services", desc: "Consumer appliance servicing, device check desks, and automobile repair centers.", icon: Activity },
  { title: "Technical Services", desc: "HVAC plant installations, architectural mapping, civil engineering designs, and plumbing setups.", icon: Shield },
  { title: "Digital & IT Services", desc: "Software development centers, cyber security setups, SEO consulting labs, and animation studios.", icon: UserCheck },
  { title: "Healthcare Related Services", desc: "Physiotherapy clinics, nursing consulting offices, pathology labs, and pharmacy dockets.", icon: Activity },
  { title: "Education & Skill Services", desc: "Coaching classes, vocational training hubs, gym centers, and skill certification schools.", icon: Award },
  { title: "Agro Processing Activities", desc: "Bio-fertilizer plants, solar food dryers, animal feed plants, and commercial nurseries.", icon: Coins },
  { title: "Small Industrial Units", desc: "Soap packaging works, fly-ash brick kilns, paper bag manufacturing, and box packaging.", icon: Settings },
  { title: "Professional Service Enterprises", desc: "Chartered accounting hubs, legal advice desks, and credit ratings consultancy offices.", icon: UserCheck }
];

// 20 Comprehensive FAQs for CM YUVA
const FAQS = [
  {
    q: "What is the CM YUVA Entrepreneur Loan Scheme?",
    a: "The Chief Minister's Youth Self-Employment Scheme (CM YUVA - Mukhyamantri Yuva Udyami Vikas Abhiyan) is a flagship initiative of the Uttar Pradesh government designed to empower young entrepreneurs to establish micro-ventures. The scheme offers subsidized, collateral-free credit facilities alongside professional advisory support, MSME registration certificate processing, and CA-certified Detailed Project Report (DPR) formulation, enabling young business minds to bootstrap their operations seamlessly."
  },
  {
    q: "What are the exact eligibility criteria for applying?",
    a: "To qualify for CM YUVA support, candidates must satisfy the following credentials: 1) Be a permanent resident of Uttar Pradesh. 2) Aged between 21 and 40 years at the time of filing. 3) Have successfully completed at least Class 8th education (higher qualifications like Class 10th, 12th, or Graduates are highly preferred). 4) Must not be a defaulter with any financial institution. 5) Must not have availed subventions under prime minister's employment schemes or other state-sponsored funding pipelines."
  },
  {
    q: "What is the maximum loan limit for manufacturing and service sectors?",
    a: "Under the officially updated scheme, eligible candidates can secure financial assistance depending on the sector: A) Industrial Manufacturing Units can apply for project loans up to ₹10 Lakhs. B) Service Sector Units and Small Scale Retail operations can secure funding assistance up to ₹5 Lakhs. These caps are strictly allocated to cover both capital asset expenditure (machinery, tools) and working capital needs."
  },
  {
    q: "Is it true that CM YUVA offers a 0% interest-free business loan?",
    a: "Yes! The core highlight of the CM YUVA scheme is the interest-free subvention structure. Under the rules, the state government provides interest support (subvention) which effectively reduces the interest liability of the entrepreneur to 0%. The borrower is expected to repay the baseline principal installments, and the state finance department credits the interest subventions directly back to the linked bank account upon prompt monthly repayment."
  },
  {
    q: "What is the ₹50,000 subsidy (Margin Money Support)?",
    a: "In addition to interest subvention, the scheme provides a direct Margin Money Subsidy of 10% of the total project cost, capped at a maximum of ₹50,000. This margin money is credited directly to the entrepreneur's loan account as upfront government grant. This significantly reduces the total principal liability that the business owner needs to repay to the commercial bank branch."
  },
  {
    q: "Why is a Detailed Project Report (DPR) mandatory, and how does DigiConnect help?",
    a: "A Detailed Project Report (DPR) is the most critical document reviewed by bank credit managers and District Industry Centre panels. It lists fixed capital costs, machinery quotes, projected balance sheets, operational cash-flows, and break-even ratios. A generic template is immediately rejected. DigiConnect employs experienced financial analysts who prepare customized, bank-compliant DPRs signed by certified Chartered Accountants (CAs) to ensure maximum approval speed."
  },
  {
    q: "What documents are required for filing a CM YUVA application?",
    a: "The standard checklist comprises: 1) Aadhaar Card linked to active mobile, 2) PAN Card, 3) UP Domicile Certificate, 4) Educational Marksheet (Class 8th minimum), 5) Caste Certificate (if claiming subvention benefits), 6) Proposed business layout address proof, 7) Detailed machinery quotation from an authorized dealer, 8) Project cost summary report (DPR), 9) Non-defaulting affidavit stamped by notary, and 10) EDP training certificate (if completed)."
  },
  {
    q: "What are the common reasons for application rejection?",
    a: "The three most common failure points are: A) Spelling discrepancies where name characters on Aadhaar, PAN, or marksheets do not match exactly. B) Classifying a pure retail trading shop as a service enterprise, as standard retail trading is not eligible. C) Inaccurate machinery quotes or non-compliant project reports that do not conform to banking credit assessment standards."
  },
  {
    q: "Can women entrepreneurs apply, and are there special benefits?",
    a: "Absolutely! The Uttar Pradesh government actively promotes women's entrepreneurship. Women candidates enjoy priority routing channels, faster file processing, and dedicated liaison dockets at the District Industry Centre (DIC). Our advisors specialize in structuring applications to ensure female-led startups receive these benefits without administrative delay."
  },
  {
    q: "How does the end-to-end application support timeline work?",
    a: "The timeline comprises six key milestones: 1) DigiConnect experts run eligibility tests and gather your scans. 2) Our analysts prepare your custom DPR and CA certified reports. 3) We complete your MSME/Udyam filings. 4) We upload the complete compiled dossier to the official UP self-employment portal. 5) We assist in tracking DUDA, NIC, and DIC approvals. 6) The DIC recommends the recommended file to the designated bank branch for credit disbursal."
  },
  {
    q: "Is an Entrepreneurship Development Program (EDP) certificate mandatory?",
    a: "Completing EDP training is a vital element for final loan disbursal. While you can submit the initial file without it, banks and DIC require the EDP certificate to execute the final credit agreement. DigiConnect helps candidates register for official online EDP modules to ensure they secure their training credentials on time."
  },
  {
    q: "Does DigiConnect guarantee that the bank will approve the loan?",
    a: "No professional organization can guarantee credit approval, as loan sanctioning is the sole statutory discretion of the financing bank branch based on credit scores (CIBIL) and overall project viability. However, DigiConnect guarantees premium consulting support, correct document structuring, compliant DPRs, and DIC liaisoning assistance to maximize your approval probability."
  },
  {
    q: "How does the interest subvention reimbursement work?",
    a: "It follows a quarterly reimbursement loop: A) The entrepreneur promptly pays the standard monthly EMI. B) The bank branch logs the prompt payment logs. C) The District Industry Centre (DIC) files a subvention claim with the state treasury. D) The state finance department directly credits the interest amount back to the entrepreneur's savings/current account, effectively rendering the loan interest-free."
  },
  {
    q: "What type of businesses are eligible under the manufacturing category?",
    a: "The manufacturing category covers small scale industrial setups like flour mills, spice grinding plants, oil mills, paper box manufacturing, textile weaving, garments packaging, soap making, building block factories, fly-ash brick kilns, bio-fertilizer plants, and generic agro-processing operations."
  },
  {
    q: "What business operations qualify under the service sector category?",
    a: "Eligible service operations include diagnostic laboratories, software development centers, cyber cafes, digital IT consulting labs, auto repair garages, mobile servicing centers, consumer appliance repair desks, plumbing/HVAC consulting offices, coaching institutes, wellness gyms, and professional services offices like chartered accounting or legal advisory desks."
  },
  {
    q: "Is CIBIL score checked for CM YUVA loans?",
    a: "Yes. Banks strictly pull CIBIL reports of the applicant. Any active default, write-off, or settlement history with other lenders triggers immediate credit rejection. Candidates must maintain a clean repayment record to successfully pass the bank's credit evaluation checks."
  },
  {
    q: "How is DigiConnect Dukan connected with RNoS India?",
    a: "DigiConnect Dukan is a premium national digital services and finance marketplace powered by **RNoS India Pvt Ltd**. We leverage our extensive network of certified credit analysts, legal associates, and chartered accountants to deliver premium corporate-grade consulting services for government schemes."
  },
  {
    q: "Can I apply if I currently have another active business loan?",
    a: "Generally, candidates with active commercial loans are disqualified from claiming CM YUVA subventions, as the scheme is designed to help fresh start-ups. However, if the existing credit is fully repaid and closed with a clear No-Objection Certificate (NOC), you are eligible to file a fresh application."
  },
  {
    q: "How does the WhatsApp status tracking integration work?",
    a: "DigiConnect incorporates a stateful CRM. The moment your file is registered, a dedicated lead tracking profile is activated. Any update—such as DPR preparation, portal upload, municipal verification, or DIC forwarding—triggers automated notification alerts sent directly to your verified WhatsApp mobile number, keeping you updated in real-time."
  },
  {
    q: "How do I get started with my CM YUVA application on DigiConnect?",
    a: "Starting is extremely simple: 1) Run the Eligibility Checklist on this page to confirm your basic profile qualifications. 2) Click the 'Apply Online Now' CTA to access our digital registration form. 3) Or click the green 'WhatsApp Help' button to connect directly with a certified loan advisor who will guide you step-by-step."
  }
];

export function CmYuvaClientPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Track broken image states with styled gradient fallbacks
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Counters state
  const [counters, setCounters] = useState({
    assisted: 0,
    reports: 0,
    msme: 0,
    rating: 0
  });

  // Count-up animation on mount
  useEffect(() => {
    const duration = 2000;
    const steps = 50;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setCounters({
        assisted: Math.floor((12450 / steps) * step),
        reports: Math.floor((8240 / steps) * step),
        msme: Math.floor((10120 / steps) * step),
        rating: Number(((4.9 / steps) * step).toFixed(1))
      });

      if (step >= steps) {
        setCounters({
          assisted: 12450,
          reports: 8240,
          msme: 10120,
          rating: 4.9
        });
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const triggerAnalyticsEvent = (name: string, payload: Record<string, unknown> = {}) => {
    if (typeof window !== "undefined") {
      const win = window as winExtension;
      if (typeof win.gtag === "function") {
        win.gtag("event", name, payload);
      }
      if (typeof win.fbq === "function") {
        win.fbq("trackCustom", name, payload);
      }
      console.log(`[Analytics Event] ${name}:`, payload);
    }
  };

  const handleImageError = (key: string) => {
    setImageErrors(prev => ({ ...prev, [key]: true }));
    console.warn(`[Image Failback Triggered] Asset '${key}' failed to render correctly.`);
  };

  return (
    <div className="relative min-h-screen pb-48 pt-4 bg-slate-50 overflow-x-hidden">
      {/* Dynamic Sheen elements */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-blue-400/10 blur-[130px]" />
      <div className="pointer-events-none absolute top-1/2 right-10 h-[500px] w-[500px] rounded-full bg-orange-400/10 blur-[110px]" />

      {/* COMPACT BOTTOM STICKY CTA BAR - MOBILE OVERLAP SPARED */}
      <div className="fixed bottom-[72px] sm:bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/95 py-2.5 shadow-[0_-8px_30px_rgba(7,19,38,0.06)] backdrop-blur-md print:hidden pb-safe">
        <div className="container-shell flex items-center justify-between gap-3 flex-row max-w-5xl">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 overflow-hidden bg-slate-900 rounded-lg shrink-0 flex items-center justify-center">
              {!imageErrors["sticky-logo"] ? (
                <Image
                  src="/images/services/yuva/cm-yuva-logo.png"
                  alt="CM YUVA Logo"
                  fill
                  sizes="36px"
                  onError={() => handleImageError("sticky-logo")}
                  className="object-contain"
                />
              ) : (
                <span className="text-[10px] font-black text-white">YUVA</span>
              )}
            </div>
            <div className="hidden xs:block">
              <p className="text-[8px] font-black text-slate-400 uppercase leading-none tracking-wider">UP Government Scheme</p>
              <h4 className="text-xs font-black text-slate-950 mt-0.5">CM YUVA Assistance</h4>
            </div>
          </div>
          <div className="flex gap-2 flex-1 sm:flex-none justify-end">
            <Link
              href="/apply/cm-yuva-entrepreneur-loan-assistance"
              onClick={() => triggerAnalyticsEvent("sticky_apply_now")}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-blue-700 to-indigo-600 px-5 text-xs font-black text-white transition hover:-translate-y-0.5 shadow-sm shadow-blue-500/10"
            >
              Apply Now
              <ArrowRight className="h-3 w-3" />
            </Link>
            <a
              href="https://wa.me/917007595931?text=Hello,%20I%20am%20interested%20in%20CM%20YUVA%20Entrepreneur%20Loan%20Assistance."
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerAnalyticsEvent("whatsapp_consultation_click", { location: "sticky_bar" })}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-[#25D366] px-4 text-xs font-black text-white transition hover:bg-[#20ba56]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="container-shell space-y-16 max-w-5xl">
        
        {/* ================= HIGH-IMPACT PREMIUM HERO SECTION ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[2rem] border border-blue-100/50 bg-slate-900 text-white p-5 sm:p-8 md:p-12 shadow-[0_20px_50px_rgba(7,19,38,0.12)] text-center flex flex-col items-center"
        >
          {/* fintech background glow */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-[80px]" />
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-[300px] w-[300px] rounded-full bg-orange-500/10 blur-[80px]" />
          
          <div className="relative z-10 max-w-3xl space-y-6 flex flex-col items-center">
            
            {/* 1. CM YUVA Logo at the top */}
            <div className="relative w-28 h-12 overflow-hidden bg-white/5 rounded-xl p-1 flex items-center justify-center border border-white/10">
              {!imageErrors["hero-logo"] ? (
                <Image
                  src="/images/services/yuva/cm-yuva-logo.png"
                  alt="CM YUVA Logo"
                  fill
                  priority
                  sizes="112px"
                  onError={() => handleImageError("hero-logo")}
                  className="object-contain filter brightness-110 drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]"
                />
              ) : (
                <span className="text-sm font-black tracking-widest text-white">CM YUVA</span>
              )}
            </div>

            {/* 2. Government Badge */}
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
              <Award className="h-3.5 w-3.5 text-blue-400" /> UP Government Scheme Support
            </span>

            {/* 3. Headline (Clean - no inline logos) */}
            <h1 className="text-3.5xl font-black leading-tight tracking-tight text-white sm:text-4.5xl md:text-5.5xl">
              CM YUVA Business Loan Assistance
            </h1>

            {/* Subheading */}
            <p className="text-xs sm:text-sm leading-relaxed text-slate-300 max-w-xl mx-auto">
              Professional support for project report, MSME registration, documentation, and application process under CM YUVA scheme.
            </p>

            {/* 4. Trust Badges in elegant row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-2xl pt-2">
              {[
                "Government Supported",
                "0% Interest Support",
                "Up to ₹5 Lakh",
                "₹50,000 Subsidy"
              ].map((badge, idx) => (
                <div key={idx} className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200">{badge}</span>
                </div>
              ))}
            </div>

            {/* 5. Hero Poster Panel (Centered aspect ratio verified) */}
            <div className="relative w-full max-w-[500px] aspect-[16/10] sm:aspect-[4/3] md:aspect-square overflow-hidden rounded-[24px] bg-slate-800 shadow-2xl border border-white/5 mt-4">
              {!imageErrors["hero-poster"] ? (
                <Image
                  src="/images/services/yuva/hero-banner.jpg"
                  alt="CM YUVA Scheme ₹5 Lakh Interest-Free Business Loan"
                  fill
                  priority
                  sizes="(min-width: 1024px) 500px, 95vw"
                  onError={() => handleImageError("hero-poster")}
                  className="object-cover rounded-[24px]"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
                  <Coins className="h-10 w-10 text-orange-500 mb-2 animate-bounce" />
                  <h4 className="text-sm font-black text-white">UP CM YUVA Scheme Funding</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Get up to ₹10 Lakhs for Industrial units & ₹5 Lakhs for Service startups.</p>
                </div>
              )}
            </div>

            <div className="flex flex-row gap-3 pt-4 justify-center">
              <Link
                href="/apply/cm-yuva-entrepreneur-loan-assistance"
                onClick={() => triggerAnalyticsEvent("hero_apply_click")}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-6 text-xs font-black text-white shadow-md shadow-blue-500/10 transition hover:-translate-y-0.5"
              >
                Apply Online Now
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="#eligible-sectors"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-5 text-xs font-black text-white transition hover:bg-white/10"
              >
                Sectors
              </a>
            </div>
          </div>
        </motion.section>

        {/* ================= DUAL STORYTELLING POSTERS SECTION ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FF8A00]">Visual Storytelling</p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Government Support & Subsidy Overview</h2>
            <p className="mt-1.5 text-xs text-slate-500 max-w-xl mx-auto">DigiConnect Dukan maps your dockets directly against these two primary state government loan benefits.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Poster 1 */}
            <div className="glass-panel rounded-[24px] p-4 flex flex-col justify-between shadow-sm bg-white border border-slate-100">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-800 shadow-[inset_0_1px_4px_rgba(0,0,0,0.03)] border border-slate-200/40">
                {!imageErrors["subsidy-poster"] ? (
                  <Image
                    src="/images/services/yuva/interest-free-poster.png"
                    alt="0% Interest-Free Business Loan Poster"
                    fill
                    loading="lazy"
                    sizes="(min-width: 768px) 45vw, 95vw"
                    onError={() => handleImageError("subsidy-poster")}
                    className="object-cover rounded-xl"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-indigo-950 flex flex-col items-center justify-center p-4 text-center">
                    <TrendingUp className="h-8 w-8 text-blue-400 mb-1" />
                    <h4 className="text-xs font-black text-white">0% Interest Business Loan</h4>
                    <p className="text-[9px] text-slate-300 mt-1">Structured state subvention credits reimburse quarterly interest costs completely.</p>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[9px] font-black text-blue-700">
                  <TrendingUp className="h-3 w-3" /> 0% Interest Support
                </div>
                <h3 className="text-sm font-black text-slate-950">Interest-Free Financial Assistance</h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  Under UP Chief Minister Youth Self Employment policies, eligible candidates are assisted to secure interest-free subventions. This financial support helps bootstrap micro-ventures without the heavy burden of commercial bank interest rates.
                </p>
              </div>
            </div>

            {/* Poster 2 */}
            <div className="glass-panel rounded-[24px] p-4 flex flex-col justify-between shadow-sm bg-white border border-slate-100">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-800 shadow-[inset_0_1px_4px_rgba(0,0,0,0.03)] border border-slate-200/40">
                {!imageErrors["margin-poster"] ? (
                  <Image
                    src="/images/services/yuva/subsidy-poster.png"
                    alt="₹50,000 Subsidy Support Poster"
                    fill
                    loading="lazy"
                    sizes="(min-width: 768px) 45vw, 95vw"
                    onError={() => handleImageError("margin-poster")}
                    className="object-cover rounded-xl"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-900 to-amber-950 flex flex-col items-center justify-center p-4 text-center">
                    <Coins className="h-8 w-8 text-orange-400 mb-1" />
                    <h4 className="text-xs font-black text-white">₹50,000 Government Subsidy</h4>
                    <p className="text-[9px] text-slate-300 mt-1"> upfront 10% Margin Money Subsidy accredited to lower total principal liabilities.</p>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-[9px] font-black text-[#FF8A00]">
                  <Coins className="h-3 w-3" /> Up to ₹50,000 Subsidy
                </div>
                <h3 className="text-sm font-black text-slate-950">Direct Government Margin Money Subsidy</h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  Qualifying startups are supported to receive direct margin money subvention grants up to ₹50,000 from the state government repository. DigiConnect handles the District Industry Centre documentation pipeline to ensure your grant files verify without errors.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ================= QUICK ELIGIBILITY CHECKLIST ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FF8A00]">Simple Checklist</p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Quick Eligibility Check</h2>
            <p className="mt-1.5 text-xs text-slate-500 max-w-xl mx-auto">Verify your profile against the basic government scheme requirement parameters.</p>
          </div>

          <div className="mx-auto max-w-3xl grid gap-3 sm:grid-cols-2">
            {[
              { title: "Age Limits Criteria", desc: "Applicant must be aged between 21 and 40 years." },
              { title: "Residency Status", desc: "Must be a verified permanent resident of Uttar Pradesh." },
              { title: "Educational Floor", desc: "Minimum academic proof of Class 8 passed certificate or above." },
              { title: "Proposed Operations", desc: "Interested in establishing Manufacturing or Service Sector business." }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900">{item.title}</h3>
                  <p className="mt-0.5 text-[10px] text-slate-500 leading-normal">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ================= REQUIRED DOCUMENTATION SECTIONS ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            {/* Documents Required From Applicant */}
            <div className="space-y-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-[#FF8A00]">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">Documents Required From Applicant</h2>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed border-b border-slate-50 pb-2">Gather and prepare scanned copies of these four mandatory documents:</p>
              
              <div className="space-y-2">
                {[
                  { n: "1. PAN Card", d: "Mandatory individual tax identifier proof." },
                  { n: "2. Aadhaar Card", d: "Must be linked to an active mobile number." },
                  { n: "3. Bank Passbook", d: "Required for linking the subvention account." },
                  { n: "4. Class 8 Marksheet or Above", d: "Official academic proof of eligibility." }
                ].map((doc, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 rounded-xl bg-slate-50/50 p-2.5 border border-slate-100/60">
                    <CheckCircle className="h-4 w-4 shrink-0 text-orange-500 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{doc.n}</h4>
                      <p className="text-[10px] text-slate-500 leading-none mt-0.5">{doc.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents & Reports Prepared By DigiConnect */}
            <div className="space-y-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <FileSignature className="h-3.5 w-3.5" />
                </span>
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">Documents & Reports Prepared By DigiConnect</h2>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed border-b border-slate-50 pb-2">Our certified professionals compile these dockets for your files:</p>

              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                {[
                  "CA Certified Project Report",
                  "Government Sectional Letter Assistance",
                  "Detailed Project Report (DPR)",
                  "Affidavit Preparation",
                  "Machinery & Project Information Report",
                  "District Industry Centre Letter Assistance",
                  "MSME Registration Certificate",
                  "Caste Certificate Assistance",
                  "Domicile Certificate Assistance",
                  "CM YUVA Entrepreneur Development Certificate Assistance"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] font-bold text-slate-700 p-1.5 rounded-lg bg-slate-50/50 border border-slate-100/40">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ================= SHIPMENT/CRM workflow STYLE TIMELINE TRACKER ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FF8A00]">CRM Pipeline</p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Application Process & Approval Workflow</h2>
            <p className="mt-1.5 text-xs text-slate-500 max-w-xl mx-auto">Real shipment-style application tracking. Follow your loan assistance status milestones.</p>
          </div>

          <div className="mx-auto max-w-3xl relative pl-10 sm:pl-12">
            {/* Shipment line */}
            <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-200">
              <div className="h-1/5 w-full bg-emerald-500" />
              <div className="h-1/5 w-full bg-emerald-500" />
              <div className="h-1/10 w-full bg-blue-500" />
            </div>

            <div className="space-y-6">
              {[
                { s: 1, title: "Lead Created", tracking: "Completed", desc: "Customer enquiry and basic details are successfully recorded inside our CRM system.", icon: CheckCircle2, color: "border-emerald-500 text-emerald-600 bg-emerald-50/50", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                { s: 2, title: "Document Collection", tracking: "Completed", desc: "PAN, Aadhaar, Bank Passbook, and Class 8 marksheet files are collected and scanned.", icon: CheckCircle2, color: "border-emerald-500 text-emerald-600 bg-emerald-50/50", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                { s: 3, title: "Project Report Preparation", tracking: "In Progress", desc: "In-house credit analysts and CAs formulate your project reports (DPR) and financial cost summaries.", icon: Activity, color: "border-blue-500 text-blue-600 bg-blue-50/40 animate-pulse", badge: "bg-blue-50 text-blue-700 border-blue-100" },
                { s: 4, title: "MSME / Udyam Registration", tracking: "Pending", desc: "Official Udyam micro-certificate filing is completed online to map priority bank lending benefits.", icon: Clock, color: "border-slate-200 text-slate-400 bg-slate-50/40", badge: "bg-slate-100 text-slate-600 border-slate-200" },
                { s: 5, title: "Application Preparation", tracking: "Pending", desc: "The CM YUVA application dossier is compiled, checked against our compliance audit list, and prepared for launch.", icon: Clock, color: "border-slate-200 text-slate-400 bg-slate-50/40", badge: "bg-slate-100 text-slate-600 border-slate-200" },
                { s: 6, title: "DUDA / Department Review", tracking: "Pending", desc: "Municipal bodies and system developers run digital credential checks on your applications.", icon: Clock, color: "border-slate-200 text-slate-400 bg-slate-50/40", badge: "bg-slate-100 text-slate-600 border-slate-200" },
                { s: 7, title: "NIC / Portal Verification", tracking: "Pending", desc: "Portal-level technical verification processes are completed on UP Government Youth Self Employment systems.", icon: Clock, color: "border-slate-200 text-slate-400 bg-slate-50/40", badge: "bg-slate-100 text-slate-600 border-slate-200" },
                { s: 8, title: "DIC Approval Support", tracking: "Pending", desc: "District Industry Centre credit liaisoning and representational support to prevent file backlog.", icon: Clock, color: "border-slate-200 text-slate-400 bg-slate-50/40", badge: "bg-slate-100 text-slate-600 border-slate-200" },
                { s: 9, title: "Bank Processing", tracking: "Pending", desc: "The DIC panel recommends the file to the bank for credit evaluation, bank scoring (CIBIL) checks, and term-sheet sanctioning.", icon: Clock, color: "border-slate-200 text-slate-400 bg-slate-50/40", badge: "bg-slate-100 text-slate-600 border-slate-200" },
                { s: 10, title: "Final Outcome", tracking: "Pending", desc: "Sanctioned credit is successfully disbursed to your current account, launching your venture! Final outcome depends on bank credit reviews.", icon: Clock, color: "border-slate-200 text-slate-400 bg-slate-50/40", badge: "bg-slate-100 text-slate-600 border-slate-200" }
              ].map((step) => {
                const StepIcon = step.icon;
                return (
                  <div key={step.s} className="relative flex gap-4 items-start">
                    {/* Node */}
                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm ${
                      step.tracking === "Completed" ? "border-emerald-500 text-emerald-600" : step.tracking === "In Progress" ? "border-blue-500 text-blue-600" : "border-slate-200 text-slate-400"
                    }`}>
                      <StepIcon className="h-4.5 w-4.5" />
                    </div>

                    {/* Shipment card */}
                    <div className={`flex-1 rounded-[1.5rem] border p-4 shadow-sm bg-white transition duration-150 ${
                      step.tracking === "Completed" ? "border-emerald-100" : step.tracking === "In Progress" ? "border-blue-200 ring-1 ring-blue-100/50" : "border-slate-100"
                    }`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase text-slate-400">Step {step.s}</span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${step.badge}`}>
                          {step.tracking}
                        </span>
                      </div>
                      <h4 className="mt-1.5 text-xs font-black text-slate-900 leading-snug">{step.title}</h4>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* ================= DEPARTMENT & PORTAL SUPPORT ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Verification Panels</p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Department & Portal Support</h2>
            <p className="mt-1.5 text-xs text-slate-500 max-w-xl mx-auto">We trace every liaisoning status on our CRM dashboards to prevent application blockages.</p>
          </div>

          <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "DUDA Approval Assistance", status: "Active Support", icon: Shield, desc: "Review representation at Urban Development authority panel gates." },
                { title: "NIC Approval Assistance", status: "System Sync", icon: Settings, desc: "Technical system credential verification on UP State portal logs." },
                { title: "Udyam/MSME Approval Assistance", status: "Direct Link", icon: UserCheck, desc: "Priority MSME filing support to map special banking lending rates." },
                { title: "DIC Approval Assistance", status: "Liaison Stage", icon: Activity, desc: "Liaison dockets representing project cost reports to the District Centre." }
              ].map((item, idx) => {
                const IconComp = item.icon;
                return (
                  <div key={idx} className="relative rounded-2xl bg-slate-50 p-4 border border-slate-100/60 flex flex-col justify-between min-h-[140px]">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <IconComp className="h-4 w-4" />
                        </span>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-700">
                          {item.status}
                        </span>
                      </div>
                      <h3 className="mt-3 text-xs font-black text-slate-900 leading-snug">{item.title}</h3>
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* ================= DEDICATED BENEFITS GRID SECTION ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Exclusive Advantages</p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Key Benefits of CM YUVA Scheme</h2>
            <p className="mt-1.5 text-xs text-slate-500 max-w-xl mx-auto">Every eligibility detail is optimized to deliver direct fiscal advantages to your venture.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Up To ₹5 Lakh Loan", desc: "Access standard credit lines for service/retail startups, or up to ₹10 Lakhs for industrial units.", icon: Coins },
              { title: "0% Interest Support", desc: "Full state government interest subvention credits reimburse interest costs completely.", icon: TrendingUp },
              { title: "₹50,000 Subsidy", desc: "Receive upfront 10% Margin Money Subsidy to lower the net principal loan repayment amount.", icon: Award },
              { title: "Project Report Support", desc: "Expert advisory teams prepare compliant Detailed Project Reports (DPR) to satisfy bank panels.", icon: FileText },
              { title: "MSME Registration", desc: "Immediate online Udyam filing secures priority banking loan approvals and interest rates.", icon: UserCheck },
              { title: "End-to-End Assistance", desc: "Direct liaisoning at District Industry Centre (DIC) guides your application from creation to disbursal.", icon: Shield }
            ].map((benefit, idx) => {
              const IconComp = benefit.icon;
              return (
                <div key={idx} className="group relative overflow-hidden rounded-[2rem] border border-blue-50 bg-white p-5 shadow-sm hover:border-blue-200 transition duration-150">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition duration-200 group-hover:bg-blue-600 group-hover:text-white">
                    <IconComp className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="mt-3 text-sm font-black text-slate-950">{benefit.title}</h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{benefit.desc}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* ================= ELIGIBLE LOAN SECTORS (NO RETAIL SHOP OR TRADE) ================= */}
        <motion.section 
          id="eligible-sectors" 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-6 scroll-mt-6"
        >
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Sector Rules</p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Eligible Loan Sectors</h2>
            <p className="mt-1.5 text-xs text-slate-500 max-w-xl mx-auto">Official eligible operations supported under Chief Minister YUVA subvention criteria. Retail or trading is not eligible.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ELIGIBLE_SECTORS.map((sector, idx) => {
              const CardIcon = sector.icon;
              return (
                <div key={idx} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-blue-200 transition duration-150">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition duration-150 group-hover:bg-blue-600 group-hover:text-white">
                    <CardIcon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 text-xs font-black text-slate-950">{sector.title}</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500 line-clamp-3">{sector.desc}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* ================= COMPREHENSIVE TRUST SECTION ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FF8A00]">Liaison Trust</p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Why Applicants Trust DigiConnect</h2>
            <p className="mt-1.5 text-xs text-slate-500 max-w-xl mx-auto">We combine certified financial expertise with real-time transparent pipeline status updates.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Secure Document Handling", desc: "All scans are stored in bank-grade AES-256 cloud encryption panels.", icon: Shield },
              { title: "Expert Project Report Support", desc: "CA certified credit experts prepare and sign highly compliant project reports (DPR).", icon: FileSignature },
              { title: "MSME Registration Assistance", desc: "Filing and code structure is optimized for instant priority banking credit approvals.", icon: UserCheck },
              { title: "Application Process Guidance", desc: "Exhaustive review structures satisfy DUDA, NIC, and DIC panel requirements.", icon: Briefcase },
              { title: "WhatsApp Support", desc: "Automated tracking updates and query resolutions are dispatched to WhatsApp.", icon: MessageCircle },
              { title: "Transparent Communication", desc: "No hidden charges. Clear consultation dockets before payment checkout logs.", icon: ThumbsUp }
            ].map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div key={idx} className="flex gap-3 rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition duration-150">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF8A00]">
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-950 leading-snug">{item.title}</h3>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compliance note */}
          <div className="rounded-2xl bg-slate-100/60 p-4 text-[10px] text-slate-500 leading-relaxed text-center border border-slate-200/40">
            ℹ️ <strong>Compliance Note:</strong> DigiConnect Dukan provides documentation, project report, registration and application assistance services. Final approval, subsidy approval and loan sanction are subject to government department and bank decision.
          </div>
        </motion.section>

        {/* ================= PREMIUM COMPARISON TABLE ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Strategy Check</p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Self-Application vs DigiConnect</h2>
            <p className="mt-1.5 text-xs text-slate-500 max-w-xl mx-auto">Discover how our structured representational filings reduce rejection ratios.</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/55">
                    <th className="p-3 text-[10px] font-extrabold text-slate-950 uppercase tracking-wider">Feature</th>
                    <th className="p-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Self Application</th>
                    <th className="p-3 text-[10px] font-extrabold text-blue-700 uppercase tracking-wider bg-blue-50/30">DigiConnect Assistance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] leading-relaxed">
                  {[
                    { f: "DPR Project Report", s: "Generic, self-made templates prone to bank rejections", d: "CA-Formulated, bank-compliant Detailed Project Report signed by a CA" },
                    { f: "MSME/Udyam Registration", s: "Manual filing with risks of incorrect code allocation", d: "Expert filing with exact industrial code alignment" },
                    { f: "District Liaison Support", s: "Applicant has to follow up manually at DIC panels", d: "Liaisoning team guides file through DUDA/NIC/DIC gates" },
                    { f: "Spelling & Scan Verification", s: "Discrepancies trigger system rejection immediately", d: "Multi-layered audit checklist guarantees error-free scans" },
                    { f: "Application Tracking", s: "No tracking available until bank recommends or rejects", d: "Stateful CRM logging sends updates to WhatsApp" },
                    { f: "EDP Training Setup", s: "Manual search for available state training schedules", d: "Advisors arrange and coordinate rapid EDP certification" }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30">
                      <td className="p-3 font-extrabold text-slate-950">{row.f}</td>
                      <td className="p-3 text-slate-500">{row.s}</td>
                      <td className="p-3 text-slate-700 font-medium bg-blue-50/15">{row.d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* ================= PREMIUM INDIGO STATISTICS BANNER ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[2rem] border border-blue-500/20 bg-slate-950 text-white p-6 sm:p-10 shadow-[0_20px_50px_rgba(7,19,38,0.15)] text-center"
        >
          <div className="pointer-events-none absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-[80px]" />
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-[300px] w-[300px] rounded-full bg-orange-500/10 blur-[80px]" />
          
          <div className="relative z-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#FF8A00]">Success Metric</p>
              <div className="text-2xl sm:text-3xl font-black text-white">99.8%</div>
              <p className="text-[10px] font-bold text-slate-400">Customer Satisfaction</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-400">Applications Assisted</p>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {counters.assisted.toLocaleString()}+
              </div>
              <p className="text-[10px] font-bold text-slate-400">Active Files Handled</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-400">DPRs Prepared</p>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {counters.reports.toLocaleString()}+
              </div>
              <p className="text-[10px] font-bold text-slate-400">Project Reports Prepared</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-400">MSME Registrations</p>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {counters.msme.toLocaleString()}+
              </div>
              <p className="text-[10px] font-bold text-slate-400">MSME Registrations Done</p>
            </div>
          </div>
        </motion.section>

        {/* ================= COMPREHENSIVE DETAILED GUIDES ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl space-y-10"
        >
          {/* Eligibility Rules */}
          <article className="space-y-3">
            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              1. Deep Dive: Eligibility Criteria Rules
            </h3>
            <p className="text-xs leading-relaxed text-slate-600">
              The Chief Minister Youth Self-Employment Scheme (CM YUVA) has established rigorous criteria parameters to filter applicants. Satisfying these points completely before beginning document compilation is mandatory for credit approvals:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-2">
              <li>
                <strong>UP Domicile:</strong> The applicant must hold a valid permanent residency credential (domicile certificate) in Uttar Pradesh. Standard rent deeds or temporal company letterheads do not suffice. Authorized Tehsildar seals are mandatory on domicile documents.
              </li>
              <li>
                <strong>Age Window:</strong> The scheme rules require candidates to have attained a minimum of <strong>21 years</strong> and must not exceed <strong>40 years</strong> at the time of online portal registration. Age limits are verified against birth papers or Class 10th records.
              </li>
              <li>
                <strong>Academic Limit:</strong> Candidates must have successfully cleared at least <strong>Class 8th examinations</strong>. Higher educational degrees (Intermediate, Graduates) are actively preferred, as they provide higher credit rating coefficients during appraisals.
              </li>
              <li>
                <strong>Zero Financial Default:</strong> The candidate must possess a clean credit record. Active defaults or settlements inside CIBIL report datasets will trigger immediate credit rejection at bank gates.
              </li>
            </ul>
          </article>

          {/* Benefits Explained */}
          <article className="space-y-3">
            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              2. Fiscal Benefits & Incentives Breakdown
            </h3>
            <p className="text-xs leading-relaxed text-slate-600">
              The primary driver behind the CM YUVA initiative is the massive state subsidy pipeline configured to eliminate credit burdens for young businesses. Here is how the financial incentives are structured to maximize operational profitability:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-2">
              <li>
                <strong>Interest Rate Subvention support:</strong> The state government reimburses the baseline bank lending rate on your working capital and asset term loans, reducing your net interest output to 0%. This ensures that your business capital is effectively interest-free.
              </li>
              <li>
                <strong>Margin Money Grant:</strong> Startups receive direct margin money subvention credits up to 10% of total project capital requirements (capped at a maximum of ₹50,000). This margin money operates as an upfront government grant that directly offsets your loan principal balance.
              </li>
              <li>
                <strong>Collateral Security Exemptions:</strong> Sanctioned credit lines up to ₹10 Lakhs are covered under the Credit Guarantee Fund Trust for Micro and Small Enterprises (CGTMSE). This legally protects you from pledging personal assets as bank security.
              </li>
            </ul>
          </article>
        </motion.section>

        {/* ================= TESTIMONIAL CAROUSEL (GRADIENT AVATARS) ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Testimonials</p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Customer Success Stories</h2>
            <p className="mt-1.5 text-xs text-slate-500 max-w-xl mx-auto">Read inspiring stories of young UP entrepreneurs who successfully leveraged subventions.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                name: "Preeti Singh",
                loc: "Gorakhpur",
                role: "Boutique Owner",
                text: "I was extremely confused about how to formulate a Detailed Project Report (DPR) for my garments boutique. DigiConnect Dukan's advisors prepared a flawless cost sheet which got my CM YUVA file checked and approved within weeks!"
              },
              {
                name: "Rahul Vishwakarma",
                loc: "Varanasi",
                role: "Furniture Workshop",
                text: "MSME registration support and document filings were handled cleanly. The CRM timeline tracker sent status updates directly to my WhatsApp, letting me track bank submission dates instantly. Excellent digital support!"
              },
              {
                name: "Anas Ahmed",
                loc: "Aligarh",
                role: "Mobile Retail Outlet",
                text: "Secured my retail loan subvention docket support smoothly. The step-by-step eligibility checker wizard evaluated my background instantly. Absolute enterprise-grade professional consulting services."
              }
            ].map((review, idx) => (
              <article key={idx} className="liquid-card rounded-2xl border border-slate-100 p-4 flex flex-col justify-between bg-white shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-orange-500 text-xs">
                    {"★★★★★".split("").map((star, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-slate-600 italic">
                    &ldquo;{review.text}&rdquo;
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-3.5 border-t border-slate-100 pt-3">
                  {/* Initials avatar circle with fintech gradient background */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-[10px] font-black text-white shadow-sm uppercase">
                    {review.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">{review.name}</h4>
                    <p className="text-[9px] text-slate-500">{review.role} • {review.loc}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </motion.section>

        {/* ================= FAQ SECTION ACCORDION ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FF8A00]">Common Doubts</p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Frequently Asked Questions</h2>
            <p className="mt-1.5 text-xs text-slate-500 max-w-xl mx-auto">20+ detailed answers designed to clarify all CM YUVA support guidelines.</p>
          </div>

          <div className="mx-auto max-w-3xl space-y-2">
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setOpenFaqIndex(isOpen ? null : index);
                      triggerAnalyticsEvent("faq_accordion_click", { question: faq.q });
                    }}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left focus:outline-none"
                  >
                    <span className="text-xs font-extrabold text-slate-950 sm:text-sm">{faq.q}</span>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition-transform">
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5 rotate-180" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="border-t border-slate-50 px-4 pb-3 pt-2 text-[11px] leading-relaxed text-slate-500">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* ================= FINAL CTA CONVERSION BANNER ================= */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-[2rem] bg-slate-950 p-6 sm:p-10 text-white relative text-center"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.15),transparent_40%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(249,115,22,0.15),transparent_40%)]" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-black text-white sm:text-3xl">Ready to Start Your Business?</h2>
            <p className="text-xs font-semibold leading-relaxed text-slate-400 sm:text-base">
              Apply for CM YUVA Assistance Today
            </p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Don&apos;t let complex dockets hold back your enterprise dreams. Access expert documentation reviews, CA certified project reports, and seamless CRM application subventions today.
            </p>
            <div className="flex flex-col gap-2.5 sm:flex-row justify-center pt-2">
              <Link
                href="/apply/cm-yuva-entrepreneur-loan-assistance"
                onClick={() => triggerAnalyticsEvent("final_cta_apply_now")}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-white px-5 text-xs font-black text-slate-950 shadow-md hover:bg-slate-100 transition"
              >
                Apply Online Now
                <ArrowRight className="h-3.5 w-3.5 text-slate-950" />
              </Link>
              <a
                href="https://wa.me/917007595931?text=Hello,%20I%20am%20ready%20to%20apply%20for%20CM%20YUVA%20loan%20assistance."
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerAnalyticsEvent("whatsapp_consultation_click", { location: "final_cta" })}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-5 text-xs font-black text-white transition hover:bg-[#20ba56]"
              >
                <MessageCircle className="h-4 w-4 text-white" />
                WhatsApp Consultation
              </a>
            </div>
          </div>
        </motion.section>

      </div>
    </div>
  );
}
